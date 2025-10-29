import { createMulberry32, RunSeed } from '../shared/random';
import type { RNG } from '../shared/random';
import { World, TickContext, type ResourceKey } from './world';
import { InputManager } from './input';

export type RunState = 'init' | 'playing' | 'game-over';

export interface RunControllerOptions {
  seed: RunSeed;
  targetDeltaMs: number;
}

/**
 * Coordinates high-level game loop state, feeding ticks into the ECS world.
 */
export class RunController {
  private world: World;
  private input: InputManager;
  private state: RunState = 'init';
  private frame = 0;
  private seed: RunSeed;
  private rng: RNG;

  private static readonly INPUT_RESOURCE_KEY = 'engine.input-manager' as ResourceKey<InputManager>;

  /**
   * Builds a controller that keeps world updates deterministic for a given seed.
   *
   * @param world ECS world instance that receives update ticks.
   * @param input Input manager that exposes per-frame state.
   * @param options Mutable configuration such as seed and target delta.
   */
  constructor(world: World, input: InputManager, options: RunControllerOptions) {
    // TODO: Store options and bootstrap initial state.
    this.world = world;
    this.input = input;
    this.seed = options.seed;
    this.rng = createMulberry32(this.seed.value);
    this.registerCoreResources();
  }

  /**
   * Transitions into the playing state, preparing the first update tick.
   */
  start(): void {
    // TODO: Transition into the playing state and spawn initial entities.
    this.state = 'playing';
  }

  /**
   * Steps the simulation forward by one frame when the run is active.
   *
   * @param delta Elapsed time in milliseconds since the previous update.
   */
  update(delta: number): void {
    // TODO: Advance world ticks deterministically based on delta and stored seed.
    if (this.state !== 'playing') {
      return;
    }
    const frame = this.frame;
    this.input.beginFrame(frame);
    const rng = this.rng;
    const context: TickContext = {
      delta,
      frame,
      rng,
    };
    this.world.update(context);
    this.frame = frame + 1;
  }

  /**
   * Switches the run into the game-over state.
   */
  triggerGameOver(): void {
    // TODO: Handle transitions from playing to game-over state.
    this.state = 'game-over';
  }

  /**
   * Resets controller state so the run can be started again with the original seed.
   */
  restart(): void {
    // TODO: Reset world/entities while keeping the original seed.
    this.frame = 0;
    this.state = 'init';
    this.rng = createMulberry32(this.seed.value);
    this.world.reset();
    this.registerCoreResources();
  }

  /**
   * Ensures world-level resources are registered after construction or reset.
   */
  private registerCoreResources(): void {
    if (!this.world.hasResource(RunController.INPUT_RESOURCE_KEY)) {
      this.world.registerResource(RunController.INPUT_RESOURCE_KEY, this.input);
    }
  }
}
