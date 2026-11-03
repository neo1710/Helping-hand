'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  FiBell,
  FiTarget,
  FiPlusCircle,
  FiUser,
  FiCompass,
  FiMap,
  FiLogOut,
  FiLogIn,
  FiMenu,
  FiX,
  FiArrowRight,
} from 'react-icons/fi';
import { HiHandRaised } from 'react-icons/hi2';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading } = useUser();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch('/api/notifications')
      .then(async r => {
        if (r.ok) {
          const data = await r.json();
          if (typeof data.pendingActionCount === 'number') {
            setPendingCount(data.pendingActionCount);
          }
        }
      })
      .catch(() => {});
  }, []);

  const navLinks = [
    { href: '/goals', label: 'Goals' },
    { href: '/goals/new', label: 'New Goal' },
    { href: '/notifications', label: 'Notifications', badge: pendingCount },
    { href: '/profile', label: 'Profile' },
    { href: '/#features', label: 'Features' },
    { href: '/#how-it-works', label: 'How It Works' },
  ];

  const mobileNavItems = [
    { href: '/goals', label: 'All Goals', icon: FiTarget },
    { href: '/goals/new', label: 'Create New Goal', icon: FiPlusCircle },
    { href: '/notifications', label: 'Notifications', icon: FiBell, badge: pendingCount },
    { href: '/profile', label: 'Profile & Settings', icon: FiUser },
    { href: '/#features', label: 'Features', icon: FiCompass },
    { href: '/#how-it-works', label: 'How It Works', icon: FiMap },
  ];

  return (
    <nav
      style={{
        background: 'rgba(20,25,32,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 clamp(16px, 3vw, 24px)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          gap: 12,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <motion.span
            whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.15 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <HiHandRaised style={{ fontSize: 26, color: 'var(--brand)' }} />
          </motion.span>
          <span
            style={{
              fontWeight: 800,
              fontSize: 'clamp(17px, 3.5vw, 20px)',
              color: 'var(--ink)',
              letterSpacing: '-0.5px',
            }}
          >
            Helping<span style={{ color: 'var(--brand)', textShadow: '0 0 12px var(--neon-glow)' }}>Hand</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="hidden-mobile">
          {navLinks.map(({ href, label, badge }) => (
            <Link
              key={label}
              href={href}
              style={{
                color: 'var(--ink-muted)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = 'var(--brand)';
                el.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = 'var(--ink-muted)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <span>{label}</span>
              {badge !== undefined && badge > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '1px 6px',
                    lineHeight: '16px',
                  }}
                >
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Notification bell on mobile or top right */}
          <Link
            href="/notifications"
            className="mobile-only"
            style={{
              position: 'relative',
              textDecoration: 'none',
              padding: '8px',
              borderRadius: 8,
              color: 'var(--ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Notifications"
          >
            <FiBell style={{ fontSize: 20 }} />
            {pendingCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pendingCount}
              </span>
            )}
          </Link>

          {/* Desktop Only Theme Toggle */}
          <ThemeToggle className="hidden-mobile" />

          {/* User profile or Login */}
          {!isLoading && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '4px',
                  borderRadius: 20,
                }}
                title="View & Edit Profile"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || 'User avatar'}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '2px solid var(--brand)',
                      boxShadow: '0 0 10px var(--neon-glow)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--brand-soft)',
                      color: 'var(--brand)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}
                  >
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className="hidden-mobile"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name || user.email}
                </span>
              </Link>

              <a
                href="/auth/logout"
                className="hidden-mobile"
                style={{
                  color: 'var(--ink-subtle)',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.color = 'var(--danger)';
                  el.style.borderColor = 'var(--danger)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.color = 'var(--ink-subtle)';
                  el.style.borderColor = 'var(--line)';
                }}
              >
                <FiLogOut style={{ fontSize: 14 }} />
                <span>Log Out</span>
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a
                href="/auth/login"
                style={{
                  color: 'var(--ink-muted)',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FiLogIn style={{ fontSize: 14 }} />
                <span>Log In</span>
              </a>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="hidden-mobile">
                <Link
                  href="/goals"
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: 9,
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 0 16px var(--neon-glow)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>Get Started</span>
                  <FiArrowRight style={{ fontSize: 14 }} />
                </Link>
              </motion.div>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="mobile-only-btn touch-target"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '8px 10px',
              color: 'var(--ink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <FiX style={{ fontSize: 22 }} /> : <FiMenu style={{ fontSize: 22 }} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              borderTop: '1px solid var(--line)',
              padding: '16px 0 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {mobileNavItems.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                style={{
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--surface-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon style={{ fontSize: 18, color: 'var(--brand)' }} />
                  <span>{label}</span>
                </div>
                {badge !== undefined && badge > 0 && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '2px 8px',
                    }}
                  >
                    {badge} new
                  </span>
                )}
              </Link>
            ))}

            {/* Light / Dark Mode Toggle ONLY in Mobile Drawer for mobile */}
            <ThemeToggle variant="menu-item" />

            {user ? (
              <a
                href="/auth/logout"
                style={{
                  color: '#ef4444',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <FiLogOut style={{ fontSize: 18 }} />
                <span>Log Out</span>
              </a>
            ) : (
              <a
                href="/auth/login"
                style={{
                  color: 'var(--brand)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--brand)',
                  background: 'var(--brand-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <FiLogIn style={{ fontSize: 18 }} />
                <span>Log In</span>
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
