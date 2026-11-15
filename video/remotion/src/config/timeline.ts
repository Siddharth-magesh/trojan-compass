// Single source of truth for scene order and durations (frames at 30 fps). Build fails if the total exceeds 180 s.
export const FPS = 30;
export const TRANSITION_FRAMES = 12;
export const MAX_TOTAL_FRAMES = 180 * FPS;

export type scene_id =
  | 's01_hook' | 's02_fragmented' | 's03_reveal' | 's04_academics' | 's05_career' | 's06_onboarding'
  | 's07_comparison' | 's08_security' | 's09_cost' | 's10_mobile' | 's11_closing';

export const scenes: { id: scene_id; composition: string; title: string; frames: number }[] = [
  { id: 's01_hook', composition: 'S01-Hook', title: 'Hook: the arrival', frames: 300 },
  { id: 's02_fragmented', composition: 'S02-Fragmented', title: 'Fragmented USC', frames: 300 },
  { id: 's03_reveal', composition: 'S03-Reveal', title: 'Reveal', frames: 240 },
  { id: 's04_academics', composition: 'S04-Academics', title: 'Academics', frames: 720 },
  { id: 's05_career', composition: 'S05-Career', title: 'Career and research', frames: 660 },
  { id: 's06_onboarding', composition: 'S06-Onboarding', title: 'International onboarding', frames: 540 },
  { id: 's07_comparison', composition: 'S07-Comparison', title: 'Comparison with general AI', frames: 540 },
  { id: 's08_security', composition: 'S08-Security', title: 'Security', frames: 540 },
  { id: 's09_cost', composition: 'S09-Cost', title: 'Cost and caching', frames: 540 },
  { id: 's10_mobile', composition: 'S10-Mobile', title: 'Mobile, personalization, roadmap', frames: 300 },
  { id: 's11_closing', composition: 'S11-Closing', title: 'Feasibility and close', frames: 570 },
];

export const frames_of = (id: scene_id): number => scenes.find((s) => s.id === id)!.frames;

export const TOTAL_FRAMES = scenes.reduce((sum, s) => sum + s.frames, 0) - TRANSITION_FRAMES * (scenes.length - 1);

if (TOTAL_FRAMES > MAX_TOTAL_FRAMES) {
  throw new Error(`Timeline is ${TOTAL_FRAMES} frames; the hard cap is ${MAX_TOTAL_FRAMES} (180 s).`);
}
