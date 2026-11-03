'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft,
  FiCheck,
  FiShuffle,
  FiPlusCircle,
  FiSmile,
  FiSliders,
  FiEye,
  FiTag,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
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
        minHeight: 380,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        borderRadius: 24,
        border: '1px solid var(--line)',
        color: 'var(--brand)',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      Initializing 3D Studio...
    </div>
  ),
});

// Available color palettes for custom companion creation
const SKIN_TONES = [
  { label: 'Fair Light', color: '#fce4d6' },
  { label: 'Warm Peach', color: '#f0c4a0' },
  { label: 'Golden Almond', color: '#e0a982' },
  { label: 'Tan Caramel', color: '#c98e66' },
  { label: 'Rich Bronze', color: '#a0633b' },
  { label: 'Deep Cocoa', color: '#663d23' },
];

const HAIR_STYLES = [
  { id: 'short', label: 'Short Crop' },
  { id: 'long', label: 'Flowing Long' },
  { id: 'bun', label: 'Top Bun' },
  { id: 'curly', label: 'Curly Bobble' },
  { id: 'spiky', label: 'Spiky Anime' },
  { id: 'afro', label: 'Cloud Afro' },
  { id: 'bald', label: 'Smooth Bald' },
];

const HAIR_COLORS = [
  { label: 'Midnight Black', color: '#181412' },
  { label: 'Dark Brunette', color: '#2b2118' },
  { label: 'Chestnut Brown', color: '#573319' },
  { label: 'Auburn Rust', color: '#8d3e1f' },
  { label: 'Golden Blonde', color: '#d4a359' },
  { label: 'Silver Mist', color: '#94a3b8' },
  { label: 'Neon Cyan', color: '#06b6d4' },
  { label: 'Electric Violet', color: '#8b5cf6' },
  { label: 'Ruby Crimson', color: '#e11d48' },
];

const EYE_COLORS = [
  { label: 'Deep Obsidian', color: '#1a1a2e' },
  { label: 'Emerald Jade', color: '#059669' },
  { label: 'Sky Azure', color: '#0284c7' },
  { label: 'Warm Hazel', color: '#d97706' },
  { label: 'Amethyst Purple', color: '#7c3aed' },
  { label: 'Crimson Red', color: '#dc2626' },
];

const AURA_TONES = [
  { label: 'Sapphire Blue', color: '#3b82f6' },
  { label: 'Mint Cyan', color: '#14b8a6' },
  { label: 'Emerald Jade', color: '#10b981' },
  { label: 'Sunset Coral', color: '#f43f5e' },
  { label: 'Cosmic Violet', color: '#8b5cf6' },
  { label: 'Solar Amber', color: '#f59e0b' },
  { label: 'Silver Platinum', color: '#94a3b8' },
];

const ACCESSORIES = [
  { id: 'none', label: 'None' },
  { id: 'glasses', label: 'Spectacles' },
  { id: 'sunglasses', label: 'Sunglasses' },
  { id: 'headband', label: 'Hero Headband' },
  { id: 'cap', label: 'Cap' },
];

const EXPRESSIONS = [
  { id: 'happy', label: 'Joyful' },
  { id: 'determined', label: 'Determined' },
  { id: 'chill', label: 'Chill' },
  { id: 'confident', label: 'Confident' },
];

// Presets for instant fun inspiration
const PRESETS: AvatarConfig[] = [
  {
    name: 'Cyber Blade',
    tone: '#06b6d4',
    skin: '#f0c4a0',
    hairStyle: 'spiky',
    hairColor: '#06b6d4',
    eyesColor: '#0284c7',
    clothingStyle: 'armor',
    accessory: 'sunglasses',
    expression: 'confident',
  },
  {
    name: 'Solar Scout',
    tone: '#f59e0b',
    skin: '#c98e66',
    hairStyle: 'short',
    hairColor: '#2b2118',
    eyesColor: '#d97706',
    clothingStyle: 'hoodie',
    accessory: 'cap',
    expression: 'happy',
  },
  {
    name: 'Astral Sage',
    tone: '#8b5cf6',
    skin: '#fce4d6',
    hairStyle: 'long',
    hairColor: '#8b5cf6',
    eyesColor: '#7c3aed',
    clothingStyle: 'hoodie',
    accessory: 'headband',
    expression: 'determined',
  },
  {
    name: 'Echo Runner',
    tone: '#10b981',
    skin: '#a0633b',
    hairStyle: 'curly',
    hairColor: '#181412',
    eyesColor: '#059669',
    clothingStyle: 'hoodie',
    accessory: 'glasses',
    expression: 'chill',
  },
];

