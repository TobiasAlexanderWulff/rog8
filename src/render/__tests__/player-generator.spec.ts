/**
 * @fileoverview Tests for the deterministic player sprite generator.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';

import { generatePlayerSprite } from '../sprites';
import type { PlayerSpriteFrame } from '../sprites';

const hashFrame = (frame: PlayerSpriteFrame): string => {
  const hash = createHash('sha256');
  hash.update(frame.buffer.data);
  return hash.digest('hex');
};

const pixelSignature = (frame: PlayerSpriteFrame, x: number, y: number): string => {
  const { width, data } = frame.buffer;
  const index = (y * width + x) * 4;
  return `${data[index]}:${data[index + 1]}:${data[index + 2]}:${data[index + 3]}`;
};

describe('generatePlayerSprite', () => {
  it('produces a deterministic atlas for a given seed', () => {
    const atlas = generatePlayerSprite({ value: 1337 });
    const frame = atlas.frames[0];
    const snapshot = {
      palette: {
        base: atlas.palette.base.hex,
        trim: atlas.palette.trim.hex,
        highlight: atlas.palette.highlight.hex,
        outline: atlas.palette.outline.hex,
      },
      metadata: atlas.metadata,
      frameHash: hashFrame(frame),
    };

    expect(snapshot).toMatchInlineSnapshot(`
      {
        "frameHash": "1339ef26e97a4380b50a828a57baca67c8c25999d9c4f736dbb94abc2aec23db",
        "metadata": {
          "features": {
            "accentBand": true,
            "hasAntenna": true,
            "hasBackpack": false,
            "visorStyle": "mono",
          },
          "height": 16,
          "paletteHex": {
            "base": "#3321a6",
            "highlight": "#6e5ae1",
            "outline": "#140d42",
            "trim": "#256d91",
          },
          "seed": 1337,
          "symmetry": "mirror-x",
          "width": 16,
        },
        "palette": {
          "base": "#3321a6",
          "highlight": "#6e5ae1",
          "outline": "#140d42",
          "trim": "#256d91",
        },
      }
    `);
  });

  it('mirrors sprite pixels along the X axis', () => {
    const atlas = generatePlayerSprite({ value: 42 });
    const frame = atlas.frames[0];
    const midpoint = Math.floor(frame.buffer.width / 2);

    for (let y = 0; y < frame.buffer.height; y += 1) {
      for (let x = 0; x < midpoint; x += 1) {
        const left = pixelSignature(frame, x, y);
        const right = pixelSignature(frame, frame.buffer.width - 1 - x, y);
        expect(left).toBe(right);
      }
    }
  });
});
