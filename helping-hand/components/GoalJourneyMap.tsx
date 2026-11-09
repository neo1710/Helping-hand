'use client';
import { useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Avatar, { AVATAR_CONFIGS, AvatarConfig } from './Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAward, FiLock, FiCheckCircle, FiBox, FiMap } from 'react-icons/fi';

// Dynamically load Three.js 3D Goal Journey on client side
const GoalJourney3DCanvas = dynamic(() => import('./GoalJourney3DCanvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        minHeight: 440,
        height: 'clamp(440px, 58vh, 600px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060d1a',
        borderRadius: 20,
        border: '1px solid var(--line)',
        color: 'var(--brand)',
        fontSize: 14,
        fontWeight: 700,
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid var(--brand)',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span>Initializing 3D Journey Studio...</span>
    </div>
  ),
});

export interface CheckpointRewardItem {
  checkpointIndex: number;
  milestoneValue?: number;
  reward: string;
}

interface JourneyMapProps {
  progress: number;   // 0–100 (percentage)
  target: number;
  unit: string;
  checkpoints: number;
  avatarIndex?: number;
  avatarConfig?: AvatarConfig;
  customAvatar?: {
    name?: string;
    tone?: string;
    skin?: string;
    hairStyle?: string;
    hairColor?: string;
    accessory?: string;
    expression?: string;
  };
  goalName: string;
  rewards?: CheckpointRewardItem[];
}

// ─── 2D Road definition ────────────────────────────────────────────────────────
const ROAD_D = 'M90 455 C300 470 360 330 520 330 C680 330 720 440 860 390 C1000 340 930 170 1100 140';

const SEGMENTS = [
  [[90,455],[300,470],[360,330],[520,330]],
  [[520,330],[680,330],[720,440],[860,390]],
  [[860,390],[1000,340],[930,170],[1100,140]],
] as const;

function bezierPt(seg: readonly (readonly number[])[], t: number): [number, number] {
  const [p0, p1, p2, p3] = seg;
  const u = 1 - t;
  return [
    u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
    u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
  ];
}

function buildArcTable() {
  const pts: Array<[number, number, number]> = [];
  let L = 0;
  let prev: [number, number] = [90, 455];
  pts.push([90, 455, 0]);
  for (const seg of SEGMENTS) {
    for (let i = 1; i <= 300; i++) {
      const p = bezierPt(seg, i / 300);
      L += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      pts.push([p[0], p[1], L]);
      prev = p;
    }
  }
  return { pts, total: L };
}

const ARC = buildArcTable();

function posAt(f: number): { x: number; y: number } {
  const clampedF = Math.min(1, Math.max(0, f));
  const target = clampedF * ARC.total;
  let lo = 0, hi = ARC.pts.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (ARC.pts[mid][2] < target) lo = mid; else hi = mid;
  }
  const [ax, ay, al] = ARC.pts[lo];
  const [bx, by, bl] = ARC.pts[hi];
  const k = bl === al ? 0 : (target - al) / (bl - al);
  return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k };
}

const STARS = Array.from({ length: 55 }, (_, i) => ({
  cx: 20 + (i * 137.508) % 1160,
  cy: 8  + (i * 73.137)  % 250,
  r:  i % 4 === 0 ? 1.6 : i % 3 === 0 ? 1.2 : 0.9,
  op: 0.25 + (i % 7) * 0.07,
}));

