// Scene 05 (Career and research): the real app answering the career prompt (A05) with lab cards and recruitment status.
import { Callouts } from '../components/callouts';
import { Caption } from '../components/headline';
import { RecordingStage } from '../components/recording_stage';
import { SceneShell } from '../components/scene_shell';
import { frames_of } from '../config/timeline';

export const Scene05Career = () => {
  return (
    <SceneShell>
      <RecordingStage id="A05" what="Real app answering the career prompt" window_frames={frames_of('s05_career')} label="Trojan Compass · synthetic student Aarav Demo" />
      <Callouts items={[
        { from: 10, to: 150, text: '1 · Ask about research labs and career resources' },
        { from: 150, to: 330, text: '2 · Labs matched to AI and software engineering' },
        { from: 330, to: 530, text: '3 · Recruitment status as published, plus how to apply' },
      ]} />
      <Caption text="Discover opportunities beyond the job boards." from={540} />
    </SceneShell>
  );
};
