// Scene 05 (Career and research): the real app answering the career prompt (A05) with lab cards and recruitment status.
import { useCurrentFrame } from 'remotion';
import { fade } from '../animations/motion';
import { Badge } from '../components/badge';
import { Caption } from '../components/headline';
import { RecordingStage } from '../components/recording_stage';
import { SceneShell } from '../components/scene_shell';
import { frames_of } from '../config/timeline';

export const Scene05Career = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell>
      <RecordingStage id="A05" what="Real app answering the career prompt" window_frames={frames_of('s05_career')} label="Trojan Compass · synthetic student Aarav Demo" />
      <div style={{ position: 'absolute', right: 180, top: 120, opacity: fade(frame, 300) }}>
        <Badge label="RECRUITMENT STATUS AS PUBLISHED" tone="real" />
      </div>
      <Caption text="Discover opportunities beyond the job boards." from={540} />
    </SceneShell>
  );
};
