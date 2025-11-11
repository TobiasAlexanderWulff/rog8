/**
 * @fileoverview Deterministic player sprite generator scaffolding.
 */
import { withSeed, type RunSeed, type RNG } from '../../shared/random';
import { createPlayerPalette } from './palette';
import { DEV_SPRITE_ATLAS } from './fallback';
import type {
  PlayerSpriteAtlas,
  PlayerSpriteFeatures,
  PlayerSpriteFrame,
  PlayerSpriteMetadata,
  PlayerSpritePalette,
  SpriteBuffer,
} from './types';
import { DEFAULT_FRAME_DURATION_MS } from './animation';

const SPRITE_WIDTH = 16;
const SPRITE_HEIGHT = 16;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
const lerp = (start: number, end: number, t: number): number => start + (end - start) * t;

interface MaskBundle {
  body: Uint8Array;
  trim: Uint8Array;
  highlight: Uint8Array;
}

/**
 * Configuration overrides for the generator.
 */
export interface PlayerSpriteGeneratorOptions {
  width?: number;
  height?: number;
  useFallbackOnError?: boolean;
}

/**
 * Generates a deterministic sprite atlas for the player entity.
 *
 * @remarks
 * Current scaffolding focuses on a single idle frame while keeping metadata/palette hooks ready for
 * multi-frame atlases. The mirrored silhouette plus highlight/accent masks provide the baseline
 * architecture described in `docs/plans/player-sprite-generator-plan.md`.
 *
 * @param seed - Run seed controlling palette and silhouette rolls.
 * @param options - Optional overrides (e.g., custom resolution).
 * @returns Player sprite atlas with palette + metadata.
 */
export function generatePlayerSprite(
  seed: RunSeed,
  options: PlayerSpriteGeneratorOptions = {},
): PlayerSpriteAtlas {
  try {
    return withSeed(seed.value, (rng) => {
      const width = options.width ?? SPRITE_WIDTH;
      const height = options.height ?? SPRITE_HEIGHT;
      const palette = createPlayerPalette(rng);
      const features = rollFeatures(rng);
      const masks = buildMasks(rng, width, height, features);
      const outlineMask = createOutlineMask(masks, width, height);
      const buffer = paintSpriteBuffer(width, height, palette, masks, outlineMask);
      const frames = createIdleFrames(buffer, masks.highlight);
      const metadata = createMetadata(seed, width, height, palette, features);
      return {
        palette,
        metadata,
        frames,
      };
    });
  } catch (error) {
    if (options.useFallbackOnError === false) {
      throw error;
    }
    console.error('Player sprite generation failed, falling back to dev atlas', error);
    return DEV_SPRITE_ATLAS;
  }
}

function rollFeatures(rng: RNG): PlayerSpriteFeatures {
  return {
    visorStyle: rng.nextFloat() > 0.45 ? 'mono' : 'dual',
    hasAntenna: rng.nextFloat() > 0.65,
    hasBackpack: rng.nextFloat() > 0.55,
    accentBand: rng.nextFloat() > 0.35,
  };
}

function buildMasks(
  rng: RNG,
  width: number,
  height: number,
  features: PlayerSpriteFeatures,
): MaskBundle {
  const body = buildBodyMask(rng, width, height);
  const trim = buildTrimMask(body, width, height, features);
  const highlight = buildHighlightMask(body, width, height, features);
  return { body, trim, highlight };
}

function createMetadata(
  seed: RunSeed,
  width: number,
  height: number,
  palette: PlayerSpritePalette,
  features: PlayerSpriteFeatures,
): PlayerSpriteMetadata {
  return {
    seed: seed.value,
    width,
    height,
    symmetry: 'mirror-x',
    features,
    paletteHex: {
      base: palette.base.hex,
      trim: palette.trim.hex,
      highlight: palette.highlight.hex,
      outline: palette.outline.hex,
    },
  };
}

function createIdleFrames(
  baseBuffer: SpriteBuffer,
  highlightMask: Uint8Array,
): PlayerSpriteFrame[] {
  const idleFrame: PlayerSpriteFrame = {
    name: 'idle-0',
    buffer: baseBuffer,
    durationMs: DEFAULT_FRAME_DURATION_MS,
  };
  const pulseBuffer = createHighlightPulseFrame(baseBuffer, highlightMask);
  const pulseFrame: PlayerSpriteFrame = {
    name: 'idle-1',
    buffer: pulseBuffer,
    durationMs: DEFAULT_FRAME_DURATION_MS,
  };
  return [idleFrame, pulseFrame];
}

