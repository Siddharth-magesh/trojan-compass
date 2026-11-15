// Small status badge (ROADMAP, DESIGN, REAL RUN, SYNTHETIC) so viewers never mistake plans for working features.
import { colors, fonts } from '../styles/theme';

const tones = {
  roadmap: { fg: colors.gold, bg: colors.gold_soft },
  design: { fg: colors.warning, bg: colors.gold_soft },
  real: { fg: colors.sage, bg: '#16261b' },
  synthetic: { fg: colors.muted, bg: colors.surface_raised },
};

export const Badge = ({ label, tone }: { label: string; tone: keyof typeof tones }) => (
  <span style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: tones[tone].fg,
    backgroundColor: tones[tone].bg, border: `2px solid ${tones[tone].fg}`, borderRadius: 10, padding: '6px 16px' }}>
    {label}
  </span>
);
