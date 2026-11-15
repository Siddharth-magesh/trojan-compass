// Light / dark / system theme: remembers the choice and toggles the .dark class on <html>.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { use_media_query } from '@/lib/use_media_query';

export type theme_choice = 'light' | 'system' | 'dark';
type theme_ctx = { choice: theme_choice; resolved: 'light' | 'dark'; set_choice: (c: theme_choice) => void };

const storage_key = 'trojan_compass.theme';
const ThemeContext = createContext<theme_ctx | null>(null);

function read_choice(): theme_choice {
  try {
    const v = localStorage.getItem(storage_key);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, set_choice_state] = useState<theme_choice>(read_choice);
  const prefers_dark = use_media_query('(prefers-color-scheme: dark)');
  const resolved = choice === 'system' ? (prefers_dark ? 'dark' : 'light') : choice;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const value = useMemo<theme_ctx>(() => ({
    choice,
    resolved,
    set_choice: (c) => {
      set_choice_state(c);
      try {
        localStorage.setItem(storage_key, c);
      } catch {
        /* storage unavailable: keep the choice for this visit only */
      }
    },
  }), [choice, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function use_theme(): theme_ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('use_theme must be used inside ThemeProvider');
  return ctx;
}