function createHighlightPulseFrame(
  baseBuffer: SpriteBuffer,
  highlightMask: Uint8Array,
): SpriteBuffer {
  const data = new Uint8ClampedArray(baseBuffer.data);
  const pulseBuffer: SpriteBuffer = {
    width: baseBuffer.width,
    height: baseBuffer.height,
    data,
  };
  const brighten = (value: number): number => clamp(Math.round(value + 35), 0, 255);
  for (let i = 0; i < highlightMask.length; i += 1) {
    if (!highlightMask[i]) {
      continue;
    }
    const offset = i * 4;
    data[offset] = brighten(data[offset]);
    data[offset + 1] = brighten(data[offset + 1]);
    data[offset + 2] = brighten(data[offset + 2]);
  }
  return pulseBuffer;
}
function buildBodyMask(rng: RNG, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  const half = width / 2;
  const center = (width - 1) / 2;

  const headHalf = clamp(Math.round(half * (0.4 + rng.nextFloat() * 0.15)), 2, Math.floor(half));
  const shoulderHalf = clamp(
    Math.round(half * (0.7 + rng.nextFloat() * 0.2)),
    headHalf,
    Math.floor(half),
  );
  const waistHalf = clamp(Math.round(half * (0.45 + rng.nextFloat() * 0.2)), 1, shoulderHalf);
  const legHalf = clamp(Math.round(half * (0.3 + rng.nextFloat() * 0.2)), 1, waistHalf);

  const headRows = Math.max(3, Math.floor(height * 0.25));
  const torsoRows = Math.max(5, Math.floor(height * 0.45));
  const legRows = Math.max(height - headRows - torsoRows, 1);

  for (let y = 0; y < height; y += 1) {
    let halfWidth: number;
    if (y < headRows) {
      const t = y / Math.max(1, headRows - 1);
      halfWidth = lerp(headHalf, shoulderHalf, t);
    } else if (y < headRows + torsoRows) {
      const torsoY = y - headRows;
      const t = torsoY / Math.max(1, torsoRows - 1);
      halfWidth = lerp(shoulderHalf, waistHalf, t);
    } else {
      const legY = y - headRows - torsoRows;
      const t = legY / Math.max(1, legRows - 1);
      halfWidth = lerp(waistHalf, legHalf, t);
    }
    const rounded = clamp(Math.round(halfWidth), 1, Math.floor(half));
    for (let x = 0; x < width; x += 1) {
      const distance = Math.abs(x - center);
      if (distance <= rounded) {
        mask[y * width + x] = 1;
      }
    }
  }

  return mask;
}

function buildTrimMask(
  bodyMask: Uint8Array,
  width: number,
  height: number,
  features: PlayerSpriteFeatures,
): Uint8Array {
  const trim = new Uint8Array(width * height);

  if (features.accentBand) {
    const bandRow = clamp(Math.floor(height * 0.65), 0, height - 1);
    for (let x = 0; x < width; x += 1) {
      const index = bandRow * width + x;
      if (bodyMask[index]) {
        trim[index] = 1;
      }
    }
  }

  if (features.hasBackpack) {
    const startRow = clamp(Math.floor(height * 0.35), 0, height - 2);
    const endRow = clamp(startRow + 3, 0, height - 1);
    const inset = 2;

    for (let y = startRow; y <= endRow; y += 1) {
      for (let offset = 0; offset <= 1; offset += 1) {
        const leftIndex = y * width + clamp(inset + offset, 0, width - 1);
        const rightIndex = y * width + clamp(width - inset - 1 - offset, 0, width - 1);
        if (bodyMask[leftIndex]) {
          trim[leftIndex] = 1;
        }
        if (bodyMask[rightIndex]) {
          trim[rightIndex] = 1;
        }
      }
    }
  }

  return trim;
}

function buildHighlightMask(
  bodyMask: Uint8Array,
  width: number,
  height: number,
  features: PlayerSpriteFeatures,
): Uint8Array {
  const highlight = new Uint8Array(width * height);
  const visorRow = clamp(Math.floor(height * 0.2), 1, Math.floor(height / 2));
  const center = Math.floor(width / 2);

  const setIfInside = (x: number, y: number): void => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    const index = y * width + x;
    if (bodyMask[index]) {
      highlight[index] = 1;
    }
  };

  if (features.visorStyle === 'mono') {
    for (let dx = -1; dx <= 1; dx += 1) {
      setIfInside(center + dx, visorRow);
    }
  } else {
    setIfInside(center - 2, visorRow);
    setIfInside(center + 2, visorRow);
  }

  if (features.hasAntenna) {
    setIfInside(center, Math.max(0, visorRow - 2));
    setIfInside(center, Math.max(0, visorRow - 3));
  }

  return highlight;
}

function createOutlineMask(masks: MaskBundle, width: number, height: number): Uint8Array {
  const outline = new Uint8Array(width * height);
  const filled = new Uint8Array(width * height);

  for (let i = 0; i < filled.length; i += 1) {
    filled[i] = masks.body[i] || masks.trim[i] || masks.highlight[i] ? 1 : 0;
  }

  const deltas = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!filled[index]) {
        continue;
      }
      for (const { dx, dy } of deltas) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }
        const neighborIndex = ny * width + nx;
        if (!filled[neighborIndex]) {
          outline[neighborIndex] = 1;
        }
      }
    }
  }

  return outline;
}

function paintSpriteBuffer(
  width: number,
  height: number,
  palette: PlayerSpritePalette,
  masks: MaskBundle,
  outlineMask: Uint8Array,
): SpriteBuffer {
  const data = new Uint8ClampedArray(width * height * 4);

  const paint = (index: number, color: { r: number; g: number; b: number; a: number }): void => {
    const offset = index * 4;
    data[offset] = color.r;
    data[offset + 1] = color.g;
    data[offset + 2] = color.b;
    data[offset + 3] = color.a;
  };

  for (let i = 0; i < width * height; i += 1) {
    if (masks.highlight[i]) {
      paint(i, palette.highlight);
    } else if (masks.trim[i]) {
      paint(i, palette.trim);
    } else if (masks.body[i]) {
      paint(i, palette.base);
    } else if (outlineMask[i]) {
      paint(i, palette.outline);
    } else {
      paint(i, palette.transparent);
    }
  }

  mirrorColorBuffer(data, width, height);
  return { width, height, data };
}

function mirrorColorBuffer(data: Uint8ClampedArray, width: number, height: number): void {
  const half = Math.floor(width / 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < half; x += 1) {
      const leftIndex = (y * width + x) * 4;
      const rightIndex = (y * width + (width - 1 - x)) * 4;
      data[rightIndex] = data[leftIndex];
      data[rightIndex + 1] = data[leftIndex + 1];
      data[rightIndex + 2] = data[leftIndex + 2];
      data[rightIndex + 3] = data[leftIndex + 3];
    }
  }
}
