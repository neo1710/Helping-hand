'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Avatar, { AVATAR_CONFIGS } from '@/components/Avatar';

interface Goal {
  _id: string;
  name: string;
  description?: string;
  goalType: 'personal' | 'collaborative' | 'competitive' | 'open';
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
  rewards?: { checkpointIndex: number; reward: string }[];
  creator?: {
    _id: string;
    username: string;
    name: string;
    picture?: string;
  };
  members?: { auth0Id: string; status: string }[];
  log: { amount: number; note: string; date: string }[];
}

const TAB_OPTIONS = [
  { id: 'all', label: 'All Goals', icon: '🌟' },
  { id: 'my', label: 'My Journeys', icon: '👤' },
  { id: 'collaborative', label: 'Collaborative', icon: '🤝' },
  { id: 'competitive', label: 'Competitive', icon: '🏆' },
  { id: 'open', label: 'Open Challenges', icon: '🌐' },
];

function getStatus(goal: Goal): { label: string; color: string } {
  if (goal.status === 'completed') return { label: 'Completed ✓', color: '#3fcf8e' };
  if (goal.status === 'abandoned') return { label: 'Abandoned', color: '#ff7b7b' };

  const now = new Date();
  const end = new Date(goal.endDate);

  if (goal.goalType === 'open' && now > end) {
    return { label: 'Expired ⌛', color: '#9ca3af' };
  }

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
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const fetchGoals = (type = 'all') => {
    setLoading(true);
    fetch(`/api/goals?type=${type}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || 'Failed to load goals.');
        } else {
          setGoals(data.goals || []);
          if (data.currentUserId) setCurrentUserId(data.currentUserId);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to connect to goals service. Please check your database connection.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGoals(activeTab);
  }, [activeTab]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-1px', marginBottom: 8 }}>
              Goal Journeys
            </h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: 16 }}>
              Personal milestones, team collaboration, friendly competitions, and open challenges.
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
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 0 24px var(--neon-glow)',
              }}
            >
              + Create New Goal
            </Link>
          </motion.div>
        </div>

        {/* Tab Filters */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 8,
            marginBottom: 36,
          }}
        >
          {TAB_OPTIONS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: `1.5px solid ${isActive ? 'var(--brand)' : 'var(--line)'}`,
                  background: isActive ? 'var(--brand-soft)' : 'var(--surface)',
                  color: isActive ? 'var(--brand)' : 'var(--ink-muted)',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Notice */}
        {error && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              marginBottom: 32,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '3px solid var(--line)',
                borderTopColor: 'var(--brand)',
              }}
            />
          </div>
        )}

        {/* Empty State */}
        {!loading && goals.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              background: 'var(--surface)',
              borderRadius: 20,
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              No goals found in this view
            </h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 15, maxWidth: 460, margin: '0 auto 24px' }}>
              Create your first personal milestone, set up a collaborative team challenge, or join open community goals.
            </p>
            <Link
              href="/goals/new"
              style={{
                background: 'var(--brand)',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: 12,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
                display: 'inline-block',
              }}
            >
              + Create Your First Goal
            </Link>
          </div>
        )}

        {/* Goals Grid */}
        {!loading && goals.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 24,
            }}
          >
            {goals.map((goal, idx) => {
              const statusInfo = getStatus(goal);
              const pct = goal.target > 0 ? Math.min(100, Math.round((goal.progress / goal.target) * 100)) : 0;
              const daysLeft = Math.max(0, Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const av = AVATAR_CONFIGS[goal.avatarIndex] || AVATAR_CONFIGS[0];
              const memberCount = goal.members?.filter(m => m.status === 'active').length || 1;
              const numCheckpoints = goal.checkpoints || 4;

              const goalTypeIcon =
                goal.goalType === 'collaborative'
                  ? '🤝'
                  : goal.goalType === 'competitive'
                  ? '🏆'
                  : goal.goalType === 'open'
                  ? '🌐'
                  : '🎯';

              return (
                <motion.div
                  key={goal._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                  whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 20,
                    border: '1px solid var(--line)',
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div>
                    {/* Top Badge Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: 'var(--brand-soft)',
                          color: 'var(--brand)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          textTransform: 'capitalize',
                        }}
                      >
                        <span>{goalTypeIcon}</span>
                        <span>{goal.goalType || 'Personal'}</span>
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: 'var(--bg)',
                          color: statusInfo.color,
                          border: '1px solid var(--line)',
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Goal Title & Creator */}
                    <Link
                      href={`/goals/${goal._id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <h2
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: 'var(--ink)',
                          marginBottom: 6,
                          letterSpacing: '-0.3px',
                        }}
                      >
                        {goal.name}
                      </h2>
                    </Link>

                    {goal.creator?.username && (
                      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 12 }}>
                        by <span style={{ color: 'var(--brand)', fontWeight: 600 }}>@{goal.creator.username}</span>
                      </div>
                    )}

                    {goal.description && (
                      <p
                        style={{
                          fontSize: 13,
                          color: 'var(--ink-muted)',
                          marginBottom: 16,
                          lineHeight: 1.45,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {goal.description}
                      </p>
                    )}

                    {/* Checkpoints & Rewards Badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg)',
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: '1px solid var(--line)',
                        marginBottom: 18,
                        fontSize: 12,
                        color: 'var(--ink)',
                        fontWeight: 600,
                      }}
                    >
                      <span>🎁</span>
                      <span>{numCheckpoints} Checkpoints & Custom Rewards</span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: 'var(--ink-muted)' }}>Progress</span>
                        <strong style={{ color: 'var(--ink)' }}>
                          {goal.progress} / {goal.target} {goal.unit} ({pct}%)
                        </strong>
                      </div>
                      <div
                        style={{
                          background: 'var(--bg)',
                          borderRadius: 8,
                          height: 8,
                          width: '100%',
                          overflow: 'hidden',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div
                          style={{
                            background: 'linear-gradient(90deg, var(--brand), #60a5fa)',
                            width: `${pct}%`,
                            height: '100%',
                            borderRadius: 8,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Card Info & Action */}
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar config={av} size={32} />
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                          {goal.goalType !== 'personal' ? `${memberCount} participant${memberCount > 1 ? 's' : ''}` : 'Solo Journey'}
                          <div>{daysLeft} days left</div>
                        </div>
                      </div>

                      <Link
                        href={`/goals/${goal._id}`}
                        style={{
                          background: 'var(--brand-soft)',
                          color: 'var(--brand)',
                          textDecoration: 'none',
                          padding: '7px 14px',
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: 13,
                          transition: 'all 0.2s',
                        }}
                      >
                        View Journey →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
