/* eslint-disable @typescript-eslint/no-unused-vars */

import { RunSeed } from '../shared/random';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  scale: number;
}

export interface RenderLoop {
  start(): void;
  stop(): void;
}

export function bootstrapCanvas(rootId = 'app'): RenderContext {
  // TODO: Look up or create the root canvas element and configure integer scaling.
  throw new Error('TODO: bootstrapCanvas not implemented yet');
}

export function createRenderLoop(
  context: RenderContext,
  tick: (frame: number) => void,
): RenderLoop {
  // TODO: Wire requestAnimationFrame to deterministic tick/update cadence.
  let rafId = 0; // TODO: Track the active RAF handle once the loop is implemented.

  return {
    start(): void {
      // TODO: Kick off the RAF-driven render/update loop.
      throw new Error('TODO: RenderLoop.start not implemented yet');
    },
    stop(): void {
      // TODO: Stop the current RAF loop and clean up state.
      throw new Error('TODO: RenderLoop.stop not implemented yet');
    },
  };
}

export function drawPlaceholderScene(context: RenderContext, seed: RunSeed): void {
  // TODO: Render a deterministic placeholder scene so we can verify scaling early.
  void context;
  void seed;
}
