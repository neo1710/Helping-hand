import * as THREE from 'three';
import { AvatarConfig } from './Avatar';

/* ─────────────────────────── TUNABLE CONSTANTS ─────────────────────────── */

export const HEAD = { rx: 1.0, ry: 1.08, rz: 1.0 };
export const HEAD_Y = 0.6;           // height of head centre above pedestal/origin
export const EYE_Y = 0.06;          // height of eyes in head space

export const HAIR_THICKNESS = 0.06;
export const HAIRLINE_Y = 0.34;
export const HAIR_TILT = -0.15;

export const DEFAULT_EYE_COLOR = 0x1a1a2e;

export const Y_AXIS = new THREE.Vector3(0, 1, 0);
export const Z_AXIS = new THREE.Vector3(0, 0, 1);

export type SkullPoint = { pos: THREE.Vector3; normal: THREE.Vector3 };

/* ───────────────────────────── HELPER FUNCTIONS ───────────────────────────── */

/** Free GPU memory of an object and everything inside it. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}

/** Remove (and dispose) everything inside a group. */
export function clearGroup(group: THREE.Group) {
  [...group.children].forEach((child) => {
    group.remove(child);
    disposeObject(child);
  });
}

/** z of the head surface at (x, y). */
export const headSurfaceZ = (x: number, y: number) =>
  HEAD.rz * Math.sqrt(Math.max(0, 1 - (x / HEAD.rx) ** 2 - (y / HEAD.ry) ** 2));

/** Unit vector pointing straight out of the head at a surface point. */
export const headNormal = (x: number, y: number, z: number) =>
  new THREE.Vector3(x / HEAD.rx ** 2, y / HEAD.ry ** 2, z / HEAD.rz ** 2).normalize();

/** Stick an object onto the FRONT of the face at (x, y). */
export function placeOnFace(obj: THREE.Object3D, x: number, y: number, lift = 0) {
  const z = headSurfaceZ(x, y);
  const n = headNormal(x, y, z);
  obj.position.set(x, y, z).addScaledVector(n, lift);
  obj.quaternion.setFromUnitVectors(Z_AXIS, n);
}

/** A point on (or offset away from) the skull described by polarDeg & azimuthDeg. */
export function skullPoint(polarDeg: number, azimuthDeg: number, offset = 0): SkullPoint {
  const t = THREE.MathUtils.degToRad(polarDeg);
  const a = THREE.MathUtils.degToRad(azimuthDeg);
  const d = new THREE.Vector3(Math.sin(t) * Math.sin(a), Math.cos(t), Math.sin(t) * Math.cos(a));
  const pos = new THREE.Vector3(d.x * HEAD.rx, d.y * HEAD.ry, d.z * HEAD.rz);
  const normal = new THREE.Vector3(d.x / HEAD.rx, d.y / HEAD.ry, d.z / HEAD.rz).normalize();
  return { pos: pos.addScaledVector(normal, offset), normal };
}

export const hairlineAt = (z: number) =>
  HAIRLINE_Y * Math.cos(HAIR_TILT) - Math.sin(HAIR_TILT) * z;

export function skullRing(
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

export function tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 8), mat);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, b.clone().sub(a).normalize());
  return mesh;
}

export const unitSphere = (w = 24, h = 18) => new THREE.SphereGeometry(1, w, h);

