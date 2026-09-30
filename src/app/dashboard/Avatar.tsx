'use client';

import type { Staff } from '../../lib/types';

export default function Avatar({ me, size = 38 }: { me: Staff | null; size?: number }) {
  if (me?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={me.avatar_url}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#FCEBC8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      <svg width={size * 0.78} height={size * 0.78} viewBox="0 0 120 120">
        <path d="M28 46 L20 14 L52 34 Z" fill="#F5C99B" />
        <path d="M92 46 L100 14 L68 34 Z" fill="#F5C99B" />
        <path d="M32 42 L27 22 L48 36 Z" fill="#FFDDBB" />
        <path d="M88 42 L93 22 L72 36 Z" fill="#FFDDBB" />
        <circle cx="60" cy="56" r="34" fill="#F5C99B" />
        <ellipse cx="38" cy="64" rx="8" ry="5" fill="#FFB6A8" opacity="0.6" />
        <ellipse cx="82" cy="64" rx="8" ry="5" fill="#FFB6A8" opacity="0.6" />
        <path d="M44 54 q4 -6 8 0" stroke="#5A4636" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M68 54 q4 -6 8 0" stroke="#5A4636" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M57 62 L63 62 L60 66 Z" fill="#C97B63" />
        <path d="M60 66 q-5 6 -10 2" stroke="#5A4636" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M60 66 q5 6 10 2" stroke="#5A4636" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
