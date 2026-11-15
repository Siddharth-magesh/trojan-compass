// Registers one composition per scene (individually renderable) and the FullVideo that joins them with short fades.
import type { FC } from 'react';
import { Composition, Folder } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Scene01Hook } from './compositions/scene_01_hook';
import { Scene02Fragmented } from './compositions/scene_02_fragmented';
import { Scene03Reveal } from './compositions/scene_03_reveal';
import { Scene04Academics } from './compositions/scene_04_academics';
import { Scene05Career } from './compositions/scene_05_career';
import { Scene06Onboarding } from './compositions/scene_06_onboarding';
import { Scene07Comparison } from './compositions/scene_07_comparison';
import { Scene08Security } from './compositions/scene_08_security';
import { Scene09Cost } from './compositions/scene_09_cost';
import { Scene10Mobile } from './compositions/scene_10_mobile';
import { Scene11Closing } from './compositions/scene_11_closing';
import { FPS, scenes, TOTAL_FRAMES, TRANSITION_FRAMES, type scene_id } from './config/timeline';

const COMPONENTS: Record<scene_id, FC> = {
  s01_hook: Scene01Hook, s02_fragmented: Scene02Fragmented, s03_reveal: Scene03Reveal, s04_academics: Scene04Academics,
  s05_career: Scene05Career, s06_onboarding: Scene06Onboarding, s07_comparison: Scene07Comparison, s08_security: Scene08Security,
  s09_cost: Scene09Cost, s10_mobile: Scene10Mobile, s11_closing: Scene11Closing,
};

const FullVideo = () => (
  <TransitionSeries>
    {scenes.flatMap((s, i) => {
      const Scene = COMPONENTS[s.id];
      const items = [<TransitionSeries.Sequence key={s.id} durationInFrames={s.frames}><Scene /></TransitionSeries.Sequence>];
      if (i < scenes.length - 1) {
        items.push(<TransitionSeries.Transition key={`${s.id}_t`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />);
      }
      return items;
    })}
  </TransitionSeries>
);

export const RemotionRoot = () => (
  <>
    <Folder name="Scenes">
      {scenes.map((s) => (
        <Composition key={s.id} id={s.composition} component={COMPONENTS[s.id]} durationInFrames={s.frames} fps={FPS} width={1920} height={1080} />
      ))}
    </Folder>
    <Composition id="FullVideo" component={FullVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
