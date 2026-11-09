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

import {
  buildAvatar,
  buildHair,
  buildAccessory,
  disposeObject,
  DEFAULT_EYE_COLOR,
  type AvatarParts,
} from './Avatar3DModel';

// Camera framing. The camera distance is computed so this box always fits,
// whatever the size of the card the canvas lives in.
const CAMERA_FOV = 38;
const FRAME_HEIGHT = 4.8;     // world units visible top → bottom.  SMALLER = ZOOM IN
const FRAME_WIDTH = 4.0;      // world units that must fit left → right (pedestal is 3.6 wide)
const FRAME_CENTER_Y = 0.2;   // the height the camera looks at
const CAMERA_ELEVATION = 0.5; // camera sits this far above that point (slight downward tilt)

// Motion
const AUTO_ROTATE_SPEED = 0.7; // radians / second
const DAMPING = 6.5;           // higher = drag feels snappier
const FLOAT_HEIGHT = 0.06;     // idle bobbing
const FLOAT_SPEED = 2.2;
const SPIN_SPEED = 10;         // celebration spin, radians / second
const JUMP_HEIGHT = 0.45;

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