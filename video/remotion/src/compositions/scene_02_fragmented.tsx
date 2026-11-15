// Scene 02 (Fragmented USC): the real USC quick-links page (A02), a montage of other portals, then the 12 services scatter.
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, fade, rise } from '../animations/motion';
import { BrowserFrame } from '../components/browser_frame';
import { Caption } from '../components/headline';
import { PlaceholderClip } from '../components/placeholder_clip';
import { SceneShell } from '../components/scene_shell';
import { resolve_asset } from '../config/asset_registry';
import a02 from '../data/a02_services.json';
import { colors, fonts } from '../styles/theme';

export const PLATFORM_TONES = [colors.cardinal, '#2c5d8a', '#3f7a52', '#8a5a2c', '#5b3f8a', '#7a2c5d'];
const N = a02.services.length;
const PORTALS = a02.other_pages;

/** Deterministic scattered position for service window i (shared with Scene 03 so the merge starts where this ends). */
export const scatter_pos = (i: number) => {
  const col = i % 4;
  const row = Math.floor(i / 4);
  return { x: 200 + col * 400 + (random(`x${i}`) - 0.5) * 80, y: 260 + row * 190 + (random(`y${i}`) - 0.5) * 50 };
};

export const PlatformWindow = ({ name, kind, tone }: { name: string; kind: string; tone: string }) => (
  <div style={{ width: 320, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface, border: `2px solid ${tone}`,
    boxShadow: '0 18px 50px rgba(0,0,0,0.45)' }}>
    <div style={{ height: 14, backgroundColor: tone }} />
    <div style={{ padding: '14px 18px' }}>
      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 30, color: colors.text, whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontFamily: fonts.sans, fontSize: 22, color: colors.faint }}>{kind}</div>
    </div>
  </div>
);

export const Scene02Fragmented = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shot = resolve_asset('A02');
  const shot_out = interpolate(frame, [80, 96], [1, 0], clamp);
  const montage_out = interpolate(frame, [168, 184], [1, 0], clamp);
  return (
    <SceneShell kicker="Today: one student, many systems">
      <div style={{ position: 'absolute', left: 260, top: 120, opacity: shot_out, scale: String(interpolate(frame, [0, 90], [1, 1.05], clamp)) }}>
        <BrowserFrame width={1400} height={800} label="experience.usc.edu · My Favorite Student Resources">
          {shot ? <Img src={staticFile(shot.file)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            : <PlaceholderClip asset_id="A02" what="Screenshot of the USC student resource directory (we provide)" seconds={3} />}
        </BrowserFrame>
      </div>
      <div style={{ position: 'absolute', left: 1080, top: 960, opacity: shot_out * fade(frame, 10), fontFamily: fonts.sans, fontSize: 34, color: colors.gold }}>
        {N} quick links, each opening a different site
      </div>
      <AbsoluteFill style={{ opacity: montage_out }}>
        {PORTALS.map((file, i) => {
          const start = 86 + i * 9;
          const p = rise(frame, fps, start);
          return (
            <div key={file} style={{ position: 'absolute', left: 140 + i * 190, top: 170 + (i % 2) * 90, opacity: fade(frame, start, 8),
              rotate: `${(i - 3) * 2.5}deg`, scale: String(interpolate(p, [0, 1], [0.8, 1])) }}>
              <BrowserFrame width={720} height={430} label={file.replace('.png', '').replace(/_/g, ' ')}>
                <Img src={staticFile(`usc_screenshots/${file}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </BrowserFrame>
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 96, right: 96, bottom: 90, textAlign: 'center', opacity: fade(frame, 100),
          fontFamily: fonts.sans, fontWeight: 600, fontSize: 44, color: colors.text }}>Billing, health, registration, events, libraries… each its own portal</div>
      </AbsoluteFill>
      {a02.services.map((p, i) => {
        const s = rise(frame, fps, 178 + i * 3);
        const { x, y } = scatter_pos(i);
        return (
          <div key={p.name} style={{ position: 'absolute', left: interpolate(s, [0, 1], [800, x]), top: interpolate(s, [0, 1], [460, y]),
            opacity: Math.min(1, s * 2), rotate: `${(random(`r${i}`) - 0.5) * 8 * s}deg` }}>
            <PlatformWindow name={p.name} kind={p.kind} tone={PLATFORM_TONES[i % PLATFORM_TONES.length]} />
          </div>
        );
      })}
      <Caption text={`${N} platforms. Different workflows. Answers scattered across all of them.`} from={215} />
    </SceneShell>
  );
};
