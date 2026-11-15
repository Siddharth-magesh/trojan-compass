// Phone bezel around a narrow recording (the real responsive UI at 430x932).
import type { ReactNode } from 'react';
import { colors } from '../styles/theme';

export const PhoneFrame = ({ children, height }: { children: ReactNode; height: number }) => {
  const width = Math.round((height * 430) / 932);
  return (
    <div style={{ width: width + 36, height: height + 36, padding: 18, borderRadius: 64, backgroundColor: '#050505',
      border: `3px solid ${colors.border}`, boxShadow: '0 40px 120px rgba(0,0,0,0.6)' }}>
      <div style={{ position: 'relative', width, height, borderRadius: 48, overflow: 'hidden', backgroundColor: colors.surface }}>{children}</div>
    </div>
  );
};
