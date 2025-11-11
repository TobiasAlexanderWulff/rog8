/**
 * @fileoverview Helpers for drawing generated sprite frames efficiently.
 */
import type { PlayerSpriteAtlas, PlayerSpriteFrame } from './types';

const FRAME_CANVAS_CACHE = new WeakMap<PlayerSpriteFrame, HTMLCanvasElement>();
const FRAME_BITMAP_CACHE = new WeakMap<PlayerSpriteFrame, ImageBitmap>();
const FRAME_BITMAP_PROMISES = new WeakMap<PlayerSpriteFrame, Promise<ImageBitmap | undefined>>();

/**
 * Ensures sprite frames have warmed caches (canvas + bitmap) before rendering.
 *
 * @param atlas - Player sprite atlas containing the frames to prepare.
 */
export function prepareSpriteFrames(atlas: PlayerSpriteAtlas): void {
  for (const frame of atlas.frames) {
    primeFrameBitmap(frame);
    getFrameCanvas(frame);
  }
}

/**
 * Attempts to draw a sprite frame to the provided context.
 *
 * @param context - Canvas rendering context.
 * @param frame - Sprite frame to draw.
 * @param dx - Destination X coordinate in canvas pixels.
 * @param dy - Destination Y coordinate in canvas pixels.
 * @param dw - Destination width in pixels.
 * @param dh - Destination height in pixels.
 * @returns True when the sprite rendered successfully; otherwise false.
 */
export function drawSpriteFrame(
  context: CanvasRenderingContext2D,
  frame: PlayerSpriteFrame,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): boolean {
  const source = getFrameImageSource(frame);
  if (!source) {
    return false;
  }
  context.drawImage(source, dx, dy, dw, dh);
  return true;
}

function getFrameImageSource(frame: PlayerSpriteFrame): CanvasImageSource | undefined {
  const bitmap = FRAME_BITMAP_CACHE.get(frame);
  if (bitmap) {
    return bitmap;
  }
  primeFrameBitmap(frame);
  return FRAME_BITMAP_CACHE.get(frame) ?? getFrameCanvas(frame);
}

function getFrameCanvas(frame: PlayerSpriteFrame): HTMLCanvasElement | undefined {
  const cached = FRAME_CANVAS_CACHE.get(frame);
  if (cached) {
    return cached;
  }
  if (typeof document === 'undefined') {
    return undefined;
  }
  const canvas = document.createElement('canvas');
  canvas.width = frame.buffer.width;
  canvas.height = frame.buffer.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return undefined;
  }
  ctx.putImageData(createImageData(frame), 0, 0);
  FRAME_CANVAS_CACHE.set(frame, canvas);
  return canvas;
}

function primeFrameBitmap(frame: PlayerSpriteFrame): void {
  if (
    typeof createImageBitmap !== 'function' ||
    FRAME_BITMAP_CACHE.has(frame) ||
    FRAME_BITMAP_PROMISES.has(frame)
  ) {
    return;
  }
  const promise = createImageBitmap(createImageData(frame))
    .then((bitmap) => {
      FRAME_BITMAP_PROMISES.delete(frame);
      FRAME_BITMAP_CACHE.set(frame, bitmap);
      return bitmap;
    })
    .catch(() => {
      FRAME_BITMAP_PROMISES.delete(frame);
      return undefined;
    });
  FRAME_BITMAP_PROMISES.set(frame, promise);
}

function createImageData(frame: PlayerSpriteFrame): ImageData {
  return new ImageData(
    new Uint8ClampedArray(frame.buffer.data),
    frame.buffer.width,
    frame.buffer.height,
  );
}
