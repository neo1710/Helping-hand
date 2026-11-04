'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FiTarget,
  FiUsers,
  FiAward,
  FiGlobe,
  FiGift,
  FiCheck,
  FiCheckCircle,
  FiArrowLeft,
  FiAlertCircle,
  FiMinus,
  FiPlus,
  FiCalendar,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import Navbar from '@/components/Navbar';
import Avatar, { AvatarConfig } from '@/components/Avatar';

const UNITS = ['km', 'hours', 'books', 'sessions', '₹', 'steps', 'pages', 'reps', 'kg'];

const DEADLINE_PRESETS = [
  { label: '+7 Days', days: 7 },
  { label: '+14 Days', days: 14 },
  { label: '+30 Days', days: 30 },
  { label: '+60 Days', days: 60 },
  { label: '+90 Days', days: 90 },
  { label: '+1 Year', days: 365 },
];

const CHECKPOINT_PRESETS = [4, 6, 8, 10, 12, 16, 20];

const GOAL_TYPES = [
  {
    type: 'personal',
    title: 'Personal Goal',
    icon: FiTarget,
    desc: 'Solo journey private to you. Track your personal milestones and unlock rewards.',
    tag: 'Solo',
  },
  {
    type: 'collaborative',
    title: 'Collaborative Goal',
    icon: FiUsers,
    desc: 'Work together towards one shared target! Team members contribute together.',
    tag: 'Teamwork',
  },
  {
    type: 'competitive',
    title: 'Competitive Goal',
    icon: FiAward,
    desc: 'Compete individually with friends! Live rankings & leaderboard show who leads.',
    tag: 'Leaderboard',
  },
  {
    type: 'open',
    title: 'Open Goal',
    icon: FiGlobe,
    desc: 'Public challenge anyone can join instantly. Disappears after deadline.',
    tag: 'Public Event',
  },
] as const;

const DEFAULT_REWARD_IDEAS = [
  'Premium specialty coffee treat',
  'Watch a favorite movie / gaming session',
  'Cheat meal celebration dinner',
  'Treat yourself to new fitness gear or shoes',
  'Buy a new book or course',
  'Relaxing massage / spa day',
  'High quality headphones / accessory',
  'Weekend getaway / adventure day trip',
  'Delicious dessert from top bakery',
  'Big victory celebration party with friends',
];

