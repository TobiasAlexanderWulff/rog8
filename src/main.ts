import { bootstrapCanvas, createRenderLoop, drawPlaceholderScene } from './render/bootstrap';
import { InputManager } from './engine/input';
import { World } from './engine/world';
import { RunController, type RunControllerEvents } from './engine/run-controller';
import { createHud, hideGameOver, showGameOver, type HudState } from './ui/hud';
import { RunSeed } from './shared/random';
import { syncHud } from './ui/hud-sync';

const ROOT_ID = 'app'; // TODO: Keep in sync with actual DOM root.

/**
 * Generates the initial seed that drives deterministic game runs.
 *
 * @remarks
 * Uses the current timestamp masked to 32 bits so the seed remains within the range the
 * deterministic RNG expects.
 *
 * @returns Seed wrapper containing a 32-bit unsigned integer.
 * @throws This function never throws; it relies on synchronous bitwise operations.
 * @example
 * ```ts
 * const seed = createInitialSeed();
 * console.log(seed.value);
 * ```
 */
function createInitialSeed(): RunSeed {
  // TODO: Generate a deterministic seed (random per run, surfaced in HUD).
  return { value: Date.now() & 0xffffffff };
}

/**
 * Entry point that wires together input, world, rendering, and HUD scaffolding.
 *
 * @remarks
 * The bootstrap is currently synchronous; future implementations should defer invocation to
 * `DOMContentLoaded` or Vite's entry lifecycle once additional subsystems exist.
 *
 * @throws This function never throws; dependent subsystems report errors internally.
 * @example
 * ```ts
 * main();
 * ```
 */
function main(): void {
  // TODO: Replace scaffolding with real bootstrap once systems are implemented.
  const seed = createInitialSeed();
  const renderContext = bootstrapCanvas(ROOT_ID);
  const world = new World();
  const input = new InputManager();
  const targetDeltaMs = 1000 / 60;
  const lifecycleEvents: RunControllerEvents = {
    onGameOver(seed: RunSeed) {
      showGameOver(seed);
    },
    onRestart() {
      hideGameOver();
    },
  };

  const controller = new RunController(world, input, {
    seed,
    targetDeltaMs,
    events: lifecycleEvents,
  });

  const hudRoot = document.getElementById('hud');
  let hudState: HudState | undefined;
  if (hudRoot) {
    hudState = createHud(hudRoot);
  }

  const loop = createRenderLoop(renderContext, (_frame) => {
    controller.update(targetDeltaMs);
    drawPlaceholderScene(renderContext, seed);

    if (hudState) {
      syncHud(world, hudState, seed);
    }
  });

  controller.start();

  if (hudState) {
    syncHud(world, hudState, seed);
  }

  loop.start();
}

// TODO: Wire this to DOMContentLoaded or Vite entry once ready.
main();
