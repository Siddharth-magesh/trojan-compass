// Scene 06 (International onboarding): the real app building the pre-semester checklist (A06), three items ticked.
import { Callouts } from '../components/callouts';
import { Caption } from '../components/headline';
import { RecordingStage } from '../components/recording_stage';
import { SceneShell } from '../components/scene_shell';
import { frames_of } from '../config/timeline';

export const Scene06Onboarding = () => (
  <SceneShell>
    <RecordingStage id="A06" what="Real app answering the onboarding prompt" window_frames={frames_of('s06_onboarding')} label="Trojan Compass · synthetic student Aarav Demo" />
    <Callouts items={[
      { from: 10, to: 140, text: '1 · A new international student asks what to finish first' },
      { from: 140, to: 300, text: '2 · A checklist built from verified USC guides' },
      { from: 300, to: 430, text: '3 · Tick items off; progress is saved' },
    ]} />
    <Caption text="From arrival to first semester, one clear path." from={440} />
  </SceneShell>
);
