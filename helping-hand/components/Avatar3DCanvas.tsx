'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarConfig } from './Avatar';
import { FiRotateCw, FiPlay, FiMaximize2 } from 'react-icons/fi';

/* ═══════════════════════════════════════════════════════════════════════════
   CHEAT SHEET — read this first
   ═══════════════════════════════════════════════════════════════════════════
   AXES (everything on the head uses these)
     +x = screen right · +y = up · +z = towards the camera (the face is on +z)

   FILE LAYOUT
     1. TUNABLE CONSTANTS   camera framing, head size, hairline, motion speeds
     2. SMALL HELPERS       placeOnFace / skullPoint → stick things ON the head
     3. buildHair()         one `case` per hairStyle
     4. buildAccessory()    one `case` per accessory
     5. buildAvatar()       the character itself: body, head, eyes, mouth
     6. <Avatar3DCanvas>    React part: renderer, camera, lights, animation, drag

   "I WANT TO CHANGE…"                          → EDIT THIS
     zoom (how much of the avatar is visible)   → FRAME_HEIGHT (smaller = zoom in)
     camera looks higher / lower                → FRAME_CENTER_Y
     head bigger / wider / taller               → HEAD
     head higher / lower on the body            → HEAD_Y
     where hair starts on the forehead          → HAIRLINE_Y, HAIR_TILT
     hair hugs the head / is puffier            → HAIR_THICKNESS
     the shape of one hair style                → buildHair() → that style's `case`
     glasses / cap / headband                   → buildAccessory()
     eye size, eye height, mouth                → buildAvatar() → "Face" block
     torso, pedestal, glow ring                 → buildAvatar() → "Body" block
     lights                                     → "Lighting" block in the effect
     spin speed, bounce, drag smoothness        → MOTION constants
     add a NEW hair style / accessory           → add a `case` + add its name to
                                                  the AvatarConfig type in Avatar.tsx
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────── 1. TUNABLE CONSTANTS ─────────────────────────── */

// Camera framing. The camera distance is computed so this box always fits,
// whatever the size of the card the canvas lives in.
const CAMERA_FOV = 38;
const FRAME_HEIGHT = 4.8;     // world units visible top → bottom.  SMALLER = ZOOM IN
const FRAME_WIDTH = 4.0;      // world units that must fit left → right (pedestal is 3.6 wide)
const FRAME_CENTER_Y = 0.2;   // the height the camera looks at
const CAMERA_ELEVATION = 0.5; // camera sits this far above that point (slight downward tilt)

// Head: an ellipsoid (a squashed/stretched sphere) with these radii.
const HEAD = { rx: 1.0, ry: 1.08, rz: 1.0 };
const HEAD_Y = 0.6;           // height of the head's CENTRE above the pedestal axis
const EYE_Y = 0.06;           // height of the eyes on the face (in head space)

// Hair. Every "cap"-style hair uses these.
const HAIR_THICKNESS = 0.06;  // how far hair sits outside the skull
const HAIRLINE_Y = 0.34;      // height of the hair edge at the SIDES of the head
const HAIR_TILT = -0.15;      // negative = forehead hairline higher than the nape

// Motion
const AUTO_ROTATE_SPEED = 0.7; // radians / second
const DAMPING = 6.5;           // higher = drag feels snappier
const FLOAT_HEIGHT = 0.06;     // idle bobbing
const FLOAT_SPEED = 2.2;
const SPIN_SPEED = 10;         // celebration spin, radians / second
const JUMP_HEIGHT = 0.45;

const DEFAULT_EYE_COLOR = 0x1a1a2e;

/* ───────────────────────────── 2. SMALL HELPERS ───────────────────────────── */

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

type SkullPoint = { pos: THREE.Vector3; normal: THREE.Vector3 };

/** Free the GPU memory of an object and everything inside it. */
function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}

/** Remove (and dispose) everything inside a group, ready to rebuild it. */
function clearGroup(group: THREE.Group) {
  [...group.children].forEach((child) => {
    group.remove(child);
    disposeObject(child);
  });
}

/** z of the head surface at (x, y). Use this instead of guessing z values! */
const headSurfaceZ = (x: number, y: number) =>
  HEAD.rz * Math.sqrt(Math.max(0, 1 - (x / HEAD.rx) ** 2 - (y / HEAD.ry) ** 2));

