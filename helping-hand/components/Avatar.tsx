'use client';

// Configuration interface for customizable companions
export interface AvatarConfig {
  name: string;
  tone: string;       // Accent / aura color
  skin: string;       // Character skin tone
  hairStyle: 'short' | 'long' | 'bun' | 'curly' | 'spiky' | 'afro' | 'bald' | string;
  hairColor: string;
  eyesColor?: string;
  clothingStyle?: string;
  accessory?: 'none' | 'glasses' | 'sunglasses' | 'headband' | 'cap' | string;
  expression?: 'happy' | 'determined' | 'chill' | 'confident' | string;
}

export interface AvatarProps {
  config?: AvatarConfig | Partial<AvatarConfig>;
  tone?: string;
  skin?: string;
  hairStyle?: string;
  hairColor?: string;
  eyesColor?: string;
  accessory?: string;
  expression?: string;
  size?: number;
  className?: string;
  animated?: boolean;
  glow?: boolean;
}

// SVG Hair path outlines for various companion styles
const HAIR_PATHS: Record<string, string> = {
  short: 'M15.4 19.5 C15.2 12.4 19.4 9.6 24 9.6 C29.2 9.6 32.8 12.6 32.6 18.6 C30.2 15.6 26.4 14.6 22.2 15.2 C19 15.6 16.9 17.2 15.4 19.5 Z',
  long: 'M14.8 28 C13.6 14 18 9.4 24 9.4 C30 9.4 34.4 14 33.2 28 C31.6 23 31.8 18.4 29.8 16.4 C26 17.2 21 16.8 18.2 16.4 C16.2 18.4 16.4 23 14.8 28 Z',
  bun: 'M15.4 19.5 C15.2 12.4 19.4 9.6 24 9.6 C29.2 9.6 32.8 12.6 32.6 18.6 C30.2 15.6 26.4 14.6 22.2 15.2 C19 15.6 16.9 17.2 15.4 19.5 Z M24 2.5 C26.6 2.5 28.4 4.3 28.4 6.6 C28.4 8.9 26.6 10.4 24 10.4 C21.4 10.4 19.6 8.9 19.6 6.6 C19.6 4.3 21.4 2.5 24 2.5 Z',
  curly: 'M15 20.5 C13 15 16 9 21 9.6 C23 7.4 28 7.8 30 10.6 C34 11.6 34.6 16.6 33 20.5 C31.4 16.6 28 15.2 24 15.2 C20 15.2 16.6 16.6 15 20.5 Z',
  spiky: 'M15.4 19.5 L17 11 L20.5 15 L24 8 L27.5 15 L31 11 L32.6 19.5 C30.2 16.2 26.4 15.4 22.2 15.8 C19 16.2 17 17.5 15.4 19.5 Z',
  afro: 'M12 21 C11 14 15 6 24 6 C33 6 37 14 36 21 C34.5 16.5 30 14 24 14 C18 14 13.5 16.5 12 21 Z',
  bald: '',
};

