'use client';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Avatar, { AVATAR_CONFIGS } from '@/components/Avatar';

const PARTICLES = [
  { x: 10, y: 20, size: 6, color: '#3b82f6', duration: 7 },
  { x: 85, y: 15, size: 10, color: '#60a5fa', duration: 9 },
  { x: 70, y: 60, size: 5, color: '#3cc7b4', duration: 8 },
  { x: 20, y: 70, size: 8, color: '#3b82f6', duration: 10 },
  { x: 90, y: 80, size: 4, color: '#60a5fa', duration: 6 },
  { x: 50, y: 10, size: 12, color: 'rgba(59,130,246,0.3)', duration: 11 },
  { x: 35, y: 85, size: 6, color: '#3fcf8e', duration: 9 },
  { x: 65, y: 30, size: 4, color: '#a3acba', duration: 7 },
];

const FEATURES = [
  {
    icon: '🎯',
    title: 'Goal Tracker',
    desc: 'Set ambitious targets and watch your custom avatar journey across the interactive roadmap.',
    color: '#3b82f6',
  },
  {
    icon: '📚',
    title: 'Learning Hub',
    desc: 'Curated resources and micro-milestones to build skills steadily every single day.',
    color: '#3cc7b4',
  },
  {
    icon: '✅',
    title: 'Habit Tracker',
    desc: 'Build powerful routines with checkpoints, streaks, reminders, and visual celebration markers.',
    color: '#3fcf8e',
  },
  {
    icon: '📊',
    title: 'Progress Analytics',
    desc: 'Real-time pace calculation, remaining distance, countdowns, and historical activity timeline.',
    color: '#60a5fa',
  },
];

const STEPS = [
  { num: '01', title: 'Set Your Goal', desc: 'Name your goal, define your target metric, set a deadline, and customize your avatar.' },
  { num: '02', title: 'Log Daily Updates', desc: 'Add daily or weekly progress. Watch your avatar smoothly advance along the neon path.' },
  { num: '03', title: 'Reach the Flag', desc: 'Unlock checkpoints, collect badges, and celebrate crossing the finish line.' },
];

