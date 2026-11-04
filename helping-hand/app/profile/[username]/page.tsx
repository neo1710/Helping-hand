'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiTarget,
  FiAward,
  FiCheckCircle,
  FiCalendar,
  FiLock,
  FiArrowRight,
  FiSmile,
  FiShield,
} from 'react-icons/fi';
import Navbar from '@/components/Navbar';
import Avatar, { AvatarConfig } from '@/components/Avatar';

// Dynamically load Three.js 3D viewport on client side only
const Avatar3DCanvas = dynamic(() => import('@/components/Avatar3DCanvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        borderRadius: 24,
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
          border: '3px solid var(--line)',
          borderTopColor: 'var(--brand)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <span>Loading 3D Avatar Studio...</span>
    </div>
  ),
});

interface UserPublicProfile {
  username: string;
  name: string;
  bio: string;
  picture?: string;
  customAvatar?: AvatarConfig | null;
  createdAt: string;
}

interface ProfileData {
  user: UserPublicProfile;
  stats: {
    totalGoals: number;
    completedGoals: number;
    activeGoals: number;
  };
  isSelf: boolean;
}

function ProfileContent() {
  const params = useParams();
  const router = useRouter();
  const rawUsername = (params?.username as string) || '';

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!rawUsername) return;
    setLoading(true);
    fetch(`/api/user/profile/${encodeURIComponent(rawUsername)}`)
      .then(async res => {
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          setError(json.error || 'User not found.');
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [rawUsername]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--brand)' }}>
        <Navbar />
        <main style={{ maxWidth: 840, margin: '60px auto', textAlign: 'center' }}>
          <p>Loading profile...</p>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
        <Navbar />
        <main style={{ maxWidth: 840, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>{error || 'User not found'}</h2>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 16,
              background: 'var(--brand)',
              color: '#fff',
              border: 'none',
              padding: '11px 24px',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FiArrowLeft style={{ fontSize: 16 }} />
            <span>Go Back</span>
          </button>
        </main>
      </div>
    );
  }

  const { user, stats, isSelf } = data;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  // Safe fallback 3D avatar configuration
  const avatarConfig: AvatarConfig = {
    name: user.customAvatar?.name || user.name || 'Hero',
    tone: user.customAvatar?.tone || '#3b82f6',
    skin: user.customAvatar?.skin || '#f0c4a0',
    hairStyle: user.customAvatar?.hairStyle || 'short',
    hairColor: user.customAvatar?.hairColor || '#2b2118',
    eyesColor: user.customAvatar?.eyesColor || '#1a1a2e',
    clothingStyle: user.customAvatar?.clothingStyle || 'casual',
    accessory: user.customAvatar?.accessory || 'none',
    expression: user.customAvatar?.expression || 'happy',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <Navbar />

      <main
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          padding: 'clamp(20px, 4vw, 36px) clamp(16px, 3vw, 24px) 80px',
        }}
      >
        {/* Top Navigation Row */}
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
              padding: 0,
            }}
          >
            <FiArrowLeft />
            <span>Back</span>
          </button>
        </div>

        {/* 2-Column Responsive Layout: 3D Viewport on Left, Profile Details & Stats on Right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* 3D Canvas Avatar Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                height: 480,
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              }}
            >
              <Avatar3DCanvas config={avatarConfig} />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'var(--surface)',
                borderRadius: 14,
                border: '1px solid var(--line)',
                fontSize: 12.5,
                color: 'var(--ink-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiSmile style={{ color: 'var(--brand)', fontSize: 15 }} />
                <span>Drag to rotate companion • 360° View</span>
              </div>
              {isSelf && (
                <Link
                  href="/avatar"
                  style={{
                    color: 'var(--brand)',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>Edit in Studio</span>
                  <FiArrowRight style={{ fontSize: 13 }} />
                </Link>
              )}
            </div>
          </div>

          {/* Profile Details & Privacy-Safe Stats Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* User Bio Card */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 22,
                padding: 'clamp(20px, 3vw, 28px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                <div
                  style={{
                    borderRadius: '50%',
                    padding: 3,
                    background: 'var(--brand-soft)',
                    border: '2px solid var(--brand)',
                    flexShrink: 0,
                  }}
                >
                  {user.customAvatar ? (
                    <Avatar config={user.customAvatar} size={54} />
                  ) : user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        background: 'var(--brand)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        fontWeight: 800,
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 800, margin: 0 }}>
                      {user.name}
                    </h1>
                    {isSelf && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'var(--brand-soft)',
                          color: 'var(--brand)',
                          padding: '2px 8px',
                          borderRadius: 12,
                        }}
                      >
                        You
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>
                      @{user.username}
                    </span>
                    {memberSince && (
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <FiCalendar style={{ fontSize: 13 }} />
                        <span>Joined {memberSince}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {user.bio ? (
                <p
                  style={{
                    color: 'var(--ink-muted)',
                    fontSize: 14,
                    margin: 0,
                    lineHeight: 1.6,
                    background: 'var(--bg)',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                  }}
                >
                  {user.bio}
                </p>
              ) : (
                <p style={{ color: 'var(--ink-muted)', fontSize: 13.5, margin: 0, fontStyle: 'italic' }}>
                  No bio written yet.
                </p>
              )}
            </div>

            {/* Privacy-Safe Goal Numbers Card */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 22,
                padding: 'clamp(20px, 3vw, 26px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Goals Overview</h2>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: '2px 0 0' }}>
                    Activity summary for @{user.username}
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--brand)',
                  }}
                >
                  <FiShield style={{ fontSize: 13 }} />
                  <span>Verified Summary</span>
                </span>
              </div>

              {/* The 3 Goal Count Badges */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    background: 'var(--bg)',
                    borderRadius: 14,
                    padding: '14px 10px',
                    border: '1px solid var(--line)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'var(--brand-soft)',
                      color: 'var(--brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      margin: '0 auto 8px',
                    }}
                  >
                    <FiTarget />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
                    {stats.totalGoals}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontWeight: 600, marginTop: 2 }}>
                    Total Goals
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg)',
                    borderRadius: 14,
                    padding: '14px 10px',
                    border: '1px solid var(--line)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'rgba(63, 207, 142, 0.15)',
                      color: '#3fcf8e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      margin: '0 auto 8px',
                    }}
                  >
                    <FiCheckCircle />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#3fcf8e' }}>
                    {stats.completedGoals}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontWeight: 600, marginTop: 2 }}>
                    Completed
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg)',
                    borderRadius: 14,
                    padding: '14px 10px',
                    border: '1px solid var(--line)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      margin: '0 auto 8px',
                    }}
                  >
                    <FiAward />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>
                    {stats.activeGoals}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontWeight: 600, marginTop: 2 }}>
                    Active
                  </div>
                </div>
              </div>

              {/* Privacy Notice Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'var(--bg)',
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  color: 'var(--ink-muted)',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                <FiLock style={{ fontSize: 16, color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: 2 }}>
                    Goal Privacy Protected
                  </strong>
                  To protect personal privacy and member focus, individual goal titles, descriptions, and progress logs are kept private. Only overall achievement counts are displayed.
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {isSelf ? (
                <>
                  <Link
                    href="/goals"
                    style={{
                      flex: 1,
                      minWidth: 160,
                      background: 'var(--brand)',
                      color: '#fff',
                      padding: '12px 18px',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: 'none',
                      textAlign: 'center',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <span>Manage My Goals</span>
                    <FiArrowRight style={{ fontSize: 14 }} />
                  </Link>
                  <Link
                    href="/profile"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink)',
                      padding: '12px 18px',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    Edit Profile
                  </Link>
                </>
              ) : (
                <Link
                  href="/goals"
                  style={{
                    flex: 1,
                    background: 'var(--brand)',
                    color: '#fff',
                    padding: '12px 18px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>Explore Public Goals</span>
                  <FiArrowRight style={{ fontSize: 14 }} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UserPublicProfilePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--line)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
