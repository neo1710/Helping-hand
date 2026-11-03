'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Avatar, { AVATAR_CONFIGS } from '@/components/Avatar';

const UNITS = ['km', 'miles', 'hours', 'books', 'sessions', '₹', 'steps', 'pages', 'reps', 'kg'];

const GOAL_TYPES = [
  {
    type: 'personal',
    title: 'Personal Goal',
    icon: '🎯',
    desc: 'Solo journey private to you. Track your personal milestones and unlock rewards.',
    tag: 'Solo',
  },
  {
    type: 'collaborative',
    title: 'Collaborative Goal',
    icon: '🤝',
    desc: 'Work together towards one shared target! Team members contribute to a joint goal. Join by invite or request.',
    tag: 'Teamwork',
  },
  {
    type: 'competitive',
    title: 'Competitive Goal',
    icon: '🏆',
    desc: 'Work individually and compete with friends! Live rankings & leaderboard show who leads the pack. Join by invite or request.',
    tag: 'Leaderboard',
  },
  {
    type: 'open',
    title: 'Open Goal',
    icon: '🌐',
    desc: 'Public challenge that anyone can join instantly. Disappears after deadline. Everyone sees everyone\'s progress.',
    tag: 'Public Event',
  },
] as const;

const DEFAULT_REWARD_IDEAS = [
  '☕ Premium specialty coffee treat',
  '🎬 Watch a favorite movie / gaming session',
  '🍕 Cheat meal celebration dinner',
  '👟 Treat yourself to new fitness gear or shoes',
  '📚 Buy a new book or course',
  '💆 Relaxing massage / spa day',
  '🎧 High quality headphones / accessory',
  '🏖️ Weekend getaway / adventure day trip',
  '🎂 Delicious dessert from top bakery',
  '🎉 Big victory celebration party with friends',
];