/** Unit vector pointing straight out of the head at a surface point. */
const headNormal = (x: number, y: number, z: number) =>
  new THREE.Vector3(x / HEAD.rx ** 2, y / HEAD.ry ** 2, z / HEAD.rz ** 2).normalize();

/**
 * Stick an object onto the FRONT of the face at (x, y).
 *  - `lift` pushes it away from the skin (0 = touching, 0.1 = floating 0.1 above)
 *  - the object's local +z axis ends up pointing out of the face, so build it
 *    "flat on the XY plane, bulging along +z" and it will sit correctly.
 */
function placeOnFace(obj: THREE.Object3D, x: number, y: number, lift = 0) {
  const z = headSurfaceZ(x, y);
  const n = headNormal(x, y, z);
  obj.position.set(x, y, z).addScaledVector(n, lift);
  obj.quaternion.setFromUnitVectors(Z_AXIS, n);
}

/**
 * A point on (or `offset` away from) the skull, described by two angles:
 *   polarDeg   0 = top of the head … 90 = ear level
 *   azimuthDeg 0 = front … 90 = screen right … 180 = back
 */
function skullPoint(polarDeg: number, azimuthDeg: number, offset = 0): SkullPoint {
  const t = THREE.MathUtils.degToRad(polarDeg);
  const a = THREE.MathUtils.degToRad(azimuthDeg);
  const d = new THREE.Vector3(Math.sin(t) * Math.sin(a), Math.cos(t), Math.sin(t) * Math.cos(a));
  const pos = new THREE.Vector3(d.x * HEAD.rx, d.y * HEAD.ry, d.z * HEAD.rz);
  const normal = new THREE.Vector3(d.x / HEAD.rx, d.y / HEAD.ry, d.z / HEAD.rz).normalize();
  return { pos: pos.addScaledVector(normal, offset), normal };
}

/** Height of the (tilted) hairline at depth z. Lets us keep hair off the face. */
const hairlineAt = (z: number) =>
  HAIRLINE_Y * Math.cos(HAIR_TILT) - Math.sin(HAIR_TILT) * z;

/** Visit `count` evenly spaced points around the skull at one latitude,
 *  skipping any that would land on the face (below the hairline). */
function skullRing(
  polarDeg: number,
  count: number,
  azimuthOffsetDeg: number,
  offset: number,
  visit: (p: SkullPoint) => void
) {
  for (let i = 0; i < count; i++) {
    const p = skullPoint(polarDeg, azimuthOffsetDeg + (360 / count) * i, offset);
    if (p.pos.y < hairlineAt(p.pos.z) + 0.04) continue;
    visit(p);
  }
}

/** A thin cylinder between two points (used for glasses arms etc.). */
function tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 8), mat);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, b.clone().sub(a).normalize());
  return mesh;
}

const unitSphere = (w = 24, h = 18) => new THREE.SphereGeometry(1, w, h);

/**
 * The basic "hair helmet": the top part of an ellipsoid that is a hair-thickness
 * bigger than the head, cut off at `hairlineY`, then tilted by HAIR_TILT.
 */
function hairCap(mat: THREE.Material, hairlineY = HAIRLINE_Y, thickness = HAIR_THICKNESS) {
  const rx = HEAD.rx + thickness;
  const ry = HEAD.ry + thickness;
  const rz = HEAD.rz + thickness;
  const cutAngle = Math.acos(THREE.MathUtils.clamp(hairlineY / ry, -1, 1));
  const geo = new THREE.SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, cutAngle);
  geo.scale(rx, ry, rz);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = HAIR_TILT;
  return mesh;
}

/* ─────────────────────────────── 3. HAIR STYLES ───────────────────────────── */

