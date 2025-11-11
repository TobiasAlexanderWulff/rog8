/**
 * @fileoverview Shared types for the deterministic sprite generator.
 */
import type { RunSeed } from '../../shared/random';

/**
 * RGBA color plus its preformatted hexadecimal string.
 *
 * @remarks
 * Hex strings always exclude alpha to keep HUD/debug readouts compact (`#rrggbb`).
 */
export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
}

/**
 * Player-specific palette with semantic slots consumed by the sprite painter.
 *
 * @remarks
 * Slots remain stable so future animation frames can rely on consistent palette ordering.
 */
export interface PlayerSpritePalette {
  base: PaletteColor;
  trim: PaletteColor;
  highlight: PaletteColor;
  outline: PaletteColor;
  transparent: PaletteColor;
}

/**
 * Raw RGBA pixel buffer backing a sprite frame.
 *
 * @remarks
 * The width/height track the virtual 1:1 pixel resolution (16×16 for the player sprite).
 */
export interface SpriteBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Feature rolls that describe how a sprite was generated.
 *
 * @remarks
 * Consumers can surface these flags in HUD overlays or tests without re-parsing pixel buffers.
 */
export interface PlayerSpriteFeatures {
  visorStyle: 'mono' | 'dual';
  hasAntenna: boolean;
  hasBackpack: boolean;
  accentBand: boolean;
}

/**
 * Metadata accompanying a generated sprite for determinism auditing.
 */
export interface PlayerSpriteMetadata {
  seed: RunSeed['value'];
  width: number;
  height: number;
  symmetry: 'mirror-x';
  features: PlayerSpriteFeatures;
  paletteHex: {
    base: string;
    trim: string;
    highlight: string;
    outline: string;
  };
}

/**
 * Single sprite frame referencing its raw pixel buffer.
 */
export interface PlayerSpriteFrame {
  name: string;
  buffer: SpriteBuffer;
  durationMs?: number;
}

/**
 * Atlas describing all frames plus accompanying metadata/palette.
 */
export interface PlayerSpriteAtlas {
  frames: PlayerSpriteFrame[];
  palette: PlayerSpritePalette;
  metadata: PlayerSpriteMetadata;
}

/**
 * Structure exported when persisting sprite data for debugging.
 */
export interface PlayerSpriteExport {
  atlas: PlayerSpriteAtlas;
  createdAt: string;
}
