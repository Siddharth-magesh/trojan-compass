// Plays a registered recording (uniformly sped up to fit its window, never cut), or a PlaceholderClip if missing.
import { Video } from '@remotion/media';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { resolve_asset, type asset_id } from '../config/asset_registry';
import { PlaceholderClip } from './placeholder_clip';

export const AssetVideo = ({ id, what, window_frames, trim_before_s = 0, fit = 'cover' }: {
  id: asset_id; what: string; window_frames: number; trim_before_s?: number; fit?: 'cover' | 'contain';
}) => {
  const { fps } = useVideoConfig();
  const asset = resolve_asset(id);
  if (!asset) return <PlaceholderClip asset_id={id} what={what} seconds={window_frames / fps} />;
  const usable_s = Math.max(1, (asset.duration_s ?? window_frames / fps) - trim_before_s);
  const playback_rate = Math.max(1, usable_s / (window_frames / fps));
  return (
    <AbsoluteFill style={{ backgroundColor: '#0d0d0d' }}>
      <Video src={staticFile(asset.file)} muted playbackRate={playback_rate} trimBefore={Math.round(trim_before_s * fps)}
        style={{ width: '100%', height: '100%', objectFit: fit }} />
    </AbsoluteFill>
  );
};