function buildHair(group: THREE.Group, style: string, color: string) {
  clearGroup(group);
  if (style === 'bald') return;

  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });

  switch (style) {
    case 'short': {
      group.add(hairCap(mat));
      // Side-swept fringe lying on the forehead
      const fringe = new THREE.Mesh(unitSphere(20, 16), mat);
      fringe.scale.set(0.5, 0.17, 0.13);
      placeOnFace(fringe, 0.14, 0.44, 0.02);
      fringe.rotateZ(-0.3);
      group.add(fringe);
      break;
    }

    case 'long': {
      group.add(hairCap(mat, HAIRLINE_Y - 0.05));
      // Curtain of hair behind the head, falling over the shoulders
      const back = new THREE.Mesh(unitSphere(32, 24), mat);
      back.scale.set(0.98, 1.25, 0.7);
      back.position.set(0, -0.55, -0.5);
      group.add(back);
      // Two locks framing the face
      [-1, 1].forEach((side) => {
        const lock = new THREE.Mesh(unitSphere(20, 16), mat);
        lock.scale.set(0.17, 0.78, 0.2);
        lock.position.set(side * 0.93, -0.45, 0.2);
        lock.rotation.z = -side * 0.06;
        group.add(lock);
      });
      break;
    }

    case 'bun': {
      group.add(hairCap(mat));
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 20), mat);
      bun.position.copy(skullPoint(22, 180, 0.22).pos); // top-back of the head
      group.add(bun);
      break;
    }

    case 'curly': {
      group.add(hairCap(mat));
      const bobble = new THREE.SphereGeometry(0.25, 14, 12);
      const put = (p: SkullPoint) => {
        const m = new THREE.Mesh(bobble, mat);
        m.position.copy(p.pos);
        group.add(m);
      };
      // rings of curls, from the crown down to ear level
      skullRing(0, 1, 0, 0.1, put);
      skullRing(24, 6, 0, 0.1, put);
      skullRing(46, 9, 15, 0.1, put);
      skullRing(66, 12, 0, 0.1, put);
      break;
    }

    case 'spiky': {
      group.add(hairCap(mat));
      const sweep = new THREE.Vector3(0, 0.6, -0.15); // bend spikes up and back
      const spike = (length: number, radius: number) => (p: SkullPoint) => {
        const geo = new THREE.ConeGeometry(radius, length, 10);
        geo.translate(0, length / 2, 0); // base at the origin, tip along +y
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(p.pos).addScaledVector(p.normal, -0.04);
        m.quaternion.setFromUnitVectors(Y_AXIS, p.normal.clone().add(sweep).normalize());
        group.add(m);
      };
      skullRing(0, 1, 0, 0, spike(0.75, 0.2));
      skullRing(30, 5, 0, 0, spike(0.65, 0.19));
      skullRing(58, 7, 20, 0, spike(0.55, 0.18));
      skullRing(78, 8, 0, 0, spike(0.45, 0.16));
      break;
    }

    case 'afro': {
      // A big ball of hair, centred up-and-back so it never covers the face,
      // and cut off at `bottomY` so the ears stay visible.
      const radius = 1.25;
      const center = new THREE.Vector3(0, 0.7, -0.28);
      const bottomY = 0.15;
      const cut = Math.acos((bottomY - center.y) / radius);
      const geo = new THREE.SphereGeometry(radius, 40, 32, 0, Math.PI * 2, 0, cut);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(center);
      group.add(mesh);
      break;
    }
  }
}

/* ─────────────────────────────── 4. ACCESSORIES ───────────────────────────── */

