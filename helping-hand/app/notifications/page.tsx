'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft,
  FiMail,
  FiInbox,
  FiSend,
  FiCheck,
  FiClock,
  FiArrowRight,
  FiCheckCircle,
} from 'react-icons/fi';
import Navbar from '@/components/Navbar';

interface InvitedGoal {
  _id: string;
  name: string;
  goalType: string;
  target: number;
  unit: string;
  endDate: string;
  creator?: {
    username?: string;
    name?: string;
    picture?: string;
  };
}

interface SentRequestGoal {
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

interface ReceivedRequest {
  goalId: string;
  goalName: string;
  goalType: string;
  memberId: string;
  user: {
    _id?: unknown;
    username?: string;
    name?: string;
    picture?: string;
  };
  joinedAt: string;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'invites' | 'incoming' | 'sent'>('invites');
  const [invitations, setInvitations] = useState<InvitedGoal[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequestGoal[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ReceivedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setInvitations(data.invitations || []);
        setSentRequests(data.sentRequests || []);
        setReceivedRequests(data.receivedRequests || []);
      } else {
        setError(data.error || 'Failed to load notifications.');
      }
    } catch {
      setError('Network error loading notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRespondInvite = async (goalId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/goals/${goalId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setInvitations(prev => prev.filter(inv => inv._id !== goalId));
        setActionSuccess(action === 'accept' ? 'You have joined the goal!' : 'Invitation declined.');
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        alert(data.error || 'Failed to respond to invite');
      }
    } catch {
      alert('Error updating invite');
    }
  };

