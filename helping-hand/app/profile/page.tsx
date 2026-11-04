'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiTarget, FiAward, FiMail, FiArrowLeft, FiCheck, FiUser, FiSmile } from 'react-icons/fi';
import Navbar from '@/components/Navbar';

interface UserProfile {
  _id: string;
  auth0Id: string;
  username: string;
  name: string;
  email: string;
  picture: string;
  bio: string;
}

interface Invitation {
  _id: string;
  name: string;
  goalType: string;
  target: number;
  unit: string;
  endDate: string;
  creator?: {
    username?: string;
    name?: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ goalsCreated: 0, goalsCompleted: 0 });
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  // Status & validation
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameMessage, setUsernameMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      if (res.ok && data.user) {
        setProfile(data.user);
        setUsername(data.user.username);
        setName(data.user.name);
        setBio(data.user.bio || '');
        if (data.stats) setStats(data.stats);
        if (data.invitations) setInvitations(data.invitations);
      } else {
        setError(data.error || 'Failed to load profile.');
      }
    } catch {
      setError('Network error loading profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Debounced username availability check
  useEffect(() => {
    if (!profile) return;
    const clean = username.trim().toLowerCase();
    if (clean === profile.username) {
      setUsernameAvailable(true);
      setUsernameMessage('Current username');
      return;
    }

    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      setUsernameAvailable(false);
      setUsernameMessage('3-30 chars, lowercase letters, numbers & _ only');
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(clean)}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
        setUsernameMessage(data.available ? 'Username available' : data.reason || 'Already taken');
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [username, profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaveSuccess(false);

    if (usernameAvailable === false) {
      setError('Please choose a valid and available username.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          name: name.trim(),
          bio: bio.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setProfile(data.user);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to save changes.');
      }
    } catch {
      setError('Network error saving profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleRespondInvite = async (goalId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/goals/${goalId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setInvitations(prev => prev.filter(inv => inv._id !== goalId));
        if (action === 'accept') {
          window.location.href = `/goals/${goalId}`;
        }
      }
    } catch {
      alert('Failed to respond to invitation.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main
        style={{
          maxWidth: 840,
          margin: '0 auto',
          padding: 'clamp(20px, 4vw, 48px) clamp(16px, 3vw, 24px) 80px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/goals"
            style={{
              color: 'var(--ink-muted)',
              textDecoration: 'none',
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            <FiArrowLeft />
            <span>Back to Goals</span>
          </Link>
          <h1
            style={{
              fontSize: 'clamp(26px, 5vw, 38px)',
              fontWeight: 800,
              color: 'var(--ink)',
              letterSpacing: '-1px',
            }}
          >
            User Profile & Settings
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 6, fontSize: 'clamp(14px, 2vw, 16px)' }}>
            Customize your unique username, display name, and view your goal achievements.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
            Loading profile...
          </div>
        ) : error && !profile ? (
          <div
            style={{
              padding: 20,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 16,
              color: '#f87171',
            }}
          >
            {error}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* Stats Overview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
                gap: 12,
              }}
            >
              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--brand-soft)',
                    color: 'var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  <FiTarget />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
                    {stats.goalsCreated}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Goals Created</div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(63, 207, 142, 0.15)',
                    color: '#3fcf8e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  <FiAward />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
                    {stats.goalsCompleted}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Goals Completed</div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#a855f7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  <FiMail />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
                    {invitations.length}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Pending Invites</div>
                </div>
              </div>
            </div>

            {/* Pending Invitations Banner */}
            {invitations.length > 0 && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(168, 85, 247, 0.12))',
                  borderRadius: 20,
                  padding: 'clamp(16px, 3vw, 24px)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FiMail style={{ color: 'var(--brand)' }} /> You Have Goal Invitations!
                </h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {invitations.map(inv => (
                    <div
                      key={inv._id}
                      style={{
                        background: 'var(--surface)',
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>
                          {inv.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                          Invited by{' '}
                          <span style={{ color: 'var(--brand)' }}>
                            @{inv.creator?.username || 'user'}
                          </span>{' '}
                          • <span style={{ textTransform: 'capitalize' }}>{inv.goalType}</span> •{' '}
                          {inv.target} {inv.unit}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleRespondInvite(inv._id, 'accept')}
                          style={{
                            background: 'var(--brand)',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            minHeight: 38,
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondInvite(inv._id, 'reject')}
                          style={{
                            background: 'transparent',
                            color: 'var(--ink-muted)',
                            border: '1px solid var(--line)',
                            padding: '8px 14px',
                            borderRadius: 10,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                            minHeight: 38,
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Form */}
            <form
              onSubmit={handleSave}
              style={{
                background: 'var(--surface)',
                borderRadius: 20,
                padding: 'clamp(20px, 4vw, 32px)',
                border: '1px solid var(--line)',
                display: 'grid',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {profile?.picture ? (
                  <img
                    src={profile.picture}
                    alt={profile.name}
                    style={{
                      width: 'clamp(56px, 10vw, 72px)',
                      height: 'clamp(56px, 10vw, 72px)',
                      borderRadius: '50%',
                      border: '3px solid var(--brand)',
                      boxShadow: '0 0 16px var(--neon-glow)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 'clamp(56px, 10vw, 72px)',
                      height: 'clamp(56px, 10vw, 72px)',
                      borderRadius: '50%',
                      background: 'var(--brand-soft)',
                      color: 'var(--brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: 'clamp(18px, 3.5vw, 22px)', fontWeight: 800, color: 'var(--ink)' }}>
                    {profile?.name}
                  </h2>
                  <p style={{ color: 'var(--brand)', fontWeight: 600, fontSize: 13.5 }}>
                    @{profile?.username}
                  </p>
                  {profile?.email && (
                    <p style={{ color: 'var(--ink-muted)', fontSize: 12.5, marginTop: 2 }}>
                      {profile.email}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Link
                    href="/avatar"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 12,
                      background: 'var(--brand-soft)',
                      border: '1.5px solid var(--brand)',
                      color: 'var(--brand)',
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 40,
                    }}
                  >
                    <FiSmile />
                    <span>3D Avatar Studio</span>
                  </Link>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />

              {/* Unique Username field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <label style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>
                    Unique Username <span style={{ color: 'var(--brand)' }}>*</span>
                  </label>
                  {usernameMessage && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          usernameAvailable === true
                            ? '#3fcf8e'
                            : usernameAvailable === false
                            ? '#f87171'
                            : 'var(--ink-muted)',
                      }}
                    >
                      {checkingUsername ? 'Checking...' : usernameMessage}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--ink-muted)',
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. runner_girl, marathon_dan"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 34px',
                      borderRadius: 12,
                      border: `1.5px solid ${
                        usernameAvailable === true
                          ? '#3fcf8e'
                          : usernameAvailable === false
                          ? '#f87171'
                          : 'var(--line)'
                      }`,
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: 15,
                      outline: 'none',
                      minHeight: 44,
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>
                  Your username is unique across HelpingHand and used for invites, competition rankings, and collaborative teams.
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontSize: 14 }}>
                  Display Name <span style={{ color: 'var(--brand)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full or display name"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: 15,
                    outline: 'none',
                    minHeight: 44,
                  }}
                />
              </div>

              {/* Bio */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontSize: 14 }}>
                  Bio & Motivation
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Share what drives you, your favorite hobbies, or fitness targets..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
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

              {/* Error banner */}
              {error && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: 13.5,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Success banner */}
              {saveSuccess && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(63, 207, 142, 0.12)',
                    border: '1px solid rgba(63, 207, 142, 0.3)',
                    color: '#3fcf8e',
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <FiCheck style={{ fontSize: 16 }} />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {/* Action buttons (Responsive flex row or full width on mobile) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <Link
                  href="/goals"
                  style={{
                    flex: '1 1 auto',
                    textAlign: 'center',
                    padding: '11px 18px',
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
                  }}
                >
                  Cancel
                </Link>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving || usernameAvailable === false}
                  style={{
                    flex: '2 1 180px',
                    padding: '12px 24px',
                    borderRadius: 12,
                    background: 'var(--brand)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 14.5,
                    cursor: saving || usernameAvailable === false ? 'not-allowed' : 'pointer',
                    opacity: saving || usernameAvailable === false ? 0.7 : 1,
                    boxShadow: '0 4px 16px var(--neon-glow)',
                    minHeight: 44,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </motion.button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
