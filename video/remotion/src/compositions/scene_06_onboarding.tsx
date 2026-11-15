// Scene 06 (International onboarding): the real app building the pre-semester checklist (A06), three items ticked.
import { Caption } from '../components/headline';
import { RecordingStage } from '../components/recording_stage';
import { SceneShell } from '../components/scene_shell';
import { frames_of } from '../config/timeline';

export const Scene06Onboarding = () => (
  <SceneShell>
    <RecordingStage id="A06" what="Real app answering the onboarding prompt" window_frames={frames_of('s06_onboarding')} label="Trojan Compass · synthetic student Aarav Demo" />
    <Caption text="From arrival to first semester, one clear path." from={440} />
  </SceneShell>
);