export default function HomePage() {
  const [selectedAvatar, setSelectedAvatar] = useState(0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <Navbar />

      {/* HERO SECTION */}
      <section
        style={{
          position: 'relative',
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '80px 24px 60px',
        }}
      >
        {/* Animated background glowing orbs */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              x: [0, 30, 0],
              y: [0, -40, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '10%', left: '15%', width: 450, height: 450,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -40, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            style={{
              position: 'absolute', bottom: '15%', right: '10%', width: 500, height: 500,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,199,180,0.15) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />

          {/* Floating animated particles */}
          {PARTICLES.map((p, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -25, 0],
                x: [0, i % 2 === 0 ? 15 : -15, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{ duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: p.color,
                boxShadow: `0 0 10px ${p.color}`,
              }}
            />
          ))}
        </div>

        {/* Neon Grid overlay */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 940, margin: '0 auto', zIndex: 1 }}>
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'var(--brand-soft)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 100, padding: '7px 18px', marginBottom: 28,
              color: 'var(--neon-blue)', fontSize: 13, fontWeight: 700,
              boxShadow: '0 0 20px rgba(59,130,246,0.2)',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)', animation: 'pulse-glow 2s infinite', display: 'block' }} />
            Helping Hand · Personal Growth Platform
          </motion.div>

          {/* Hero title */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            style={{
              fontSize: 'clamp(54px, 8.5vw, 98px)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-3px',
              marginBottom: 24,
            }}
          >
            <span style={{ color: 'var(--ink)' }}>Grow</span>
            <br />
            <span className="gradient-text">Every Day</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
            style={{
              fontSize: 'clamp(17px, 2.5vw, 22px)',
              color: 'var(--ink-muted)',
              maxWidth: 640,
              margin: '0 auto 44px',
              lineHeight: 1.65,
            }}
          >
            Set meaningful targets, watch your custom avatar travel the journey map in real time, and achieve more with interactive visual tracking.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/goals/new"
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 14,
                  padding: '14px clamp(20px, 4vw, 36px)',
                  fontWeight: 700,
                  fontSize: 'clamp(14px, 2vw, 16px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 0 32px rgba(59,130,246,0.45)',
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                🚀 Create a Goal
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/goals"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  borderRadius: 14,
                  padding: '14px clamp(20px, 4vw, 36px)',
                  fontWeight: 700,
                  fontSize: 'clamp(14px, 2vw, 16px)',
                  border: '1px solid var(--line-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                👀 View Goals & Tracker
              </Link>
            </motion.div>
          </motion.div>

          {/* Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.6 }}
            style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: '20px 36px', flexWrap: 'wrap' }}
          >
            {[
              { val: '12K+', label: 'Goals Completed' },
              { val: '99.2%', label: 'Habit Consistency' },
              { val: 'Auth0', label: 'Per-User Secure Isolation' },
            ].map(({ val, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--neon-blue)', letterSpacing: '-0.5px' }}>{val}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-subtle)', marginTop: 2, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" style={{ padding: '90px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <p style={{ color: 'var(--brand)', fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            POWERFUL CAPABILITIES
          </p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--ink)' }}>
            Everything built for your <span className="gradient-text">daily growth</span>
          </h2>
          <p style={{ color: 'var(--ink-muted)', marginTop: 14, fontSize: 17, maxWidth: 520, margin: '14px auto 0' }}>
            A unified suite designed to keep you inspired, accountable, and focused.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, boxShadow: `0 0 24px ${f.color}33, 0 12px 32px rgba(0,0,0,0.4)` }}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 20,
                padding: 32,
                cursor: 'default',
                transition: 'border-color 0.25s',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `${f.color}18`,
                border: `1.5px solid ${f.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, marginBottom: 20,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ color: 'var(--ink-muted)', lineHeight: 1.6, fontSize: 14 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '90px 24px', background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: 'var(--brand)', fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
              EFFORTLESS WORKFLOW
            </p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--ink)' }}>
              How your journey <span className="gradient-text">unfolds</span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--line)',
                  borderRadius: 18,
                  padding: '28px 24px',
                  flex: '1 1 260px',
                  maxWidth: 300,
                  position: 'relative',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--brand), var(--teal))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 16, color: '#fff',
                  boxShadow: '0 0 16px var(--neon-glow)',
                  marginBottom: 18,
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>{step.title}</h3>
                <p style={{ color: 'var(--ink-muted)', lineHeight: 1.6, fontSize: 14 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AVATAR SHOWCASE */}
      <section style={{ padding: '90px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ color: 'var(--brand)', fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            CUSTOM COMPANIONS
          </p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--ink)' }}>
            Choose your <span className="gradient-text">avatar</span>
          </h2>
          <p style={{ color: 'var(--ink-muted)', marginTop: 14, fontSize: 17, maxWidth: 520, margin: '14px auto 0' }}>
            Select an avatar that represents you. They travel every step of your journey map.
          </p>
        </div>

        {/* Clickable Avatar selector preview */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {AVATAR_CONFIGS.map((av, i) => {
            const isSelected = selectedAvatar === i;
            return (
              <motion.div
                key={i}
                whileHover={{ scale: 1.08, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedAvatar(i)}
                style={{
                  background: isSelected ? 'var(--brand-soft)' : 'var(--surface)',
                  border: isSelected ? `2px solid ${av.tone}` : '1px solid var(--line)',
                  borderRadius: 20,
                  padding: '24px 20px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  cursor: 'pointer',
                  minWidth: 130,
                  boxShadow: isSelected ? `0 0 24px ${av.tone}55` : 'none',
                  transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
                }}
              >
                <div style={{
                  padding: 4, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${av.tone}, ${av.tone}66)`,
                  boxShadow: `0 0 16px ${av.tone}44`,
                }}>
                  <Avatar {...av} size={70} />
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: isSelected ? av.tone : 'var(--ink-muted)',
                }}>
                  Avatar {i + 1}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <Link
            href="/goals/new"
            style={{
              color: 'var(--brand)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 15,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            Create a goal with your companion →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
        padding: '36px 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>✋</span>
            <span style={{ fontWeight: 800, color: 'var(--ink)' }}>HelpingHand</span>
          </div>
          <p style={{ color: 'var(--ink-subtle)', fontSize: 13 }}>
            © 2026 HelpingHand. Secured with Auth0 & MongoDB.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Security', 'Docs'].map(l => (
              <span key={l} style={{ color: 'var(--ink-subtle)', fontSize: 13 }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
