// Product window chrome around a recording: title bar with dots and a URL pill; children fill the viewport area.
import type { ReactNode } from 'react';
import { colors, fonts } from '../styles/theme';

export const BrowserFrame = ({ children, width, height, label = 'trojan-compass · demo' }: {
  children: ReactNode; width: number; height: number; label?: string;
}) => (
  <div style={{ width, height, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface,
    border: `2px solid ${colors.border}`, boxShadow: '0 40px 120px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', backgroundColor: colors.surface_raised }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c }} />)}
      <div style={{ marginLeft: 24, padding: '6px 22px', borderRadius: 10, backgroundColor: colors.background, color: colors.faint,
        fontFamily: fonts.sans, fontSize: 22 }}>{label}</div>
    </div>
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>{children}</div>
  </div>
);
