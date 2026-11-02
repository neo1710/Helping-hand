'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import GoalJourneyMap from '@/components/GoalJourneyMap';
import { AVATAR_CONFIGS } from '@/components/Avatar';

interface LogEntry {
  _id?: string;
  amount: number;
  note: string;
  date: string;
}

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
  log: LogEntry[];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export default function GoalJourneyPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
          <p>Loading your journey...</p>
        </div>
      }
    >
      <GoalJourneyContent />
    </Suspense>
  );
}

function GoalJourneyContent() {
  const params = useParams();
  const id = (params?.id as string) || '';

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/goals/${id}`)
      .then(async r => {
        const data = await r.json();
        if (r.ok && data.goal) {
          setGoal(data.goal);
        } else {
          setError(data.error || 'Goal not found.');
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load goal.'); setLoading(false); });
  }, [id]);

  const handleLog = async (quickAmount?: number) => {
    const logAmount = quickAmount ?? Number(amount);
    if (!logAmount || logAmount <= 0) return;
    setLogging(true);
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: logAmount, note }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoal(data.goal);
        setAmount('');
        setNote('');
        setLogSuccess(true);
        setTimeout(() => setLogSuccess(false), 2500);
      } else {
        alert(data.error || 'Failed to log progress');
      }
    } catch {
      alert('Error updating goal');
    } finally {
      setLogging(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/goals';
      } else {
        alert('Failed to delete goal');
      }
    } catch {
      alert('Error deleting goal');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
        <p>Loading your journey...</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
        <Navbar />
        <main className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>{error || 'Goal not found'}</h2>
          <Link href="/goals" className="btn btn-secondary">
            ← Back to Goals
          </Link>
        </main>
      </div>
    );
  }

  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.progress / goal.target) * 100)) : 0;
  const daysTotal = daysBetween(goal.startDate, goal.endDate);
  const now = new Date().toISOString();
  const daysRemaining = Math.max(0, daysBetween(now, goal.endDate));
  const avatarConfig = AVATAR_CONFIGS[goal.avatarIndex] || AVATAR_CONFIGS[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <Navbar />

      <main className="container" style={{ padding: '40px 24px 80px' }}>
        {/* Top Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <Link href="/goals" style={{ color: 'var(--ink-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            ← Back to all goals
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Goal'}
          </button>
        </div>

        {/* Goal Hero Banner */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: goal.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                  color: goal.status === 'completed' ? '#22c55e' : 'var(--brand)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {goal.status}
              </span>
              <span style={{ color: 'var(--ink-subtle)', fontSize: '13px' }}>
                {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 10px', color: 'var(--ink)' }}>
              {goal.name}
            </h1>
            <p style={{ color: 'var(--ink-muted)', margin: 0, fontSize: '15px' }}>
              Target: <strong style={{ color: 'var(--ink)' }}>{goal.target} {goal.unit}</strong> | Days Left: <strong style={{ color: 'var(--ink)' }}>{daysRemaining} of {daysTotal}</strong>
            </p>
          </div>

          <div style={{ textAlign: 'right', minWidth: '180px' }}>
            <div style={{ fontSize: '38px', fontWeight: 900, color: 'var(--brand)', lineHeight: 1 }}>
              {pct}%
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: '14px', marginTop: '4px' }}>
              {goal.progress} / {goal.target} {goal.unit}
            </div>
            <div
              style={{
                background: 'var(--surface-raised)',
                borderRadius: '8px',
                height: '8px',
                width: '100%',
                marginTop: '10px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(90deg, var(--brand), #60a5fa)',
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: '8px',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* 2-Column Section: Visual Map + Action / Log Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          {/* Journey Map */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Progress Roadmap</h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: '14px', margin: '4px 0 0' }}>
                  Watch your avatar journey along the path as you log achievements.
                </p>
              </div>
              <span
                style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--brand)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Avatar #{goal.avatarIndex + 1}
              </span>
            </div>

            <GoalJourneyMap
              target={goal.target}
              progress={pct}
              unit={goal.unit}
              checkpoints={goal.checkpoints}
              avatarIndex={goal.avatarIndex}
              goalName={goal.name}
            />
          </div>

          {/* Quick Log and History */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Log Progress Card */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Log New Progress</h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: '13px', marginBottom: '18px' }}>
                Every small step counts towards your milestone!
              </p>

              {/* Quick Increment Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[1, 5, 10, 25].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleLog(inc)}
                    disabled={logging || goal.status === 'completed'}
                    style={{
                      flex: 1,
                      minWidth: '60px',
                      padding: '8px 12px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    +{inc} {goal.unit}
                  </button>
                ))}
              </div>

              {/* Custom Amount Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    Custom Amount ({goal.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={`e.g. 15`}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    Note / Reflection (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Completed module 3"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleLog()}
                  disabled={logging || !amount || goal.status === 'completed'}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '6px' }}
                >
                  {logging ? 'Saving...' : logSuccess ? 'Progress Logged! 🎉' : 'Record Progress'}
                </button>
              </div>
            </div>

            {/* History Log */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: '24px',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Activity Log</h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: '13px', marginBottom: '18px' }}>
                Timeline of updates for this goal.
              </p>

              {(!goal.log || goal.log.length === 0) ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-subtle)', padding: '32px 0' }}>
                  No activities logged yet. Take your first step above!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[...goal.log].reverse().map((entry, idx) => (
                    <div
                      key={entry._id || idx}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--surface-raised)',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--brand)', marginRight: '8px' }}>
                          +{entry.amount} {goal.unit}
                        </span>
                        {entry.note && (
                          <span style={{ color: 'var(--ink)', fontSize: '13px' }}>
                            {entry.note}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--ink-subtle)' }}>
                        {formatDate(entry.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
