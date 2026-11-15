// Scene 02 (Fragmented USC): the supplied resource-directory screenshot (A02), then each platform pops out and scatters.
import { Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, fade, rise } from '../animations/motion';
import { BrowserFrame } from '../components/browser_frame';
import { Caption } from '../components/headline';
import { PlaceholderClip } from '../components/placeholder_clip';
import { SceneShell } from '../components/scene_shell';
import { resolve_asset } from '../config/asset_registry';
import platforms from '../data/platforms.json';
import { colors, fonts } from '../styles/theme';

export const PLATFORM_TONES = [colors.cardinal, '#2c5d8a', '#3f7a52', '#8a5a2c', '#5b3f8a', '#7a2c5d'];
const N = platforms.platforms.length;

/** Deterministic scattered position for platform window i (shared with Scene 03 so the merge starts where this ends). */
export const scatter_pos = (i: number) => {
  const col = i % 6;
  const row = Math.floor(i / 6);
  return { x: 110 + col * 290 + (random(`x${i}`) - 0.5) * 70, y: 250 + row * 165 + (random(`y${i}`) - 0.5) * 50 };
};

export const PlatformWindow = ({ name, kind, tone }: { name: string; kind: string; tone: string }) => (
  <div style={{ width: 270, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface, border: `2px solid ${tone}`,
    boxShadow: '0 18px 50px rgba(0,0,0,0.45)' }}>
    <div style={{ height: 14, backgroundColor: tone }} />
    <div style={{ padding: '12px 16px' }}>
      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 26, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      <div style={{ fontFamily: fonts.sans, fontSize: 20, color: colors.faint }}>{kind}</div>
    </div>
  </div>
);

export const Scene02Fragmented = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a02 = resolve_asset('A02');
  const shot_out = interpolate(frame, [110, 135], [1, 0], clamp);
  return (
    <SceneShell kicker="Today: one student, many systems">
      <div style={{ position: 'absolute', left: 260, top: 110, opacity: shot_out, scale: String(interpolate(frame, [0, 120], [1, 1.04], clamp)) }}>
        <BrowserFrame width={1400} height={820} label="USC student resources">
          {a02 ? <Img src={staticFile(a02.file)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            : <PlaceholderClip asset_id="A02" what="Screenshot of the USC student resource directory (we provide)" seconds={4} />}
        </BrowserFrame>
      </div>
      {platforms.platforms.map((p, i) => {
        const s = rise(frame, fps, 118 + i * 3);
        const { x, y } = scatter_pos(i);
        return (
          <div key={p.name} style={{ position: 'absolute', left: interpolate(s, [0, 1], [820, x]), top: interpolate(s, [0, 1], [460, y]),
            opacity: Math.min(1, s * 2), rotate: `${(random(`r${i}`) - 0.5) * 8 * s}deg` }}>
            <PlatformWindow name={p.name} kind={p.kind} tone={PLATFORM_TONES[i % PLATFORM_TONES.length]} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 96, right: 96, bottom: 170, textAlign: 'center', opacity: fade(frame, 200),
        fontFamily: fonts.sans, fontSize: 28, color: colors.faint }}>
        Count: sites and tools referenced in our verified dataset ({N})
      </div>
      <Caption text={`${N} platforms. Different workflows. Answers scattered across all of them.`} from={185} />
    </SceneShell>
  );
};