export default function CustomAvatarStudioPage() {
  const router = useRouter();

  // Active custom avatar configuration
  const [avatar, setAvatar] = useState<AvatarConfig>({
    name: 'My Custom Companion',
    tone: '#3b82f6',
    skin: '#f0c4a0',
    hairStyle: 'short',
    hairColor: '#2b2118',
    eyesColor: '#1a1a2e',
    clothingStyle: 'hoodie',
    accessory: 'none',
    expression: 'happy',
  });

  const [activeTab, setActiveTab] = useState<'hair' | 'face' | 'aura' | 'accessories'>('hair');
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // ── Load user's saved avatar on initial mount ──
  useEffect(() => {
    async function loadSavedAvatar() {
      try {
        const res = await fetch('/api/user/avatar');
        const data = await res.json();
        if (res.ok && data.customAvatar) {
          setAvatar(data.customAvatar);
        }
      } catch (err) {
        console.warn('Could not load existing custom avatar:', err);
      }
    }
    loadSavedAvatar();
  }, []);

  // ── Save Avatar to user profile in MongoDB ──
  const handleSaveAvatar = async (redirectTarget?: string) => {
    setSaving(true);
    setToastMsg('');
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(avatar),
      });
      const data = await res.json();

      if (res.ok) {
        setToastMsg('Custom avatar saved! Ready for your goal roadmap.');
        setTimeout(() => setToastMsg(''), 3500);

        if (redirectTarget) {
          router.push(redirectTarget);
        }
      } else {
        alert(data.error || 'Failed to save custom avatar');
      }
    } catch {
      alert('Network error saving custom avatar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Randomize avatar configuration ──
  const handleRandomize = () => {
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].color;
    const randomHair = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id;
    const randomHairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].color;
    const randomEyes = EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)].color;
    const randomTone = AURA_TONES[Math.floor(Math.random() * AURA_TONES.length)].color;
    const randomAcc = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)].id;
    const randomExp = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)].id;

    const titles = ['Nova', 'Vortex', 'Kairo', 'Orion', 'Zephyr', 'Astra', 'Zenith', 'Sol'];
    const randomName = `${titles[Math.floor(Math.random() * titles.length)]} Hero`;

    setAvatar({
      name: randomName,
      tone: randomTone,
      skin: randomSkin,
      hairStyle: randomHair,
      hairColor: randomHairColor,
      eyesColor: randomEyes,
      clothingStyle: 'hoodie',
      accessory: randomAcc,
      expression: randomExp,
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <Navbar />

      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'clamp(16px, 3.5vw, 36px) clamp(14px, 3vw, 24px) 100px',
        }}
      >
        {/* Back Link & Header */}
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/goals"
            style={{
              color: 'var(--ink-muted)',
              textDecoration: 'none',
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            <FiArrowLeft />
            <span>Back to Goals</span>
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h1
                style={{
                  fontSize: 'clamp(24px, 5vw, 36px)',
                  fontWeight: 900,
                  color: 'var(--ink)',
                  letterSpacing: '-1px',
                  lineHeight: 1.2,
                }}
              >
                3D Avatar Studio
              </h1>
              <p style={{ color: 'var(--ink-muted)', marginTop: 6, fontSize: 'clamp(13.5px, 2vw, 15px)' }}>
                Customize your unique 3D hero companion with 360° inspection for your goal roadmaps and leaderboards!
              </p>
            </div>

            {/* Quick Inspiration Pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRandomize}
                style={{
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  border: '1.5px solid var(--line)',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 38,
                }}
              >
                <FiShuffle style={{ fontSize: 14, color: 'var(--brand)' }} />
                <span>Randomize</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert Toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(63, 207, 142, 0.15)',
                border: '1.5px solid #3fcf8e',
                color: '#3fcf8e',
                padding: '12px 18px',
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FiCheck style={{ fontSize: 18 }} />
              <span>{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Studio Grid (3D Viewport on Left, Control Panels on Right) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* ── Left Column: 3D Interactive Viewport ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ height: 480, position: 'relative' }}>
              <Avatar3DCanvas config={avatar} />
            </div>

            {/* Live 2D Roadmap & Leaderboard Preview Card */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 20,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar config={avatar} size={54} glow />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                    {avatar.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                    How your companion looks on the Roadmap Pin & Leaderboard
                  </div>
                </div>
              </div>

              {/* Ready Badge */}
              <span
                style={{
                  background: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <HiSparkles style={{ fontSize: 13 }} />
                <span>Roadmap Ready</span>
              </span>
            </div>

            {/* Quick Inspiration Presets */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 20,
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick Inspiration Themes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                {PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setAvatar({ ...p })}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Avatar config={p} size={28} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Column: Studio Customization Controls ── */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 24,
              padding: 'clamp(18px, 3.5vw, 28px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            {/* Hero Companion Name */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
                <FiTag style={{ color: 'var(--brand)' }} />
                <span>Companion Hero Name</span>
              </label>
              <input
                type="text"
                value={avatar.name}
                maxLength={30}
                onChange={e => setAvatar(a => ({ ...a, name: e.target.value }))}
                placeholder="Give your companion a name (e.g. Astra)"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: 15,
                  fontWeight: 600,
                  outline: 'none',
                  minHeight: 46,
                }}
              />
            </div>

            {/* Category Navigation Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                background: 'var(--bg)',
                padding: 4,
                borderRadius: 14,
                border: '1px solid var(--line)',
                gap: 4,
              }}
            >
              {[
                { id: 'hair', label: 'Hair & Style', icon: FiSliders },
                { id: 'face', label: 'Skin & Eyes', icon: FiEye },
                { id: 'aura', label: 'Aura Tone', icon: HiSparkles },
                { id: 'accessories', label: 'Accessories', icon: FiSmile },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: 'none',
                      background: isActive ? 'var(--surface)' : 'transparent',
                      color: isActive ? 'var(--brand)' : 'var(--ink-muted)',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Icon style={{ fontSize: 16 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── 1. Hair & Style Tab ── */}
            {activeTab === 'hair' && (
              <div style={{ display: 'grid', gap: 18 }}>
                {/* Hairstyle options */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                    Hairstyle Cut
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 8 }}>
                    {HAIR_STYLES.map(hs => {
                      const isSelected = avatar.hairStyle === hs.id;
                      return (
                        <button
                          key={hs.id}
                          type="button"
                          onClick={() => setAvatar(a => ({ ...a, hairStyle: hs.id }))}
                          style={{
                            padding: '10px 8px',
                            borderRadius: 12,
                            border: `1.5px solid ${isSelected ? 'var(--brand)' : 'var(--line)'}`,
                            background: isSelected ? 'var(--brand-soft)' : 'var(--bg)',
                            color: isSelected ? 'var(--brand)' : 'var(--ink)',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: 12,
                            cursor: 'pointer',
                            textAlign: 'center',
                            minHeight: 44,
                          }}
                        >
                          {hs.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hair Color Palette */}
                {avatar.hairStyle !== 'bald' && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                      Hair Color
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {HAIR_COLORS.map(hc => {
                        const isSelected = avatar.hairColor === hc.color;
                        return (
                          <button
                            key={hc.color}
                            type="button"
                            onClick={() => setAvatar(a => ({ ...a, hairColor: hc.color }))}
                            title={hc.label}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: hc.color,
                              border: isSelected ? '3px solid var(--brand)' : '2px solid rgba(255,255,255,0.2)',
                              boxShadow: isSelected ? '0 0 12px var(--brand)' : 'none',
                              cursor: 'pointer',
                              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                              transition: 'transform 0.15s ease',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 2. Skin & Face Tab ── */}
            {activeTab === 'face' && (
              <div style={{ display: 'grid', gap: 18 }}>
                {/* Skin tone palette */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                    Skin Complexion
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {SKIN_TONES.map(sk => {
                      const isSelected = avatar.skin === sk.color;
                      return (
                        <button
                          key={sk.color}
                          type="button"
                          onClick={() => setAvatar(a => ({ ...a, skin: sk.color }))}
                          title={sk.label}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: sk.color,
                            border: isSelected ? '3px solid var(--brand)' : '2px solid rgba(0,0,0,0.15)',
                            boxShadow: isSelected ? '0 0 12px var(--brand)' : 'none',
                            cursor: 'pointer',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.15s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Eye Color */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                    Eye Color
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {EYE_COLORS.map(ec => {
                      const isSelected = avatar.eyesColor === ec.color;
                      return (
                        <button
                          key={ec.color}
                          type="button"
                          onClick={() => setAvatar(a => ({ ...a, eyesColor: ec.color }))}
                          title={ec.label}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: ec.color,
                            border: isSelected ? '3px solid var(--brand)' : '2px solid rgba(255,255,255,0.2)',
                            boxShadow: isSelected ? '0 0 12px var(--brand)' : 'none',
                            cursor: 'pointer',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.15s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Expression */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                    Facial Expression
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 8 }}>
                    {EXPRESSIONS.map(exp => {
                      const isSelected = avatar.expression === exp.id;
                      return (
                        <button
                          key={exp.id}
                          type="button"
                          onClick={() => setAvatar(a => ({ ...a, expression: exp.id }))}
                          style={{
                            padding: '10px 8px',
                            borderRadius: 12,
                            border: `1.5px solid ${isSelected ? 'var(--brand)' : 'var(--line)'}`,
                            background: isSelected ? 'var(--brand-soft)' : 'var(--bg)',
                            color: isSelected ? 'var(--brand)' : 'var(--ink)',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: 12,
                            cursor: 'pointer',
                            textAlign: 'center',
                            minHeight: 44,
                          }}
                        >
                          {exp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── 3. Aura Tone Tab ── */}
            {activeTab === 'aura' && (
              <div style={{ display: 'grid', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Energy Aura & Outfit Tone
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>
                    This tone lights up your 3D platform pedestal, glowing outfit, and roadmap path glow!
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {AURA_TONES.map(at => {
                      const isSelected = avatar.tone === at.color;
                      return (
                        <button
                          key={at.color}
                          type="button"
                          onClick={() => setAvatar(a => ({ ...a, tone: at.color }))}
                          title={at.label}
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            background: at.color,
                            border: isSelected ? '3.5px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                            boxShadow: isSelected ? `0 0 16px ${at.color}` : 'none',
                            cursor: 'pointer',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.15s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. Accessories Tab ── */}
            {activeTab === 'accessories' && (
              <div style={{ display: 'grid', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                    Hero Equipment & Gear
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                    {ACCESSORIES.map(acc => {
                      const isSelected = (avatar.accessory || 'none') === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setAvatar(a => ({ ...a, accessory: acc.id }))}
                          style={{
                            padding: '12px 10px',
                            borderRadius: 12,
                            border: `1.5px solid ${isSelected ? 'var(--brand)' : 'var(--line)'}`,
                            background: isSelected ? 'var(--brand-soft)' : 'var(--bg)',
                            color: isSelected ? 'var(--brand)' : 'var(--ink)',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: 12.5,
                            cursor: 'pointer',
                            textAlign: 'center',
                            minHeight: 46,
                          }}
                        >
                          {acc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons: Save & Use in Goal */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 10,
                borderTop: '1px solid var(--line)',
                paddingTop: 18,
              }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleSaveAvatar()}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '14px 22px',
                  borderRadius: 12,
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 14.5,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  minHeight: 48,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 18px var(--neon-glow)',
                }}
              >
                <FiCheck style={{ fontSize: 18 }} />
                <span>{saving ? 'Saving Companion...' : 'Save as Active Companion'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleSaveAvatar('/goals/new')}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '1.5px solid var(--line)',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <FiPlusCircle style={{ fontSize: 16, color: 'var(--brand)' }} />
                <span>Save & Create New Goal With This Avatar</span>
              </motion.button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

