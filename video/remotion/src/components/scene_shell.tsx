// Shared scene background (dark surface with a faint cardinal glow) and a small kicker label in the top-left corner.
import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fade } from '../animations/motion';
import { colors, fonts, type } from '../styles/theme';

export const SceneShell = ({ children, kicker }: { children: ReactNode; kicker?: string }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.background,
      backgroundImage: `radial-gradient(1200px 700px at 85% -10%, ${colors.cardinal_soft}, transparent 70%)` }}>
      {children}
      {kicker && (
        <div style={{ position: 'absolute', left: 96, top: 40, opacity: fade(frame, 0, 12), fontFamily: fonts.sans,
          fontWeight: 700, fontSize: type.label, letterSpacing: 5, color: colors.gold, textTransform: 'uppercase' }}>{kicker}</div>
      )}
    </AbsoluteFill>
  );
};
