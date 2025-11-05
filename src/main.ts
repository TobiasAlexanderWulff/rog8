/* eslint-disable @typescript-eslint/no-unused-vars */

import { bootstrapCanvas, createRenderLoop, drawPlaceholderScene } from './render/bootstrap';
import { InputManager } from './engine/input';
import { World } from './engine/world';
import { RunController } from './engine/run-controller';
import { createHud } from './ui/hud';
import { withSeed, RunSeed } from './shared/random';

const ROOT_ID = 'app'; // TODO: Keep in sync with actual DOM root.

/**
 * Generates the initial seed that drives deterministic game runs.
 *
 * Returns:
 *   RunSeed: Seed wrapper containing a 32-bit unsigned integer.
 */
function createInitialSeed(): RunSeed {
  // TODO: Generate a deterministic seed (random per run, surfaced in HUD).
  return { value: Date.now() & 0xffffffff };
}

/**
 * Entry point that wires together input, world, rendering, and HUD scaffolding.
 */
function main(): void {
  // TODO: Replace scaffolding with real bootstrap once systems are implemented.
  const seed = createInitialSeed();
  const renderContext = bootstrapCanvas(ROOT_ID);
  const world = new World();
  const input = new InputManager();
  const targetDeltaMs = 1000 / 60;
  const controller = new RunController(world, input, {
    seed,
    targetDeltaMs,
  });

  const hudRoot = document.getElementById('hud');
  if (hudRoot) {
    createHud(hudRoot);
  }

  const loop = createRenderLoop(renderContext, (_frame) => {
    controller.update(targetDeltaMs);
    drawPlaceholderScene(renderContext, seed);
  });

  controller.start();
  loop.start();
}

// TODO: Wire this to DOMContentLoaded or Vite entry once ready.
main();
