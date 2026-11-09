'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  FiRotateCw,
  FiMaximize2,
  FiEye,
  FiAward,
  FiCompass,
  FiTarget,
} from 'react-icons/fi';
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

/* ────────────────────────── 3D WAYPOINTS & ROAD CURVE ────────────────────────── */

// 10 strategic 3D control points crafting an organic winding highway through space & hills
const ROAD_CONTROL_POINTS = [
  new THREE.Vector3(-14.0, 0.0, 9.0),  // 0. Start Gate
  new THREE.Vector3(-11.0, 0.35, 5.5), // 1. First scenic sweep
  new THREE.Vector3(-7.5, 0.7, 2.5),   // 2. Rising gentle slope
  new THREE.Vector3(-3.5, 0.5, 4.2),   // 3. Valley curve
  new THREE.Vector3(0.0, 0.85, 1.0),   // 4. Midpoint ridge
  new THREE.Vector3(3.5, 1.25, -2.0),  // 5. Climbing highway
  new THREE.Vector3(6.5, 1.05, 1.5),   // 6. Vista bend
  new THREE.Vector3(10.0, 1.55, -1.5), // 7. High terrace
  new THREE.Vector3(13.0, 2.05, -5.5), // 8. Summit approach
  new THREE.Vector3(15.5, 2.45, -9.0), // 9. Goal Peak
];

const ROAD_CURVE = new THREE.CatmullRomCurve3(ROAD_CONTROL_POINTS, false, 'catmullrom', 0.25);

/* ─────────────────────────────── SCENE HELPERS ─────────────────────────────── */

interface Checkpoint3DMeta {
  index: number;
  value: number;
  reward: string;
  reached: boolean;
  position: THREE.Vector3;
  meshGroup: THREE.Group;
  pinMesh: THREE.Mesh;
}

