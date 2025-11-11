/**
 * @fileoverview Palette helpers for the player sprite generator.
 */
import type { RNG } from '../../shared/random';
import type { PaletteColor, PlayerSpritePalette } from './types';

const DEFAULT_ALPHA = 255;

interface HslColor {
  h: number;
  s: number;
  l: number;
}

/**
 * Clamps a numeric value to an inclusive range.
 *
 * @param value - Number to clamp.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns Clamped number.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Converts an HSL color into an RGBA tuple.
 *
 * @param color - Source HSL components.
 * @param alpha - Alpha channel (0-255).
 * @returns Palette color with populated hex representation.
 */
function hslToRgba(color: HslColor, alpha = DEFAULT_ALPHA): PaletteColor {
  const h = ((color.h % 360) + 360) % 360;
  const s = clamp(color.s, 0, 1);
  const l = clamp(color.l, 0, 1);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toChannel = (component: number): number => Math.round((component + m) * 255);
  const [rr, gg, bb] = [toChannel(r), toChannel(g), toChannel(b)];
  const hex = `#${rr.toString(16).padStart(2, '0')}${gg
    .toString(16)
    .padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;

  return { r: rr, g: gg, b: bb, a: clamp(alpha, 0, 255), hex };
}

/**
 * Generates the deterministic palette for a run.
 *
 * @remarks
 * Palette slots remain stable across seeds to keep HUD overlays deterministic.
 *
 * @param rng - Seeded RNG.
 * @param overrides - Optional preselected palette colors (mainly for tests/fallbacks).
 * @returns Completed palette.
 */
export function createPlayerPalette(
  rng: RNG,
  overrides: Partial<PlayerSpritePalette> = {},
): PlayerSpritePalette {
  const baseHue = Math.floor(rng.nextFloat() * 360);
  const temperatureRoll = rng.nextFloat();
  const hueOffset = temperatureRoll > 0.66 ? 40 : temperatureRoll > 0.33 ? -40 : 0;
  const trimHue = (baseHue + hueOffset + rng.nextInt(-10, 10)) % 360;
  const highlightHue = (trimHue + rng.nextInt(20, 80)) % 360;

  const base: PaletteColor =
    overrides.base ??
    hslToRgba({
      h: baseHue,
      s: 0.5 + rng.nextFloat() * 0.2,
      l: 0.35 + rng.nextFloat() * 0.15,
    });

  const trim: PaletteColor =
    overrides.trim ??
    hslToRgba({
      h: trimHue,
      s: 0.5 + rng.nextFloat() * 0.3,
      l: 0.35 + rng.nextFloat() * 0.15,
    });

  const highlight: PaletteColor =
    overrides.highlight ??
    hslToRgba({
      h: highlightHue,
      s: 0.55 + rng.nextFloat() * 0.25,
      l: 0.5 + rng.nextFloat() * 0.2,
    });

  const outline: PaletteColor =
    overrides.outline ??
    (() => {
      const scale = 0.4;
      const darken = (channel: number): number => clamp(Math.round(channel * scale), 0, 255);
      const r = darken(base.r);
      const g = darken(base.g);
      const b = darken(base.b);
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
        .toString(16)
        .padStart(2, '0')}`;
      return { r, g, b, a: DEFAULT_ALPHA, hex };
    })();

  const transparent: PaletteColor =
    overrides.transparent ?? ({ r: 0, g: 0, b: 0, a: 0, hex: '#000000' } satisfies PaletteColor);

  return {
    base,
    trim,
    highlight,
    outline,
    transparent,
  };
}
