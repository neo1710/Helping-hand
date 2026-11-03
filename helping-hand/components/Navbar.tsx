'use client';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@auth0/nextjs-auth0/client';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading } = useUser();

  return (
    <nav
      style={{
        background: 'rgba(20,25,32,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <motion.span
            whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.15 }}
            transition={{ duration: 0.5 }}
            style={{ fontSize: 28, display: 'inline-block', cursor: 'pointer' }}
          >
            ✋
          </motion.span>
          <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
            Helping<span style={{ color: 'var(--brand)', textShadow: '0 0 12px var(--neon-glow)' }}>Hand</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden-mobile">
          {[
            { href: '/goals', label: 'Goals' },
            { href: '/goals/new', label: 'New Goal' },
            { href: '/profile', label: 'Profile' },
            { href: '/#features', label: 'Features' },
            { href: '/#how-it-works', label: 'How It Works' },
          ].map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              style={{
                color: 'var(--ink-muted)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.2s ease',
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
              {label}
            </Link>
          ))}
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />

          {/* Auth0 User profile or Login button */}
          {!isLoading && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                  color: 'inherit',
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
                <span className="hidden-mobile" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {user.name || user.email}
                </span>
              </Link>

              <a
                href="/auth/logout"
                style={{
                  color: 'var(--ink-subtle)',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  transition: 'all 0.2s',
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
                Log Out
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
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.color = 'var(--brand)';
                  el.style.borderColor = 'var(--brand)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.color = 'var(--ink-muted)';
                  el.style.borderColor = 'var(--line)';
                }}
              >
                Log In
              </a>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/goals"
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: 9,
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 0 16px var(--neon-glow)',
                  }}
                >
                  Get Started →
                </Link>
              </motion.div>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="mobile-only-btn"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '6px 10px',
              color: 'var(--ink)',
              cursor: 'pointer',
              fontSize: 18,
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? '✕' : '☰'}
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
              padding: '16px 0 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {[
              { href: '/goals', label: 'Goals' },
              { href: '/goals/new', label: 'Set New Goal' },
              { href: '/profile', label: 'Profile & Settings' },
              { href: '/#features', label: 'Features' },
              { href: '/#how-it-works', label: 'How It Works' },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                style={{
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '8px 0',
                }}
              >
                {label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .mobile-only-btn { display: none; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-only-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