export default function NewGoalPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    description: '',
    goalType: 'personal' as 'personal' | 'collaborative' | 'competitive' | 'open',
    accessType: 'public' as 'public' | 'invite_only',
    target: '',
    unit: 'km',
    startDate: '',
    endDate: '',
    checkpoints: 4,
  });

  const [customAvatar, setCustomAvatar] = useState<AvatarConfig | null>(null);

  const [rewards, setRewards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch custom avatar if created
  useEffect(() => {
    async function loadUserAvatar() {
      try {
        const res = await fetch('/api/user/avatar');
        const data = await res.json();
        if (res.ok && data.customAvatar) {
          setCustomAvatar(data.customAvatar);
        }
      } catch (e) {
        console.warn('Error loading custom avatar:', e);
      }
    }
    loadUserAvatar();
  }, []);

  useEffect(() => {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 30);

    setForm(prev => ({
      ...prev,
      startDate: today.toISOString().split('T')[0],
      endDate: future.toISOString().split('T')[0],
    }));
  }, []);

  useEffect(() => {
    setRewards(prev => {
      const updated = [...prev];
      for (let i = 0; i < form.checkpoints; i++) {
        if (!updated[i]) {
          const suggestion = DEFAULT_REWARD_IDEAS[i % DEFAULT_REWARD_IDEAS.length];
          updated[i] = `Checkpoint ${i + 1}: ${suggestion}`;
        }
      }
      return updated.slice(0, form.checkpoints);
    });
  }, [form.checkpoints]);

  const handleRewardChange = (index: number, val: string) => {
    setRewards(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleAutofillRewards = () => {
    const filled: string[] = [];
    for (let i = 0; i < form.checkpoints; i++) {
      const idea = DEFAULT_REWARD_IDEAS[i % DEFAULT_REWARD_IDEAS.length];
      filled.push(idea);
    }
    setRewards(filled);
  };

  const setDeadlineDays = (days: number) => {
    const base = form.startDate ? new Date(form.startDate) : new Date();
    const target = new Date(base);
    target.setDate(base.getDate() + days);
    setForm(f => ({ ...f, endDate: target.toISOString().split('T')[0] }));
  };

  const handleStepCheckpoints = (delta: number) => {
    setForm(f => ({
      ...f,
      checkpoints: Math.min(20, Math.max(4, f.checkpoints + delta)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Please enter a goal name.');
      return;
    }
    if (!form.target || Number(form.target) <= 0) {
      setError('Please enter a valid target greater than 0.');
      return;
    }
    if (!form.endDate) {
      setError('Please set a deadline.');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError('Deadline must be after the start date.');
      return;
    }
    if (form.checkpoints < 4 || form.checkpoints > 20) {
      setError('Checkpoints must be between 4 and 20.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          goalType: form.goalType,
          accessType: form.goalType === 'personal' ? 'invite_only' : form.goalType === 'open' ? 'public' : form.accessType,
          target: Number(form.target),
          unit: form.unit,
          startDate: form.startDate,
          endDate: form.endDate,
          checkpoints: form.checkpoints,
          rewards: rewards.map((r, idx) => ({
            checkpointIndex: idx + 1,
            reward: r.trim() || `Milestone ${idx + 1} Reward!`,
          })),
          customAvatar: customAvatar || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create goal.');
        setLoading(false);
        return;
      }

      router.push(`/goals/${data.goal._id}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: 'clamp(14px, 3.5vw, 40px) clamp(10px, 3vw, 24px) 100px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/goals"
            style={{
              color: 'var(--ink-muted)',
              textDecoration: 'none',
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            <FiArrowLeft />
            <span>Back to Goals</span>
          </Link>
          <h1
            style={{
              fontSize: 'clamp(22px, 5.5vw, 36px)',
              fontWeight: 800,
              color: 'var(--ink)',
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            Create a New Goal
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 6, fontSize: 'clamp(13px, 2.5vw, 15px)', lineHeight: 1.45 }}>
            Choose your goal type, customize 4 to 20 milestone rewards, and begin your journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'clamp(14px, 3vw, 20px)' }}>
          {/* 1. Goal Type Selection */}
          <div className="form-card">
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 800, color: 'var(--ink)', fontSize: 'clamp(15px, 4vw, 16px)' }}>
                1. Select Goal Type <span style={{ color: 'var(--brand)' }}>*</span>
              </label>
              <p style={{ color: 'var(--ink-muted)', fontSize: 12.5, marginTop: 4 }}>
                Choose personal solo, team collaborative, competitive rankings, or open public challenge.
              </p>
            </div>

            <div className="grid-responsive-2col">
              {GOAL_TYPES.map(gt => {
                const isSelected = form.goalType === gt.type;
                const Icon = gt.icon;
                return (
                  <motion.div
                    key={gt.type}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setForm(f => ({ ...f, goalType: gt.type }))}
                    style={{
                      padding: 'clamp(12px, 2.5vw, 16px)',
                      borderRadius: 14,
                      border: `2px solid ${isSelected ? 'var(--brand)' : 'var(--line)'}`,
                      background: isSelected ? 'var(--brand-soft)' : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              background: isSelected ? 'var(--brand)' : 'var(--surface-raised)',
                              color: isSelected ? '#fff' : 'var(--brand)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                              flexShrink: 0,
                            }}
                          >
                            <Icon />
                          </div>
                          <span style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 'clamp(14px, 3.8vw, 15px)', wordBreak: 'break-word' }}>
                            {gt.title}
                          </span>
                        </div>

                        <div style={{ flexShrink: 0, marginTop: 4 }}>
                          {isSelected ? (
                            <FiCheckCircle style={{ color: 'var(--brand)', fontSize: 18 }} />
                          ) : (
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                border: '1.5px solid var(--line-strong)',
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                        {gt.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 20,
                          background: isSelected ? 'var(--brand)' : 'var(--surface)',
                          color: isSelected ? '#fff' : 'var(--ink-muted)',
                        }}
                      >
                        {gt.tag}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Access Mode Selector for Collaborative / Competitive */}
            {(form.goalType === 'collaborative' || form.goalType === 'competitive') && (
              <div
                style={{
                  marginTop: 14,
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: 'var(--bg)',
                  borderRadius: 14,
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontWeight: 800, color: 'var(--ink)', fontSize: 13.5 }}>
                    Access & Visibility Mode
                  </label>
                  <p style={{ color: 'var(--ink-muted)', fontSize: 12, marginTop: 2 }}>
                    Choose whether this {form.goalType} goal appears in the Public feed or stays hidden as Invite-Only.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                    gap: 10,
                  }}
                >
                  <div
                    onClick={() => setForm(f => ({ ...f, accessType: 'public' }))}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${form.accessType === 'public' ? 'var(--brand)' : 'var(--line)'}`,
                      background: form.accessType === 'public' ? 'var(--brand-soft)' : 'var(--surface)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                        Public Goal
                      </span>
                      {form.accessType === 'public' && <FiCheckCircle style={{ color: 'var(--brand)', fontSize: 16, flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', margin: 0, lineHeight: 1.4 }}>
                      Visible in Public Goals feed. Anyone can discover it and request to join.
                    </p>
                  </div>

                  <div
                    onClick={() => setForm(f => ({ ...f, accessType: 'invite_only' }))}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${form.accessType === 'invite_only' ? 'var(--brand)' : 'var(--line)'}`,
                      background: form.accessType === 'invite_only' ? 'var(--brand-soft)' : 'var(--surface)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                        Invite-Only Goal
                      </span>
                      {form.accessType === 'invite_only' && <FiCheckCircle style={{ color: 'var(--brand)', fontSize: 16, flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', margin: 0, lineHeight: 1.4 }}>
                      Hidden from the public feed. People can only join if you send them an invite.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Goal Details */}
          <div className="form-card" style={{ display: 'grid', gap: 'clamp(12px, 2.5vw, 16px)' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 'clamp(15px, 4vw, 16px)' }}>
              2. Goal Details & Schedule
            </h2>

            {/* Goal Name */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontSize: 13.5 }}>
                Goal Name <span style={{ color: 'var(--brand)' }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Marathon Training, Read 20 Books, 100 Days of Code"
                maxLength={120}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: 15,
                  outline: 'none',
                  minHeight: 46,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontSize: 13.5 }}>
                Description & Purpose (Optional)
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Why is this goal important? What are the ground rules for your team or participants?"
                rows={2}
                maxLength={400}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Target & Unit */}
            <div className="grid-responsive-2col">
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontSize: 13.5 }}>
                  Target Metric Value <span style={{ color: 'var(--brand)' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                  placeholder="e.g. 100"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: 15,
                    outline: 'none',
                    minHeight: 46,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontSize: 13.5 }}>
                  Unit of Measurement <span style={{ color: 'var(--brand)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. km, books, hours"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: 15,
                    outline: 'none',
                    minHeight: 46,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Quick Unit Selector Pills */}
            <div>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'block', marginBottom: 6 }}>
                Quick unit presets:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {UNITS.map(u => {
                  const isActive = form.unit.toLowerCase() === u.toLowerCase();
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, unit: u }))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: `1px solid ${isActive ? 'var(--brand)' : 'var(--line)'}`,
                        background: isActive ? 'var(--brand)' : 'var(--surface-raised)',
                        color: isActive ? '#fff' : 'var(--ink-muted)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {u}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates */}
            <div className="grid-responsive-2col">
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontSize: 13.5 }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: 15,
                    outline: 'none',
                    minHeight: 46,
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontSize: 13.5 }}>
                  Deadline Date <span style={{ color: 'var(--brand)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: 15,
                    outline: 'none',
                    minHeight: 46,
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                  }}
                />
              </div>
            </div>

            {/* Quick Deadline Pills */}
            <div>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'block', marginBottom: 6 }}>
                Quick deadline presets from start date:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DEADLINE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDeadlineDays(p.days)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: '1px solid var(--line)',
                      background: 'var(--surface-raised)',
                      color: 'var(--ink-muted)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FiCalendar style={{ fontSize: 11, flexShrink: 0 }} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.goalType === 'open' && (
              <p style={{ fontSize: 12.5, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '10px 14px', borderRadius: 10, lineHeight: 1.45 }}>
                Note: Open challenges automatically disappear from the active feed once this deadline passes!
              </p>
            )}
          </div>

          {/* 3. Checkpoints & Rewards Configuration */}
          <div className="form-card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div style={{ flex: '1 1 200px' }}>
                <h2 style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 'clamp(15px, 4vw, 16px)' }}>
                  3. Checkpoints & Rewards
                </h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: 12.5, marginTop: 2 }}>
                  Set 4 to 20 milestone checkpoints and custom reward unlocks.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutofillRewards}
                style={{
                  background: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  border: '1px solid var(--brand)',
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: 38,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  alignSelf: 'flex-start',
                }}
              >
                <HiSparkles style={{ fontSize: 14, flexShrink: 0 }} />
                <span>Auto-fill Ideas</span>
              </button>
            </div>

            {/* Stepper & Slider Box */}
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 14,
                padding: 'clamp(12px, 3vw, 16px)',
                border: '1px solid var(--line)',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 'clamp(13px, 3.5vw, 14px)' }}>
                  Total Milestones:
                </span>

                {/* Touch Stepper Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => handleStepCheckpoints(-1)}
                    disabled={form.checkpoints <= 4}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      border: '1px solid var(--line)',
                      background: 'var(--surface-raised)',
                      color: form.checkpoints <= 4 ? 'var(--ink-subtle)' : 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: form.checkpoints <= 4 ? 'not-allowed' : 'pointer',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                    aria-label="Decrease checkpoints"
                  >
                    <FiMinus />
                  </button>

                  <span
                    style={{
                      background: 'var(--brand)',
                      color: '#fff',
                      padding: '6px 14px',
                      borderRadius: 16,
                      fontWeight: 800,
                      fontSize: 13.5,
                      minWidth: 84,
                      textAlign: 'center',
                    }}
                  >
                    {form.checkpoints} Points
                  </span>

                  <button
                    type="button"
                    onClick={() => handleStepCheckpoints(1)}
                    disabled={form.checkpoints >= 20}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      border: '1px solid var(--line)',
                      background: 'var(--surface-raised)',
                      color: form.checkpoints >= 20 ? 'var(--ink-subtle)' : 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: form.checkpoints >= 20 ? 'not-allowed' : 'pointer',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                    aria-label="Increase checkpoints"
                  >
                    <FiPlus />
                  </button>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="4"
                max="20"
                step="1"
                value={form.checkpoints}
                onChange={e => setForm(f => ({ ...f, checkpoints: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer', height: 26 }}
              />

              {/* Quick Milestone Chips */}
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', display: 'block', marginBottom: 6 }}>
                  Quick milestone presets:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CHECKPOINT_PRESETS.map(num => {
                    const isActive = form.checkpoints === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, checkpoints: num }))}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          border: `1px solid ${isActive ? 'var(--brand)' : 'var(--line)'}`,
                          background: isActive ? 'var(--brand-soft)' : 'var(--surface)',
                          color: isActive ? 'var(--brand)' : 'var(--ink-muted)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {num} {num === 4 ? '(Min)' : num === 20 ? '(Max)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* List of Checkpoints & Rewards */}
            <div style={{ display: 'grid', gap: 10 }}>
              {Array.from({ length: form.checkpoints }).map((_, idx) => {
                const targetNum = Number(form.target) || 100;
                const milestoneVal = Math.round((targetNum * ((idx + 1) / form.checkpoints)) * 10) / 10;
                const pct = Math.round(((idx + 1) / form.checkpoints) * 100);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      background: 'var(--bg)',
                      padding: 'clamp(10px, 2.5vw, 14px)',
                      borderRadius: 12,
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--brand-soft)',
                            color: 'var(--brand)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11.5,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                          Checkpoint {idx + 1}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', background: 'var(--surface-raised)', padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}>
                          {pct}%
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--brand)', wordBreak: 'break-all' }}>
                          {milestoneVal} {form.unit || 'units'}
                        </span>
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <FiGift style={{ fontSize: 16, color: 'var(--brand)' }} />
                      </span>
                      <input
                        type="text"
                        value={rewards[idx] || ''}
                        onChange={e => handleRewardChange(idx, e.target.value)}
                        placeholder={`Reward at ${milestoneVal} ${form.unit || 'units'}...`}
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          borderRadius: 10,
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: 14,
                          outline: 'none',
                          minHeight: 42,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar Companion Note */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1px solid var(--line)',
              padding: 'clamp(12px, 3vw, 18px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {customAvatar ? (
                <div style={{ borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--brand)', flexShrink: 0 }}>
                  <Avatar config={customAvatar} size={44} />
                </div>
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--brand-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand)',
                    flexShrink: 0,
                  }}
                >
                  <HiSparkles style={{ fontSize: 22 }} />
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 14, wordBreak: 'break-word' }}>
                  Your Journey Avatar: {customAvatar?.name || 'Custom Hero'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.4 }}>
                  Your personal companion travels with you along this goal journey roadmap.
                </div>
              </div>
            </div>

            <Link
              href="/avatar"
              style={{
                color: 'var(--brand)',
                textDecoration: 'none',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 12,
                background: 'var(--brand-soft)',
                border: '1px solid var(--brand)',
                minHeight: 42,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <HiSparkles style={{ fontSize: 15, flexShrink: 0 }} />
              <span>Customize in 3D Studio</span>
            </Link>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                wordBreak: 'break-word',
              }}
            >
              <FiAlertCircle style={{ fontSize: 16, flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form Action Buttons (Clean & Stacked on mobile) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginTop: 4,
            }}
          >
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px clamp(14px, 3vw, 24px)',
                borderRadius: 12,
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: 'clamp(14px, 3.6vw, 15px)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 20px var(--neon-glow)',
                minHeight: 48,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxSizing: 'border-box',
              }}
            >
              {loading ? (
                'Creating Journey...'
              ) : (
                <>
                  <FiCheck style={{ fontSize: 18, flexShrink: 0 }} />
                  <span>Launch Goal & Begin Journey</span>
                </>
              )}
            </motion.button>

            <Link
              href="/goals"
              style={{
                width: '100%',
                textAlign: 'center',
                padding: '12px 20px',
                borderRadius: 12,
                border: '1px solid var(--line)',
                background: 'transparent',
                color: 'var(--ink-muted)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
