// Scene 03 (Reveal): the scattered windows merge into one chat frame, the real home screen (A03), then logo and tagline.
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, fade, rise } from '../animations/motion';
import { Headline } from '../components/headline';
import { RecordingStage } from '../components/recording_stage';
import { SceneShell } from '../components/scene_shell';
import a02 from '../data/a02_services.json';
import { colors, type } from '../styles/theme';
import { PLATFORM_TONES, PlatformWindow, scatter_pos } from './scene_02_fragmented';

export const Scene03Reveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const merge = rise(frame, fps, 0, 30);
  const stage_in = interpolate(frame, [36, 60], [0, 1], clamp);
  const stage_out = interpolate(frame, [170, 190], [1, 0], clamp);
  return (
    <SceneShell>
      {frame < 60 && a02.services.map((p, i) => {
        const { x, y } = scatter_pos(i);
        return (
          <div key={p.name} style={{ position: 'absolute', left: interpolate(merge, [0, 1], [x, 825]), top: interpolate(merge, [0, 1], [y, 480]),
            opacity: 1 - stage_in, scale: String(interpolate(merge, [0, 1], [1, 0.4])) }}>
            <PlatformWindow name={p.name} kind={p.kind} tone={PLATFORM_TONES[i % PLATFORM_TONES.length]} />
          </div>
        );
      })}
      <AbsoluteFill style={{ opacity: stage_in * stage_out, scale: String(interpolate(stage_in, [0, 1], [0.85, 1])) }}>
        <Sequence from={36} durationInFrames={160}>
          <RecordingStage id="A03" what="Real home screen: greeting and four starter cards" window_frames={150} trim_before_s={1.5}
            label="Trojan Compass · synthetic student" />
        </Sequence>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fade(frame, 182) }}>
        <Img src={staticFile('brand/logo.svg')} style={{ width: 150, height: 150, opacity: fade(frame, 182),
          scale: String(rise(frame, fps, 182)) }} />
        <div style={{ height: 36 }} />
        <Headline text="Meet Trojan Compass." from={188} size={type.display} />
        <div style={{ height: 16 }} />
        <Headline text="Your USC experience, one conversation away." from={198} size={type.supporting} color={colors.gold} serif={false} />
      </AbsoluteFill>
    </SceneShell>
  );
};
