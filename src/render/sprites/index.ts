/**
 * Entrypoint for sprite generation helpers.
 */
export { generatePlayerSprite, type PlayerSpriteGeneratorOptions } from './player-generator';
export type {
  PlayerSpriteAtlas,
  PlayerSpriteExport,
  PlayerSpriteFeatures,
  PlayerSpriteFrame,
  PlayerSpriteMetadata,
  PlayerSpritePalette,
  SpriteBuffer,
} from './types';
export { DEV_SPRITE_ATLAS } from './fallback';
export { persistSpriteAtlas, serializeSpriteAtlas } from './export';
