'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from './supabase/client';
import { DEFAULT_THEME_KEY, STATUS_COLORS, THEMES, themeByKey, type ThemeMode } from './themes';

export type { ThemeMode } from './themes';

// Theme đi theo TÀI KHOẢN (cột staff.theme_key / staff.theme_mode).
// localStorage chỉ dùng để hiện đúng màu ngay lúc mở trang (tránh nháy màu) trước khi tải xong tài khoản.

function applyVars(themeKey: string, mode: ThemeMode) {
  const t = themeByKey(themeKey)[mode];
  const st = STATUS_COLORS[mode];
  const root = document.documentElement.style;
  root.setProperty('--bg', t.bg);
  root.setProperty('--surface', t.surface);
  root.setProperty('--text', t.text);
  root.setProperty('--muted', t.muted);
  root.setProperty('--muted-2', mode === 'dark' ? '#7A7A80' : '#A3A3A8');
  root.setProperty('--border', t.border);
  root.setProperty('--chip', t.soft);
  root.setProperty('--accent', t.accent);
  root.setProperty('--accent-contrast', t.onAccent);
  root.setProperty('--accent-ink', t.ink);
  root.setProperty('--st-red', st.red);
  root.setProperty('--st-orange', st.orange);
  root.setProperty('--st-blue', st.blue);
  root.setProperty('--st-green', st.green);
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.style.colorScheme = mode;
}

interface ThemeContextValue {
  mode: ThemeMode;
  themeKey: string;
  toggleMode: () => void;
  setMode: (m: ThemeMode) => void;
  setThemeKey: (k: string) => void;
  /** AppShell gọi khi đã biết tài khoản: áp theme đã lưu của tài khoản đó. */
  loadFromAccount: (staffId: string, themeKey: string | null | undefined, mode: string | null | undefined) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  themeKey: DEFAULT_THEME_KEY,
  toggleMode: () => {},
  setMode: () => {},
  setThemeKey: () => {},
  loadFromAccount: () => {}
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [themeKey, setThemeKeyState] = useState<string>(DEFAULT_THEME_KEY);
  const staffIdRef = useRef<string | null>(null);

  useEffect(() => {
    let storedKey: string | null = null;
    let storedMode: ThemeMode = 'light';
    try {
      storedKey = localStorage.getItem('ode-theme-key');
      storedMode = localStorage.getItem('ode-theme-mode') === 'dark' ? 'dark' : 'light';
    } catch {
      /* bỏ qua */
    }
    const key = THEMES.some((t) => t.key === storedKey) ? (storedKey as string) : DEFAULT_THEME_KEY;
    setThemeKeyState(key);
    setModeState(storedMode);
    applyVars(key, storedMode);
  }, []);

  const persist = useCallback((key: string, m: ThemeMode) => {
    applyVars(key, m);
    try {
      localStorage.setItem('ode-theme-key', key);
      localStorage.setItem('ode-theme-mode', m);
    } catch {
      /* bỏ qua */
    }
    const staffId = staffIdRef.current;
    if (staffId) {
      createClient().from('staff').update({ theme_key: key, theme_mode: m }).eq('id', staffId).then(() => {});
    }
  }, []);

  const setThemeKey = useCallback(
    (k: string) => {
      const key = THEMES.some((t) => t.key === k) ? k : DEFAULT_THEME_KEY;
      setThemeKeyState(key);
      setModeState((m) => {
        persist(key, m);
        return m;
      });
    },
    [persist]
  );

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      setThemeKeyState((k) => {
        persist(k, m);
        return k;
      });
    },
    [persist]
  );

  const toggleMode = useCallback(() => setMode(mode === 'light' ? 'dark' : 'light'), [mode, setMode]);

  const loadFromAccount = useCallback((staffId: string, key: string | null | undefined, m: string | null | undefined) => {
    staffIdRef.current = staffId;
    const k = THEMES.some((t) => t.key === key) ? (key as string) : DEFAULT_THEME_KEY;
    const md: ThemeMode = m === 'dark' ? 'dark' : 'light';
    setThemeKeyState(k);
    setModeState(md);
    applyVars(k, md);
    try {
      localStorage.setItem('ode-theme-key', k);
      localStorage.setItem('ode-theme-mode', md);
    } catch {
      /* bỏ qua */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, themeKey, toggleMode, setMode, setThemeKey, loadFromAccount }}>
      {children}
    </ThemeContext.Provider>
  );
}