  const handleRespondIncomingRequest = async (goalId: string, memberId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/goals/${goalId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setReceivedRequests(prev => prev.filter(r => r.memberId !== memberId));
        setActionSuccess(action === 'accept' ? 'Request approved!' : 'Request declined.');
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        alert(data.error || 'Failed to update request');
      }
    } catch {
      alert('Error updating request');
    }
  };

  const handleCancelSentRequest = async (goalId: string) => {
    if (!confirm('Cancel your request to join this goal?')) return;
    try {
      const res = await fetch(`/api/goals/${goalId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });
      if (res.ok) {
        setSentRequests(prev => prev.filter(r => r._id !== goalId));
        setActionSuccess('Request cancelled.');
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch {
      alert('Error cancelling request');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main
        style={{
          maxWidth: 860,
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
            Notifications & Requests
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 6, fontSize: 'clamp(14px, 2vw, 16px)' }}>
            Manage incoming invitations, review join requests for your goals, and track your sent requests.
          </p>
        </div>

        {/* Action Success Toast */}
        <AnimatePresence>
          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(63, 207, 142, 0.15)',
                border: '1.5px solid #3fcf8e',
                color: '#3fcf8e',
                padding: '12px 18px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              {actionSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <div className="tabs-scroll" style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setActiveTab('invites')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              border: `1.5px solid ${activeTab === 'invites' ? 'var(--brand)' : 'var(--line)'}`,
              background: activeTab === 'invites' ? 'var(--brand-soft)' : 'var(--surface)',
              color: activeTab === 'invites' ? 'var(--brand)' : 'var(--ink-muted)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 44,
            }}
          >
            <FiMail style={{ fontSize: 16 }} />
            <span>Invitations Received</span>
            {invitations.length > 0 && (
              <span
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {invitations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              border: `1.5px solid ${activeTab === 'incoming' ? 'var(--brand)' : 'var(--line)'}`,
              background: activeTab === 'incoming' ? 'var(--brand-soft)' : 'var(--surface)',
              color: activeTab === 'incoming' ? 'var(--brand)' : 'var(--ink-muted)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 44,
            }}
          >
            <FiInbox style={{ fontSize: 16 }} />
            <span>Requests on My Goals</span>
            {receivedRequests.length > 0 && (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {receivedRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              border: `1.5px solid ${activeTab === 'sent' ? 'var(--brand)' : 'var(--line)'}`,
              background: activeTab === 'sent' ? 'var(--brand-soft)' : 'var(--surface)',
              color: activeTab === 'sent' ? 'var(--brand)' : 'var(--ink-muted)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 44,
            }}
          >
            <FiSend style={{ fontSize: 16 }} />
            <span>My Sent Requests</span>
            {sentRequests.length > 0 && (
              <span
                style={{
                  background: 'var(--line-strong)',
                  color: 'var(--ink)',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {sentRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
            Loading notification updates...
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div
            style={{
              padding: 16,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#f87171',
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* 1. Tab: Invitations Received */}
        {!loading && activeTab === 'invites' && (
          <div>
            {invitations.length === 0 ? (
              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: 18,
                  padding: '50px 20px',
                  textAlign: 'center',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <FiMail style={{ fontSize: 40, color: 'var(--brand)' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  No invitations right now
                </h3>
                <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
                  When someone invites you to join their collaborative or competitive goal, it will show up here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {invitations.map(inv => (
                  <div
                    key={inv._id}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: 16,
                      padding: 'clamp(16px, 3vw, 22px)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 14,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: 'var(--brand-soft)',
                            color: 'var(--brand)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {inv.goalType} Goal
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                          Target: {inv.target} {inv.unit}
                        </span>
                      </div>

                      <Link
                        href={`/goals/${inv._id}`}
                        style={{
                          textDecoration: 'none',
                          color: 'var(--ink)',
                          fontSize: 'clamp(16px, 3vw, 19px)',
                          fontWeight: 800,
                        }}
                      >
                        {inv.name}
                      </Link>

                      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
                        Invited by <span style={{ color: 'var(--brand)', fontWeight: 600 }}>@{inv.creator?.username || 'user'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleRespondInvite(inv._id, 'accept')}
                        style={{
                          background: 'var(--brand)',
                          color: '#fff',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: 13.5,
                          cursor: 'pointer',
                          minHeight: 42,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <FiCheck style={{ fontSize: 16 }} />
                        <span>Accept & Join</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondInvite(inv._id, 'reject')}
                        style={{
                          background: 'transparent',
                          color: 'var(--ink-muted)',
                          border: '1px solid var(--line)',
                          padding: '10px 16px',
                          borderRadius: 10,
                          fontWeight: 600,
                          fontSize: 13.5,
                          cursor: 'pointer',
                          minHeight: 42,
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Tab: Incoming Requests on My Goals */}
        {!loading && activeTab === 'incoming' && (
          <div>
            {receivedRequests.length === 0 ? (
              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: 18,
                  padding: '50px 20px',
                  textAlign: 'center',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <FiCheckCircle style={{ fontSize: 40, color: 'var(--brand)' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  No pending requests to approve
                </h3>
                <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
                  When other users request to join your collaborative or competitive goals, you can review and accept them here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {receivedRequests.map(req => (
                  <div
                    key={req.memberId}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: 16,
                      padding: 'clamp(16px, 3vw, 22px)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 14,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>
                          Request for: {req.goalName}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 10,
                            background: 'var(--surface-raised)',
                            color: 'var(--ink-muted)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {req.goalType}
                        </span>
                      </div>

                      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
                        {req.user.name}
                      </div>

                      <div style={{ fontSize: 13, color: 'var(--brand)', marginTop: 2 }}>
                        @{req.user.username}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleRespondIncomingRequest(req.goalId, req.memberId, 'accept')}
                        style={{
                          background: '#3fcf8e',
                          color: '#fff',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: 13.5,
                          cursor: 'pointer',
                          minHeight: 42,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <FiCheck style={{ fontSize: 16 }} />
                        <span>Approve Request</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondIncomingRequest(req.goalId, req.memberId, 'reject')}
                        style={{
                          background: 'transparent',
                          color: 'var(--ink-muted)',
                          border: '1px solid var(--line)',
                          padding: '10px 16px',
                          borderRadius: 10,
                          fontWeight: 600,
                          fontSize: 13.5,
                          cursor: 'pointer',
                          minHeight: 42,
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Tab: My Sent Requests */}
        {!loading && activeTab === 'sent' && (
          <div>
            {sentRequests.length === 0 ? (
              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: 18,
                  padding: '50px 20px',
                  textAlign: 'center',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <FiSend style={{ fontSize: 40, color: 'var(--brand)' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  No sent requests pending
                </h3>
                <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
                  You haven&apos;t requested to join any other user&apos;s goals right now. Explore public goals to collaborate or compete!
                </p>
                <Link
                  href="/goals"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 14,
                    background: 'var(--brand)',
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '9px 18px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13.5,
                  }}
                >
                  <span>Explore Public Goals</span>
                  <FiArrowRight style={{ fontSize: 14 }} />
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {sentRequests.map(req => (
                  <div
                    key={req._id}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: 16,
                      padding: 'clamp(16px, 3vw, 22px)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 14,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: 'var(--brand-soft)',
                            color: 'var(--brand)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {req.goalType} Goal
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FiClock style={{ fontSize: 12 }} />
                          <span>Pending Approval</span>
                        </span>
                      </div>

                      <Link
                        href={`/goals/${req._id}`}
                        style={{
                          textDecoration: 'none',
                          color: 'var(--ink)',
                          fontSize: 'clamp(16px, 3vw, 19px)',
                          fontWeight: 800,
                        }}
                      >
                        {req.name}
                      </Link>

                      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
                        Created by <span style={{ color: 'var(--brand)', fontWeight: 600 }}>@{req.creator?.username || 'user'}</span> • Target: {req.target} {req.unit}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCancelSentRequest(req._id)}
                      style={{
                        background: 'transparent',
                        color: 'var(--ink-muted)',
                        border: '1px solid var(--line)',
                        padding: '9px 16px',
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        minHeight: 40,
                      }}
                    >
                      Cancel Request
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