export default function GoalJourneyMap({
  progress,
  target,
  unit,
  checkpoints,
  avatarIndex = 0,
  avatarConfig,
  customAvatar,
  goalName,
  rewards = [],
}: JourneyMapProps) {
  // Use custom companion if defined, otherwise preset config
  const av = customAvatar?.skin || customAvatar?.tone
    ? {
        name: customAvatar.name || 'Hero',
        tone: customAvatar.tone || '#3b82f6',
        skin: customAvatar.skin || '#f0c4a0',
        hairStyle: customAvatar.hairStyle || 'short',
        hairColor: customAvatar.hairColor || '#2b2118',
        accessory: customAvatar.accessory || 'none',
        expression: customAvatar.expression || 'happy',
      }
    : avatarConfig || (AVATAR_CONFIGS[avatarIndex] ?? AVATAR_CONFIGS[0]);

  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(1500);
  const [activeModalReward, setActiveModalReward] = useState<{
    index: number;
    value: number;
    reward: string;
    reached: boolean;
  } | null>(null);

  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      if (len > 0) setPathLen(len);
    }
  }, []);

  const fraction = Math.min(1, Math.max(0, progress / 100));
  const pos = useMemo(() => posAt(fraction), [fraction]);
  const trailDash = `${fraction * pathLen} ${pathLen}`;

  const numCheckpoints = Math.min(20, Math.max(2, checkpoints || 4));
  const cpFractions = useMemo(() => {
    const cps: number[] = [];
    for (let i = 1; i <= numCheckpoints; i++) {
      cps.push(i / (numCheckpoints + 0.25));
    }
    return cps;
  }, [numCheckpoints]);

  const toPercent = (x: number, y: number) => ({
    left: `${(x / 1200) * 100}%`,
    top:  `${(y / 520)  * 100}%`,
  });

  const avatarPct = toPercent(pos.x, pos.y);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── View Mode Switcher Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: '2px 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: av.tone,
              boxShadow: `0 0 10px ${av.tone}`,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            {viewMode === '3d' ? '3D Journey World' : 'Classic 2D Roadmap'}
          </span>
          <span
            style={{
              fontSize: 12,
              color: 'var(--ink-muted)',
              fontWeight: 600,
            }}
          >
            • {Math.round(fraction * target)} of {target} {unit} ({Math.round(fraction * 100)}%)
          </span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            background: 'var(--surface-raised)',
            padding: 3,
            borderRadius: 12,
            border: '1px solid var(--line)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            style={{
              padding: '5px 12px',
              borderRadius: 9,
              border: 'none',
              background: viewMode === '3d' ? 'var(--brand)' : 'transparent',
              color: viewMode === '3d' ? '#fff' : 'var(--ink-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <FiBox style={{ fontSize: 13 }} />
            <span>3D World</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            style={{
              padding: '5px 12px',
              borderRadius: 9,
              border: 'none',
              background: viewMode === '2d' ? 'var(--brand)' : 'transparent',
              color: viewMode === '2d' ? '#fff' : 'var(--ink-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <FiMap style={{ fontSize: 13 }} />
            <span>2D Map</span>
          </button>
        </div>
      </div>

      {/* ── Main Roadmap View (3D or 2D) ── */}
      <div style={{ position: 'relative' }}>
        {viewMode === '3d' ? (
          <GoalJourney3DCanvas
            progress={progress}
            target={target}
            unit={unit}
            checkpoints={checkpoints}
            avatarConfig={av as AvatarConfig}
            goalName={goalName}
            rewards={rewards}
            onSelectCheckpoint={(info) => setActiveModalReward(info)}
          />
        ) : (
          <div
            style={{
              position: 'relative',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid var(--line)',
              background: '#060d1a',
              paddingTop: 16,
            }}
          >
            <svg
              viewBox="0 0 1200 520"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              preserveAspectRatio="xMidYMid meet"
              aria-label="Goal journey map"
            >
              <defs>
                <linearGradient id="jm-sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#03060f" />
                  <stop offset="60%"  stopColor="#060d1a" />
                  <stop offset="100%" stopColor="#0d1828" />
                </linearGradient>

                <linearGradient id="jm-trail" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor={av.tone}   stopOpacity="0.4" />
                  <stop offset="60%"  stopColor="#60a5fa"   stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#a5f3fc"   stopOpacity="1"   />
                </linearGradient>

                <filter id="jm-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>

                <filter id="jm-flag-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Sky */}
              <rect width="1200" height="520" fill="url(#jm-sky)" />

              {/* Stars */}
              {STARS.map((s, i) => (
                <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.op} />
              ))}

              {/* Moon */}
              <circle cx="1100" cy="60" r="28" fill="#e9ecf1" opacity="0.07" />
              <circle cx="1113" cy="54" r="22" fill="#060d1a" opacity="1" />

              {/* Far hills */}
              <path d="M0 360 Q150 290 320 330 Q480 270 660 320 Q840 270 1020 310 Q1120 290 1200 305 L1200 520 L0 520 Z"
                fill="#0c1520" opacity="0.9" />
              {/* Mid hills */}
              <path d="M0 410 Q200 370 400 395 Q580 360 780 390 Q960 360 1200 385 L1200 520 L0 520 Z"
                fill="#0e1a27" opacity="0.95" />
              {/* Ground */}
              <path d="M0 468 Q300 455 600 468 Q900 458 1200 468 L1200 520 L0 520 Z"
                fill="#0a1520" />

              {/* Road: shadow border */}
              <path d={ROAD_D} fill="none" stroke="#050a12" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
              {/* Road: surface */}
              <path d={ROAD_D} fill="none" stroke="#1c2638" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
              {/* Road: lane markings */}
              <path d={ROAD_D} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2"
                strokeDasharray="22 28" strokeLinecap="round" />

              {/* Trail glow (wide, soft) */}
              <path
                d={ROAD_D}
                fill="none"
                stroke="url(#jm-trail)"
                strokeWidth="22"
                strokeLinecap="round"
                strokeOpacity="0.18"
                strokeDasharray={trailDash}
                filter="url(#jm-glow)"
                style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)' }}
              />
              {/* Trail core (sharp) */}
              <path
                ref={pathRef}
                d={ROAD_D}
                fill="none"
                stroke="url(#jm-trail)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={trailDash}
                filter="url(#jm-glow)"
                style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)' }}
              />

              {/* Start dot */}
              <circle cx="90" cy="455" r="16" fill={av.tone} opacity="0.15" />
              <circle cx="90" cy="455" r="9"  fill="#1c2638" stroke={av.tone} strokeWidth="2" />
              <circle cx="90" cy="455" r="4"  fill={av.tone} />

              {/* Checkpoint markers */}
              {cpFractions.map((f, i) => {
                const p = posAt(f);
                const reached = fraction >= f;
                const milestoneVal = Math.round((target * ((i + 1) / numCheckpoints)) * 10) / 10;
                const label = `${milestoneVal}${unit}`;
                const rewardText = rewards[i]?.reward || `Milestone ${i + 1} Reward`;
                const labelY = p.y - 20;

                return (
                  <g
                    key={i}
                    onClick={() =>
                      setActiveModalReward({
                        index: i + 1,
                        value: milestoneVal,
                        reward: rewardText,
                        reached,
                      })
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={p.x} cy={p.y} r="24" fill="transparent" />

                    {reached && (
                      <circle cx={p.x} cy={p.y} r="18" fill={av.tone} opacity="0.25" />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={reached ? 11 : 9}
                      fill={reached ? av.tone : '#1c2638'}
                      stroke={reached ? '#fff' : '#3a4556'}
                      strokeWidth={reached ? '2.5' : '1.5'}
                      style={{
                        filter: reached ? `drop-shadow(0 0 10px ${av.tone})` : 'none',
                        transition: 'all 0.5s ease',
                      }}
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={reached ? 5 : 3.5}
                      fill={reached ? '#fff' : '#6b7280'}
                      style={{ transition: 'fill 0.5s ease' }}
                    />

                    {reached ? (
                      <g transform={`translate(${p.x - 6}, ${labelY - 24})`}>
                        <polygon
                          points="6,1 7.8,4.8 12,5.2 8.8,8.2 9.7,12.3 6,10.2 2.3,12.3 3.2,8.2 0,5.2 4.2,4.8"
                          fill="#ffd166"
                          filter="drop-shadow(0 0 6px #ffd166)"
                        />
                      </g>
                    ) : null}

                    {(numCheckpoints <= 10 || i % 2 === 0 || i === numCheckpoints - 1) && (
                      <>
                        <rect
                          x={p.x - 22}
                          y={labelY - 12}
                          width={44}
                          height={16}
                          rx={8}
                          fill={reached ? av.tone : '#1c2638'}
                          stroke={reached ? '#fff' : '#3a4556'}
                          strokeWidth="1"
                          opacity={reached ? 0.95 : 0.85}
                        />
                        <text
                          x={p.x}
                          y={labelY - 1}
                          textAnchor="middle"
                          fill={reached ? '#fff' : '#9ca3af'}
                          fontSize="9.5"
                          fontFamily="Inter, sans-serif"
                          fontWeight="700"
                        >
                          {label}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* Goal flag */}
              <g filter="url(#jm-flag-glow)">
                <circle cx="1100" cy="140" r="42" fill={av.tone} opacity="0.08" />
                <circle cx="1100" cy="140" r="28" fill="#1c2638" stroke={av.tone} strokeWidth="1.5" strokeOpacity="0.5" />
              </g>
              <line x1="1094" y1="154" x2="1094" y2="108" stroke="#e9ecf1" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M1094 108 L1124 118 L1094 128 Z" fill={av.tone} />
              <ellipse cx="1094" cy="155" rx="8" ry="3" fill="#0a1520" opacity="0.7" />
              <text x="1094" y="175" textAnchor="middle" fill={av.tone} fontSize="11" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="0.08em">GOAL</text>
              <text x="1094" y="190" textAnchor="middle" fill="#e9ecf1" fontSize="12" fontFamily="Inter, sans-serif" fontWeight="600">{target}{unit}</text>

              <text x="90" y="478" textAnchor="middle" fill="#7d8796" fontSize="11"
                fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.06em">START</text>
            </svg>

            {/* Responsive Avatar Overlay on 2D */}
            <div
              aria-label="Avatar position"
              style={{
                position: 'absolute',
                left: avatarPct.left,
                top: avatarPct.top,
                transform: 'translate(-50%, calc(-100% - 4px))',
                transition: 'left 0.9s cubic-bezier(0.4,0,0.2,1), top 0.9s cubic-bezier(0.4,0,0.2,1)',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <div className="gt-bob" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div
                  style={{
                    padding: '2px 8px',
                    borderRadius: 100,
                    background: '#e9ecf1',
                    color: '#12161c',
                    fontSize: 'clamp(9px, 2vw, 11px)',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {Math.round(fraction * target)}{unit}
                </div>

                <div
                  style={{
                    position: 'relative',
                    width: 'clamp(38px, 5.5vw, 50px)',
                    height: 'clamp(38px, 5.5vw, 50px)',
                  }}
                >
                  <div
                    className="gt-pulse"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: av.tone,
                      opacity: 0.35,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: av.tone,
                      padding: 2.5,
                      boxSizing: 'border-box',
                      boxShadow: `0 0 16px ${av.tone}66, 0 6px 20px rgba(0,0,0,0.5)`,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#1b212b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Avatar config={av} size={48} />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `7px solid ${av.tone}`,
                    marginTop: -4,
                    filter: `drop-shadow(0 2px 4px ${av.tone}44)`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Interactive Milestone Reward Modal (Works for both 3D & 2D) ── */}
        <AnimatePresence>
          {activeModalReward && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 40,
                padding: 16,
              }}
              onClick={() => setActiveModalReward(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'rgba(20, 25, 32, 0.98)',
                  border: `2px solid ${activeModalReward.reached ? '#3fcf8e' : 'var(--line)'}`,
                  borderRadius: 20,
                  padding: '24px 20px',
                  maxWidth: 380,
                  width: '100%',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  {activeModalReward.reached ? (
                    <FiAward style={{ fontSize: 44, color: '#3fcf8e' }} />
                  ) : (
                    <FiLock style={{ fontSize: 44, color: '#f59e0b' }} />
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  Checkpoint {activeModalReward.index} ({activeModalReward.value} {unit})
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: activeModalReward.reached ? '#3fcf8e' : '#f59e0b',
                    marginBottom: 16,
                  }}
                >
                  {activeModalReward.reached ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <FiCheckCircle style={{ fontSize: 14 }} />
                      <span>Reached & Unlocked!</span>
                    </span>
                  ) : (
                    `Locked — reach ${activeModalReward.value} ${unit} to unlock`
                  )}
                </p>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: 18,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
                    Designated Reward:
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', wordBreak: 'break-word' }}>
                    {activeModalReward.reward}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalReward(null)}
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  Got it
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Responsive Legend Strip (Beneath Map) ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '8px 16px',
          padding: '8px 12px',
          background: 'var(--surface-raised)',
          borderRadius: 12,
          border: '1px solid var(--line)',
        }}
      >
        {[
          { color: av.tone, label: 'Traveled Route' },
          { color: '#334763', label: 'Path Ahead' },
          { color: '#ffd166', label: 'Unlocked Milestones' },
          { color: '#f59e0b', label: 'Upcoming Rewards (Tap pins)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 4, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--ink-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
