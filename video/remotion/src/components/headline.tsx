// Scene headline and burned-in caption text: fades and rises in at `from` (frames), optionally fades out at `until`.
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, fade, fade_out, rise } from '../animations/motion';
import { colors, fonts, type } from '../styles/theme';

export const Headline = ({ text, from, until, size = type.headline, serif = true, color = colors.text, align = 'center' }: {
  text: string; from: number; until?: number; size?: number; serif?: boolean; color?: string; align?: 'center' | 'left';
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = Math.min(fade(frame, from), until === undefined ? 1 : fade_out(frame, until));
  return (
    <div style={{
      opacity, translate: `0px ${interpolate(rise(frame, fps, from), [0, 1], [24, 0], clamp)}px`,
      fontFamily: serif ? fonts.serif : fonts.sans, fontSize: size, lineHeight: 1.15, color, textAlign: align,
      fontWeight: serif ? 400 : 600, letterSpacing: serif ? -0.5 : 0,
    }}>{text}</div>
  );
};

/** Bottom caption bar used for the burned-in key line of each scene. */
export const Caption = ({ text, from, until }: { text: string; from: number; until?: number }) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(fade(frame, from - 4, 10), until === undefined ? 1 : fade_out(frame, until));
  return (
    <div style={{ position: 'absolute', left: 96, right: 96, bottom: 72, display: 'flex', justifyContent: 'center', opacity }}>
      <div style={{ padding: '18px 36px', borderRadius: 18, backgroundColor: 'rgba(15,13,12,0.9)', border: `1px solid ${colors.border}` }}>
        <Headline text={text} from={from} until={until} size={type.supporting} />
      </div>
    </div>
  );
};
