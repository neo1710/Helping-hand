'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Avatar, { AVATAR_CONFIGS } from '@/components/Avatar';

interface Goal {
  _id: string;
  name: string;
  target: number;
  unit: string;
  startDate: string;
  endDate: string;
  progress: number;
  avatarIndex: number;
  avatarTone: string;
  avatarSkin: string;
  avatarHair: 'short' | 'long' | 'bun' | 'curly';
  avatarHairColor: string;
  status: 'active' | 'completed' | 'abandoned';
  checkpoints: number;
  log: { amount: number; note: string; date: string }[];
}

function getStatus(goal: Goal): { label: string; color: string } {
  if (goal.status === 'completed') return { label: 'Completed ✓', color: '#3fcf8e' };
  if (goal.status === 'abandoned') return { label: 'Abandoned', color: '#ff7b7b' };

  const now = new Date();
  const end = new Date(goal.endDate);
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const pct = goal.target > 0 ? (goal.progress / goal.target) * 100 : 0;
  const totalDays = Math.ceil((end.getTime() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = totalDays - daysLeft;
  const expectedPct = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;

  if (pct >= expectedPct - 5) return { label: 'On Track 🟢', color: '#3fcf8e' };
  return { label: 'Behind 🔴', color: '#ff7b7b' };
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGoals = () => {
    fetch('/api/goals')
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || 'Failed to load goals.');
        } else {
          setGoals(data.goals || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to connect to goals service. Please check your database connection.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 44, flexWrap: 'wrap', gap: 16 }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-1px', marginBottom: 8 }}>
              My Goals
            </h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: 16 }}>
              {goals.length === 0 && !loading ? 'Start your first journey below.' : `${goals.length} goal${goals.length !== 1 ? 's' : ''} in progress`}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Link
              href="/goals/new"
              style={{
                background: 'var(--brand)',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 12,
                padding: '12px 24px',
                fontWeight: 700,
                fontSize: 15,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 0 24px rgba(59,130,246,0.35)',
              }}
            >
              + New Goal
            </Link>
          </motion.div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '3px solid var(--line)',
                borderTopColor: 'var(--brand)',
                boxShadow: '0 0 16px var(--neon-glow)',
              }}
            />
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div style={{
            background: 'rgba(255,123,123,0.1)',
            border: '1px solid rgba(255,123,123,0.3)',
            borderRadius: 14,
            padding: '20px 24px',
            color: '#ff7b7b',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{error}</p>
            <button
              onClick={() => { setError(''); setLoading(true); fetchGoals(); }}
              style={{
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && goals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              textAlign: 'center', padding: '80px 24px',
              background: 'var(--surface)',
              borderRadius: 24,
              border: '1px dashed var(--line-strong)',
            }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              style={{ fontSize: 72, marginBottom: 20 }}
            >
              🗺️
            </motion.div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>No goals set yet</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 16, marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
              Create your first goal, choose your avatar companion, and watch yourself advance along the roadmap!
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/goals/new"
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 12,
                  padding: '14px 32px',
                  fontWeight: 700,
                  fontSize: 16,
                  display: 'inline-block',
                  boxShadow: '0 0 24px rgba(59,130,246,0.4)',
                }}
              >
                Create Your First Goal →
              </Link>
            </motion.div>
          </motion.div>
        )}

        {/* Goals Grid */}
        {!loading && !error && goals.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {goals.map((goal, i) => {
              const pct = goal.target > 0 ? Math.round((goal.progress / goal.target) * 100) : 0;
              const daysLeft = Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const status = getStatus(goal);
              const av = AVATAR_CONFIGS[goal.avatarIndex] ?? AVATAR_CONFIGS[0];

              return (
                <motion.div
                  key={goal._id}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  whileHover={{ y: -5, boxShadow: `0 0 24px ${av.tone}33, 0 12px 32px rgba(0,0,0,0.45)` }}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 20,
                    padding: 28,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    cursor: 'pointer',
                    transition: 'border-color 0.25s, box-shadow 0.25s',
                  }}
                >
                  <Link
                    href={`/goals/${goal._id}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%', gap: 18 }}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontWeight: 700, fontSize: 18, color: 'var(--ink)',
                          marginBottom: 4, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {goal.name}
                        </h3>
                        <p style={{ color: 'var(--ink-subtle)', fontSize: 13 }}>
                          {goal.progress} / {goal.target} {goal.unit}
                        </p>
                      </div>
                      <div style={{ marginLeft: 12, flexShrink: 0 }}>
                        <div style={{
                          padding: 3, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${av.tone}, ${av.tone}88)`,
                          boxShadow: `0 0 12px ${av.tone}44`,
                        }}>
                          <Avatar {...av} size={52} />
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-subtle)', fontWeight: 600 }}>Progress</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: av.tone }}>{pct}%</span>
                      </div>
                      <div className="progress-bar">
                        <motion.div
                          className="progress-bar-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, pct)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{ background: `linear-gradient(90deg, ${av.tone}, #60a5fa)` }}
                        />
                      </div>
                    </div>

                    {/* Key stats row */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{
                        flex: 1, background: 'var(--surface-raised)', borderRadius: 12,
                        padding: '10px 12px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{pct}%</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-subtle)' }}>Done</div>
                      </div>
                      <div style={{
                        flex: 1, background: 'var(--surface-raised)', borderRadius: 12,
                        padding: '10px 12px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: daysLeft < 0 ? '#ff7b7b' : 'var(--ink)' }}>
                          {daysLeft < 0 ? 'Overdue' : `${daysLeft}d`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-subtle)' }}>Left</div>
                      </div>
                      <div style={{
                        flex: 1, background: 'var(--surface-raised)', borderRadius: 12,
                        padding: '10px 12px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-subtle)' }}>Status</div>
                      </div>
                    </div>

                    {/* Footer link */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 8, borderTop: '1px solid var(--line)', marginTop: 'auto',
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>
                        {goal.log.length} update{goal.log.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{
                        fontSize: 13, color: 'var(--brand)', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        View Journey →
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
