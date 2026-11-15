// A real app recording in browser chrome, centred and large (the product UI is the hero of each scene).
import type { CSSProperties } from 'react';
import type { asset_id } from '../config/asset_registry';
import { AssetVideo } from './asset_video';
import { BrowserFrame } from './browser_frame';

export const STAGE = { width: 1600, video_height: 900, chrome: 56 };

export const RecordingStage = ({ id, what, window_frames, trim_before_s = 1.5, label, style }: {
  id: asset_id; what: string; window_frames: number; trim_before_s?: number; label?: string; style?: CSSProperties;
}) => (
  <div style={{ position: 'absolute', left: (1920 - STAGE.width) / 2, top: (1080 - STAGE.video_height - STAGE.chrome) / 2, ...style }}>
    <BrowserFrame width={STAGE.width} height={STAGE.video_height + STAGE.chrome} label={label}>
      <AssetVideo id={id} what={what} window_frames={window_frames} trim_before_s={trim_before_s} />
    </BrowserFrame>
  </div>
);