function buildAccessory(group: THREE.Group, accessory: string, toneColor: string) {
  clearGroup(group);

  switch (accessory) {
    case 'glasses':
    case 'sunglasses': {
      const isSun = accessory === 'sunglasses';
      const frameMat = new THREE.MeshStandardMaterial({
        color: isSun ? 0x18181b : 0x27272a,
        roughness: 0.3,
      });
      const lensMat = new THREE.MeshStandardMaterial({
        color: isSun ? 0x09090b : 0x93c5fd,
        roughness: 0.1,
        transparent: true,
        opacity: isSun ? 0.92 : 0.45,
      });
      const rimGeo = new THREE.TorusGeometry(0.24, 0.035, 12, 32);
      const lensGeo = new THREE.CircleGeometry(0.23, 28);

      // Lenses float 0.12 in front of the skin → in front of the eyes
      [-0.35, 0.35].forEach((x) => {
        const lens = new THREE.Group();
        lens.add(new THREE.Mesh(rimGeo, frameMat), new THREE.Mesh(lensGeo, lensMat));
        placeOnFace(lens, x, EYE_Y, 0.12);
        group.add(lens);
      });

      // Bridge between the lenses
      const bz = headSurfaceZ(0, EYE_Y) + 0.135;
      group.add(
        tube(new THREE.Vector3(-0.17, EYE_Y + 0.04, bz), new THREE.Vector3(0.17, EYE_Y + 0.04, bz), 0.025, frameMat)
      );

      // Arms running back to the ears (two segments so they clear the cheeks)
      [-1, 1].forEach((s) => {
        const a = new THREE.Vector3(0.62 * s, EYE_Y, 0.96);
        const b = new THREE.Vector3(0.93 * s, 0.08, 0.5);
        const c = new THREE.Vector3(1.06 * s, 0.1, 0.0);
        group.add(tube(a, b, 0.022, frameMat), tube(b, c, 0.022, frameMat));
      });
      break;
    }

    case 'headband': {
      const bandMat = new THREE.MeshStandardMaterial({
        color: toneColor,
        roughness: 0.2,
        emissive: toneColor,
        emissiveIntensity: 0.3,
      });
      const geo = new THREE.TorusGeometry(1.0, 0.08, 16, 48);
      geo.rotateX(Math.PI / 2); // lay the ring flat
      const band = new THREE.Mesh(geo, bandMat);
      band.position.y = 0.45;
      band.rotation.x = HAIR_TILT; // same tilt as the hairline
      group.add(band);
      break;
    }

    case 'cap': {
      const capMat = new THREE.MeshStandardMaterial({ color: toneColor, roughness: 0.5 });
      // Dome = the hair-cap shape, just thicker so hair never pokes through
      group.add(hairCap(capMat, HAIRLINE_Y - 0.04, 0.13));

      // Visor = half a flat disc pointing forward (+z)
      const visorGeo = new THREE.CylinderGeometry(1, 1, 0.06, 28, 1, false, -Math.PI / 2, Math.PI);
      visorGeo.scale(0.72, 1, 0.55);
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0, 0.42, 0.95);
      visor.rotation.x = 0.2; // tip the front down a little
      group.add(visor);
      break;
    }
  }
}

/* ─────────────────────────────── 5. THE CHARACTER ─────────────────────────── */

interface AvatarParts {
  root: THREE.Group;      // the whole character — this is what rotates / floats
  eyes: THREE.Group;      // both eyes (scaled flat when blinking)
  hair: THREE.Group;      // rebuilt when hairStyle / hairColor change
  accessory: THREE.Group; // rebuilt when accessory changes
  skinMat: THREE.MeshStandardMaterial;
  toneMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
}

function buildAvatar(cfg: AvatarConfig): AvatarParts {
  const root = new THREE.Group();

  /* ── Body ─────────────────────────────────────────────── */
  const toneMat = new THREE.MeshStandardMaterial({ color: cfg.tone, roughness: 0.5, metalness: 0.1 });

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.8, 0.18, 48),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 })
  );
  pedestal.position.y = -1.5;
  root.add(pedestal);

  const ringMat = new THREE.MeshStandardMaterial({
    color: cfg.tone,
    emissive: cfg.tone,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.04, 16, 64), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.41;
  root.add(ring);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 1.1, 32), toneMat);
  torso.position.y = -0.85;
  root.add(torso);

  // Hoodie collar: a ring just wider than the chin so it's actually visible
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 16, 32), toneMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.3;
  root.add(collar);

  /* ── Head ─────────────────────────────────────────────── */
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  root.add(head);

  const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: 0.45, metalness: 0.05 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), skinMat);
  skull.scale.set(HEAD.rx, HEAD.ry, HEAD.rz);
  head.add(skull);

  const earGeo = new THREE.SphereGeometry(0.18, 16, 16);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(side * (HEAD.rx + 0.01), 0, 0);
    head.add(ear);
  });

  /* ── Face ─────────────────────────────────────────────── */
  // Each eye is a little group built in "face space" (+z = out of the face),
  // then placeOnFace() snaps it to the skin and orients it.
  const eyes = new THREE.Group();
  head.add(eyes);

  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: cfg.eyesColor || DEFAULT_EYE_COLOR, roughness: 0.1 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const whiteGeo = new THREE.SphereGeometry(0.15, 24, 24);
  const pupilGeo = new THREE.SphereGeometry(0.09, 20, 20);
  const shineGeo = new THREE.SphereGeometry(0.028, 12, 12);

  [-0.35, 0.35].forEach((x) => {
    const eye = new THREE.Group();

    const white = new THREE.Mesh(whiteGeo, eyeWhiteMat);
    white.scale.z = 0.55;      // flatten so it doesn't bulge like a googly eye
    white.position.z = -0.015;
    const pupil = new THREE.Mesh(pupilGeo, eyeMat);
    pupil.scale.z = 0.5;
    pupil.position.z = 0.045;
    const shine = new THREE.Mesh(shineGeo, shineMat);
    shine.position.set(0.045, 0.045, 0.085);

    eye.add(white, pupil, shine);
    placeOnFace(eye, x, EYE_Y);
    eyes.add(eye);
  });

  // Smile: an arc of a torus, rotated so the curve opens upward
  const mouthGeo = new THREE.TorusGeometry(0.14, 0.025, 10, 20, Math.PI * 0.85);
  mouthGeo.rotateZ(Math.PI * 1.08);
  const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshBasicMaterial({ color: 0x33221a }));
  placeOnFace(mouth, 0, -0.28, 0.01);
  head.add(mouth);

  /* ── Hair & accessory (rebuilt live when config changes) ── */
  const hair = new THREE.Group();
  head.add(hair);
  buildHair(hair, cfg.hairStyle, cfg.hairColor);

  const accessory = new THREE.Group();
  head.add(accessory);
  buildAccessory(accessory, cfg.accessory || 'none', cfg.tone);

  return { root, eyes, hair, accessory, skinMat, toneMat, ringMat, eyeMat };
}

