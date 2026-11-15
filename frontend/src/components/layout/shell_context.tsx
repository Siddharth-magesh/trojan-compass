// Shared open/closed state for the mobile drawer and the contextual right panel sheet.
import { createContext, useContext, useState, type ReactNode } from 'react';

type shell_ctx = {
  nav_open: boolean;
  set_nav_open: (v: boolean) => void;
  panel_open: boolean;
  set_panel_open: (v: boolean) => void;
  collapsed: boolean;
  set_collapsed: (v: boolean) => void;
};

const ShellContext = createContext<shell_ctx | null>(null);
const collapsed_key = 'trojan_compass.sidebar_collapsed';

export function ShellProvider({ children }: { children: ReactNode }) {
  const [nav_open, set_nav_open] = useState(false);
  const [panel_open, set_panel_open] = useState(false);
  const [collapsed, set_collapsed_state] = useState(() => localStorage.getItem(collapsed_key) === '1');
  const set_collapsed = (v: boolean) => {
    localStorage.setItem(collapsed_key, v ? '1' : '0');
    set_collapsed_state(v);
  };
  return (
    <ShellContext.Provider value={{ nav_open, set_nav_open, panel_open, set_panel_open, collapsed, set_collapsed }}>
      {children}
    </ShellContext.Provider>
  );
}

export function use_shell(): shell_ctx {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('use_shell must be used inside ShellProvider');
  return ctx;
}
