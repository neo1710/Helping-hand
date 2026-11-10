'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { FiRotateCw, FiMaximize2, FiTarget, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { AvatarConfig } from './Avatar';
import { buildAvatar, disposeObject, type AvatarParts } from './Avatar3DModel';

export interface CheckpointRewardItem {
  checkpointIndex: number;
  milestoneValue?: number;
  reward: string;
}

interface GoalJourney3DCanvasProps {
  progress: number; // 0 - 100 percentage
  target: number;
  unit: string;
  checkpoints: number;
  avatarConfig: AvatarConfig;
  goalName: string;
  rewards?: CheckpointRewardItem[];
  onSelectCheckpoint?: (info: {
    index: number;
    value: number;
    reward: string;
    reached: boolean;
  }) => void;
}

type CameraMode = 'overview' | 'follow' | 'free' | 'inspect';

/* ────────────────────────── ROAD CURVE ────────────────────────── */

// Gentle S-curves with monotonic climb (the old points zig-zagged, which caused sharp kinks).
const ROAD_CONTROL_POINTS = [
  new THREE.Vector3(-14.0, 0.0, 9.0),
  new THREE.Vector3(-10.0, 0.3, 6.6),
  new THREE.Vector3(-6.0, 0.65, 4.6),
  new THREE.Vector3(-2.0, 0.9, 3.0),
  new THREE.Vector3(2.0, 1.2, 0.6),
  new THREE.Vector3(6.0, 1.5, -1.4),
  new THREE.Vector3(10.0, 1.9, -2.6),
  new THREE.Vector3(13.2, 2.3, -5.2),
  new THREE.Vector3(15.5, 2.7, -9.0),
];

// Centripetal parameterisation = no overshoot / loops on uneven spacing
const ROAD_CURVE = new THREE.CatmullRomCurve3(ROAD_CONTROL_POINTS, false, 'centripetal');

// The avatar never sits exactly on the start gantry / goal monument
const START_T = 0.12;
const END_T = 0.97;
const mapT = (f: number) => START_T + Math.min(1, Math.max(0, f)) * (END_T - START_T);

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const AVATAR_BASE_Y = 0.92;

/* ─────────────────────────────── GEOMETRY HELPERS ─────────────────────────────── */

interface Frame {
  p: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  normal: THREE.Vector3;
  dist: number;
}

function frameAt(curve: THREE.Curve<THREE.Vector3>, u: number, len: number): Frame {
  const p = curve.getPointAt(u);
  const tangent = curve.getTangentAt(u).normalize();
  // Horizontal cross product -> no roll / banking across the road width
  let right = new THREE.Vector3().crossVectors(tangent, WORLD_UP);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();
  return { p, tangent, right, normal, dist: u * len };
}

function makeFrames(curve: THREE.Curve<THREE.Vector3>, samples: number, len: number): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i <= samples; i++) frames.push(frameAt(curve, i / samples, len));
  return frames;
}

