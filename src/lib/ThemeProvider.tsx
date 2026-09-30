'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentKey = 'neutral' | 'terracotta' | 'forest' | 'navy' | 'plum' | 'amber';

export const ACCENT_SWATCHES: { key: AccentKey; label: string; light: string; dark: string; contrast: string }[] = [
  { key: 'neutral', label: 'Mặc định', light: '#141413', dark: '#F2F2EF', contrast: '' }, // contrast computed per-mode
  { key: 'terracotta', label: 'Đất nung', light: '#C1602A', dark: '#C1602A', contrast: '#FFFFFF' },
  { key: 'forest', label: 'Xanh rêu', light: '#2F6B4F', dark: '#2F6B4F', contrast: '#FFFFFF' },
  { key: 'navy', label: 'Xanh navy', light: '#24406B', dark: '#24406B', contrast: '#FFFFFF' },
  { key: 'plum', label: 'Tím mận', light: '#6B2F5E', dark: '#6B2F5E', contrast: '#FFFFFF' },
  { key: 'amber', label: 'Hổ phách', light: '#9C6B12', dark: '#9C6B12', contrast: '#FFFFFF' }
];

function accentFor(accentKey: AccentKey, mode: ThemeMode) {
  const swatch = ACCENT_SWATCHES.find((s) => s.key === accentKey) ?? ACCENT_SWATCHES[0];
  const accent = mode === 'dark' ? swatch.dark : swatch.light;
  const contrast = swatch.key === 'neutral' ? (mode === 'dark' ? '#141413' : '#FBFBF9') : swatch.contrast;
  return { accent, contrast };
}

function applyVars(mode: ThemeMode, accentKey: AccentKey) {
  const root = document.documentElement.style;
  if (mode === 'dark') {
    root.setProperty('--bg', '#141413');
    root.setProperty('--surface', '#1E1E1D');
    root.setProperty('--text', '#F2F2EF');
    root.setProperty('--muted', '#A8A8A4');
    root.setProperty('--muted-2', '#7A7A76');
    root.setProperty('--border', '#3A3A38');
    root.setProperty('--chip', '#2A2A28');
  } else {
    root.setProperty('--bg', '#FBFBF9');
    root.setProperty('--surface', '#FFFFFF');
    root.setProperty('--text', '#141413');
    root.setProperty('--muted', '#6B6B68');
    root.setProperty('--muted-2', '#B2B2B2');
    root.setProperty('--border', '#E5E5E5');
    root.setProperty('--chip', '#EDEDEA');
  }
  const { accent, contrast } = accentFor(accentKey, mode);
  root.setProperty('--accent', accent);
  root.setProperty('--accent-contrast', contrast);
  document.documentElement.setAttribute('data-theme', mode);
}

interface ThemeContextValue {
  mode: ThemeMode;
  accentKey: AccentKey;
  toggleMode: () => void;
  setAccentKey: (k: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  accentKey: 'neutral',
  toggleMode: () => {},
  setAccentKey: () => {}
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [accentKey, setAccentKeyState] = useState<AccentKey>('neutral');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedMode = (localStorage.getItem('ode-theme-mode') as ThemeMode | null) ?? 'light';
    const storedAccent = (localStorage.getItem('ode-theme-accent') as AccentKey | null) ?? 'neutral';
    setMode(storedMode);
    setAccentKeyState(storedAccent);
    applyVars(storedMode, storedAccent);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyVars(mode, accentKey);
    localStorage.setItem('ode-theme-mode', mode);
    localStorage.setItem('ode-theme-accent', accentKey);
  }, [mode, accentKey, ready]);

  function toggleMode() {
    setMode((m) => (m === 'light' ? 'dark' : 'light'));
  }

  function setAccentKey(k: AccentKey) {
    setAccentKeyState(k);
  }

  return <ThemeContext.Provider value={{ mode, accentKey, toggleMode, setAccentKey }}>{children}</ThemeContext.Provider>;
}
