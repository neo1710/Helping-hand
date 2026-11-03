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

  // Rewards array of length `checkpoints`
  const [rewards, setRewards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize start date to today and default deadline to 30 days ahead
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

  // Sync rewards array size whenever checkpoints count changes
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

  const selectedAv = AVATAR_CONFIGS[form.avatarIndex];

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

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px 100px' }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <Link
            href="/goals"
            style={{
              color: 'var(--ink-muted)',
              textDecoration: 'none',
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
            }}
          >
            ← Back to Goals
          </Link>
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 800,
              color: 'var(--ink)',
              letterSpacing: '-1px',
            }}
          >
            Create a New Goal
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 8, fontSize: 16 }}>
            Choose your goal type, customize 4 to 20 milestone rewards, and start your journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 28 }}>
          {/* 1. Goal Type Selection */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 28,
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 800, color: 'var(--ink)', fontSize: 17 }}>
                1. Select Goal Type <span style={{ color: 'var(--brand)' }}>*</span>
              </label>
              <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 4 }}>
                Choose whether this goal is personal, team collaborative, competitive, or an open public challenge.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 14,
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
                      padding: '20px 18px',
                      borderRadius: 16,
                      border: `2px solid ${isSelected ? 'var(--brand)' : 'var(--line)'}`,
                      background: isSelected ? 'var(--brand-soft)' : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{gt.icon}</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>
                          {gt.title}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 20,
                          background: isSelected ? 'var(--brand)' : 'var(--surface)',
                          color: isSelected ? '#fff' : 'var(--ink-muted)',
                        }}
                      >
                        {gt.tag}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
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
              padding: 28,
              border: '1px solid var(--line)',
              display: 'grid',
              gap: 20,
            }}
          >
            <h2 style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 17 }}>
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

            {/* Target & Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 14 }}>
                  Target Value <span style={{ color: 'var(--brand)' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
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

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
              <p style={{ fontSize: 13, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: 8 }}>
                ⚡ Note: Open goals will automatically disappear from the active feed once this deadline passes!
              </p>
            )}
          </div>

          {/* 3. Checkpoints & Rewards Configuration */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 28,
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 17 }}>
                  3. Checkpoints & Rewards (4 to 20 Checkpoints)
                </h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 4 }}>
                  Decide how many milestones you want (from 4 to 20). Write a custom reward for each checkpoint that unlocks when reached!
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutofillRewards}
                style={{
                  background: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  border: '1px solid var(--brand)',
                  padding: '7px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
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
                padding: '18px 20px',
                border: '1px solid var(--line)',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>
                  Number of Checkpoints:
                </span>
                <span
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    padding: '4px 14px',
                    borderRadius: 20,
                    fontWeight: 800,
                    fontSize: 15,
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
                style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--ink-muted)' }}>
                <span>4 (Minimum)</span>
                <span>8</span>
                <span>12</span>
                <span>16</span>
                <span>20 (Maximum)</span>
              </div>
            </div>

            {/* List of Checkpoints & Rewards */}
            <div style={{ display: 'grid', gap: 14 }}>
              {Array.from({ length: form.checkpoints }).map((_, idx) => {
                const targetNum = Number(form.target) || 100;
                const milestoneVal = Math.round((targetNum * ((idx + 1) / form.checkpoints)) * 10) / 10;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'var(--bg)',
                      padding: '12px 16px',
                      borderRadius: 14,
                      border: '1px solid var(--line)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        minWidth: 100,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--brand-soft)',
                          color: 'var(--brand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                        {milestoneVal} {form.unit || 'units'}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
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

          {/* 4. Avatar Customization */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 28,
              border: '1px solid var(--line)',
            }}
          >
            <h2 style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 17, marginBottom: 6 }}>
              4. Pick Your Journey Avatar
            </h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 20 }}>
              Your avatar will travel along the road and celebrate as you unlock checkpoint rewards!
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {AVATAR_CONFIGS.map((cfg, idx) => {
                const isSelected = form.avatarIndex === idx;
                return (
                  <motion.div
                    key={cfg.name}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setForm(f => ({ ...f, avatarIndex: idx }))}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      padding: 10,
                      borderRadius: 16,
                      border: `2px solid ${isSelected ? 'var(--brand)' : 'transparent'}`,
                      background: isSelected ? 'var(--brand-soft)' : 'transparent',
                    }}
                  >
                    <Avatar config={cfg} size={64} glow={isSelected} />
                    <span
                      style={{
                        fontSize: 12,
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
                padding: '14px 18px',
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

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14 }}>
            <Link
              href="/goals"
              style={{
                padding: '14px 24px',
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'transparent',
                color: 'var(--ink-muted)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 15,
                display: 'inline-flex',
                alignItems: 'center',
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
                padding: '14px 36px',
                borderRadius: 14,
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 20px var(--neon-glow)',
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