export function hairCap(mat: THREE.Material, hairlineY = HAIRLINE_Y, thickness = HAIR_THICKNESS) {
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

/* ─────────────────────────────── HAIR STYLES ───────────────────────────── */

export function buildHair(group: THREE.Group, style: string, color: string) {
  clearGroup(group);
  if (style === 'bald') return;

  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });

  switch (style) {
    case 'short': {
      group.add(hairCap(mat));
      const fringe = new THREE.Mesh(unitSphere(20, 16), mat);
      fringe.scale.set(0.5, 0.17, 0.13);
      placeOnFace(fringe, 0.14, 0.44, 0.02);
      fringe.rotateZ(-0.3);
      group.add(fringe);
      break;
    }

    case 'long': {
      group.add(hairCap(mat, HAIRLINE_Y - 0.05));
      const back = new THREE.Mesh(unitSphere(32, 24), mat);
      back.scale.set(0.98, 1.25, 0.7);
      back.position.set(0, -0.55, -0.5);
      group.add(back);
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
      bun.position.copy(skullPoint(22, 180, 0.22).pos);
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
      skullRing(0, 1, 0, 0.1, put);
      skullRing(24, 6, 0, 0.1, put);
      skullRing(46, 9, 15, 0.1, put);
      skullRing(66, 12, 0, 0.1, put);
      break;
    }

    case 'spiky': {
      group.add(hairCap(mat));
      const sweep = new THREE.Vector3(0, 0.6, -0.15);
      const spike = (length: number, radius: number) => (p: SkullPoint) => {
        const geo = new THREE.ConeGeometry(radius, length, 10);
        geo.translate(0, length / 2, 0);
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

/* ─────────────────────────────── ACCESSORIES ───────────────────────────── */

export function buildAccessory(group: THREE.Group, accessory: string, toneColor: string) {
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

      [-0.35, 0.35].forEach((x) => {
        const lens = new THREE.Group();
        lens.add(new THREE.Mesh(rimGeo, frameMat), new THREE.Mesh(lensGeo, lensMat));
        placeOnFace(lens, x, EYE_Y, 0.12);
        group.add(lens);
      });

      const bz = headSurfaceZ(0, EYE_Y) + 0.135;
      group.add(
        tube(new THREE.Vector3(-0.17, EYE_Y + 0.04, bz), new THREE.Vector3(0.17, EYE_Y + 0.04, bz), 0.025, frameMat)
      );

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
      geo.rotateX(Math.PI / 2);
      const band = new THREE.Mesh(geo, bandMat);
      band.position.y = 0.45;
      band.rotation.x = HAIR_TILT;
      group.add(band);
      break;
    }

    case 'cap': {
      const capMat = new THREE.MeshStandardMaterial({ color: toneColor, roughness: 0.5 });
      group.add(hairCap(capMat, HAIRLINE_Y - 0.04, 0.13));

      const visorGeo = new THREE.CylinderGeometry(1, 1, 0.06, 28, 1, false, -Math.PI / 2, Math.PI);
      visorGeo.scale(0.72, 1, 0.55);
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0, 0.42, 0.95);
      visor.rotation.x = 0.2;
      group.add(visor);
      break;
    }
  }
}

/* ─────────────────────────────── THE CHARACTER ─────────────────────────── */

export interface AvatarParts {
  root: THREE.Group;
  eyes: THREE.Group;
  hair: THREE.Group;
  accessory: THREE.Group;
  skinMat: THREE.MeshStandardMaterial;
  toneMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
  glowHover?: THREE.Mesh;
}

export interface BuildAvatarOptions {
  withPedestal?: boolean;
  withHoverRing?: boolean;
}

export function buildAvatar(cfg: AvatarConfig, options: BuildAvatarOptions = { withPedestal: true }): AvatarParts {
  const root = new THREE.Group();
  const { withPedestal = true, withHoverRing = false } = options;

  /* ── Body ── */
  const toneMat = new THREE.MeshStandardMaterial({ color: cfg.tone, roughness: 0.5, metalness: 0.1 });

  let ringMat = new THREE.MeshStandardMaterial({
    color: cfg.tone,
    emissive: cfg.tone,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  let glowHover: THREE.Mesh | undefined;

  if (withPedestal) {
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 0.18, 48),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 })
    );
    pedestal.position.y = -1.5;
    root.add(pedestal);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.04, 16, 64), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.41;
    root.add(ring);
  } else if (withHoverRing) {
    // Stylized glowing energy disc below feet/torso for traveling characters
    const hoverGeo = new THREE.RingGeometry(0.3, 0.95, 32);
    hoverGeo.rotateX(-Math.PI / 2);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: cfg.tone,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    glowHover = new THREE.Mesh(hoverGeo, hoverMat);
    glowHover.position.y = -1.42;
    root.add(glowHover);

    const hoverRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.035, 12, 36), ringMat);
    hoverRing.rotation.x = Math.PI / 2;
    hoverRing.position.y = -1.42;
    root.add(hoverRing);
  }

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 1.1, 32), toneMat);
  torso.position.y = -0.85;
  root.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 16, 32), toneMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.3;
  root.add(collar);

  /* ── Head ── */
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

  /* ── Face ── */
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
    white.scale.z = 0.55;
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

  const mouthGeo = new THREE.TorusGeometry(0.14, 0.025, 10, 20, Math.PI * 0.85);
  mouthGeo.rotateZ(Math.PI * 1.08);
  const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshBasicMaterial({ color: 0x33221a }));
  placeOnFace(mouth, 0, -0.28, 0.01);
  head.add(mouth);

  /* ── Hair & accessory ── */
  const hair = new THREE.Group();
  head.add(hair);
  buildHair(hair, cfg.hairStyle, cfg.hairColor);

  const accessory = new THREE.Group();
  head.add(accessory);
  buildAccessory(accessory, cfg.accessory || 'none', cfg.tone);

  return { root, eyes, hair, accessory, skinMat, toneMat, ringMat, eyeMat, glowHover };
}
