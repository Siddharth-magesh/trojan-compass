// On-slide step wording: one short callout at a time in a cardinal pill, timed in scene frames.
import { interpolate, useCurrentFrame } from 'remotion';
import { clamp } from '../animations/motion';
import { colors, fonts } from '../styles/theme';

export type callout = { from: number; to: number; text: string };

export const Callouts = ({ items, top = 96, left = 200 }: { items: callout[]; top?: number; left?: number }) => {
  const frame = useCurrentFrame();
  const active = items.find((c) => frame >= c.from && frame < c.to);
  if (!active) return null;
  const opacity = Math.min(interpolate(frame, [active.from, active.from + 8], [0, 1], clamp), interpolate(frame, [active.to - 8, active.to], [1, 0], clamp));
  const y = interpolate(frame, [active.from, active.from + 10], [16, 0], clamp);
  return (
    <div style={{ position: 'absolute', top, left, opacity, translate: `0px ${y}px`, padding: '16px 30px', borderRadius: 16,
      backgroundColor: colors.cardinal, color: '#fff', fontFamily: fonts.sans, fontWeight: 600, fontSize: 38,
      boxShadow: '0 16px 50px rgba(0,0,0,0.5)', maxWidth: 1500 }}>{active.text}</div>
  );
};
