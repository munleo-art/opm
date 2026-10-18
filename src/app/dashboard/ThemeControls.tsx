'use client';

import { useState } from 'react';
import { useTheme } from '../../lib/ThemeProvider';
import { THEMES } from '../../lib/themes';

// Nút ⚙︎ mở bảng "Giao diện": chọn 1 trong 11 theme + Sáng/Tối. Lựa chọn lưu theo tài khoản.
// popAlign='left' khi nút nằm bên trái màn hình (trang Tài khoản trên điện thoại) để bảng không tràn ra ngoài.

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r="1.5" />
      <circle cx="17.5" cy="10.5" r="1.5" />
      <circle cx="8.5" cy="7.5" r="1.5" />
      <circle cx="6.5" cy="12.5" r="1.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

const iconBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)',
  cursor: 'pointer', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0
};

// uiVersion/onChangeUi: nút chuyển "Giao diện cũ / Giao diện mới" (lưu theo tài khoản).
// popDir='up': bảng mở lên trên (khi nút nằm sát đáy màn hình, ví dụ cuối menu trái).
export default function ThemeControls({
  popAlign = 'right',
  popDir = 'down',
  uiVersion,
  onChangeUi
}: {
  popAlign?: 'left' | 'right';
  popDir?: 'down' | 'up';
  uiVersion?: 'old' | 'new';
  onChangeUi?: (v: 'old' | 'new') => void;
} = {}) {
  const { mode, themeKey, toggleMode, setMode, setThemeKey } = useTheme();
  const [open, setOpen] = useState(false);

  const modeBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, height: 38, borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
    fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--accent-ink)' : 'var(--muted)',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
  });

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Giao diện"
          aria-expanded={open}
          title="Giao diện"
          style={{ ...iconBtn, background: open ? 'var(--chip)' : 'var(--surface)' }}
        >
          <GearIcon />
        </button>

        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} />
            <div
              className="ode-theme-pop"
              role="dialog"
              aria-label="Giao diện"
              style={{
                position: 'absolute',
                ...(popDir === 'up' ? { bottom: 48 } : { top: 48 }),
                ...(popAlign === 'left' ? { left: 0 } : { right: 0 }),
                width: 300,
                maxHeight: '75vh',
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                padding: 16,
                zIndex: 60,
                color: 'var(--text)'
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700 }}>Giao diện</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', margin: '2px 0 12px' }}>Lưu theo tài khoản của bạn.</div>

              {onChangeUi && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.4, marginBottom: 6 }}>KIỂU GIAO DIỆN</div>
                  <div role="group" aria-label="Kiểu giao diện" style={{ display: 'flex', gap: 4, background: 'var(--chip)', padding: 4, borderRadius: 12, marginBottom: 12 }}>
                    <button onClick={() => onChangeUi('old')} aria-pressed={uiVersion !== 'new'} style={modeBtn(uiVersion !== 'new')}>
                      Giao diện cũ
                    </button>
                    <button onClick={() => onChangeUi('new')} aria-pressed={uiVersion === 'new'} style={modeBtn(uiVersion === 'new')}>
                      Giao diện mới
                    </button>
                  </div>
                </>
              )}

              <div role="group" aria-label="Chế độ sáng tối" style={{ display: 'flex', gap: 4, background: 'var(--chip)', padding: 4, borderRadius: 12, marginBottom: 10 }}>
                <button onClick={() => setMode('light')} aria-pressed={mode === 'light'} style={modeBtn(mode === 'light')}>
                  <SunIcon /> Sáng
                </button>
                <button onClick={() => setMode('dark')} aria-pressed={mode === 'dark'} style={modeBtn(mode === 'dark')}>
                  <MoonIcon /> Tối
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {THEMES.map((t) => {
                  const on = t.key === themeKey;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setThemeKey(t.key)}
                      aria-pressed={on}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 44, padding: '6px 10px',
                        borderRadius: 11, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 14,
                        fontWeight: on ? 700 : 500, color: 'var(--text)', background: on ? 'var(--chip)' : 'transparent',
                        border: on ? '2px solid var(--accent)' : '2px solid transparent'
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: t.base,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <span style={{ width: 11, height: 11, borderRadius: 4, background: t.light.accent }} />
                      </span>
                      <span style={{ flex: 1 }}>{t.name}</span>
                      {t.key === 'mono' && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Mặc định</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <button onClick={toggleMode} aria-label="Đổi giao diện sáng/tối" title={mode === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'} style={iconBtn}>
        {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </>
  );
}
