'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiTarget,
  FiAward,
  FiUsers,
  FiGlobe,
  FiPlus,
  FiPlusCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiGift,
  FiArrowRight,
  FiUser,
  FiUserPlus,
  FiLock,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import Navbar from '@/components/Navbar';
import Avatar, { AVATAR_CONFIGS } from '@/components/Avatar';

interface Goal {
  _id: string;
  name: string;
  description?: string;
  goalType: 'personal' | 'collaborative' | 'competitive' | 'open';
  accessType?: 'public' | 'invite_only';
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
  customAvatar?: {
    name?: string;
    tone?: string;
    skin?: string;
    hairStyle?: 'short' | 'long' | 'bun' | 'curly';
    hairColor?: string;
  };
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

const MY_SUBTABS = [
  { id: 'all', label: 'All My Goals', icon: HiSparkles },
  { id: 'personal', label: 'Personal', icon: FiTarget },
  { id: 'collaborative', label: 'Collaborative', icon: FiUsers },
  { id: 'competitive', label: 'Competitive', icon: FiAward },
  { id: 'open', label: 'Open Joined', icon: FiGlobe },
];

const PUBLIC_SUBTABS = [
  { id: 'all', label: 'All Public', icon: HiSparkles },
  { id: 'open', label: 'Open Challenges', icon: FiGlobe },
  { id: 'collaborative', label: 'Collaborative', icon: FiUsers },
  { id: 'competitive', label: 'Competitive', icon: FiAward },
];

function getStatus(goal: Goal): { label: string; color: string; icon: typeof FiCheckCircle } {
  if (goal.status === 'completed') return { label: 'Completed', color: '#3fcf8e', icon: FiCheckCircle };
  if (goal.status === 'abandoned') return { label: 'Abandoned', color: '#ff7b7b', icon: FiAlertCircle };

  const now = new Date();
  const end = new Date(goal.endDate);

  if (goal.goalType === 'open' && now > end) {
    return { label: 'Expired', color: '#9ca3af', icon: FiClock };
  }

  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const pct = goal.target > 0 ? (goal.progress / goal.target) * 100 : 0;
  const totalDays = Math.ceil((end.getTime() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = totalDays - daysLeft;
  const expectedPct = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;

  if (pct >= expectedPct - 5) return { label: 'On Track', color: '#3fcf8e', icon: FiCheckCircle };
  return { label: 'Behind', color: '#ff7b7b', icon: FiAlertCircle };
}

function getGoalTypeIcon(type: string) {
  switch (type) {
    case 'collaborative': return FiUsers;
    case 'competitive': return FiAward;
    case 'open': return FiGlobe;
    default: return FiTarget;
  }
}

export default function GoalsPage() {
  const router = useRouter();
  const [parentTab, setParentTab] = useState<'my' | 'public'>('my');
  const [subTab, setSubTab] = useState('all');

  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinSuccessToast, setJoinSuccessToast] = useState('');

  const fetchGoals = (parent: 'my' | 'public', subtype: string) => {
    setLoading(true);
    fetch(`/api/goals?parent=${parent}&subtype=${subtype}`)
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
    fetchGoals(parentTab, subTab);
  }, [parentTab, subTab]);

  const handleParentTabChange = (newParent: 'my' | 'public') => {
    setParentTab(newParent);
    setSubTab('all');
  };

  const handleQuickJoin = async (goal: Goal) => {
    setJoiningId(goal._id);
    try {
      const res = await fetch(`/api/goals/${goal._id}/join`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (goal.goalType === 'open') {
          setJoinSuccessToast(`You joined "${goal.name}"! Moved to My Goals.`);
          setTimeout(() => {
            setJoinSuccessToast('');
            router.push(`/goals/${goal._id}`);
          }, 1500);
        } else {
          setJoinSuccessToast(data.message || 'Request sent to creator!');
          setTimeout(() => setJoinSuccessToast(''), 3000);
          fetchGoals(parentTab, subTab);
        }
      } else {
        alert(data.error || 'Failed to join goal');
      }
    } catch {
      alert('Error joining goal');
    } finally {
      setJoiningId(null);
    }
  };

  const currentSubtabs = parentTab === 'my' ? MY_SUBTABS : PUBLIC_SUBTABS;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px) 80px',
        }}
      >
        {/* Header Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1
              style={{
                fontSize: 'clamp(26px, 5vw, 40px)',
                fontWeight: 800,
                color: 'var(--ink)',
                letterSpacing: '-1px',
                marginBottom: 6,
              }}
            >
              Goal Journeys
            </h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: 'clamp(14px, 2vw, 16px)' }}>
              {parentTab === 'my'
                ? 'Your active personal milestones and joined team challenges.'
                : 'Discover public open challenges, team goals, and competitions to join.'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/goals/new"
              style={{
                background: 'var(--brand)',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontWeight: 700,
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 0 24px var(--neon-glow)',
                whiteSpace: 'nowrap',
                minHeight: 44,
              }}
            >
              <FiPlusCircle style={{ fontSize: 16 }} />
              <span>Create New Goal</span>
            </Link>
          </motion.div>
        </div>

        {/* Join Success Toast */}
        <AnimatePresence>
          {joinSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              style={{
                background: 'rgba(63, 207, 142, 0.15)',
                border: '1.5px solid #3fcf8e',
                color: '#3fcf8e',
                padding: '12px 18px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FiCheckCircle style={{ fontSize: 18, flexShrink: 0 }} />
              <span>{joinSuccessToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PARENT TABS: MY GOALS vs PUBLIC GOALS ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--surface)',
            padding: 6,
            borderRadius: 16,
            border: '1px solid var(--line)',
            marginBottom: 20,
            maxWidth: 480,
          }}
        >
          <button
            type="button"
            onClick={() => handleParentTabChange('my')}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: parentTab === 'my' ? 'var(--brand)' : 'transparent',
              color: parentTab === 'my' ? '#fff' : 'var(--ink-muted)',
              fontWeight: 800,
              fontSize: 'clamp(14px, 3vw, 15px)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.25s ease',
              boxShadow: parentTab === 'my' ? '0 4px 16px var(--neon-glow)' : 'none',
              minHeight: 44,
            }}
          >
            <FiUser style={{ fontSize: 16 }} />
            <span>My Goals</span>
          </button>

          <button
            type="button"
            onClick={() => handleParentTabChange('public')}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: parentTab === 'public' ? 'var(--brand)' : 'transparent',
              color: parentTab === 'public' ? '#fff' : 'var(--ink-muted)',
              fontWeight: 800,
              fontSize: 'clamp(14px, 3vw, 15px)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.25s ease',
              boxShadow: parentTab === 'public' ? '0 4px 16px var(--neon-glow)' : 'none',
              minHeight: 44,
            }}
          >
            <FiGlobe style={{ fontSize: 16 }} />
            <span>Public Goals</span>
          </button>
        </div>

        {/* ── SUB-TABS CATEGORIZATION ── */}
        <div className="tabs-scroll" style={{ marginBottom: 28 }}>
          {currentSubtabs.map(tab => {
            const isActive = subTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: `1.5px solid ${isActive ? 'var(--brand)' : 'var(--line)'}`,
                  background: isActive ? 'var(--brand-soft)' : 'var(--surface)',
                  color: isActive ? 'var(--brand)' : 'var(--ink-muted)',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  minHeight: 38,
                }}
              >
                <Icon style={{ fontSize: 15 }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Notice */}
        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              style={{
                width: 40,
                height: 40,
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
              padding: '60px 20px',
              background: 'var(--surface)',
              borderRadius: 20,
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              {parentTab === 'my' ? (
                <FiTarget style={{ fontSize: 44, color: 'var(--brand)' }} />
              ) : (
                <FiGlobe style={{ fontSize: 44, color: 'var(--brand)' }} />
              )}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              {parentTab === 'my'
                ? 'No active journeys in your My Goals yet'
                : 'No public goals found in this category'}
            </h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14, maxWidth: 460, margin: '0 auto 20px' }}>
              {parentTab === 'my'
                ? 'Create a new personal journey or explore Public Goals to join collaborative and open challenges!'
                : 'You have either joined all current challenges or none are open right now. Be the first to create one!'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {parentTab === 'my' && (
                <button
                  type="button"
                  onClick={() => handleParentTabChange('public')}
                  style={{
                    background: 'var(--surface-raised)',
                    color: 'var(--ink)',
                    border: '1px solid var(--line)',
                    padding: '11px 20px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>Explore Public Goals</span>
                  <FiArrowRight style={{ fontSize: 14 }} />
                </button>
              )}
              <Link
                href="/goals/new"
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  padding: '11px 22px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 44,
                }}
              >
                <FiPlusCircle style={{ fontSize: 16 }} />
                <span>Create New Goal</span>
              </Link>
            </div>
          </div>
        )}

        {/* Goals Grid */}
        {!loading && goals.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))',
              gap: 20,
            }}
          >
            {goals.map((goal, idx) => {
              const statusInfo = getStatus(goal);
              const pct = goal.target > 0 ? Math.min(100, Math.round((goal.progress / goal.target) * 100)) : 0;
              const daysLeft = Math.max(0, Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const av = goal.customAvatar?.skin || goal.customAvatar?.tone
                ? {
                    name: goal.customAvatar.name || 'Hero',
                    tone: goal.customAvatar.tone || '#3b82f6',
                    skin: goal.customAvatar.skin || '#f0c4a0',
                    hairStyle: goal.customAvatar.hairStyle || 'short',
                    hairColor: goal.customAvatar.hairColor || '#2b2118',
                  }
                : (AVATAR_CONFIGS[goal.avatarIndex] || AVATAR_CONFIGS[0]);
              const activeMembers = goal.members?.filter(m => m.status === 'active') || [];
              const memberCount = activeMembers.length || 1;
              const numCheckpoints = goal.checkpoints || 4;

              const isPending = goal.members?.some(
                m => m.auth0Id === currentUserId && m.status === 'pending_approval'
              );

              const GoalTypeIcon = getGoalTypeIcon(goal.goalType);
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={goal._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 18,
                    border: '1px solid var(--line)',
                    padding: 'clamp(18px, 3vw, 24px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div>
                    {/* Top Badge Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: 20,
                            background: 'var(--brand-soft)',
                            color: 'var(--brand)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            textTransform: 'capitalize',
                          }}
                        >
                          <GoalTypeIcon style={{ fontSize: 13 }} />
                          <span>{goal.goalType || 'Personal'}</span>
                        </span>

                        {(goal.goalType === 'collaborative' || goal.goalType === 'competitive') && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 16,
                              background: goal.accessType === 'invite_only' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                              color: goal.accessType === 'invite_only' ? '#f87171' : 'var(--brand)',
                              border: `1px solid ${goal.accessType === 'invite_only' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {goal.accessType === 'invite_only' ? (
                              <>
                                <FiLock style={{ fontSize: 10 }} />
                                <span>Invite Only</span>
                              </>
                            ) : (
                              <>
                                <FiGlobe style={{ fontSize: 10 }} />
                                <span>Public</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 20,
                          background: 'var(--bg)',
                          color: statusInfo.color,
                          border: '1px solid var(--line)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <StatusIcon style={{ fontSize: 12 }} />
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>

                    {/* Goal Title */}
                    <Link
                      href={`/goals/${goal._id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <h2
                        style={{
                          fontSize: 'clamp(17px, 3vw, 19px)',
                          fontWeight: 800,
                          color: 'var(--ink)',
                          marginBottom: 4,
                          letterSpacing: '-0.3px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {goal.name}
                      </h2>
                    </Link>

                    {goal.creator?.username && (
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 10 }}>
                        by <span style={{ color: 'var(--brand)', fontWeight: 600 }}>@{goal.creator.username}</span>
                      </div>
                    )}

                    {goal.description && (
                      <p
                        style={{
                          fontSize: 13,
                          color: 'var(--ink-muted)',
                          marginBottom: 14,
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
                        gap: 7,
                        background: 'var(--bg)',
                        padding: '7px 10px',
                        borderRadius: 10,
                        border: '1px solid var(--line)',
                        marginBottom: 16,
                        fontSize: 12,
                        color: 'var(--ink)',
                        fontWeight: 600,
                      }}
                    >
                      <FiGift style={{ fontSize: 14, color: 'var(--brand)' }} />
                      <span>{numCheckpoints} Checkpoints & Rewards</span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: 'var(--ink-muted)' }}>Progress</span>
                        <strong style={{ color: 'var(--ink)' }}>
                          {goal.progress} / {goal.target} {goal.unit} ({pct}%)
                        </strong>
                      </div>
                      <div
                        style={{
                          background: 'var(--bg)',
                          borderRadius: 8,
                          height: 7,
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

                  {/* Card Footer */}
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar config={av} size={30} />
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                          <div>{goal.goalType !== 'personal' ? `${memberCount} participant${memberCount > 1 ? 's' : ''}` : 'Solo Journey'}</div>
                          <div>{daysLeft} days left</div>
                        </div>
                      </div>

                      {/* Dynamic CTA depending on parent tab */}
                      {parentTab === 'my' ? (
                        <Link
                          href={`/goals/${goal._id}`}
                          style={{
                            background: 'var(--brand-soft)',
                            color: 'var(--brand)',
                            textDecoration: 'none',
                            padding: '7px 12px',
                            borderRadius: 9,
                            fontWeight: 700,
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                            minHeight: 36,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span>View Road</span>
                          <FiArrowRight style={{ fontSize: 13 }} />
                        </Link>
                      ) : isPending ? (
                        <span
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            padding: '6px 10px',
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FiClock style={{ fontSize: 12 }} />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickJoin(goal)}
                          disabled={joiningId === goal._id}
                          style={{
                            background: goal.goalType === 'open' ? 'var(--brand)' : 'var(--brand-soft)',
                            color: goal.goalType === 'open' ? '#fff' : 'var(--brand)',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: 9,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            minHeight: 36,
                            boxShadow: goal.goalType === 'open' ? '0 0 12px var(--neon-glow)' : 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {joiningId === goal._id ? (
                            'Joining...'
                          ) : goal.goalType === 'open' ? (
                            <>
                              <FiPlus style={{ fontSize: 14 }} />
                              <span>Join Now</span>
                            </>
                          ) : (
                            <>
                              <FiUserPlus style={{ fontSize: 14 }} />
                              <span>Request to Join</span>
                            </>
                          )}
                        </button>
                      )}
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