export default function Avatar({
  config,
  tone,
  skin,
  hairStyle,
  hairColor,
  eyesColor,
  accessory,
  expression,
  size = 48,
  className = '',
  glow = false,
}: AvatarProps) {
  // Resolve configuration attributes with fallbacks
  const activeTone = config?.tone || tone || '#3b82f6';
  const activeSkin = config?.skin || skin || '#f0c4a0';
  const activeHairStyle = config?.hairStyle || hairStyle || 'short';
  const activeHairColor = config?.hairColor || hairColor || '#2b2118';
  const activeEyesColor = config?.eyesColor || eyesColor || '#1a1a2e';
  const activeAccessory = config?.accessory || accessory || 'none';
  const activeExpression = config?.expression || expression || 'happy';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{
        display: 'block',
        filter: glow ? `drop-shadow(0 0 10px ${activeTone})` : 'none',
        transition: 'filter 0.3s ease',
      }}
      aria-hidden="true"
    >
      {/* Background aura circle */}
      <circle cx="24" cy="24" r="23" fill={activeTone} opacity="0.15" />
      <circle cx="24" cy="24" r="23" fill="none" stroke={activeTone} strokeWidth="1.5" opacity="0.6" />

      {/* Body / outfit */}
      <ellipse cx="24" cy="38" rx="10" ry="6" fill={activeTone} opacity="0.8" />
      <path d="M14 42 Q24 36 34 42" fill={activeTone} opacity="0.6" />

      {/* Neck */}
      <rect x="21" y="30" width="6" height="5" rx="2" fill={activeSkin} />

      {/* Head */}
      <ellipse cx="24" cy="22" rx="9" ry="10" fill={activeSkin} />

      {/* Ears */}
      <ellipse cx="15.2" cy="23" rx="1.5" ry="2" fill={activeSkin} />
      <ellipse cx="32.8" cy="23" rx="1.5" ry="2" fill={activeSkin} />

      {/* Hair (if not bald) */}
      {activeHairStyle !== 'bald' && HAIR_PATHS[activeHairStyle] && (
        <path d={HAIR_PATHS[activeHairStyle]} fill={activeHairColor} />
      )}

      {/* Headband accessory (under eyes) */}
      {activeAccessory === 'headband' && (
        <rect x="15" y="15" width="18" height="3" rx="1.5" fill={activeTone} />
      )}

      {/* Eyes & Pupil Highlights */}
      {activeAccessory !== 'sunglasses' ? (
        <>
          <ellipse cx="20.5" cy="22" rx="1.5" ry="1.8" fill={activeEyesColor} />
          <ellipse cx="27.5" cy="22" rx="1.5" ry="1.8" fill={activeEyesColor} />
          <circle cx="21.2" cy="21.2" r="0.5" fill="white" />
          <circle cx="28.2" cy="21.2" r="0.5" fill="white" />
        </>
      ) : (
        /* Sunglasses */
        <g fill="#18181b">
          <rect x="18" y="20.5" width="5" height="3.5" rx="1" />
          <rect x="25" y="20.5" width="5" height="3.5" rx="1" />
          <line x1="23" y1="22" x2="25" y2="22" stroke="#18181b" strokeWidth="1.2" />
        </g>
      )}

      {/* Clear Spectacles / Glasses */}
      {activeAccessory === 'glasses' && (
        <g fill="none" stroke="#27272a" strokeWidth="1">
          <circle cx="20.5" cy="22" r="2.8" />
          <circle cx="27.5" cy="22" r="2.8" />
          <line x1="23.3" y1="22" x2="24.7" y2="22" />
        </g>
      )}

      {/* Cap accessory */}
      {activeAccessory === 'cap' && (
        <g>
          <path d="M15 17 Q24 10 33 17 Z" fill={activeTone} />
          <path d="M17 17 Q24 15 35 18" stroke={activeTone} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {/* Nose */}
      <ellipse cx="24" cy="25" rx="1" ry="0.6" fill={activeHairColor} opacity="0.4" />

      {/* Mouth Expression */}
      {activeExpression === 'determined' ? (
        <line x1="21" y1="28" x2="27" y2="27.5" stroke={activeHairColor} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      ) : activeExpression === 'chill' ? (
        <line x1="21.5" y1="28" x2="26.5" y2="28" stroke={activeHairColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      ) : activeExpression === 'confident' ? (
        <path d="M21 28 Q25 29 27.5 26.5" fill="none" stroke={activeHairColor} strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      ) : (
        /* Happy smile (default) */
        <path d="M21 27.5 Q24 30 27 27.5" fill="none" stroke={activeHairColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      )}

      {/* Top accent dot */}
      <circle cx="24" cy="4" r="2" fill={activeTone} opacity="0.8" />
    </svg>
  );
}

// 6 Pre-made avatar companion presets
export const AVATAR_CONFIGS: AvatarConfig[] = [
  { name: 'Alex', tone: '#3b82f6', skin: '#f0c4a0', hairStyle: 'short', hairColor: '#2b2118' },
  { name: 'Sam', tone: '#3cc7b4', skin: '#c98e66', hairStyle: 'long', hairColor: '#1b1410' },
  { name: 'Jordan', tone: '#60a5fa', skin: '#8d5a3b', hairStyle: 'bun', hairColor: '#120d0a' },
  { name: 'Taylor', tone: '#ff7b7b', skin: '#f3d3b8', hairStyle: 'curly', hairColor: '#6b3f1f' },
  { name: 'Morgan', tone: '#a3acba', skin: '#e0a982', hairStyle: 'spiky', hairColor: '#3a2a1e' },
  { name: 'Casey', tone: '#3fcf8e', skin: '#f0c4a0', hairStyle: 'afro', hairColor: '#a35f2a' },
];