/* ───────────────────────────── 6. REACT COMPONENT ─────────────────────────── */

interface Avatar3DCanvasProps {
  config: AvatarConfig;
  className?: string;
  autoRotateDefault?: boolean;
}

export default function Avatar3DCanvas({
  config,
  className = '',
  autoRotateDefault = true,
}: Avatar3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const partsRef = useRef<AvatarParts | null>(null);
  const initialConfig = useRef(config).current; // config at first render (scene is built once)

  // `autoRotate` is state only so the button can highlight; the animation loop
  // reads the ref, which means toggling it never rebuilds the 3D scene.
  const [autoRotate, setAutoRotate] = useState(autoRotateDefault);
  const autoRotateRef = useRef(autoRotateDefault);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const spinRef = useRef({ active: false, angle: 0 });
  const isDraggingRef = useRef(false);
  const previousPointerRef = useRef({ x: 0, y: 0 });
  const rotationTargetRef = useRef({ y: 0, x: 0 });

  /* ── A. Build the scene ONCE ───────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();

    // Camera: placed so FRAME_WIDTH × FRAME_HEIGHT always fits, looking at the character
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 100);
    const frameCamera = (w: number, h: number) => {
      const aspect = w / h;
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
      const distForHeight = FRAME_HEIGHT / 2 / tanHalf;
      const distForWidth = FRAME_WIDTH / 2 / (tanHalf * aspect);
      camera.aspect = aspect;
      camera.position.set(0, FRAME_CENTER_Y + CAMERA_ELEVATION, Math.max(distForHeight, distForWidth));
      camera.lookAt(0, FRAME_CENTER_Y, 0);
      camera.updateProjectionMatrix();
    };
    frameCamera(width, height);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    /* ── Lighting (three-point) ── */
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.8);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    const softFill = new THREE.DirectionalLight(0xffffff, 0.8);
    softFill.position.set(0, -2, 2);
    scene.add(softFill);

    /* ── Character ── */
    const parts = buildAvatar(initialConfig);
    scene.add(parts.root);
    partsRef.current = parts;

    /* ── Animation loop ── */
    const clock = new THREE.Clock();
    let frameId = 0;
    let blinkIn = 3; // seconds until next blink
    let blinkLeft = 0; // seconds the eyes stay closed

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1); // clamp: a paused tab shouldn't cause a huge jump
      const target = rotationTargetRef.current;
      let y = Math.sin(clock.elapsedTime * FLOAT_SPEED) * FLOAT_HEIGHT; // idle float

      // Blink
      blinkIn -= delta;
      if (blinkIn <= 0) {
        blinkLeft = 0.11;
        blinkIn = 3 + Math.random() * 2.5;
      }
      blinkLeft -= delta;
      parts.eyes.children.forEach((eye) => (eye.scale.y = blinkLeft > 0 ? 0.12 : 1));

      // Celebration spin (advances the target AND the model so there's no snap)
      const spin = spinRef.current;
      if (spin.active) {
        const step = delta * SPIN_SPEED;
        spin.angle += step;
        target.y += step;
        parts.root.rotation.y += step;
        y += Math.abs(Math.sin(spin.angle)) * JUMP_HEIGHT; // two hops per turn
        if (spin.angle >= Math.PI * 2) spin.active = false;
      } else if (autoRotateRef.current && !isDraggingRef.current) {
        target.y += delta * AUTO_ROTATE_SPEED;
      }

      // Smoothly chase the target rotation (frame-rate independent)
      const k = 1 - Math.exp(-DAMPING * delta);
      parts.root.rotation.y += (target.y - parts.root.rotation.y) * k;
      parts.root.rotation.x += (target.x - parts.root.rotation.x) * k;
      parts.root.position.y = y;

      renderer.render(scene, camera);
    };
    animate();

    // Resize with the container (not just the window)
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      frameCamera(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      disposeObject(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      partsRef.current = null;
    };
  }, [initialConfig]);

  /* ── B. React to config changes (each effect = one slice of config) ── */

  // Colors: just recolor the existing materials
  useEffect(() => {
    const p = partsRef.current;
    if (!p) return;
    p.skinMat.color.set(config.skin);
    p.toneMat.color.set(config.tone);
    p.ringMat.color.set(config.tone);
    p.ringMat.emissive.set(config.tone);
    p.eyeMat.color.set(config.eyesColor || DEFAULT_EYE_COLOR);
  }, [config.skin, config.tone, config.eyesColor]);

  // Hair: rebuild the meshes
  useEffect(() => {
    const p = partsRef.current;
    if (!p) return;
    buildHair(p.hair, config.hairStyle, config.hairColor);
  }, [config.hairStyle, config.hairColor]);

  // Accessory: rebuild the meshes (cap / headband use the tone color)
  useEffect(() => {
    const p = partsRef.current;
    if (!p) return;
    buildAccessory(p.accessory, config.accessory || 'none', config.tone);
  }, [config.accessory, config.tone]);

  /* ── C. Drag to rotate ── */
  const handlePointerDown = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    previousPointerRef.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - previousPointerRef.current.x;
    const dy = clientY - previousPointerRef.current.y;
    const target = rotationTargetRef.current;
    target.y += dx * 0.012;
    target.x = Math.max(-0.4, Math.min(0.4, target.x + dy * 0.008));
    previousPointerRef.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const triggerCelebrationSpin = () => {
    if (spinRef.current.active) return;
    spinRef.current = { active: true, angle: 0 };
  };

  const handleResetView = () => {
    rotationTargetRef.current = { y: 0, x: 0 };
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 300,
        borderRadius: 24,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 40%, rgba(59, 130, 246, 0.12), transparent 70%), var(--surface)',
        border: '1px solid var(--line)',
        touchAction: 'none',
        userSelect: 'none',
      }}
      className={className}
      onPointerDown={(e) => handlePointerDown(e.clientX, e.clientY)}
      onPointerMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Three.js canvas lives here. Absolutely positioned so the canvas can
          never push the card's size around. */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Top-left badge */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'auto',
        }}
      >
        <span
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: 11.5,
            fontWeight: 800,
            padding: '5px 11px',
            borderRadius: 20,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            letterSpacing: '0.04em',
          }}
        >
          3D STUDIO VIEW
        </span>
      </div>

      {/* Bottom control buttons (stopPropagation so pressing them doesn't start a drag) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 10,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          padding: '6px 12px',
          borderRadius: 30,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          pointerEvents: 'auto',
        }}
      >
        {/* Toggle Auto-Rotate */}
        <button
          type="button"
          onClick={() => setAutoRotate((r) => !r)}
          title={autoRotate ? 'Pause Rotation' : 'Enable 360° Auto-Rotate'}
          style={{
            background: autoRotate ? 'var(--brand)' : 'transparent',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 14,
            transition: 'background 0.2s ease',
          }}
        >
          <FiRotateCw />
        </button>

        {/* Celebrate / Spin Jump */}
        <button
          type="button"
          onClick={triggerCelebrationSpin}
          title="Celebration Spin Jump!"
          style={{
            background: 'transparent',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <FiPlay />
        </button>

        {/* Reset View */}
        <button
          type="button"
          onClick={handleResetView}
          title="Reset Camera Front Angle"
          style={{
            background: 'transparent',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <FiMaximize2 />
        </button>
      </div>

      {/* Helper touch hint */}
      <div
        className="hidden-mobile"
        style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          color: 'var(--ink-muted)',
          fontSize: 11,
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        Drag to rotate 360°
      </div>
    </div>
  );
}