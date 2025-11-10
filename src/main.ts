import {
  bootstrapCanvas,
  createRenderLoop,
  drawPlaceholderScene,
  type RenderContext,
} from './render/bootstrap';
import { InputManager } from './engine/input';
import { World } from './engine/world';
import { RunController, type RunControllerEvents } from './engine/run-controller';
import { createHud, hideGameOver, showGameOver, type HudState } from './ui/hud';
import { RunSeed } from './shared/random';
import { syncHud } from './ui/hud-sync';

const ROOT_ID = 'app';

/**
 * Generates the initial seed that drives deterministic game runs.
 *
 * @remarks
 * Pulls a 32-bit sample from the Web Crypto API so each run starts with a unique deterministic seed
 * while staying within the range expected by the RNG subsystem. Falls back to a timestamp/XOR based
 * mix when secure randomness is unavailable (e.g. older browsers).
 *
 * @returns Seed wrapper containing a 32-bit unsigned integer.
 * @throws This function never throws; it relies on synchronous bitwise operations.
 * @example
 * ```ts
 * const seed = createInitialSeed();
 * console.log(seed.value);
 * ```
 */
export function createInitialSeed(): RunSeed {
  const getRandomSeed = (): number => {
    const cryptoApi = globalThis.crypto as Crypto | undefined;
    if (cryptoApi?.getRandomValues) {
      const sample = new Uint32Array(1);
      cryptoApi.getRandomValues(sample);
      return sample[0] >>> 0;
    }
    const fallback = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    return fallback;
  };

  return { value: getRandomSeed() };
}

interface GameBootstrapContext {
  seed: RunSeed;
  renderContext: RenderContext;
  world: World;
  input: InputManager;
  targetDeltaMs: number;
  events: RunControllerEvents;
  hudRoot?: HTMLElement;
}

/**
 * Wires together the deterministic seed, ECS world, rendering context, and HUD container.
 *
 * @remarks
 * Provides the fully initialised runtime dependencies so {@link main} can focus on loop orchestration.
 *
 * @param rootId - Identifier for the DOM element that hosts the canvas.
 * @returns Structured runtime references required to start the run controller.
 */
function bootstrapGame(rootId: string): GameBootstrapContext {
  const seed = createInitialSeed();
  const renderContext = bootstrapCanvas(rootId);
  const world = new World();
  const input = new InputManager();
  const targetDeltaMs = 1000 / 60;
  const events: RunControllerEvents = {
    onGameOver(seedValue: RunSeed) {
      showGameOver(seedValue);
    },
    onRestart() {
      hideGameOver();
    },
  };

  return {
    seed,
    renderContext,
    world,
    input,
    targetDeltaMs,
    events,
    hudRoot: document.getElementById('hud') ?? undefined,
  };
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
  const { seed, renderContext, world, input, targetDeltaMs, events, hudRoot } =
    bootstrapGame(ROOT_ID);

  const controller = new RunController(world, input, {
    seed,
    targetDeltaMs,
    events,
  });

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
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  main();
}
