'use client';

import { useState } from 'react';
import { useTheme, ACCENT_SWATCHES } from '../../lib/ThemeProvider';

export default function ThemeControls() {
  const { mode, accentKey, toggleMode, setAccentKey } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Cài đặt giao diện"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: open ? 'var(--chip)' : 'transparent',
            cursor: 'pointer',
            fontSize: 16,
            color: 'var(--text)'
          }}
        >
          ⚙︎
        </button>

        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} />
            <div
              style={{
                position: 'absolute',
                top: 46,
                right: 0,
                width: 220,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                boxShadow: '0 16px 40px rgba(20,20,19,0.18)',
                padding: 16,
                zIndex: 60
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 10
                }}
              >
                Màu giao diện
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {ACCENT_SWATCHES.map((sw) => {
                  const swatchColor = mode === 'dark' ? sw.dark : sw.light;
                  return (
                    <button
                      key={sw.key}
                      onClick={() => setAccentKey(sw.key)}
                      aria-label={sw.label}
                      title={sw.label}
                      style={{
                        height: 32,
                        borderRadius: 9,
                        border: accentKey === sw.key ? '2px solid var(--text)' : '1px solid var(--border)',
                        background: swatchColor,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={toggleMode}
        aria-label="Đổi giao diện sáng/tối"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 16,
          color: 'var(--text)'
        }}
      >
        {mode === 'dark' ? '☀︎' : '☾'}
      </button>
    </>
  );
}
