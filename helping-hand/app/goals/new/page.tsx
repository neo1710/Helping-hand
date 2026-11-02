'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Avatar, { AVATAR_CONFIGS } from '@/components/Avatar';

const UNITS = ['km', 'miles', 'hours', 'books', 'sessions', '₹', 'steps', 'pages', 'reps', 'kg'];
const CHECKPOINT_OPTIONS = [2, 3, 4];

const ROAD_PATH_D = 'M0 100 C50 100 80 60 130 60 C180 60 200 90 260 75 C320 60 300 20 370 15';

export default function NewGoalPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    target: '',
    unit: 'km',
    startDate: '',
    endDate: '',
    checkpoints: 3,
    avatarIndex: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      startDate: new Date().toISOString().split('T')[0],
    }));
  }, []);

  const selectedAv = AVATAR_CONFIGS[form.avatarIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Please enter a goal name.'); return; }
    if (!form.target || Number(form.target) <= 0) { setError('Please enter a valid target.'); return; }
    if (!form.endDate) { setError('Please set a deadline.'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) { setError('Deadline must be after start date.'); return; }

    setLoading(true);
    try {
      const av = AVATAR_CONFIGS[form.avatarIndex];
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          target: Number(form.target),
          unit: form.unit,
          startDate: form.startDate,
          endDate: form.endDate,
          checkpoints: form.checkpoints,
          avatarIndex: form.avatarIndex,
          avatarTone: av.tone,
          avatarSkin: av.skin,
          avatarHair: av.hairStyle,
          avatarHairColor: av.hairColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create goal.'); setLoading(false); return; }
      router.push(`/goals/${data.goal._id}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ maxWidth: 840, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/goals" style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            ← Back to Goals
          </Link>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-1px' }}>
            Create a New Goal
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 8, fontSize: 16 }}>
            Set your target, pick your avatar, and begin your journey.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 24 }}>

            {/* Goal Name */}
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, border: '1px solid var(--line)' }}>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 15 }}>
                Goal Name
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="e.g. Run a Marathon, Read 12 Books..."
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                maxLength={120}
                required
              />
            </div>

            {/* Target + Unit */}
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, border: '1px solid var(--line)' }}>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 15 }}>
                Target
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  className="input-field"
                  type="number"
                  placeholder="100"
                  min="1"
                  value={form.target}
                  onChange={e => setForm({ ...form, target: e.target.value })}
                  style={{ flex: 1 }}
                  required
                />
                <select
                  className="input-field"
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                  style={{ flex: '0 0 auto', width: 120, cursor: 'pointer' }}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <p style={{ color: 'var(--ink-subtle)', fontSize: 13, marginTop: 8 }}>
                Your avatar will travel from 0 to {form.target || '?'} {form.unit} on the journey map.
              </p>
            </div>

            {/* Dates */}
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, border: '1px solid var(--line)' }}>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 15 }}>
                Timeline
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 6 }}>Start Date</p>
                  <input
                    className="input-field"
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    required
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 6 }}>Deadline</p>
                  <input
                    className="input-field"
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    min={form.startDate}
                    required
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>

            {/* Checkpoints */}
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, border: '1px solid var(--line)' }}>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 4, fontSize: 15 }}>
                Checkpoints
              </label>
              <p style={{ color: 'var(--ink-subtle)', fontSize: 13, marginBottom: 16 }}>
                Milestones along your journey path
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {CHECKPOINT_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, checkpoints: n })}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 10,
                      border: `2px solid ${form.checkpoints === n ? 'var(--brand)' : 'var(--line)'}`,
                      background: form.checkpoints === n ? 'var(--brand-soft)' : 'var(--surface-raised)',
                      color: form.checkpoints === n ? 'var(--brand)' : 'var(--ink-muted)',
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: form.checkpoints === n ? '0 0 12px var(--neon-glow)' : 'none',
                    }}
                  >
                    {n} pts
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Picker */}
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, border: '1px solid var(--line)' }}>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 4, fontSize: 15 }}>
                Choose Your Avatar
              </label>
              <p style={{ color: 'var(--ink-subtle)', fontSize: 13, marginBottom: 20 }}>
                Your companion for the journey
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 16 }}>
                {AVATAR_CONFIGS.map((av, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm({ ...form, avatarIndex: i })}
                    style={{
                      padding: '16px 12px',
                      borderRadius: 16,
                      border: `2px solid ${form.avatarIndex === i ? av.tone : 'var(--line)'}`,
                      background: form.avatarIndex === i ? `${av.tone}15` : 'var(--surface-raised)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      boxShadow: form.avatarIndex === i ? `0 0 16px ${av.tone}44` : 'none',
                    }}
                  >
                    <div style={{
                      padding: 3,
                      borderRadius: '50%',
                      background: form.avatarIndex === i ? `linear-gradient(135deg, ${av.tone}, ${av.tone}88)` : 'transparent',
                    }}>
                      <Avatar {...av} size={56} className={form.avatarIndex === i ? 'gt-bob' : ''} />
                    </div>
                    {form.avatarIndex === i && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: av.tone, letterSpacing: 1 }}>CHOSEN</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Journey Preview */}
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, border: '1px solid var(--line)' }}>
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 16, fontSize: 15 }}>
                Journey Preview
              </label>
              <div style={{ background: 'var(--surface-raised)', borderRadius: 16, padding: 20, overflow: 'hidden' }}>
                <svg viewBox="0 0 400 130" style={{ width: '100%', height: 'auto' }}>
                  <defs>
                    <linearGradient id="prevSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#050810" />
                      <stop offset="100%" stopColor="#0d1520" />
                    </linearGradient>
                  </defs>
                  <rect width="400" height="130" fill="url(#prevSky)" />
                  {/* Stars */}
                  {Array.from({ length: 20 }, (_, i) => (
                    <circle key={i} cx={10 + (i * 73) % 380} cy={5 + (i * 31) % 50} r="1" fill="white" opacity="0.4" />
                  ))}
                  {/* Hill */}
                  <path d="M0 100 Q100 80 200 90 Q300 80 400 85 L400 130 L0 130 Z" fill="#141f2e" />

                  {/* Road */}
                  <path d={ROAD_PATH_D} fill="none" stroke="#1b212b" strokeWidth="18" strokeLinecap="round" />
                  <path d={ROAD_PATH_D} fill="none" stroke="#2a3545" strokeWidth="14" strokeLinecap="round" />
                  <path d={ROAD_PATH_D} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeDasharray="12 18" strokeLinecap="round" />

                  {/* Checkpoints */}
                  {Array.from({ length: form.checkpoints }, (_, i) => {
                    const t = (i + 1) / (form.checkpoints + 1);
                    // Simple linear approximation
                    const x = 0 + t * 370;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={60 - t * 40} r="5" fill="var(--line-strong)" />
                        <circle cx={x} cy={60 - t * 40} r="2.5" fill="var(--ink-subtle)" />
                      </g>
                    );
                  })}

                  {/* Start */}
                  <circle cx="0" cy="100" r="6" fill={selectedAv.tone} />

                  {/* Flag */}
                  <line x1="370" y1="5" x2="370" y2="25" stroke="var(--ink-subtle)" strokeWidth="1.5" />
                  <path d="M370 5 L390 12 L370 19 Z" fill={selectedAv.tone} />

                  {/* Avatar at start */}
                  <g transform="translate(-20, 65)">
                    <svg x="0" y="0" width="28" height="28" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="23" fill={selectedAv.tone} opacity="0.2" />
                      <circle cx="24" cy="24" r="23" fill="none" stroke={selectedAv.tone} strokeWidth="1.5" opacity="0.6" />
                      <ellipse cx="24" cy="38" rx="10" ry="6" fill={selectedAv.tone} opacity="0.7" />
                      <rect x="21" y="30" width="6" height="5" rx="2" fill={selectedAv.skin} />
                      <ellipse cx="24" cy="22" rx="9" ry="10" fill={selectedAv.skin} />
                      <ellipse cx="20.5" cy="22" rx="1.5" ry="1.8" fill="#1a1a2e" />
                      <ellipse cx="27.5" cy="22" rx="1.5" ry="1.8" fill="#1a1a2e" />
                    </svg>
                  </g>

                  {/* Labels */}
                  <text x="4" y="118" fontSize="9" fill="var(--ink-muted)" fontFamily="Inter, sans-serif">Start</text>
                  <text x="355" y="35" fontSize="9" fill={selectedAv.tone} fontFamily="Inter, sans-serif">{form.target || '?'}{form.unit}</text>
                </svg>
              </div>
              <p style={{ color: 'var(--ink-subtle)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                Your avatar will travel this road as you log progress!
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(255,123,123,0.1)',
                border: '1px solid rgba(255,123,123,0.3)',
                borderRadius: 12,
                padding: '14px 20px',
                color: '#ff7b7b',
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <div style={{ display: 'flex', gap: 12, paddingBottom: 48 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  background: loading ? 'var(--line)' : 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  padding: '16px 32px',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: loading ? 'none' : '0 0 24px rgba(59,130,246,0.4)',
                }}
              >
                {loading ? 'Creating...' : '🚀 Start Journey'}
              </button>
              <Link
                href="/goals"
                style={{
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-muted)',
                  textDecoration: 'none',
                  borderRadius: 14,
                  padding: '16px 24px',
                  fontWeight: 600,
                  fontSize: 16,
                  border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
