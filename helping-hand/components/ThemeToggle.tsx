'use client';
import { useState, useEffect } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

interface ThemeToggleProps {
  variant?: 'button' | 'menu-item';
  className?: string;
  onThemeChange?: (theme: 'dark' | 'light') => void;
}

export default function ThemeToggle({ variant = 'button', className = '', onThemeChange }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const updateTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    try {
      localStorage.setItem('hh-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      window.dispatchEvent(new Event('theme-change'));
      onThemeChange?.(newTheme);
    } catch {}
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('hh-theme') as 'dark' | 'light' | null;
      if (stored) {
        setTheme(stored);
        document.documentElement.setAttribute('data-theme', stored);
      }
    } catch {}

    const handleSync = () => {
      try {
        const current = (localStorage.getItem('hh-theme') as 'dark' | 'light') || 'dark';
        setTheme(current);
      } catch {}
    };

    window.addEventListener('theme-change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('theme-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    updateTheme(next);
  };

  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={toggle}
        className={className}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderRadius: 10,
          background: 'var(--surface-raised)',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          fontWeight: 600,
          textAlign: 'left',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {theme === 'dark' ? (
            <FiMoon style={{ fontSize: 18, color: '#a78bfa' }} />
          ) : (
            <FiSun style={{ fontSize: 18, color: '#f59e0b' }} />
          )}
          <span>Theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
        </div>

        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 20,
            background: 'var(--brand-soft)',
            color: 'var(--brand)',
            border: '1px solid var(--brand)',
          }}
        >
          Switch to {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--ink-muted)',
        fontSize: 14,
        transition: 'all 0.2s ease',
        fontFamily: 'var(--font-sans)',
        minHeight: 40,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)';
        (e.currentTarget as HTMLElement).style.color = 'var(--brand)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
        (e.currentTarget as HTMLElement).style.color = 'var(--ink-muted)';
      }}
    >
      {theme === 'dark' ? (
        <>
          <FiSun style={{ fontSize: 16, color: '#f59e0b' }} />
          <span>Light</span>
        </>
      ) : (
        <>
          <FiMoon style={{ fontSize: 16, color: '#6366f1' }} />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
