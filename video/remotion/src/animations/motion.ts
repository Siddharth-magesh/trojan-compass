// Shared animation helpers: clamped interpolation and spring-based entrances (frame-driven, never CSS animations).
import { Easing, interpolate, spring } from 'remotion';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0 -> 1 over [start, start + length] frames with an ease-out curve. */
export const fade = (frame: number, start: number, length = 15) =>
  interpolate(frame, [start, start + length], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });

/** 1 -> 0 over [start, start + length] frames. */
export const fade_out = (frame: number, start: number, length = 15) =>
  interpolate(frame, [start, start + length], [1, 0], { ...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0) });

/** Spring progress 0 -> 1 starting at `start` (gentle, no overshoot by default). */
export const rise = (frame: number, fps: number, start: number, damping = 200) =>
  spring({ frame: frame - start, fps, config: { damping } });
