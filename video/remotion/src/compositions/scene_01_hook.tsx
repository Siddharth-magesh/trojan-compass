// Scene 01 (Hook): original vector arrival, five task chips, then a growing stack of tabs counting to the platform total.
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, fade, fade_out, rise } from '../animations/motion';
import { Headline } from '../components/headline';
import { SceneShell } from '../components/scene_shell';
import platforms from '../data/platforms.json';
import { colors, fonts, type } from '../styles/theme';

const TASKS = ['Register for courses', 'Find housing', 'Find a campus job', 'Understand visa rules', 'Track deadlines'];
const N = platforms.platforms.length;

const Skyline = ({ progress }: { progress: number }) => {
  // Stylized, original skyline blocks (no real buildings) that rise with `progress`.
  const blocks = [[0, 260], [120, 360], [210, 300], [330, 460], [430, 380], [560, 520], [650, 420], [780, 340], [880, 480],
    [1010, 300], [1110, 400], [1240, 560], [1340, 380], [1470, 300], [1580, 440], [1700, 340], [1810, 280]];
  return (
    <svg width={1920} height={600} style={{ position: 'absolute', bottom: 0, left: 0 }}>
      {blocks.map(([x, h], i) => {
        const hh = h * progress;
        return <rect key={i} x={x} y={600 - hh} width={(blocks[i + 1]?.[0] ?? 1920) - x - 6} height={hh}
          fill={i % 3 === 0 ? '#2a1c1a' : '#1f1816'} />;
      })}
      <circle cx={1500} cy={170} r={70} fill={colors.gold} opacity={0.18 * progress} />
      <rect x={0} y={590} width={1920} height={10} fill={colors.cardinal} opacity={0.6} />
    </svg>
  );
};

const Traveller = ({ x }: { x: number }) => (
  // Simple silhouette of a student pulling a suitcase.
  <svg width={160} height={260} style={{ position: 'absolute', left: x, bottom: 10 }}>
    <circle cx={70} cy={34} r={24} fill={colors.text} />
    <rect x={50} y={62} width={42} height={96} rx={18} fill={colors.text} />
    <rect x={54} y={154} width={14} height={84} rx={7} fill={colors.text} />
    <rect x={74} y={154} width={14} height={84} rx={7} fill={colors.text} />
    <rect x={88} y={80} width={8} height={70} rx={4} fill={colors.muted} transform="rotate(-20 92 80)" />
    <rect x={104} y={150} width={50} height={80} rx={10} fill={colors.cardinal} />
    <rect x={118} y={140} width={22} height={12} rx={4} fill="none" stroke={colors.gold} strokeWidth={4} />
  </svg>
);

export const Scene01Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const collapse = interpolate(frame, [210, 240], [0, 1], clamp);
  const count = Math.round(interpolate(frame, [228, 282], [1, N], clamp));
  return (
    <SceneShell>
      <AbsoluteFill style={{ opacity: interpolate(frame, [180, 220], [1, 0.25], clamp) }}>
        <Skyline progress={rise(frame, fps, 0)} />
        <Traveller x={interpolate(frame, [0, 90], [-160, 380], clamp)} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 120, left: 96, right: 96 }}>
        <Headline text="Starting university should be exciting." from={6} size={type.headline} />
        <div style={{ height: 24 }} />
        <Headline text="Navigating it shouldn't be overwhelming." from={60} size={type.headline} color={colors.gold} />
      </div>
      {TASKS.map((t, i) => {
        const start = 95 + i * 14;
        const p = rise(frame, fps, start);
        const x = 260 + i * 290;
        const y = 560 + (i % 2) * 90;
        return (
          <div key={t} style={{ position: 'absolute', left: interpolate(collapse, [0, 1], [x - 160, 860]),
            top: interpolate(collapse, [0, 1], [y, 620]), scale: String(interpolate(p, [0, 1], [0.6, 1]) * (1 - collapse * 0.5)),
            opacity: Math.min(p, 1 - collapse), padding: '18px 30px', borderRadius: 999, backgroundColor: colors.surface_raised,
            border: `2px solid ${colors.border}`, fontFamily: fonts.sans, fontSize: type.body, color: colors.text, whiteSpace: 'nowrap' }}>{t}</div>
        );
      })}
      {frame >= 214 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 520, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 720, height: 260 }}>
            {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
              <div key={i} style={{ position: 'absolute', left: 40 + i * 22, top: 120 - i * 9, width: 420, height: 64,
                borderRadius: '14px 14px 0 0', backgroundColor: i % 2 ? colors.surface_raised : colors.surface,
                border: `2px solid ${colors.border}`, opacity: fade(frame, 214 + i * 3, 6) }} />
            ))}
            <div style={{ position: 'absolute', right: 0, top: 70, fontFamily: fonts.sans, fontWeight: 700,
              fontSize: type.display, color: colors.gold, opacity: fade_out(frame, 290, 10) * fade(frame, 222) }}>{count} tabs</div>
          </div>
        </div>
      )}
    </SceneShell>
  );
};
