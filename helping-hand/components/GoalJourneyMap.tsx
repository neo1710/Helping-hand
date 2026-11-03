'use client';
import { useRef, useEffect, useState, useMemo } from 'react';
import { AVATAR_CONFIGS } from './Avatar';
import { motion, AnimatePresence } from 'framer-motion';

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
  avatarIndex: number;
  goalName: string;
  rewards?: CheckpointRewardItem[];
}

// ─── Road definition ────────────────────────────────────────────────────────
const ROAD_D = 'M90 455 C300 470 360 330 520 330 C680 330 720 440 860 390 C1000 340 930 170 1100 140';

// Cubic-Bézier segments (same curve, for arc-length sampling)
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

/** Build arc-length table once (300 pts per segment = 900 total) */
function buildArcTable() {
  const pts: Array<[number, number, number]> = [];   // [x, y, arcLen]
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

/** Return {x, y} for fraction f ∈ [0,1] using arc-length parameterisation */
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

// Star positions (stable, pre-computed)
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
  avatarIndex,
  rewards = [],
}: JourneyMapProps) {
  const av = AVATAR_CONFIGS[avatarIndex] ?? AVATAR_CONFIGS[0];

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

  // Clamp fraction
  const fraction = Math.min(1, Math.max(0, progress / 100));

  // Avatar position along the arc
  const pos = useMemo(() => posAt(fraction), [fraction]);

  // Trail dash
  const trailDash = `${fraction * pathLen} ${pathLen}`;

  // Checkpoint fractions (4 to 20 checkpoints distributed smoothly along road)
  const numCheckpoints = Math.min(20, Math.max(2, checkpoints || 4));
  const cpFractions = useMemo(() => {
    const cps: number[] = [];
    for (let i = 1; i <= numCheckpoints; i++) {
      // Scale fractions so the last checkpoint is close to but before 100% flag
      cps.push((i / (numCheckpoints + 0.25)));
    }
    return cps;
  }, [numCheckpoints]);

  const HAIR: Record<string, string> = {
    short: 'M15.4 19.5 C15.2 12.4 19.4 9.6 24 9.6 C29.2 9.6 32.8 12.6 32.6 18.6 C30.2 15.6 26.4 14.6 22.2 15.2 C19 15.6 16.9 17.2 15.4 19.5 Z',
    long:  'M14.8 28 C13.6 14 18 9.4 24 9.4 C30 9.4 34.4 14 33.2 28 C31.6 23 31.8 18.4 29.8 16.4 C26 17.2 21 16.8 18.2 16.4 C16.2 18.4 16.4 23 14.8 28 Z',
    bun:   'M15.4 19.5 C15.2 12.4 19.4 9.6 24 9.6 C29.2 9.6 32.8 12.6 32.6 18.6 C30.2 15.6 26.4 14.6 22.2 15.2 C19 15.6 16.9 17.2 15.4 19.5 Z M24 2.5 C26.6 2.5 28.4 4.3 28.4 6.6 C28.4 8.9 26.6 10.4 24 10.4 C21.4 10.4 19.6 8.9 19.6 6.6 C19.6 4.3 21.4 2.5 24 2.5 Z',
    curly: 'M15 20.5 C13 15 16 9 21 9.6 C23 7.4 28 7.8 30 10.6 C34 11.6 34.6 16.6 33 20.5 C31.4 16.6 28 15.2 24 15.2 C20 15.2 16.6 16.6 15 20.5 Z',
  };

  const toPercent = (x: number, y: number) => ({
    left: `${(x / 1200) * 100}%`,
    top:  `${(y / 520)  * 100}%`,
  });

  const avatarPct = toPercent(pos.x, pos.y);

  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--line)' }}>
      {/* ── Main SVG ── */}
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

        {/* ── Start dot ── */}
        <circle cx="90" cy="455" r="16" fill={av.tone} opacity="0.15" />
        <circle cx="90" cy="455" r="9"  fill="#1c2638" stroke={av.tone} strokeWidth="2" />
        <circle cx="90" cy="455" r="4"  fill={av.tone} />

        {/* ── Checkpoint markers (4 to 20) ── */}
        {cpFractions.map((f, i) => {
          const p = posAt(f);
          const reached = fraction >= f;
          const milestoneVal = Math.round((target * ((i + 1) / numCheckpoints)) * 10) / 10;
          const label = `${milestoneVal}${unit}`;
          const rewardText = rewards[i]?.reward || `Milestone ${i + 1} Reward 🎉`;
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

              {/* Gift icon for unlocked rewards */}
              {reached ? (
                <text x={p.x} y={labelY - 14} textAnchor="middle" fontSize="12">
                  🎁
                </text>
              ) : null}

              {/* Label pill background (shown for small counts or alternating for dense checkpoints) */}
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

        {/* ── Goal flag ── */}
        <g filter="url(#jm-flag-glow)">
          <circle cx="1100" cy="140" r="42" fill={av.tone} opacity="0.08" />
          <circle cx="1100" cy="140" r="28" fill="#1c2638" stroke={av.tone} strokeWidth="1.5" strokeOpacity="0.5" />
        </g>
        {/* Flagpole */}
        <line x1="1094" y1="154" x2="1094" y2="108" stroke="#e9ecf1" strokeWidth="2.5" strokeLinecap="round" />
        {/* Flag */}
        <path d="M1094 108 L1124 118 L1094 128 Z" fill={av.tone} />
        {/* Base */}
        <ellipse cx="1094" cy="155" rx="8" ry="3" fill="#0a1520" opacity="0.7" />
        {/* Labels */}
        <text x="1094" y="175" textAnchor="middle" fill={av.tone} fontSize="11" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="0.08em">GOAL</text>
        <text x="1094" y="190" textAnchor="middle" fill="#e9ecf1" fontSize="12" fontFamily="Inter, sans-serif" fontWeight="600">{target}{unit}</text>

        {/* Start label */}
        <text x="90" y="478" textAnchor="middle" fill="#7d8796" fontSize="11"
          fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.06em">START</text>
      </svg>

      {/* ── Avatar overlay (traveling smoothly along road) ── */}
      <div
        aria-label="Avatar position"
        style={{
          position: 'absolute',
          left: avatarPct.left,
          top:  avatarPct.top,
          transform: 'translate(-50%, calc(-100% - 6px))',
          transition: 'left 0.9s cubic-bezier(0.4,0,0.2,1), top 0.9s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div className="gt-bob" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {/* Label pill */}
          <div style={{
            padding: '3px 10px',
            borderRadius: 100,
            background: '#e9ecf1',
            color: '#12161c',
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
            letterSpacing: '0.02em',
          }}>
            {Math.round(fraction * target)}{unit}
          </div>

          {/* Avatar circle */}
          <div style={{ position: 'relative', width: 52, height: 52 }}>
            <div className="gt-pulse" style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: av.tone,
              opacity: 0.35,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: av.tone,
              padding: 3,
              boxSizing: 'border-box',
              boxShadow: `0 0 20px ${av.tone}66, 0 8px 24px rgba(0,0,0,0.5)`,
            }}>
              <div style={{
                width: '100%', height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#1b212b',
              }}>
                <svg viewBox="0 0 48 48" width="46" height="46" style={{ display: 'block' }}>
                  <rect width="48" height="48" fill="#1b212b" />
                  <path d="M8 50 C8 37 15 31.5 24 31.5 C33 31.5 40 37 40 50 Z" fill={av.tone} />
                  <circle cx="24" cy="20" r="8.5" fill={av.skin} />
                  <path d={HAIR[av.hairStyle] ?? HAIR.short} fill={av.hairColor} />
                  <ellipse cx="21" cy="20" rx="1.4" ry="1.7" fill="#1a1a2e" />
                  <ellipse cx="27" cy="20" rx="1.4" ry="1.7" fill="#1a1a2e" />
                  <circle cx="21.5" cy="19.3" r="0.5" fill="white" />
                  <circle cx="27.5" cy="19.3" r="0.5" fill="white" />
                </svg>
              </div>
            </div>
          </div>

          <div style={{
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `8px solid ${av.tone}`,
            marginTop: -6,
            filter: `drop-shadow(0 2px 4px ${av.tone}44)`,
          }} />
        </div>
      </div>

      {/* ── Interactive Milestone Reward Modal / Popover ── */}
      <AnimatePresence>
        {activeModalReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 30,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: `2px solid ${activeModalReward.reached ? '#3fcf8e' : 'var(--line)'}`,
              borderRadius: 20,
              padding: '24px 28px',
              maxWidth: 380,
              width: '90%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>
              {activeModalReward.reached ? '🎉' : '🔒'}
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
              {activeModalReward.reached
                ? '✓ Reached & Unlocked!'
                : `Locked — reach ${activeModalReward.value} ${unit} to unlock`}
            </p>

            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '14px 18px',
                border: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
                Designated Reward:
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                {activeModalReward.reward}
              </div>
            </div>

            <button
              onClick={() => setActiveModalReward(null)}
              style={{
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend strip ── */}
      <div style={{
        position: 'absolute',
        bottom: 10, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 16,
        background: 'rgba(5,10,18,0.75)',
        backdropFilter: 'blur(8px)',
        borderRadius: 100,
        padding: '6px 16px',
        border: '1px solid rgba(255,255,255,0.08)',
        pointerEvents: 'none',
      }}>
        {[
          { color: av.tone,   label: 'Travelled' },
          { color: '#3a4556', label: 'Road ahead' },
          { color: '#3fcf8e', label: 'Milestone Reward (Click pins)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 4, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 11, color: '#a3acba', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