/** Builds realistic 3D highway geometry: flat asphalt, raised concrete curbs, structural deck, and lane markings */
function buildHighwayGeometry(curve: THREE.Curve<THREE.Vector3>, samples = 200) {
  const ROAD_W = 2.4;
  const HALF_W = 1.2;
  const CURB_W = 0.24;
  const TOTAL_HALF_W = HALF_W + CURB_W; // 1.44
  const CURB_H = 0.08;
  const SLAB_DEPTH = 0.26;

  // Sample frames along the curve
  const frames: Array<{
    p: THREE.Vector3;
    tangent: THREE.Vector3;
    right: THREE.Vector3;
    normal: THREE.Vector3;
    t: number;
  }> = [];

  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    // Using horizontal cross product guarantees road is flat across its width (zero roll/bank)
    let right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (right.lengthSq() < 0.001) right = new THREE.Vector3(1, 0, 0);
    const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();
    frames.push({ p, tangent, right, normal, t });
  }

  // 1. Asphalt Road Deck (Main Surface)
  const asphaltGeo = new THREE.BufferGeometry();
  const asphaltPositions: number[] = [];
  const asphaltNormals: number[] = [];
  const asphaltUvs: number[] = [];
  const asphaltIndices: number[] = [];

  for (let i = 0; i <= samples; i++) {
    const { p, right, normal, t } = frames[i];
    const pl = p.clone().addScaledVector(right, -HALF_W);
    const pr = p.clone().addScaledVector(right, HALF_W);

    asphaltPositions.push(pl.x, pl.y, pl.z, pr.x, pr.y, pr.z);
    asphaltNormals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
    asphaltUvs.push(0, t * 24, 1, t * 24);

    if (i < samples) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      asphaltIndices.push(a, b, c, b, d, c);
    }
  }

  asphaltGeo.setAttribute('position', new THREE.Float32BufferAttribute(asphaltPositions, 3));
  asphaltGeo.setAttribute('normal', new THREE.Float32BufferAttribute(asphaltNormals, 3));
  asphaltGeo.setAttribute('uv', new THREE.Float32BufferAttribute(asphaltUvs, 2));
  asphaltGeo.setIndex(asphaltIndices);

  // 2. Concrete Curbs (Left & Right Raised Sidewalks)
  const curbGeo = new THREE.BufferGeometry();
  const curbPositions: number[] = [];
  const curbNormals: number[] = [];
  const curbIndices: number[] = [];

  for (let i = 0; i <= samples; i++) {
    const { p, right, normal } = frames[i];
    const lOut = p.clone().addScaledVector(right, -TOTAL_HALF_W).addScaledVector(normal, CURB_H);
    const lIn = p.clone().addScaledVector(right, -HALF_W).addScaledVector(normal, CURB_H);
    const rIn = p.clone().addScaledVector(right, HALF_W).addScaledVector(normal, CURB_H);
    const rOut = p.clone().addScaledVector(right, TOTAL_HALF_W).addScaledVector(normal, CURB_H);

    curbPositions.push(
      lOut.x, lOut.y, lOut.z,
      lIn.x, lIn.y, lIn.z,
      rIn.x, rIn.y, rIn.z,
      rOut.x, rOut.y, rOut.z
    );

    curbNormals.push(
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z
    );

    if (i < samples) {
      const b = i * 4;
      const n = (i + 1) * 4;
      // Left curb
      curbIndices.push(b, b + 1, n, b + 1, n + 1, n);
      // Right curb
      curbIndices.push(b + 2, b + 3, n + 2, b + 3, n + 3, n + 2);
    }
  }

  curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
  curbGeo.setAttribute('normal', new THREE.Float32BufferAttribute(curbNormals, 3));
  curbGeo.setIndex(curbIndices);

  // 3. Structural Concrete Bridge Skirts (Side walls & underside)
  const skirtGeo = new THREE.BufferGeometry();
  const skirtPositions: number[] = [];
  const skirtNormals: number[] = [];
  const skirtIndices: number[] = [];

  for (let i = 0; i <= samples; i++) {
    const { p, right, normal } = frames[i];
    const lTop = p.clone().addScaledVector(right, -TOTAL_HALF_W).addScaledVector(normal, CURB_H);
    const lBot = p.clone().addScaledVector(right, -TOTAL_HALF_W).addScaledVector(normal, -SLAB_DEPTH);
    const rTop = p.clone().addScaledVector(right, TOTAL_HALF_W).addScaledVector(normal, CURB_H);
    const rBot = p.clone().addScaledVector(right, TOTAL_HALF_W).addScaledVector(normal, -SLAB_DEPTH);

    skirtPositions.push(
      lTop.x, lTop.y, lTop.z,
      lBot.x, lBot.y, lBot.z,
      rTop.x, rTop.y, rTop.z,
      rBot.x, rBot.y, rBot.z
    );

    const lSide = right.clone().negate();
    const rSide = right.clone();

    skirtNormals.push(
      lSide.x, lSide.y, lSide.z,
      lSide.x, lSide.y, lSide.z,
      rSide.x, rSide.y, rSide.z,
      rSide.x, rSide.y, rSide.z
    );

    if (i < samples) {
      const b = i * 4;
      const n = (i + 1) * 4;
      // Left vertical wall
      skirtIndices.push(b, b + 1, n, b + 1, n + 1, n);
      // Right vertical wall
      skirtIndices.push(b + 3, b + 2, n + 3, b + 2, n + 2, n + 3);
      // Underside bottom slab
      skirtIndices.push(b + 1, b + 3, n + 1, b + 3, n + 3, n + 1);
    }
  }

  skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtPositions, 3));
  skirtGeo.setAttribute('normal', new THREE.Float32BufferAttribute(skirtNormals, 3));
  skirtGeo.setIndex(skirtIndices);

  // 4. White Centerline Road Markings (Dashed Highway Stripes)
  const dashGeo = new THREE.BufferGeometry();
  const dashPositions: number[] = [];
  const dashNormals: number[] = [];
  const dashIndices: number[] = [];
  let dashVertexCount = 0;

  for (let i = 2; i < samples - 2; i += 3) {
    const { p, right, normal, tangent } = frames[i];
    const dw = 0.08; // half width of dash
    const dl = 0.42; // half length of dash
    const center = p.clone().addScaledVector(normal, 0.009);

    const c1 = center.clone().addScaledVector(right, -dw).addScaledVector(tangent, -dl);
    const c2 = center.clone().addScaledVector(right, dw).addScaledVector(tangent, -dl);
    const c3 = center.clone().addScaledVector(right, -dw).addScaledVector(tangent, dl);
    const c4 = center.clone().addScaledVector(right, dw).addScaledVector(tangent, dl);

    dashPositions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z, c3.x, c3.y, c3.z, c4.x, c4.y, c4.z);
    dashNormals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);

    const v = dashVertexCount;
    dashIndices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    dashVertexCount += 4;
  }

  dashGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashPositions, 3));
  dashGeo.setAttribute('normal', new THREE.Float32BufferAttribute(dashNormals, 3));
  dashGeo.setIndex(dashIndices);

  // 5. Glowing Traveled Energy Center Track
  const trailGeo = new THREE.BufferGeometry();
  const trailPositions: number[] = [];
  const trailNormals: number[] = [];
  const trailIndices: number[] = [];
  const TRAIL_HALF_W = 0.32;

  for (let i = 0; i <= samples; i++) {
    const { p, right, normal } = frames[i];
    const centerElevated = p.clone().addScaledVector(normal, 0.015);
    const tl = centerElevated.clone().addScaledVector(right, -TRAIL_HALF_W);
    const tr = centerElevated.clone().addScaledVector(right, TRAIL_HALF_W);

    trailPositions.push(tl.x, tl.y, tl.z, tr.x, tr.y, tr.z);
    trailNormals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);

    if (i < samples) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      trailIndices.push(a, b, c, b, d, c);
    }
  }

  trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));
  trailGeo.setAttribute('normal', new THREE.Float32BufferAttribute(trailNormals, 3));
  trailGeo.setIndex(trailIndices);

  return { asphaltGeo, curbGeo, skirtGeo, dashGeo, trailGeo, frames, samples };
}

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

  // Interaction & camera targets
  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(false);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const [activeCameraMode, setActiveCameraMode] = useState<'overview' | 'follow'>('follow');
  const activeCameraModeRef = useRef<'overview' | 'follow'>('follow');
  useEffect(() => {
    activeCameraModeRef.current = activeCameraMode;
  }, [activeCameraMode]);

  const [celebrating, setCelebrating] = useState(false);
  const celebrationRef = useRef({ active: false, time: 0 });

  // Camera lerp targets
  const cameraTargetPos = useRef(new THREE.Vector3(0, 10, 24));
  const cameraTargetLook = useRef(new THREE.Vector3(0, 1, 0));

  // Drag interaction
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const orbitAnglesRef = useRef({ theta: 0, phi: 0.35, radius: 18 });

  // Progress animation
  const fraction = Math.min(1, Math.max(0, progress / 100));
  const currentFractionRef = useRef(fraction);
  const targetFractionRef = useRef(fraction);

  useEffect(() => {
    targetFractionRef.current = fraction;
  }, [fraction]);

  // Checkpoints data
  const numCheckpoints = Math.min(20, Math.max(2, checkpoints || 4));
  const checkpointMetasRef = useRef<Checkpoint3DMeta[]>([]);

  // Particle systems
  const sparklesRef = useRef<THREE.Points | null>(null);

  // Trigger celebration
  const triggerCelebration = useCallback(() => {
    celebrationRef.current = { active: true, time: 0 };
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 2400);
  }, []);

  // Set camera to overview
  const viewOverview = useCallback(() => {
    setActiveCameraMode('overview');
    cameraTargetPos.current.set(0, 14, 22);
    cameraTargetLook.current.set(1, 1.2, -1);
  }, []);

  // Set camera to focus on avatar
  const viewAvatar = useCallback(() => {
    setActiveCameraMode('follow');
  }, []);

  // Set camera to inspect specific checkpoint
  const inspectCheckpoint = useCallback((meta: Checkpoint3DMeta) => {
    cameraTargetLook.current.copy(meta.position).add(new THREE.Vector3(0, 0.8, 0));
    cameraTargetPos.current.copy(meta.position).add(new THREE.Vector3(0, 3.2, 5.5));
    if (onSelectCheckpoint) {
      onSelectCheckpoint({
        index: meta.index,
        value: meta.value,
        reward: meta.reward,
        reached: meta.reached,
      });
    }
  }, [onSelectCheckpoint]);

  /* ────────────────────────── THREE.JS SETUP EFFECT ────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060d1a, 0.016);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 150);
    camera.position.set(0, 12, 22);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x060d1a, 1);
    container.appendChild(renderer.domElement);

    /* ── 1. Lighting ── */
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    sunLight.position.set(12, 24, 15);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.3);
    rimLight.position.set(-15, 12, -15);
    scene.add(rimLight);

    const bottomGlow = new THREE.DirectionalLight(0x38bdf8, 0.6);
    bottomGlow.position.set(0, -10, 5);
    scene.add(bottomGlow);

    // Dynamic aura point light following the avatar
    const avatarAuraLight = new THREE.PointLight(avatarConfig.tone, 2.5, 9);
    scene.add(avatarAuraLight);

    /* ── 2. Environment (Starfield & Cosmic Terrain) ── */
    const starGeo = new THREE.BufferGeometry();
    const starCount = 320;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 130;
      starPositions[i * 3 + 1] = 4 + Math.random() * 60;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 130;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.75,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Floating scenic low-poly mountains in background
    const bgGroup = new THREE.Group();
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x0c1626,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });
    const mountainGeo = new THREE.ConeGeometry(7, 10, 5);

    const mountainPositions = [
      [-26, 0, -22],
      [-16, 0, -28],
      [-4, 0, -32],
      [12, 0, -28],
      [24, 0, -20],
      [32, 0, -12],
    ];

    mountainPositions.forEach(([x, y, z]) => {
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      m.position.set(x, y + 2, z);
      const scale = 0.8 + Math.random() * 0.7;
      m.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
      m.rotation.y = Math.random() * Math.PI;
      bgGroup.add(m);
    });

    // Gentle terrain floor
    const floorGeo = new THREE.PlaneGeometry(90, 90, 24, 24);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x07101b,
      roughness: 0.95,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.4;
    bgGroup.add(floor);
    scene.add(bgGroup);

    /* ── 3. The 3D Road Highway ── */
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);

    const highway = buildHighwayGeometry(ROAD_CURVE, 200);

    // 3a. Asphalt Road Surface (Dark, realistic textured road)
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x161e2b,
      roughness: 0.75,
      metalness: 0.2,
    });
    const asphaltMesh = new THREE.Mesh(highway.asphaltGeo, asphaltMat);
    roadGroup.add(asphaltMesh);

    // 3b. Concrete Raised Curbs
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x334458,
      roughness: 0.5,
      metalness: 0.5,
    });
    const curbMesh = new THREE.Mesh(highway.curbGeo, curbMat);
    roadGroup.add(curbMesh);

    // 3c. Bridge Skirts & Underbelly Slab
    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x0c131e,
      roughness: 0.9,
      metalness: 0.2,
    });
    const skirtMesh = new THREE.Mesh(highway.skirtGeo, skirtMat);
    roadGroup.add(skirtMesh);

    // 3d. White Centerline Dashed Markings
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.85,
    });
    const dashMesh = new THREE.Mesh(highway.dashGeo, dashMat);
    roadGroup.add(dashMesh);

    // 3e. Glowing Traveled Energy Center Track
    const trailMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.tone,
      emissive: avatarConfig.tone,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });
    const trailMesh = new THREE.Mesh(highway.trailGeo, trailMat);
    roadGroup.add(trailMesh);

    // 3f. Structural Highway Support Pillars
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x182232,
      roughness: 0.7,
      metalness: 0.4,
    });
    const pillarCapMat = new THREE.MeshStandardMaterial({
      color: 0x384c66,
      roughness: 0.3,
      metalness: 0.8,
    });

    const pillarFractions = [0.15, 0.35, 0.55, 0.75, 0.92];
    pillarFractions.forEach((pf) => {
      const pPt = ROAD_CURVE.getPointAt(pf);
      const pillarGroup = new THREE.Group();
      const colHeight = Math.max(0.6, pPt.y - (-0.4));

      // Main column
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.48, colHeight, 20),
        pillarMat
      );
      col.position.y = -0.4 + colHeight / 2;
      pillarGroup.add(col);

      // Top crosshead supporting the highway slab
      const crosshead = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.2, 0.65),
        pillarCapMat
      );
      crosshead.position.y = pPt.y - 0.22;
      const tan = ROAD_CURVE.getTangentAt(pf);
      crosshead.rotation.y = Math.atan2(tan.x, tan.z);
      pillarGroup.add(crosshead);

      pillarGroup.position.set(pPt.x, 0, pPt.z);
      roadGroup.add(pillarGroup);
    });

    /* ── 4. Start Gantry & Goal Peak Victory Monument ── */
    // Start Overhead Gantry
    const startPt = ROAD_CURVE.getPointAt(0);
    const startTangent = ROAD_CURVE.getTangentAt(0);
    const startYaw = Math.atan2(startTangent.x, startTangent.z);
    const startGroup = new THREE.Group();
    startGroup.position.copy(startPt);
    startGroup.rotation.y = startYaw;

    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x3b4a60, metalness: 0.8, roughness: 0.3 });
    const gantryAccentMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.tone,
      emissive: avatarConfig.tone,
      emissiveIntensity: 0.8,
    });

    // Left and right pillars
    [-1.4, 1.4].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 12), gantryMat);
      post.position.set(x, 1.1, 0);
      startGroup.add(post);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 16), gantryMat);
      foot.position.set(x, 0.06, 0);
      startGroup.add(foot);
    });

    // Overhead crossbar
    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 0.2), gantryMat);
    crossbeam.position.set(0, 2.1, 0);
    startGroup.add(crossbeam);

    const signBanner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.06), gantryAccentMat);
    signBanner.position.set(0, 1.82, 0);
    startGroup.add(signBanner);

    scene.add(startGroup);

    // Goal Peak Victory Monument (100% Finish Line)
    const endPt = ROAD_CURVE.getPointAt(1);
    const endTangent = ROAD_CURVE.getTangentAt(1);
    const endYaw = Math.atan2(endTangent.x, endTangent.z);
    const goalGroup = new THREE.Group();
    goalGroup.position.copy(endPt);
    goalGroup.rotation.y = endYaw;

    const goalPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.2, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 })
    );
    goalPedestal.position.y = 0.02;
    goalGroup.add(goalPedestal);

    // Golden victory beacon core
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

    // Rotating gold rings around goal trophy
    const trophyRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.06, 16, 48), beaconMat);
    trophyRing1.position.y = 1.6;
    goalGroup.add(trophyRing1);

    const trophyRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.04, 16, 48), beaconMat);
    trophyRing2.position.y = 1.6;
    trophyRing2.rotation.x = Math.PI / 3;
    goalGroup.add(trophyRing2);

    // Goal light beam shooting upwards
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.6, 14, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const goalBeam = new THREE.Mesh(beamGeo, beamMat);
    goalBeam.position.y = 7.0;
    goalGroup.add(goalBeam);

    scene.add(goalGroup);

    /* ── 5. Checkpoints (Roadside Milestone Pedestals) ── */
    const checkpointMetas: Checkpoint3DMeta[] = [];
    const cpGroup = new THREE.Group();
    scene.add(cpGroup);
    const UP = new THREE.Vector3(0, 1, 0);

    for (let i = 1; i <= numCheckpoints; i++) {
      const f = i / (numCheckpoints + 0.25);
      const pos = ROAD_CURVE.getPointAt(f);
      const tangent = ROAD_CURVE.getTangentAt(f);
      const right = new THREE.Vector3().crossVectors(tangent, UP).normalize();
      const isReached = fraction >= f;
      const milestoneVal = Math.round((target * (i / numCheckpoints)) * 10) / 10;
      const rewardText = rewards[i - 1]?.reward || `Milestone ${i} Reward`;

      // Situate checkpoint along the right shoulder of the road
      const roadsidePos = pos.clone().addScaledVector(right, 1.62);

      const singleCpGroup = new THREE.Group();
      singleCpGroup.position.copy(roadsidePos);

      // Milestone road pedestal base
      const cpBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.58, 0.16, 20),
        new THREE.MeshStandardMaterial({
          color: isReached ? 0x1e3a5f : 0x18202c,
          roughness: 0.4,
          metalness: 0.7,
        })
      );
      cpBase.position.y = 0.08;
      singleCpGroup.add(cpBase);

      // Glowing crystal milestone badge
      const pinColor = isReached ? avatarConfig.tone : '#f59e0b';
      const pinMat = new THREE.MeshStandardMaterial({
        color: pinColor,
        emissive: pinColor,
        emissiveIntensity: isReached ? 1.1 : 0.5,
        roughness: 0.2,
        metalness: 0.8,
      });

      const pinGeo = isReached
        ? new THREE.OctahedronGeometry(0.35, 0)
        : new THREE.DodecahedronGeometry(0.3, 0);

      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.y = 0.95;
      singleCpGroup.add(pinMesh);

      // Stem post
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
      );
      stem.position.y = 0.48;
      singleCpGroup.add(stem);

      // Floating halo ring around milestone crystal
      const haloMat = new THREE.MeshBasicMaterial({
        color: pinColor,
        wireframe: true,
        transparent: true,
        opacity: isReached ? 0.7 : 0.35,
      });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 24), haloMat);
      halo.position.y = 0.95;
      halo.rotation.x = Math.PI / 2;
      singleCpGroup.add(halo);

      cpGroup.add(singleCpGroup);

      checkpointMetas.push({
        index: i,
        value: milestoneVal,
        reward: rewardText,
        reached: isReached,
        position: roadsidePos.clone(),
        meshGroup: singleCpGroup,
        pinMesh,
      });
    }

    checkpointMetasRef.current = checkpointMetas;

    /* ── 6. The 3D Avatar Companion ── */
    const avatarRoot = new THREE.Group();
    scene.add(avatarRoot);
    avatarGroupRef.current = avatarRoot;

    const avatarParts = buildAvatar(avatarConfig, { withPedestal: false, withHoverRing: true });
    avatarParts.root.scale.set(0.65, 0.65, 0.65);
    avatarRoot.add(avatarParts.root);
    partsRef.current = avatarParts;

    // Ground aura projection disc beneath avatar's feet on the asphalt
    const groundAuraGeo = new THREE.RingGeometry(0.2, 0.85, 32);
    groundAuraGeo.rotateX(-Math.PI / 2);
    const groundAuraMat = new THREE.MeshBasicMaterial({
      color: avatarConfig.tone,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const groundAura = new THREE.Mesh(groundAuraGeo, groundAuraMat);
    scene.add(groundAura);

    /* ── 7. Celebration Confetti / Sparkle Particles ── */
    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;
      sparkVelocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 4.0,
          1.5 + Math.random() * 4.5,
          (Math.random() - 0.5) * 4.0
        )
      );
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffd166,
      size: 0.35,
      transparent: true,
      opacity: 0,
    });
    const sparkles = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkles);
    sparklesRef.current = sparkles;

    /* ── 8. Raycasting (Clicking 3D Checkpoints) ── */
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClickCanvas = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check hits against checkpoints
      for (const meta of checkpointMetasRef.current) {
        const hits = raycaster.intersectObjects(meta.meshGroup.children, true);
        if (hits.length > 0) {
          inspectCheckpoint(meta);
          return;
        }
      }

      // Check hit against avatar to celebrate
      if (avatarGroupRef.current) {
        const avatarHits = raycaster.intersectObjects(avatarGroupRef.current.children, true);
        if (avatarHits.length > 0) {
          triggerCelebration();
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClickCanvas);

    /* ── 9. Animation Loop ── */
    const clock = new THREE.Clock();
    let frameId = 0;
    let blinkIn = 3.0;
    let blinkLeft = 0.0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Smooth progress lerp
      currentFractionRef.current +=
        (targetFractionRef.current - currentFractionRef.current) * Math.min(1, delta * 3.5);
      const t = currentFractionRef.current;

      // Update traveled neon road track range on GPU
      const activeSegments = Math.max(1, Math.min(200, Math.floor(t * 200)));
      trailMesh.geometry.setDrawRange(0, activeSegments * 6);

      // Position along 3D road curve
      const posOnCurve = ROAD_CURVE.getPointAt(t);
      const tangentOnCurve = ROAD_CURVE.getTangentAt(t).normalize();

      // Horizontal yaw angle along the road travel direction
      // Avatar face is on +Z in model space; atan2(x, z) points +Z along (x, z)
      const yawAngle = Math.atan2(tangentOnCurve.x, tangentOnCurve.z);

      // Height on the road (standing right on the asphalt surface + subtle hover bob)
      let avatarYOffset = 0.92 + Math.sin(elapsed * 3.2) * 0.06;

      // Celebration handling
      const cel = celebrationRef.current;
      if (cel.active) {
        cel.time += delta;
        const spinAngle = cel.time * 12.0;
        // Strictly vertical orientation around Y; ZERO TILT (rotation.x = 0, rotation.z = 0)
        avatarRoot.rotation.set(0, yawAngle + spinAngle, 0);
        avatarYOffset += Math.abs(Math.sin(cel.time * 8.0)) * 0.65; // Joyful victory hop

        if (sparklesRef.current) {
          sparklesRef.current.position.copy(posOnCurve).add(new THREE.Vector3(0, 1.2, 0));
          const pArr = sparkGeo.attributes.position.array as Float32Array;
          sparkMat.opacity = Math.max(0, 1.0 - cel.time / 2.2);
          for (let i = 0; i < sparkCount; i++) {
            pArr[i * 3] += sparkVelocities[i].x * delta;
            pArr[i * 3 + 1] += (sparkVelocities[i].y - 3.5 * cel.time) * delta;
            pArr[i * 3 + 2] += sparkVelocities[i].z * delta;
          }
          sparkGeo.attributes.position.needsUpdate = true;
        }

        if (cel.time > 2.2) {
          cel.active = false;
          sparkMat.opacity = 0;
        }
      } else {
        // Normal state: strictly vertical standing upright facing along the road (ZERO TILT)
        avatarRoot.rotation.set(0, yawAngle, 0);
      }

      // Position the avatar and aura light
      avatarRoot.position.set(posOnCurve.x, posOnCurve.y + avatarYOffset, posOnCurve.z);
      avatarAuraLight.position.set(posOnCurve.x, posOnCurve.y + 1.2, posOnCurve.z);

      // Position ground projection aura disc right on the road surface
      groundAura.position.set(posOnCurve.x, posOnCurve.y + 0.02, posOnCurve.z);
      groundAura.rotation.y = elapsed * 1.5;

      // Blink animation
      blinkIn -= delta;
      if (blinkIn <= 0) {
        blinkLeft = 0.12;
        blinkIn = 2.5 + Math.random() * 3.0;
      }
      blinkLeft -= delta;
      avatarParts.eyes.children.forEach(
        (eye) => (eye.scale.y = blinkLeft > 0 ? 0.12 : 1.0)
      );

      // Rotate goal trophy and checkpoint pins
      trophyCore.rotation.y = elapsed * 1.5;
      trophyCore.rotation.x = Math.sin(elapsed) * 0.3;
      trophyRing1.rotation.y = -elapsed * 0.8;
      trophyRing2.rotation.z = elapsed * 1.2;

      checkpointMetasRef.current.forEach((m) => {
        m.pinMesh.rotation.y = elapsed * 1.8;
      });

      // Camera positioning
      if (activeCameraModeRef.current === 'follow' && !isDraggingRef.current) {
        // Third-person camera tracking behind and above the avatar looking down the highway
        const fwdX = Math.sin(yawAngle);
        const fwdZ = Math.cos(yawAngle);
        const camOffset = new THREE.Vector3(-fwdX * 6.2, 3.6, -fwdZ * 6.2);
        cameraTargetPos.current.copy(posOnCurve).add(camOffset);
        cameraTargetLook.current.copy(posOnCurve).add(new THREE.Vector3(fwdX * 2.5, 0.8, fwdZ * 2.5));
      }

      // Auto-rotate if enabled
      if (autoRotateRef.current && !isDraggingRef.current) {
        orbitAnglesRef.current.theta += delta * 0.45;
        const r = orbitAnglesRef.current.radius;
        const th = orbitAnglesRef.current.theta;
        const ph = orbitAnglesRef.current.phi;
        cameraTargetPos.current.set(
          Math.sin(th) * Math.cos(ph) * r,
          Math.sin(ph) * r + 2,
          Math.cos(th) * Math.cos(ph) * r
        );
      }

      // Smooth camera lerp
      camera.position.lerp(cameraTargetPos.current, 0.06);

      // Smooth lookAt interpolation
      const currentLookAt = new THREE.Vector3();
      camera.getWorldDirection(currentLookAt);
      currentLookAt.multiplyScalar(10).add(camera.position);
      currentLookAt.lerp(cameraTargetLook.current, 0.08);
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);
    };

    animate();

    /* ── 10. Resize Observer ── */
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
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
      renderer.domElement.removeEventListener('click', handleClickCanvas);
      disposeObject(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      partsRef.current = null;
      avatarGroupRef.current = null;
    };
  }, [avatarConfig, numCheckpoints, target, unit, inspectCheckpoint, triggerCelebration]);

  /* ────────────────────────── DRAG & TOUCH CONTROLS ────────────────────────── */
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };

    orbitAnglesRef.current.theta -= dx * 0.009;
    orbitAnglesRef.current.phi = Math.max(0.08, Math.min(1.2, orbitAnglesRef.current.phi + dy * 0.007));

    const r = orbitAnglesRef.current.radius;
    const th = orbitAnglesRef.current.theta;
    const ph = orbitAnglesRef.current.phi;

    cameraTargetPos.current.set(
      cameraTargetLook.current.x + Math.sin(th) * Math.cos(ph) * r,
      cameraTargetLook.current.y + Math.sin(ph) * r,
      cameraTargetLook.current.z + Math.cos(th) * Math.cos(ph) * r
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    orbitAnglesRef.current.radius = Math.max(
      6,
      Math.min(32, orbitAnglesRef.current.radius + (e.deltaY > 0 ? 1.5 : -1.5))
    );
  };

  /* ── Checkpoints quick scrubber ── */
  const checkpointList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= numCheckpoints; i++) {
      const f = i / (numCheckpoints + 0.25);
      const isReached = fraction >= f;
      const milestoneVal = Math.round((target * (i / numCheckpoints)) * 10) / 10;
      const rewardText = rewards[i - 1]?.reward || `Milestone ${i} Reward`;
      list.push({
        index: i,
        fraction: f,
        value: milestoneVal,
        reached: isReached,
        reward: rewardText,
      });
    }
    return list;
  }, [numCheckpoints, target, fraction, rewards]);

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
      {/* 3D WebGL viewport canvas container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          flex: 1,
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      />

      {/* Floating 3D HUD Badge (Progress & Unit) */}
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

      {/* Floating Control Buttons */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          display: 'flex',
          gap: 8,
          zIndex: 10,
        }}
      >
        {/* Celebrate / Cheer Button */}
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

        {/* Focus Avatar Button */}
        <button
          type="button"
          onClick={viewAvatar}
          title="Follow 3D Companion"
          style={{
            background: activeCameraMode === 'follow' ? 'var(--brand)' : 'rgba(15, 23, 42, 0.85)',
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
          }}
        >
          <FiTarget />
        </button>

        {/* Panoramic Overview Button */}
        <button
          type="button"
          onClick={viewOverview}
          title="Full scenic overview"
          style={{
            background: activeCameraMode === 'overview' ? 'var(--brand)' : 'rgba(15, 23, 42, 0.85)',
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
          }}
        >
          <FiMaximize2 />
        </button>

        {/* Auto Rotate Toggle */}
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Cinematic Auto-Orbit"
          style={{
            background: autoRotate ? 'var(--brand)' : 'rgba(15, 23, 42, 0.85)',
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
          }}
        >
          <FiRotateCw />
        </button>
      </div>

      {/* Floating Bottom Quick-Jump Milestone Scrubber */}
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

        {/* Goal Trophy Chip */}
        <button
          type="button"
          onClick={() => {
            const endPt = ROAD_CURVE.getPointAt(1);
            cameraTargetLook.current.copy(endPt).add(new THREE.Vector3(0, 1.2, 0));
            cameraTargetPos.current.copy(endPt).add(new THREE.Vector3(0, 3.5, 6.0));
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
          <span>🏆 Finish ({target} {unit})</span>
        </button>
      </div>

      {/* Helpful Hint on desktop */}
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
