'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import GoalJourneyMap, { CheckpointRewardItem } from '@/components/GoalJourneyMap';

interface LogEntry {
  _id?: string;
  userId?: string;
  username?: string;
  amount: number;
  note: string;
  date: string;
}

interface GoalMember {
  _id: string;
  user?: {
    _id: string;
    username: string;
    name: string;
    picture?: string;
  };
  auth0Id: string;
  role: 'creator' | 'member';
  status: 'active' | 'pending_approval' | 'invited';
  joinedAt: string;
  progress: number;
  log: LogEntry[];
}

interface RankingItem {
  memberId: string;
  userId: string;
  username: string;
  name: string;
  picture: string;
  progress: number;
  percentage: number;
  joinedAt: string;
  role: string;
}

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
  status: 'active' | 'completed' | 'abandoned';
  checkpoints: number;
  rewards: CheckpointRewardItem[];
  creator?: {
    _id: string;
    username: string;
    name: string;
    picture?: string;
  };
  members: GoalMember[];
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
          <p>Loading journey roadmap...</p>
        </div>
      }
    >
      <GoalJourneyContent />
    </Suspense>
  );
}

function GoalJourneyContent() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const [goal, setGoal] = useState<Goal | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'active' | 'pending_approval' | 'invited' | 'none'>('none');
  const [userProgress, setUserProgress] = useState(0);
  const [rankings, setRankings] = useState<RankingItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Logging progress state
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [logging, setLogging] = useState(false);
  const [unlockedRewardAlert, setUnlockedRewardAlert] = useState<string | null>(null);

  // Invite state
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  // Join state
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchGoalDetails = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/goals/${id}`);
      const data = await res.json();
      if (res.ok && data.goal) {
        setGoal(data.goal);
        setCurrentUserId(data.currentUserId || '');
        setCurrentUsername(data.currentUsername || '');
        setIsCreator(data.isCreator || false);
        setIsExpired(data.isExpired || false);
        setMembershipStatus(data.membershipStatus || 'none');
        setUserProgress(data.userProgress ?? data.goal.progress);
        setRankings(data.rankings || []);
      } else {
        setError(data.error || 'Goal not found.');
      }
    } catch {
      setError('Failed to load goal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalDetails();
  }, [id]);

  const handleLog = async (quickAmount?: number) => {
    const logAmount = quickAmount ?? Number(amount);
    if (!logAmount || logAmount <= 0) return;
    setLogging(true);
    setUnlockedRewardAlert(null);

    const oldProg = goal?.goalType === 'collaborative' || goal?.goalType === 'personal'
      ? (goal?.progress || 0)
      : userProgress;

    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: logAmount, note }),
      });
      const data = await res.json();
      if (res.ok && data.goal) {
        setGoal(data.goal);
        setAmount('');
        setNote('');
        fetchGoalDetails();

        // Check if a checkpoint reward was freshly unlocked!
        const newProg = oldProg + logAmount;
        const target = data.goal.target;
        const numCheckpoints = data.goal.checkpoints || 4;

        for (let i = 1; i <= numCheckpoints; i++) {
          const threshold = target * (i / numCheckpoints);
          if (oldProg < threshold && newProg >= threshold) {
            const rewardName = data.goal.rewards?.[i - 1]?.reward || `Milestone ${i} Reward`;
            setUnlockedRewardAlert(`🎉 Unlocked Checkpoint ${i} Reward: ${rewardName}!`);
            break;
          }
        }
      } else {
        alert(data.error || 'Failed to log progress');
      }
    } catch {
      alert('Error updating goal');
    } finally {
      setLogging(false);
    }
  };

  const handleJoinGoal = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/goals/${id}/join`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || data.error);
      fetchGoalDetails();
    } catch {
      alert('Failed to send join request.');
    } finally {
      setJoining(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviting(true);
    setInviteMsg('');

    try {
      const res = await fetch(`/api/goals/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: inviteUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMsg(data.message || 'Invitation sent!');
        setInviteUsername('');
        fetchGoalDetails();
      } else {
        setInviteMsg(data.error || 'Failed to invite user.');
      }
    } catch {
      setInviteMsg('Network error sending invite.');
    } finally {
      setInviting(false);
    }
  };

  const handleMemberAction = async (memberId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/goals/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchGoalDetails();
      } else {
        alert(data.error || 'Failed to update member');
      }
    } catch {
      alert('Network error updating member.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/goals');
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
        <p>Loading journey...</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
        <Navbar />
        <main style={{ maxWidth: 800, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>{error || 'Goal not found'}</h2>
          <Link
            href="/goals"
            style={{
              display: 'inline-block',
              marginTop: 16,
              background: 'var(--brand)',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            ← Back to Goals
          </Link>
        </main>
      </div>
    );
  }

  // Active progress depends on goal type:
  // - Collaborative & Personal: goal.progress
  // - Competitive & Open: viewing member's personal progress (or goal progress if not member)
  const displayProgress = goal.goalType === 'competitive' || goal.goalType === 'open'
    ? userProgress
    : goal.progress;

  const pct = goal.target > 0 ? Math.min(100, Math.round((displayProgress / goal.target) * 100)) : 0;
  const daysTotal = daysBetween(goal.startDate, goal.endDate);
  const nowStr = new Date().toISOString();
  const daysRemaining = Math.max(0, daysBetween(nowStr, goal.endDate));

  // Checkpoints list (4 to 20)
  const numCheckpoints = goal.checkpoints || 4;
  const checkpointsList = Array.from({ length: numCheckpoints }).map((_, i) => {
    const val = Math.round((goal.target * ((i + 1) / numCheckpoints)) * 10) / 10;
    const isReached = displayProgress >= val;
    const rewardText = goal.rewards?.[i]?.reward || `Milestone ${i + 1} Celebration 🎉`;
    return {
      index: i + 1,
      value: val,
      isReached,
      reward: rewardText,
    };
  });

  const pendingRequests = goal.members?.filter(m => m.status === 'pending_approval') || [];
  const invitedMembers = goal.members?.filter(m => m.status === 'invited') || [];
  const activeMembers = goal.members?.filter(m => m.status === 'active') || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 100px' }}>
        {/* Top Back & Admin Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <Link
            href="/goals"
            style={{
              color: 'var(--ink-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ← Back to all goals
          </Link>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Non-member Join CTA */}
            {membershipStatus === 'none' && !isCreator && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleJoinGoal}
                disabled={joining || isExpired}
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: isExpired ? 'not-allowed' : 'pointer',
                  opacity: isExpired ? 0.6 : 1,
                  boxShadow: '0 4px 14px var(--neon-glow)',
                }}
              >
                {joining
                  ? 'Joining...'
                  : goal.goalType === 'open'
                  ? '🌐 Join This Open Goal'
                  : '🤝 Request to Join Goal'}
              </motion.button>
            )}

            {membershipStatus === 'pending_approval' && (
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                ⏳ Join Request Pending Approval
              </span>
            )}

            {membershipStatus === 'invited' && (
              <button
                onClick={() => handleMemberAction(goal.members.find(m => m.auth0Id === currentUserId)?._id || '', 'accept')}
                style={{
                  background: '#3fcf8e',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ✓ Accept Invitation
              </button>
            )}

            {isCreator && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  borderRadius: 10,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Goal'}
              </button>
            )}
          </div>
        </div>

        {/* Milestone Unlock Alert Banner */}
        <AnimatePresence>
          {unlockedRewardAlert && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                padding: '16px 24px',
                borderRadius: 16,
                marginBottom: 24,
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>🏆</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{unlockedRewardAlert}</span>
              </div>
              <button
                onClick={() => setUnlockedRewardAlert(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Banner */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 20,
            padding: 32,
            marginBottom: 32,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {goal.goalType} Goal
              </span>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: goal.status === 'completed' ? 'rgba(63, 207, 142, 0.15)' : 'rgba(255,255,255,0.06)',
                  color: goal.status === 'completed' ? '#3fcf8e' : 'var(--ink-muted)',
                }}
              >
                {goal.status}
              </span>

              {isExpired && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                  }}
                >
                  Deadline Expired
                </span>
              )}

              <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
                {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, margin: '0 0 10px', color: 'var(--ink)' }}>
              {goal.name}
            </h1>

            {goal.description && (
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, margin: '0 0 12px', lineHeight: 1.5 }}>
                {goal.description}
              </p>
            )}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, color: 'var(--ink-muted)' }}>
              <span>
                Target: <strong style={{ color: 'var(--ink)' }}>{goal.target} {goal.unit}</strong>
              </span>
              <span>•</span>
              <span>
                Days Remaining: <strong style={{ color: 'var(--ink)' }}>{daysRemaining} of {daysTotal}</strong>
              </span>
              <span>•</span>
              <span>
                Created by: <strong style={{ color: 'var(--brand)' }}>@{goal.creator?.username || 'user'}</strong>
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: 200 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--brand)', lineHeight: 1 }}>
              {pct}%
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 4 }}>
              {displayProgress} / {goal.target} {goal.unit}
              {goal.goalType === 'competitive' || goal.goalType === 'open' ? ' (Your personal progress)' : ' (Overall goal progress)'}
            </div>
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 10,
                height: 10,
                width: '100%',
                marginTop: 12,
                overflow: 'hidden',
                border: '1px solid var(--line)',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(90deg, var(--brand), #60a5fa)',
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 10,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Journey Map Section ── */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 20,
            padding: 28,
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                Roadmap & Milestones
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, margin: '4px 0 0' }}>
                Follow your journey along the road. Click on any checkpoint marker to inspect its designated reward!
              </p>
            </div>
            <span
              style={{
                background: 'var(--brand-soft)',
                color: 'var(--brand)',
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {numCheckpoints} Checkpoints
            </span>
          </div>

          <GoalJourneyMap
            target={goal.target}
            progress={pct}
            unit={goal.unit}
            checkpoints={numCheckpoints}
            avatarIndex={goal.avatarIndex}
            goalName={goal.name}
            rewards={goal.rewards || []}
          />
        </div>

        {/* ── 4 to 20 Checkpoints & Rewards Interactive Showcase ── */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 20,
            padding: 28,
            marginBottom: 32,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🎁</span> Checkpoints & Rewards ({numCheckpoints} Milestones)
            </h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 4 }}>
              As you log progress towards your target, checkpoints automatically unlock and reveal your designated rewards.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {checkpointsList.map(cp => (
              <div
                key={cp.index}
                style={{
                  background: cp.isReached ? 'rgba(63, 207, 142, 0.08)' : 'var(--bg)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  border: `1.5px solid ${cp.isReached ? '#3fcf8e' : 'var(--line)'}`,
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: cp.isReached ? '#3fcf8e' : 'var(--line)',
                      color: cp.isReached ? '#fff' : 'var(--ink-muted)',
                    }}
                  >
                    Checkpoint {cp.index}
                  </span>

                  <span style={{ fontSize: 13, fontWeight: 700, color: cp.isReached ? '#3fcf8e' : 'var(--ink)' }}>
                    {cp.value} {goal.unit}
                  </span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {cp.reward}
                </div>

                <div style={{ fontSize: 12, color: cp.isReached ? '#3fcf8e' : 'var(--ink-muted)', fontWeight: 600 }}>
                  {cp.isReached ? '✓ Unlocked! Enjoy your reward' : `🔒 Needs ${(Math.max(0, cp.value - displayProgress)).toFixed(1)} ${goal.unit} more`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Competitive Leaderboard or Collaborative Team Overview ── */}
        {goal.goalType === 'competitive' && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: 28,
              marginBottom: 32,
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏆</span> Competition Leaderboard & Rankings
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 4 }}>
                Real-time competitor standings. Log your progress to climb the leaderboard!
              </p>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {rankings.map((r, idx) => {
                const rankBadge = idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`;
                const isMe = r.userId === currentUserId || r.username === currentUsername;
                return (
                  <div
                    key={r.memberId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      background: isMe ? 'var(--brand-soft)' : 'var(--bg)',
                      borderRadius: 14,
                      border: `1.5px solid ${isMe ? 'var(--brand)' : 'var(--line)'}`,
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, minWidth: 50, color: 'var(--brand)' }}>
                        {rankBadge}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>
                          {r.name} {isMe && '(You)'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                          @{r.username}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 16 }}>
                        {r.progress} {goal.unit}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700 }}>
                        {r.percentage}% of target
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {goal.goalType === 'collaborative' && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: 28,
              marginBottom: 32,
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🤝</span> Collaborative Team Members
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 4 }}>
                All active members contribute together to reach the goal target of {goal.target} {goal.unit}.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {activeMembers.map(m => {
                const u = m.user;
                const isMe = m.auth0Id === currentUserId;
                return (
                  <div
                    key={m._id}
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 14,
                      padding: '16px',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>
                        {u?.name || 'Member'} {isMe && '(You)'}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: m.role === 'creator' ? 'var(--brand-soft)' : 'var(--surface)',
                          color: m.role === 'creator' ? 'var(--brand)' : 'var(--ink-muted)',
                        }}
                      >
                        {m.role}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--brand)', marginBottom: 8 }}>
                      @{u?.username || 'member'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                      Contributed: <strong style={{ color: 'var(--ink)' }}>{m.progress} {goal.unit}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Creator Invites & Join Requests Management ── */}
        {isCreator && goal.goalType !== 'personal' && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: 28,
              marginBottom: 32,
              display: 'grid',
              gap: 24,
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚡</span> Goal Admin & Member Invitations
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 4 }}>
                Invite users by their unique username (@username) or approve incoming join requests.
              </p>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInviteUser} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ink-muted)',
                    fontWeight: 700,
                  }}
                >
                  @
                </span>
                <input
                  type="text"
                  placeholder="Enter unique username to invite..."
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 34px',
                    borderRadius: 12,
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={inviting || !inviteUsername.trim()}
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: inviting ? 'not-allowed' : 'pointer',
                  opacity: inviting ? 0.7 : 1,
                }}
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </form>

            {inviteMsg && (
              <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>
                {inviteMsg}
              </div>
            )}

            {/* Pending Requests to Join */}
            {pendingRequests.length > 0 && (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
                  Pending Join Requests ({pendingRequests.length})
                </h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {pendingRequests.map(req => (
                    <div
                      key={req._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg)',
                        padding: '12px 18px',
                        borderRadius: 12,
                        border: '1px solid var(--line)',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>
                          {req.user?.name || 'User'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--brand)' }}>
                          @{req.user?.username || 'user'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleMemberAction(req._id, 'accept')}
                          style={{
                            background: '#3fcf8e',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleMemberAction(req._id, 'reject')}
                          style={{
                            background: 'transparent',
                            color: 'var(--ink-muted)',
                            border: '1px solid var(--line)',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
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
          </div>
        )}

        {/* ── Progress Logging & History Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Progress Logger */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: 28,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: 'var(--ink)' }}>
              Log Your Progress
            </h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 18 }}>
              Advance along the roadmap and unlock rewards as you hit checkpoints!
            </p>

            {/* Quick buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[1, 5, 10, 25].map(inc => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleLog(inc)}
                  disabled={logging || goal.status === 'completed' || isExpired}
                  style={{
                    flex: 1,
                    minWidth: 60,
                    padding: '9px 12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  +{inc} {goal.unit}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Custom Amount ({goal.unit})
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="e.g. 15"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  disabled={logging || goal.status === 'completed' || isExpired}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Note / Reflection (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning sprint in the park"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  disabled={logging || goal.status === 'completed' || isExpired}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleLog()}
                disabled={logging || !amount || Number(amount) <= 0 || goal.status === 'completed' || isExpired}
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: logging || !amount ? 'not-allowed' : 'pointer',
                  opacity: logging || !amount ? 0.6 : 1,
                  boxShadow: '0 4px 14px var(--neon-glow)',
                  marginTop: 6,
                }}
              >
                {logging ? 'Recording...' : 'Log Progress'}
              </motion.button>
            </div>
          </div>

          {/* Activity Log Feed */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: 28,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: 'var(--ink)' }}>
              Activity History
            </h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 18 }}>
              Recent logs and milestone achievements.
            </p>

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'grid', gap: 10 }}>
              {(!goal.log || goal.log.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-muted)', fontSize: 14 }}>
                  No progress logged yet. Make your first entry above!
                </div>
              ) : (
                [...goal.log].reverse().map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'var(--bg)',
                      borderRadius: 12,
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>
                        +{entry.amount} {goal.unit}
                        {entry.username && (
                          <span style={{ fontSize: 12, color: 'var(--brand)', marginLeft: 8 }}>
                            @{entry.username}
                          </span>
                        )}
                      </div>
                      {entry.note && (
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                          {entry.note}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      {formatDate(entry.date)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