/** A ribbon between two (lateral, height) offsets, following the road. Use DoubleSide materials. */
function buildRibbon(
  frames: Frame[],
  a: [number, number],
  b: [number, number],
  uvScale = 2.4
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();

  frames.forEach((f, i) => {
    pa.copy(f.p).addScaledVector(f.right, a[0]).addScaledVector(f.normal, a[1]);
    pb.copy(f.p).addScaledVector(f.right, b[0]).addScaledVector(f.normal, b[1]);
    pos.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    const v = f.dist / uvScale;
    uv.push(0, v, 1, v);
    if (i < frames.length - 1) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Evenly spaced centre-line dashes measured by arc length (follows curvature). */
function buildDashes(
  curve: THREE.Curve<THREE.Vector3>,
  len: number,
  dashLen = 0.8,
  gap = 1.0,
  halfW = 0.06,
  lift = 0.03
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const steps = 4;
  let vc = 0;
  const l = new THREE.Vector3();
  const r = new THREE.Vector3();

  for (let s = 1.4; s + dashLen < len - 1.4; s += dashLen + gap) {
    for (let k = 0; k <= steps; k++) {
      const f = frameAt(curve, (s + (dashLen * k) / steps) / len, len);
      l.copy(f.p).addScaledVector(f.right, -halfW).addScaledVector(f.normal, lift);
      r.copy(f.p).addScaledVector(f.right, halfW).addScaledVector(f.normal, lift);
      pos.push(l.x, l.y, l.z, r.x, r.y, r.z);
    }
    for (let k = 0; k < steps; k++) {
      const b = vc + k * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
    vc += (steps + 1) * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function makeAsphaltTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#26324a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const v = 30 + Math.random() * 40;
    ctx.fillStyle = `rgba(${v + 10},${v + 22},${v + 45},${0.12 + Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

interface Checkpoint3DMeta {
  index: number;
  f: number;
  value: number;
  reward: string;
  reached: boolean;
  position: THREE.Vector3;
  meshGroup: THREE.Group;
  pinMesh: THREE.Mesh;
  pinMat: THREE.MeshStandardMaterial;
  haloMat: THREE.MeshBasicMaterial;
  baseMat: THREE.MeshStandardMaterial;
}

const ROAD_SAMPLES = 400;

export default function GoalJourney3DCanvas({
  progress,
  target,
  unit,
  checkpoints,
  avatarConfig,
  goalName,
  rewards = [],
  onSelectCheckpoint,
}: GoalJourney3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const partsRef = useRef<AvatarParts | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Latest props in refs so the scene is NOT rebuilt when parents pass inline objects/functions
  const avatarConfigRef = useRef(avatarConfig);
  avatarConfigRef.current = avatarConfig;
  const avatarKey = JSON.stringify(avatarConfig);
  const rewardsRef = useRef(rewards);
  rewardsRef.current = rewards;
  const onSelectRef = useRef(onSelectCheckpoint);
  onSelectRef.current = onSelectCheckpoint;

  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(false);

  const [activeCameraMode, setActiveCameraModeState] = useState<CameraMode>('follow');
  const cameraModeRef = useRef<CameraMode>('follow');
  const setMode = useCallback((m: CameraMode) => {
    cameraModeRef.current = m;
    setActiveCameraModeState(m);
  }, []);

  const [celebrating, setCelebrating] = useState(false);
  const celebrationRef = useRef({ active: false, time: 0, fresh: false });

  // Camera targets (damped every frame)
  const cameraTargetPos = useRef(new THREE.Vector3(0, 10, 24));
  const cameraTargetLook = useRef(new THREE.Vector3(0, 1, 0));
  const focusRef = useRef(new THREE.Vector3()); // avatar focus point, updated each frame

  // Drag / orbit
  const isDraggingRef = useRef(false);
  const movedRef = useRef(0);
  const pointerLastRef = useRef({ x: 0, y: 0 });
  const orbitRef = useRef({ theta: 0, phi: 0.35, radius: 10 });
  const zoomRef = useRef(1);

  // Progress
  const fraction = Math.min(1, Math.max(0, progress / 100));
  const currentFractionRef = useRef(fraction);
  const targetFractionRef = useRef(fraction);
  targetFractionRef.current = fraction;

  const numCheckpoints = Math.min(20, Math.max(2, checkpoints || 4));
  const checkpointMetasRef = useRef<Checkpoint3DMeta[]>([]);

  const triggerCelebration = useCallback(() => {
    celebrationRef.current = { active: true, time: 0, fresh: true };
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 2400);
  }, []);

  const viewOverview = useCallback(() => {
    setAutoRotate(false);
    autoRotateRef.current = false;
    setMode('overview');
    cameraTargetPos.current.set(0, 15, 24);
    cameraTargetLook.current.set(1, 1.2, -1);
  }, [setMode]);

  const viewAvatar = useCallback(() => {
    setAutoRotate(false);
    autoRotateRef.current = false;
    zoomRef.current = 1;
    setMode('follow');
  }, [setMode]);

  const handleZoomIn = useCallback(() => {
    const mode = cameraModeRef.current;
    if (mode === 'follow') {
      zoomRef.current = Math.max(0.45, zoomRef.current - 0.2);
    } else if (mode === 'free') {
      orbitRef.current.radius = Math.max(4.5, orbitRef.current.radius - 2.5);
    } else {
      const dir = cameraTargetPos.current.clone().sub(cameraTargetLook.current);
      if (dir.length() > 6) {
        cameraTargetPos.current.sub(dir.normalize().multiplyScalar(3.0));
      }
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const mode = cameraModeRef.current;
    if (mode === 'follow') {
      zoomRef.current = Math.min(2.4, zoomRef.current + 0.2);
    } else if (mode === 'free') {
      orbitRef.current.radius = Math.min(36, orbitRef.current.radius + 2.5);
    } else {
      const dir = cameraTargetPos.current.clone().sub(cameraTargetLook.current);
      if (dir.length() < 45) {
        cameraTargetPos.current.add(dir.normalize().multiplyScalar(3.0));
      }
    }
  }, []);

  const inspectCheckpoint = useCallback(
    (meta: Checkpoint3DMeta) => {
      setAutoRotate(false);
      autoRotateRef.current = false;
      setMode('inspect');
      cameraTargetLook.current.copy(meta.position).add(new THREE.Vector3(0, 0.9, 0));
      cameraTargetPos.current.copy(meta.position).add(new THREE.Vector3(0, 3.0, 5.5));
      onSelectRef.current?.({
        index: meta.index,
        value: meta.value,
        reward: meta.reward,
        reached: meta.reached,
      });
    },
    [setMode]
  );

  const toggleAutoRotate = useCallback(() => {
    const next = !autoRotateRef.current;
    autoRotateRef.current = next;
    setAutoRotate(next);
    if (next) {
      const cam = cameraRef.current;
      if (cam) {
        const off = cam.position.clone().sub(focusRef.current);
        const r = Math.max(6, off.length());
        orbitRef.current = {
          theta: Math.atan2(off.x, off.z),
          phi: Math.max(0.15, Math.min(1.1, Math.asin(off.y / r))),
          radius: r,
        };
      }
      setMode('free');
    }
  }, [setMode]);

  /* ────────────────────────── THREE.JS SETUP EFFECT ────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cfg = avatarConfigRef.current;
    const tone = cfg.tone;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060d1a, 0.014);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 150);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x060d1a, 1);
    container.appendChild(renderer.domElement);

    /* ── 1. Lighting ── */
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const sunLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    sunLight.position.set(12, 24, 15);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.3);
    rimLight.position.set(-15, 12, -15);
    scene.add(rimLight);

    const bottomGlow = new THREE.DirectionalLight(0x38bdf8, 0.6);
    bottomGlow.position.set(0, -10, 5);
    scene.add(bottomGlow);

    const avatarAuraLight = new THREE.PointLight(tone, 2.5, 9);
    scene.add(avatarAuraLight);

    /* ── 2. Environment ── */
    const starGeo = new THREE.BufferGeometry();
    const starCount = 320;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 130;
      starPositions[i * 3 + 1] = 4 + Math.random() * 60;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 130;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starField = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.75 })
    );
    scene.add(starField);

    const bgGroup = new THREE.Group();
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x0c1626,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });
    const mountainGeo = new THREE.ConeGeometry(7, 10, 5);
    [
      [-26, 0, -22],
      [-16, 0, -28],
      [-4, 0, -32],
      [12, 0, -28],
      [24, 0, -20],
      [32, 0, -12],
    ].forEach(([x, y, z], i) => {
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      m.position.set(x, y + 2, z);
      const scale = 0.8 + ((i * 37) % 7) * 0.1; // deterministic: no layout change between rebuilds
      m.scale.set(scale, scale * 1.0, scale);
      m.rotation.y = i * 1.3;
      bgGroup.add(m);
    });

    const floorGeo = new THREE.PlaneGeometry(90, 90, 1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(
      floorGeo,
      new THREE.MeshStandardMaterial({ color: 0x07101b, roughness: 0.95, metalness: 0.05 })
    );
    floor.position.y = -0.4;
    bgGroup.add(floor);
    scene.add(bgGroup);

    /* ── 3. Highway ── */
    const roadLen = ROAD_CURVE.getLength();
    const frames = makeFrames(ROAD_CURVE, ROAD_SAMPLES, roadLen);

    const HALF_W = 1.2;
    const CURB_W = 0.24;
    const TOTAL_HALF_W = HALF_W + CURB_W;
    const CURB_H = 0.09;
    const SLAB_DEPTH = 0.3;

    const roadGroup = new THREE.Group();
    scene.add(roadGroup);

    const asphaltTex = makeAsphaltTexture(renderer.capabilities.getMaxAnisotropy());
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: asphaltTex,
      roughness: 0.8,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const asphaltGeo = buildRibbon(frames, [-HALF_W, 0], [HALF_W, 0], 2.4);
    roadGroup.add(new THREE.Mesh(asphaltGeo, asphaltMat));

    // Raised concrete curbs (top + inner wall)
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x5a7190,
      roughness: 0.55,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const curbGeos = [
      buildRibbon(frames, [-TOTAL_HALF_W, CURB_H], [-HALF_W, CURB_H]),
      buildRibbon(frames, [-HALF_W, CURB_H], [-HALF_W, 0]),
      buildRibbon(frames, [HALF_W, CURB_H], [TOTAL_HALF_W, CURB_H]),
      buildRibbon(frames, [HALF_W, 0], [HALF_W, CURB_H]),
    ];
    curbGeos.forEach((g) => roadGroup.add(new THREE.Mesh(g, curbMat)));

    // Deck skirts + underside
    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x111b2b,
      roughness: 0.9,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const skirtGeos = [
      buildRibbon(frames, [-TOTAL_HALF_W, CURB_H], [-TOTAL_HALF_W, -SLAB_DEPTH]),
      buildRibbon(frames, [TOTAL_HALF_W, CURB_H], [TOTAL_HALF_W, -SLAB_DEPTH]),
      buildRibbon(frames, [-TOTAL_HALF_W, -SLAB_DEPTH], [TOTAL_HALF_W, -SLAB_DEPTH]),
    ];
    skirtGeos.forEach((g) => roadGroup.add(new THREE.Mesh(g, skirtMat)));

    // Solid white edge lines + neon curb accent
    const edgeLineMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const edgeGeos = [
      buildRibbon(frames, [-HALF_W + 0.1, 0.012], [-HALF_W + 0.17, 0.012]),
      buildRibbon(frames, [HALF_W - 0.17, 0.012], [HALF_W - 0.1, 0.012]),
    ];
    edgeGeos.forEach((g) => roadGroup.add(new THREE.Mesh(g, edgeLineMat)));

    const neonMat = new THREE.MeshBasicMaterial({
      color: tone,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const neonGeos = [
      buildRibbon(frames, [-TOTAL_HALF_W + 0.02, CURB_H + 0.006], [-TOTAL_HALF_W + 0.08, CURB_H + 0.006]),
      buildRibbon(frames, [TOTAL_HALF_W - 0.08, CURB_H + 0.006], [TOTAL_HALF_W - 0.02, CURB_H + 0.006]),
    ];
    neonGeos.forEach((g) => roadGroup.add(new THREE.Mesh(g, neonMat)));

    // Glowing travelled track (centre), drawn progressively
    const trailMat = new THREE.MeshStandardMaterial({
      color: tone,
      emissive: tone,
      emissiveIntensity: 1.5,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const trailGeo = buildRibbon(frames, [-0.3, 0.018], [0.3, 0.018]);
    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
    roadGroup.add(trailMesh);

    // Centre dashes on top of the trail
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const dashGeo = buildDashes(ROAD_CURVE, roadLen);
    roadGroup.add(new THREE.Mesh(dashGeo, dashMat));

    // Support pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x182232, roughness: 0.7, metalness: 0.4 });
    const pillarCapMat = new THREE.MeshStandardMaterial({ color: 0x384c66, roughness: 0.3, metalness: 0.8 });
    const colGeoCache: THREE.BufferGeometry[] = [];
    [0.15, 0.35, 0.55, 0.75, 0.92].forEach((pf) => {
      const pPt = ROAD_CURVE.getPointAt(pf);
      const g = new THREE.Group();
      const crossY = pPt.y - SLAB_DEPTH - 0.1;
      const colHeight = Math.max(0.4, crossY + 0.4);

      const colGeo = new THREE.CylinderGeometry(0.4, 0.48, colHeight, 20);
      colGeoCache.push(colGeo);
      const col = new THREE.Mesh(colGeo, pillarMat);
      col.position.y = -0.4 + colHeight / 2;
      g.add(col);

      const crossGeo = new THREE.BoxGeometry(2.8, 0.2, 0.65);
      colGeoCache.push(crossGeo);
      const cross = new THREE.Mesh(crossGeo, pillarCapMat);
      cross.position.y = crossY + 0.05;
      const tan = ROAD_CURVE.getTangentAt(pf);
      cross.rotation.y = Math.atan2(tan.x, tan.z);
      g.add(cross);

      g.position.set(pPt.x, 0, pPt.z);
      roadGroup.add(g);
    });

    /* ── 4. Start gantry & goal monument ── */
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x3b4a60, metalness: 0.8, roughness: 0.3 });
    const gantryAccentMat = new THREE.MeshStandardMaterial({
      color: tone,
      emissive: tone,
      emissiveIntensity: 0.8,
    });
    const checkerMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.85 });

    const startFrame = frames[0];
    const startGroup = new THREE.Group();
    startGroup.position.copy(startFrame.p);
    startGroup.rotation.y = Math.atan2(startFrame.tangent.x, startFrame.tangent.z);

    // Posts stand OUTSIDE the road, the bar is high above any avatar / camera head height
    [-1.85, 1.85].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.8, 12), gantryMat);
      post.position.set(x, 1.9, 0);
      startGroup.add(post);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.14, 16), gantryMat);
      foot.position.set(x, 0.07, 0);
      startGroup.add(foot);
    });
    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.16, 0.22), gantryMat);
    crossbeam.position.set(0, 3.7, 0);
    startGroup.add(crossbeam);
    const signBanner = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.36, 0.06), gantryAccentMat);
    signBanner.position.set(0, 3.35, 0);
    startGroup.add(signBanner);
    const startLine = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 0.18), checkerMat);
    startLine.position.set(0, 0.035, 0);
    startGroup.add(startLine);
    scene.add(startGroup);

    const endFrame = frames[frames.length - 1];
    const goalGroup = new THREE.Group();
    goalGroup.position.copy(endFrame.p);
    goalGroup.rotation.y = Math.atan2(endFrame.tangent.x, endFrame.tangent.z);

    const goalPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.2, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 })
    );
    goalPedestal.position.y = 0.02;
    goalGroup.add(goalPedestal);

    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.3,
      roughness: 0.1,
      metalness: 0.9,
    });
    const trophyCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), beaconMat);
    trophyCore.position.y = 1.6;
    goalGroup.add(trophyCore);
    const trophyRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.06, 16, 48), beaconMat);
    trophyRing1.position.y = 1.6;
    goalGroup.add(trophyRing1);
    const trophyRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.04, 16, 48), beaconMat);
    trophyRing2.position.y = 1.6;
    trophyRing2.rotation.x = Math.PI / 3;
    goalGroup.add(trophyRing2);

    const goalBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.6, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    goalBeam.position.y = 7.0;
    goalGroup.add(goalBeam);
    scene.add(goalGroup);

    /* ── 5. Checkpoints ── */
    const checkpointMetas: Checkpoint3DMeta[] = [];
    const cpGroup = new THREE.Group();
    scene.add(cpGroup);
    const geoReached = new THREE.OctahedronGeometry(0.35, 0);
    const geoPending = new THREE.DodecahedronGeometry(0.3, 0);
    const initialFrac = currentFractionRef.current;

    for (let i = 1; i <= numCheckpoints; i++) {
      const f = i / (numCheckpoints + 0.25);
      const fr = frameAt(ROAD_CURVE, mapT(f), roadLen);
      const isReached = initialFrac >= f;
      const milestoneVal = Math.round(target * (i / numCheckpoints) * 10) / 10;
      const rewardText = rewardsRef.current[i - 1]?.reward || `Milestone ${i} Reward`;

      // Sits clear of the curb on the right shoulder
      const roadsidePos = fr.p.clone().addScaledVector(fr.right, 2.0);

      const g = new THREE.Group();
      g.position.copy(roadsidePos);

      // Slim post down to the ground so pedestals don't float beside the raised road
      const postH = roadsidePos.y + 0.4;
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, postH, 10),
        new THREE.MeshStandardMaterial({ color: 0x182232, roughness: 0.7, metalness: 0.4 })
      );
      support.position.y = -postH / 2;
      g.add(support);

      const baseMat = new THREE.MeshStandardMaterial({
        color: isReached ? 0x1e3a5f : 0x18202c,
        roughness: 0.4,
        metalness: 0.7,
      });
      const cpBase = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.16, 20), baseMat);
      cpBase.position.y = 0.08;
      g.add(cpBase);

      const pinColor = isReached ? tone : '#f59e0b';
      const pinMat = new THREE.MeshStandardMaterial({
        color: pinColor,
        emissive: pinColor,
        emissiveIntensity: isReached ? 1.1 : 0.5,
        roughness: 0.2,
        metalness: 0.8,
      });
      const pinMesh = new THREE.Mesh(isReached ? geoReached : geoPending, pinMat);
      pinMesh.position.y = 0.95;
      g.add(pinMesh);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
      );
      stem.position.y = 0.48;
      g.add(stem);

      const haloMat = new THREE.MeshBasicMaterial({
        color: pinColor,
        wireframe: true,
        transparent: true,
        opacity: isReached ? 0.7 : 0.35,
      });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 24), haloMat);
      halo.position.y = 0.95;
      halo.rotation.x = Math.PI / 2;
      g.add(halo);

      cpGroup.add(g);
      checkpointMetas.push({
        index: i,
        f,
        value: milestoneVal,
        reward: rewardText,
        reached: isReached,
        position: roadsidePos.clone(),
        meshGroup: g,
        pinMesh,
        pinMat,
        haloMat,
        baseMat,
      });
    }
    checkpointMetasRef.current = checkpointMetas;

    /* ── 6. Avatar ── */
    const avatarRoot = new THREE.Group();
    scene.add(avatarRoot);
    avatarGroupRef.current = avatarRoot;

    const avatarParts = buildAvatar(cfg, { withPedestal: false, withHoverRing: true });
    avatarParts.root.scale.set(0.65, 0.65, 0.65);
    avatarRoot.add(avatarParts.root);
    partsRef.current = avatarParts;

    const groundAuraGeo = new THREE.RingGeometry(0.2, 0.85, 32);
    groundAuraGeo.rotateX(-Math.PI / 2);
    const groundAura = new THREE.Mesh(
      groundAuraGeo,
      new THREE.MeshBasicMaterial({
        color: tone,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      })
    );
    scene.add(groundAura);

    /* ── 7. Celebration sparkles ── */
    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkVelocities.push(
        new THREE.Vector3((Math.random() - 0.5) * 4.0, 1.5 + Math.random() * 4.5, (Math.random() - 0.5) * 4.0)
      );
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({ color: 0xffd166, size: 0.35, transparent: true, opacity: 0 });
    const sparkles = new THREE.Points(sparkGeo, sparkMat);
    sparkles.frustumCulled = false;
    scene.add(sparkles);

    /* ── 8. Raycasting (listener on the container so pointer capture can't swallow clicks) ── */
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClickCanvas = (e: MouseEvent) => {
      if (movedRef.current > 5) return; // was a drag, not a click
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      for (const meta of checkpointMetasRef.current) {
        if (raycaster.intersectObjects(meta.meshGroup.children, true).length > 0) {
          inspectCheckpoint(meta);
          return;
        }
      }
      if (avatarGroupRef.current && raycaster.intersectObjects(avatarGroupRef.current.children, true).length > 0) {
        triggerCelebration();
      }
    };
    container.addEventListener('click', handleClickCanvas);

    /* ── 9. Animation ── */
    // Reused vectors (no per-frame allocation => no GC hitches)
    const posOnCurve = new THREE.Vector3();
    const tanA = new THREE.Vector3();
    const tanB = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const currentLook = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    const headingAt = (t: number) => {
      tanA.copy(ROAD_CURVE.getTangentAt(t));
      tanB.copy(ROAD_CURVE.getTangentAt(Math.min(1, t + 0.02)));
      tanA.add(tanB).normalize(); // slight look-ahead => smoother turns
      return Math.atan2(tanA.x, tanA.z);
    };

    const followTargets = (yaw: number, pos: THREE.Vector3) => {
      const z = zoomRef.current;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      cameraTargetPos.current.set(pos.x - fx * 6.4 * z, pos.y + 3.5 * z, pos.z - fz * 6.4 * z);
      cameraTargetLook.current.set(pos.x + fx * 2.4, pos.y + 1.1, pos.z + fz * 2.4);
    };

    // Start the camera already in place (no long fly-in from a far default position)
    let t0 = mapT(currentFractionRef.current);
    let smoothYaw = headingAt(t0);
    ROAD_CURVE.getPointAt(t0, posOnCurve);
    followTargets(smoothYaw, posOnCurve);
    camera.position.copy(cameraTargetPos.current);
    currentLook.copy(cameraTargetLook.current);
    camera.lookAt(currentLook);
    focusRef.current.copy(posOnCurve);

    const clock = new THREE.Clock();
    let frameId = 0;
    let blinkIn = 3.0;
    let blinkLeft = 0.0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      // Frame-rate independent progress easing
      const cur0 = currentFractionRef.current;
      const diff = targetFractionRef.current - cur0;
      currentFractionRef.current = Math.abs(diff) < 0.0003 ? targetFractionRef.current : cur0 + diff * (1 - Math.exp(-delta * 2.6));
      const cur = currentFractionRef.current;
      const t = mapT(cur);

      // Traveled track (starts at 0 and ends at the avatar)
      const activeSegments = Math.max(1, Math.min(ROAD_SAMPLES, Math.floor(t * ROAD_SAMPLES)));
      trailGeo.setDrawRange(0, activeSegments * 6);

      ROAD_CURVE.getPointAt(t, posOnCurve);

      // Smoothed heading
      const targetYaw = headingAt(t);
      let dYaw = targetYaw - smoothYaw;
      dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
      smoothYaw += dYaw * (1 - Math.exp(-delta * 7));

      let avatarYOffset = AVATAR_BASE_Y + Math.sin(elapsed * 2.6) * 0.04;

      // Celebration
      const cel = celebrationRef.current;
      if (cel.active) {
        if (cel.fresh) {
          cel.fresh = false;
          sparkPositions.fill(0);
        }
        cel.time += delta;
        // ease-out spin: fast burst that settles instead of snapping
        const k = Math.min(1, cel.time / 1.8);
        const spin = (1 - Math.pow(1 - k, 3)) * Math.PI * 4;
        avatarRoot.rotation.set(0, smoothYaw + spin, 0);
        avatarYOffset += Math.abs(Math.sin(Math.min(cel.time, 1.6) * 6.0)) * 0.55 * (1 - k * 0.6);

        sparkles.position.copy(posOnCurve).y += 1.2;
        sparkMat.opacity = Math.max(0, 1.0 - cel.time / 2.2);
        for (let i = 0; i < sparkCount; i++) {
          sparkPositions[i * 3] += sparkVelocities[i].x * delta;
          sparkPositions[i * 3 + 1] += (sparkVelocities[i].y - 3.5 * cel.time) * delta;
          sparkPositions[i * 3 + 2] += sparkVelocities[i].z * delta;
        }
        sparkGeo.attributes.position.needsUpdate = true;

        if (cel.time > 2.2) {
          cel.active = false;
          sparkMat.opacity = 0;
        }
      } else {
        avatarRoot.rotation.set(0, smoothYaw, 0);
      }

      avatarRoot.position.set(posOnCurve.x, posOnCurve.y + avatarYOffset, posOnCurve.z);
      avatarAuraLight.position.set(posOnCurve.x, posOnCurve.y + 1.2, posOnCurve.z);
      groundAura.position.set(posOnCurve.x, posOnCurve.y + CURB_H + 0.02, posOnCurve.z);
      groundAura.rotation.y = elapsed * 1.2;
      focusRef.current.copy(posOnCurve);

      // Blink
      blinkIn -= delta;
      if (blinkIn <= 0) {
        blinkLeft = 0.12;
        blinkIn = 2.5 + Math.random() * 3.0;
      }
      blinkLeft -= delta;
      avatarParts.eyes.children.forEach((eye) => (eye.scale.y = blinkLeft > 0 ? 0.12 : 1.0));

      // Goal & checkpoint animation + live reached-state updates
      trophyCore.rotation.y = elapsed * 1.5;
      trophyCore.rotation.x = Math.sin(elapsed) * 0.3;
      trophyRing1.rotation.y = -elapsed * 0.8;
      trophyRing2.rotation.z = elapsed * 1.2;

      checkpointMetasRef.current.forEach((m) => {
        const reached = cur >= m.f - 0.002;
        if (reached !== m.reached) {
          m.reached = reached;
          const col = reached ? tone : '#f59e0b';
          m.pinMat.color.set(col);
          m.pinMat.emissive.set(col);
          m.pinMat.emissiveIntensity = reached ? 1.1 : 0.5;
          m.haloMat.color.set(col);
          m.haloMat.opacity = reached ? 0.7 : 0.35;
          m.baseMat.color.setHex(reached ? 0x1e3a5f : 0x18202c);
          m.pinMesh.geometry = reached ? geoReached : geoPending;
        }
        m.pinMesh.rotation.y = elapsed * 1.8;
        m.pinMesh.position.y = 0.95 + Math.sin(elapsed * 2 + m.index) * 0.04;
      });

      // Camera
      const mode = cameraModeRef.current;
      if (mode === 'follow') {
        followTargets(smoothYaw, posOnCurve);
      } else if (mode === 'free') {
        const o = orbitRef.current;
        if (autoRotateRef.current && !isDraggingRef.current) o.theta += delta * 0.4;
        const cp = Math.cos(o.phi);
        tmp.copy(posOnCurve);
        tmp.y += 0.9;
        cameraTargetLook.current.copy(tmp);
        cameraTargetPos.current.set(
          tmp.x + Math.sin(o.theta) * cp * o.radius,
          tmp.y + Math.sin(o.phi) * o.radius,
          tmp.z + Math.cos(o.theta) * cp * o.radius
        );
      }

      const posRate = isDraggingRef.current ? 12 : mode === 'follow' ? 5 : 3.5;
      camera.position.lerp(cameraTargetPos.current, 1 - Math.exp(-delta * posRate));
      currentLook.lerp(cameraTargetLook.current, 1 - Math.exp(-delta * (isDraggingRef.current ? 14 : 6)));
      camera.lookAt(currentLook);

      renderer.render(scene, camera);
    };
    animate();

    /* ── 10. Resize ── */
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeEventListener('click', handleClickCanvas);
      disposeObject(scene);
      [asphaltGeo, trailGeo, dashGeo, ...curbGeos, ...skirtGeos, ...edgeGeos, ...neonGeos, ...colGeoCache].forEach((g) =>
        g.dispose()
      );
      geoReached.dispose();
      geoPending.dispose();
      asphaltTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      partsRef.current = null;
      avatarGroupRef.current = null;
      cameraRef.current = null;
    };
    // Rebuild only when the avatar look, checkpoint count or target actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarKey, numCheckpoints, target, inspectCheckpoint, triggerCelebration]);

  /* ────────────────────────── DRAG & TOUCH CONTROLS ────────────────────────── */
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    movedRef.current = 0;
    pointerLastRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - pointerLastRef.current.x;
    const dy = e.clientY - pointerLastRef.current.y;
    pointerLastRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current += Math.abs(dx) + Math.abs(dy);
    if (movedRef.current <= 5) return;

    // First real drag: hand over to a free orbit around the avatar, starting from where the camera is now
    if (cameraModeRef.current !== 'free') {
      const cam = cameraRef.current;
      if (cam) {
        const off = cam.position.clone().sub(focusRef.current).sub(new THREE.Vector3(0, 0.9, 0));
        const r = Math.max(5, off.length());
        orbitRef.current = {
          theta: Math.atan2(off.x, off.z),
          phi: Math.max(0.08, Math.min(1.25, Math.asin(Math.max(-1, Math.min(1, off.y / r))))),
          radius: Math.min(32, r),
        };
      }
      setMode('free');
    }

    const o = orbitRef.current;
    o.theta -= dx * 0.008;
    o.phi = Math.max(0.08, Math.min(1.25, o.phi + dy * 0.006));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const dir = e.deltaY > 0 ? 1 : -1;
    if (cameraModeRef.current === 'free') {
      orbitRef.current.radius = Math.max(5, Math.min(32, orbitRef.current.radius + dir * 1.2));
    } else if (cameraModeRef.current === 'follow') {
      zoomRef.current = Math.max(0.55, Math.min(2.2, zoomRef.current + dir * 0.1));
    }
  };

  /* ── Checkpoints quick scrubber ── */
  const checkpointList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= numCheckpoints; i++) {
      const f = i / (numCheckpoints + 0.25);
      list.push({
        index: i,
        fraction: f,
        value: Math.round(target * (i / numCheckpoints) * 10) / 10,
        reached: fraction >= f,
        reward: rewards[i - 1]?.reward || `Milestone ${i} Reward`,
      });
    }
    return list;
  }, [numCheckpoints, target, fraction, rewards]);

  const iconBtn = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--brand)' : 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 12,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 15,
    transition: 'all 0.2s ease',
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 440,
        height: 'clamp(440px, 58vh, 600px)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: '#060d1a',
        boxShadow: '0 16px 36px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{ width: '100%', flex: 1, cursor: 'grab', touchAction: 'none' }}
      />

      {/* HUD badge */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: 'rgba(10, 18, 30, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: '8px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: avatarConfig.tone,
                boxShadow: `0 0 10px ${avatarConfig.tone}`,
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>
              3D HIGHWAY
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>
            {Math.round(fraction * target)} <span style={{ fontSize: 13, color: avatarConfig.tone }}>{unit}</span>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginLeft: 6 }}>
              / {target} {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8, zIndex: 10 }}>
        <button
          type="button"
          onClick={triggerCelebration}
          title="Cheer & celebrate"
          style={{
            background: celebrating ? avatarConfig.tone : 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            color: celebrating ? '#fff' : avatarConfig.tone,
            border: `1px solid ${celebrating ? avatarConfig.tone : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 12,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          <HiSparkles style={{ fontSize: 16 }} />
          <span>Cheer</span>
        </button>

        <button type="button" onClick={viewAvatar} title="Follow 3D Companion" style={iconBtn(activeCameraMode === 'follow')}>
          <FiTarget />
        </button>
        <button type="button" onClick={viewOverview} title="Full scenic overview" style={iconBtn(activeCameraMode === 'overview')}>
          <FiMaximize2 />
        </button>

        {/* Zoom In & Out Controls */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.15)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            style={{
              background: 'transparent',
              color: '#fff',
              border: 'none',
              borderRight: '1px solid rgba(255,255,255,0.12)',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              transition: 'background 0.15s ease',
            }}
          >
            <FiZoomIn />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            style={{
              background: 'transparent',
              color: '#fff',
              border: 'none',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              transition: 'background 0.15s ease',
            }}
          >
            <FiZoomOut />
          </button>
        </div>

        <button type="button" onClick={toggleAutoRotate} title="Toggle Cinematic Auto-Orbit" style={iconBtn(autoRotate)}>
          <FiRotateCw />
        </button>
      </div>

      {/* Milestone scrubber */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          background: 'rgba(8, 14, 24, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14,
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          zIndex: 10,
          scrollbarWidth: 'none',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            paddingLeft: 4,
            paddingRight: 6,
            whiteSpace: 'nowrap',
          }}
        >
          Roadside:
        </span>

        {checkpointList.map((cp) => (
          <button
            key={cp.index}
            type="button"
            onClick={() => {
              const meta = checkpointMetasRef.current.find((m) => m.index === cp.index);
              if (meta) inspectCheckpoint(meta);
            }}
            style={{
              background: cp.reached ? `${avatarConfig.tone}22` : 'rgba(255,255,255,0.06)',
              color: cp.reached ? '#fff' : '#94a3b8',
              border: `1px solid ${cp.reached ? avatarConfig.tone : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: cp.reached ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            {cp.reached && <span style={{ color: '#ffd166' }}>★</span>}
            <span>
              {cp.value} {unit}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            setAutoRotate(false);
            autoRotateRef.current = false;
            setMode('inspect');
            const end = ROAD_CURVE.getPointAt(1);
            cameraTargetLook.current.copy(end).add(new THREE.Vector3(0, 1.4, 0));
            cameraTargetPos.current.copy(end).add(new THREE.Vector3(-1.5, 3.5, 7.0));
          }}
          style={{
            background: fraction >= 1 ? '#f59e0b22' : 'rgba(255,255,255,0.06)',
            color: '#f59e0b',
            border: '1px solid #f59e0b66',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>
            🏆 Finish ({target} {unit})
          </span>
        </button>
      </div>

      <div
        className="hidden-mobile"
        style={{
          position: 'absolute',
          bottom: 52,
          right: 16,
          color: 'rgba(255,255,255,0.45)',
          fontSize: 11,
          fontWeight: 600,
          pointerEvents: 'none',
          zIndex: 9,
        }}
      >
        Drag to orbit · Click pins or companion to inspect
      </div>
    </div>
  );
}