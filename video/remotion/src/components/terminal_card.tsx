// Terminal-style panel for real command output (security checks, log lines). Lines reveal one by one.
import { useCurrentFrame } from 'remotion';
import { fade } from '../animations/motion';
import { colors, fonts } from '../styles/theme';

export const TerminalCard = ({ title, lines, from, width = 1400, line_gap = 10 }: {
  title: string; lines: { text: string; tone?: 'cmd' | 'ok' | 'bad' | 'dim' }[]; from: number; width?: number; line_gap?: number;
}) => {
  const frame = useCurrentFrame();
  const tone = { cmd: colors.gold, ok: colors.sage, bad: '#ff7a7a', dim: colors.faint };
  return (
    <div style={{ width, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0a0908', border: `2px solid ${colors.border}`,
      boxShadow: '0 30px 90px rgba(0,0,0,0.5)', opacity: fade(frame, from) }}>
      <div style={{ padding: '10px 24px', backgroundColor: colors.surface_raised, color: colors.muted, fontFamily: fonts.sans, fontSize: 24 }}>{title}</div>
      <div style={{ padding: '14px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: fonts.mono, fontSize: 28, lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: tone[l.tone ?? 'dim'], opacity: fade(frame, from + 8 + i * line_gap, 8) }}>{l.text}</div>
        ))}
      </div>
    </div>
  );
};
