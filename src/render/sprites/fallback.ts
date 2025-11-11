/**
 * @fileoverview Development fallback sprite used when generation fails.
 */
import type { PlayerSpriteAtlas, PlayerSpritePalette, PaletteColor } from './types';

const SPRITE_SIZE = 16;

const hexToColor = (hex: string, alpha = 255): PaletteColor => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b, a: alpha, hex: `#${normalized}` };
};

const DEV_PALETTE: PlayerSpritePalette = {
  base: hexToColor('#1d4ed8'),
  trim: hexToColor('#a21caf'),
  highlight: hexToColor('#22d3ee'),
  outline: hexToColor('#020617'),
  transparent: hexToColor('#000000', 0),
};

const createCrosshairFrame = (): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(SPRITE_SIZE * SPRITE_SIZE * 4);
  const setPixel = (x: number, y: number, color: PaletteColor): void => {
    const index = (y * SPRITE_SIZE + x) * 4;
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = color.a;
  };

  for (let y = 0; y < SPRITE_SIZE; y += 1) {
    for (let x = 0; x < SPRITE_SIZE; x += 1) {
      setPixel(x, y, DEV_PALETTE.transparent);
    }
  }

  const mid = Math.floor(SPRITE_SIZE / 2);
  for (let i = 0; i < SPRITE_SIZE; i += 1) {
    setPixel(mid, i, DEV_PALETTE.highlight);
    setPixel(i, mid, DEV_PALETTE.highlight);
  }

  for (let i = mid - 2; i <= mid + 2; i += 1) {
    setPixel(i, mid - 4, DEV_PALETTE.trim);
    setPixel(i, mid + 4, DEV_PALETTE.trim);
  }

  return data;
};

/**
 * Deterministic atlas used whenever generation aborts.
 */
export const DEV_SPRITE_ATLAS: PlayerSpriteAtlas = {
  palette: DEV_PALETTE,
  metadata: {
    seed: 0,
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    symmetry: 'mirror-x',
    features: {
      visorStyle: 'mono',
      hasAntenna: false,
      hasBackpack: false,
      accentBand: true,
    },
    paletteHex: {
      base: DEV_PALETTE.base.hex,
      trim: DEV_PALETTE.trim.hex,
      highlight: DEV_PALETTE.highlight.hex,
      outline: DEV_PALETTE.outline.hex,
    },
  },
  frames: [
    {
      name: 'idle',
      buffer: {
        width: SPRITE_SIZE,
        height: SPRITE_SIZE,
        data: createCrosshairFrame(),
      },
    },
  ],
};