export default function NewGoalPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    description: '',
    goalType: 'personal' as 'personal' | 'collaborative' | 'competitive' | 'open',
    target: '',
    unit: 'km',
    startDate: '',
    endDate: '',
    checkpoints: 4,
    avatarIndex: 0,
  });

  const [rewards, setRewards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const av = AVATAR_CONFIGS[form.avatarIndex];
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          goalType: form.goalType,
          target: Number(form.target),
          unit: form.unit,
          startDate: form.startDate,
          endDate: form.endDate,
          checkpoints: form.checkpoints,
          rewards: rewards.map((r, idx) => ({
            checkpointIndex: idx + 1,
            reward: r.trim() || `Milestone ${idx + 1} Reward!`,
          })),
          avatarIndex: form.avatarIndex,
          avatarTone: av.tone,
          avatarSkin: av.skin,
          avatarHair: av.hairStyle,
          avatarHairColor: av.hairColor,
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
          maxWidth: 920,
          margin: '0 auto',
          padding: 'clamp(20px, 4vw, 48px) clamp(16px, 3vw, 24px) 100px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/goals"
            style={{
              color: 'var(--ink-muted)',
              textDecoration: 'none',
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 14,
              fontWeight: 600,
            }}
          >
            ← Back to Goals
          </Link>
          <h1
            style={{
              fontSize: 'clamp(26px, 5vw, 38px)',
              fontWeight: 800,
              color: 'var(--ink)',
              letterSpacing: '-1px',
            }}
          >
            Create a New Goal
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 6, fontSize: 'clamp(14px, 2vw, 16px)' }}>
            Choose your goal type, customize 4 to 20 milestone rewards, and begin your journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 24 }}>
          {/* 1. Goal Type Selection */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 'clamp(18px, 3vw, 28px)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 800, color: 'var(--ink)', fontSize: 16 }}>
                1. Select Goal Type <span style={{ color: 'var(--brand)' }}>*</span>
              </label>
              <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 4 }}>
                Choose whether this goal is personal, team collaborative, competitive, or an open public challenge.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                gap: 12,
              }}
            >
              {GOAL_TYPES.map(gt => {
                const isSelected = form.goalType === gt.type;
                return (
                  <motion.div
                    key={gt.type}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setForm(f => ({ ...f, goalType: gt.type }))}
                    style={{
                      padding: '16px 14px',
                      borderRadius: 14,
                      border: `2px solid ${isSelected ? 'var(--brand)' : 'var(--line)'}`,
                      background: isSelected ? 'var(--brand-soft)' : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{gt.icon}</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>
                          {gt.title}
                        </span>
                      </div>
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
                    <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                      {gt.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 2. Goal Details */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 'clamp(18px, 3vw, 28px)',
              border: '1px solid var(--line)',
              display: 'grid',
              gap: 18,
            }}
          >
            <h2 style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 16 }}>
              2. Goal Details & Schedule
            </h2>

            {/* Goal Name */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 14 }}>
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
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 14 }}>
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
                }}
              />
            </div>

            {/* Target & Unit (Responsive 1 or 2 cols) */}
            <div className="grid-responsive-2col">
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 14 }}>
                  Target Value <span style={{ color: 'var(--brand)' }}>*</span>
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
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 14 }}>
                  Unit <span style={{ color: 'var(--brand)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="km"
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: 15,
                      outline: 'none',
                    }}
                  />
                  <select
                    value={UNITS.includes(form.unit) ? form.unit : ''}
                    onChange={e => {
                      if (e.target.value) setForm(f => ({ ...f, unit: e.target.value }));
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 12,
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: 14,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Presets</option>
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dates (Responsive 1 or 2 cols) */}
            <div className="grid-responsive-2col">
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 14 }}>
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
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 14 }}>
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
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {form.goalType === 'open' && (
              <p style={{ fontSize: 12.5, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '10px 14px', borderRadius: 10, lineHeight: 1.45 }}>
                ⚡ Note: Open challenges automatically disappear from the active feed once this deadline passes!
              </p>
            )}
          </div>

          {/* 3. Checkpoints & Rewards Configuration */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 'clamp(18px, 3vw, 28px)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 16 }}>
                  3. Checkpoints & Rewards (4 to 20 Milestones)
                </h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 4 }}>
                  Decide how many milestones you want. Customize each reward unlocked upon reaching it!
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
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: 38,
                }}
              >
                ✨ Auto-fill Ideas
              </button>
            </div>

            {/* Checkpoints slider / selector */}
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 16,
                padding: '16px 18px',
                border: '1px solid var(--line)',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>
                  Milestone Count:
                </span>
                <span
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    padding: '3px 12px',
                    borderRadius: 20,
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {form.checkpoints} Checkpoints
                </span>
              </div>

              <input
                type="range"
                min="4"
                max="20"
                step="1"
                value={form.checkpoints}
                onChange={e => setForm(f => ({ ...f, checkpoints: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer', height: 28 }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11.5, color: 'var(--ink-muted)' }}>
                <span>4 (Min)</span>
                <span>8</span>
                <span>12</span>
                <span>16</span>
                <span>20 (Max)</span>
              </div>
            </div>

            {/* List of Checkpoints & Rewards (Mobile-friendly stacked or side-by-side) */}
            <div style={{ display: 'grid', gap: 12 }}>
              {Array.from({ length: form.checkpoints }).map((_, idx) => {
                const targetNum = Number(form.target) || 100;
                const milestoneVal = Math.round((targetNum * ((idx + 1) / form.checkpoints)) * 10) / 10;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      background: 'var(--bg)',
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'var(--brand-soft)',
                            color: 'var(--brand)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                          Checkpoint {idx + 1}
                        </span>
                      </div>

                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand)' }}>
                        {milestoneVal} {form.unit || 'units'}
                      </span>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>
                        🎁
                      </span>
                      <input
                        type="text"
                        value={rewards[idx] || ''}
                        onChange={e => handleRewardChange(idx, e.target.value)}
                        placeholder={`Reward for reaching ${milestoneVal} ${form.unit}...`}
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          borderRadius: 10,
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Avatar Selection */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 'clamp(18px, 3vw, 28px)',
              border: '1px solid var(--line)',
            }}
          >
            <h2 style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 16, marginBottom: 4 }}>
              4. Pick Your Journey Avatar
            </h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 16 }}>
              Your avatar travels along the road and celebrates as you hit checkpoints!
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                gap: 12,
              }}
            >
              {AVATAR_CONFIGS.map((cfg, idx) => {
                const isSelected = form.avatarIndex === idx;
                return (
                  <motion.div
                    key={cfg.name}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setForm(f => ({ ...f, avatarIndex: idx }))}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      padding: '8px 4px',
                      borderRadius: 14,
                      border: `2px solid ${isSelected ? 'var(--brand)' : 'transparent'}`,
                      background: isSelected ? 'var(--brand-soft)' : 'transparent',
                    }}
                  >
                    <Avatar config={cfg} size={50} glow={isSelected} />
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isSelected ? 'var(--brand)' : 'var(--ink-muted)',
                      }}
                    >
                      {cfg.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
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
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Form Action Buttons (Responsive flex row or stack on mobile) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/goals"
              style={{
                flex: '1 1 auto',
                textAlign: 'center',
                padding: '12px 20px',
                borderRadius: 12,
                border: '1px solid var(--line)',
                background: 'transparent',
                color: 'var(--ink-muted)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
                minHeight: 46,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Cancel
            </Link>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              style={{
                flex: '2 1 200px',
                padding: '14px 28px',
                borderRadius: 12,
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 20px var(--neon-glow)',
                minHeight: 46,
              }}
            >
              {loading ? 'Creating Journey...' : '🚀 Launch Goal & Begin Journey'}
            </motion.button>
          </div>
        </form>
      </main>
    </div>
  );
}
