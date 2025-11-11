/**
 * @fileoverview Helpers for animating sprite atlases.
 */
import type { PlayerSpriteAtlas, PlayerSpriteFrame } from './types';

export const DEFAULT_FRAME_DURATION_MS = 250;

/**
 * Computes the duration for a sprite frame, falling back to a default cadence.
 *
 * @param frame - Frame whose duration should be read.
 * @returns Duration in milliseconds.
 */
export function getFrameDuration(frame?: PlayerSpriteFrame): number {
  if (!frame) {
    return DEFAULT_FRAME_DURATION_MS;
  }
  const duration: unknown = frame.durationMs;
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return duration;
  }
  return DEFAULT_FRAME_DURATION_MS;
}

/**
 * Selects the frame that should be displayed at a given animation timestamp.
 *
 * @param atlas - Sprite atlas to sample.
 * @param elapsedMs - Accumulated animation time in milliseconds.
 * @returns Frame covering the current timestamp, or `undefined` when the atlas is empty.
 */
export function selectAnimatedFrame(
  atlas: PlayerSpriteAtlas | undefined,
  elapsedMs: number,
): PlayerSpriteFrame | undefined {
  if (!atlas || atlas.frames.length === 0) {
    return undefined;
  }

  const totalDuration = atlas.frames.reduce((sum, frame) => sum + getFrameDuration(frame), 0);
  if (totalDuration <= 0) {
    return atlas.frames[0];
  }

  let remaining = elapsedMs % totalDuration;
  for (const frame of atlas.frames) {
    const duration = getFrameDuration(frame);
    if (remaining < duration) {
      return frame;
    }
    remaining -= duration;
  }
  return atlas.frames[atlas.frames.length - 1];
}
