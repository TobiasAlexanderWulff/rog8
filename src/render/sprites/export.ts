/**
 * @fileoverview Dev helpers for exporting generated sprites.
 */
import type { RunSeed } from '../../shared/random';
import type { PlayerSpriteAtlas, PlayerSpriteExport } from './types';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isDevBuild =
  typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
    ? import.meta.env.DEV
    : false;

/**
 * Serializes the atlas into a JSON-friendly payload.
 *
 * @param atlas - Generated sprite atlas.
 * @returns Export payload.
 */
export function serializeSpriteAtlas(atlas: PlayerSpriteAtlas): PlayerSpriteExport {
  return {
    atlas,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Triggers a JSON download containing the sprite atlas for dev inspection.
 *
 * @remarks
 * Downloads land in the browser's default folder so developers can move them into
 * `src/assets/generated/` manually when needed.
 *
 * @param seed - Run seed used for the sprite.
 * @param atlas - Generated atlas to persist.
 */
export function persistSpriteAtlas(seed: RunSeed, atlas: PlayerSpriteAtlas): void {
  if (!isBrowser || !isDevBuild) {
    return;
  }

  const payload = serializeSpriteAtlas(atlas);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `player-sprite-${seed.value}.json`;
  anchor.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
