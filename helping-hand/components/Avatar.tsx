'use client';
import { useEffect, useRef } from 'react';

interface AvatarProps {
  tone: string;
  skin: string;
  hairStyle: 'short' | 'long' | 'bun' | 'curly';
  hairColor: string;
  size?: number;
  className?: string;
  animated?: boolean;
}

const HAIR_PATHS: Record<string, string> = {
  short: 'M15.4 19.5 C15.2 12.4 19.4 9.6 24 9.6 C29.2 9.6 32.8 12.6 32.6 18.6 C30.2 15.6 26.4 14.6 22.2 15.2 C19 15.6 16.9 17.2 15.4 19.5 Z',
  long: 'M14.8 28 C13.6 14 18 9.4 24 9.4 C30 9.4 34.4 14 33.2 28 C31.6 23 31.8 18.4 29.8 16.4 C26 17.2 21 16.8 18.2 16.4 C16.2 18.4 16.4 23 14.8 28 Z',
  bun: 'M15.4 19.5 C15.2 12.4 19.4 9.6 24 9.6 C29.2 9.6 32.8 12.6 32.6 18.6 C30.2 15.6 26.4 14.6 22.2 15.2 C19 15.6 16.9 17.2 15.4 19.5 Z M24 2.5 C26.6 2.5 28.4 4.3 28.4 6.6 C28.4 8.9 26.6 10.4 24 10.4 C21.4 10.4 19.6 8.9 19.6 6.6 C19.6 4.3 21.4 2.5 24 2.5 Z',
  curly: 'M15 20.5 C13 15 16 9 21 9.6 C23 7.4 28 7.8 30 10.6 C34 11.6 34.6 16.6 33 20.5 C31.4 16.6 28 15.2 24 15.2 C20 15.2 16.6 16.6 15 20.5 Z',
};

export default function Avatar({ tone, skin, hairStyle, hairColor, size = 48, className = '', animated = false }: AvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle cx="24" cy="24" r="23" fill={tone} opacity="0.15" />
      <circle cx="24" cy="24" r="23" fill="none" stroke={tone} strokeWidth="1.5" opacity="0.6" />

      {/* Body / torso */}
      <ellipse cx="24" cy="38" rx="10" ry="6" fill={tone} opacity="0.7" />
      <path d="M14 42 Q24 36 34 42" fill={tone} opacity="0.5" />

      {/* Neck */}
      <rect x="21" y="30" width="6" height="5" rx="2" fill={skin} />

      {/* Head */}
      <ellipse cx="24" cy="22" rx="9" ry="10" fill={skin} />

      {/* Hair */}
      <path d={HAIR_PATHS[hairStyle]} fill={hairColor} />

      {/* Eyes */}
      <ellipse cx="20.5" cy="22" rx="1.5" ry="1.8" fill="#1a1a2e" />
      <ellipse cx="27.5" cy="22" rx="1.5" ry="1.8" fill="#1a1a2e" />
      {/* Eye shine */}
      <circle cx="21.2" cy="21.2" r="0.5" fill="white" />
      <circle cx="28.2" cy="21.2" r="0.5" fill="white" />

      {/* Nose */}
      <ellipse cx="24" cy="25" rx="1" ry="0.6" fill={hairColor} opacity="0.4" />

      {/* Smile */}
      <path d="M21 27.5 Q24 30 27 27.5" fill="none" stroke={hairColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

      {/* Ear */}
      <ellipse cx="15.2" cy="23" rx="1.5" ry="2" fill={skin} />
      <ellipse cx="32.8" cy="23" rx="1.5" ry="2" fill={skin} />

      {/* Accent dot */}
      <circle cx="24" cy="4" r="2" fill={tone} opacity="0.8" />
    </svg>
  );
}

// Named avatar configs
export const AVATAR_CONFIGS = [
  { tone: '#3b82f6', skin: '#f0c4a0', hairStyle: 'short' as const, hairColor: '#2b2118' },
  { tone: '#3cc7b4', skin: '#c98e66', hairStyle: 'long' as const, hairColor: '#1b1410' },
  { tone: '#60a5fa', skin: '#8d5a3b', hairStyle: 'bun' as const, hairColor: '#120d0a' },
  { tone: '#ff7b7b', skin: '#f3d3b8', hairStyle: 'curly' as const, hairColor: '#6b3f1f' },
  { tone: '#a3acba', skin: '#e0a982', hairStyle: 'short' as const, hairColor: '#3a2a1e' },
  { tone: '#3fcf8e', skin: '#f0c4a0', hairStyle: 'long' as const, hairColor: '#a35f2a' },
];
