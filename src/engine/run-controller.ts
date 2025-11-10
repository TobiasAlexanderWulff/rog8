import { createMulberry32, RunSeed } from '../shared/random';
import type { RNG } from '../shared/random';
import { World, TickContext, type ResourceKey } from './world';
import type { ComponentKey, HealthComponent } from './components';
import { bootstrapRun, type RunBootstrapResult } from '../world/run-setup';
import { InputManager } from './input';

/**
 * Labels for the lifecycle states a run can occupy.
 *
 * @remarks
 * Runs transition from `init` to `playing`, and finally to `game-over` when the player loses.
 *
 * @example
 * ```ts
 * let state: RunState = 'init';
 * ```
 */
export type RunState = 'init' | 'playing' | 'game-over';

/**
 * Configuration provided when constructing a run controller.
 *
 * @remarks
 * Captures the deterministic seed and fixed timestep configuration needed by the controller.
 *
 * @example
 * ```ts
 * const options: RunControllerOptions = { seed: { value: 0 }, targetDeltaMs: 16 };
 * ```
 */
export interface RunControllerOptions {
  seed: RunSeed;
  targetDeltaMs: number;
  events?: RunControllerEvents;
}

/**
 * Lifecycle callbacks invoked by the {@link RunController} when key transitions occur.
 *
 * @remarks
 * Hooks allow presentation layers to react to engine events without the controller importing UI
 * modules directly.
 *
 * @example
 * ```ts
 * const events: RunControllerEvents = {
 *   onGameOver: (seed) => console.log(`Run failed with seed ${seed.value}`),
 *   onRestart: () => console.log('Run restarting'),
 * };
 * ```
 */
export interface RunControllerEvents {
  onGameOver?(seed: RunSeed): void;
  onRestart?(): void;
}

/**
 * Dispatcher resource that exposes run lifecycle transitions to ECS systems.
 *
 * @remarks
 * Systems retrieve the dispatcher from the world and invoke `triggerGameOver` when the player dies
 * so the controller can halt the simulation and notify presentation layers.
 *
 * @example
 * ```ts
 * const dispatcher = world.getResource(RUN_LIFECYCLE_DISPATCH_KEY);
 * dispatcher?.triggerGameOver();
 * ```
 */
export interface RunLifecycleDispatcher {
  triggerGameOver(): void;
}

/**
 * Resource key used to register the {@link RunLifecycleDispatcher} within the world.
 *
 * @remarks
 * The controller re-registers the dispatcher after every restart to keep the callbacks bound to the
 * latest instance.
 */
export const RUN_LIFECYCLE_DISPATCH_KEY =
  'engine.run.lifecycle-dispatch' as ResourceKey<RunLifecycleDispatcher>;

/**
 * Snapshot describing the player entity for HUD and gameplay orchestration.
 *
 * @remarks
 * Provides the entity identifier alongside the mutable health component reference attached to the
 * world so callers can reflect the player's latest vitals.
 *
 * @example
 * ```ts
 * const snapshot = controller.getPlayerSnapshot();
 * if (snapshot) {
 *   console.log(snapshot.health.current);
 * }
 * ```
 */
export interface PlayerSnapshot {
  entityId: number;
  health: HealthComponent;
}

/**
 * Coordinates high-level game loop state, feeding ticks into the ECS world.
 *
 * @remarks
 * Owns the ECS world reference, deterministic RNG, and lifecycle transitions required to run the
 * simulation loop.
 *
 * @example
 * ```ts
 * const world = new World();
 * const input = new InputManager();
 * const controller = new RunController(world, input, { seed: { value: 123 }, targetDeltaMs: 16 });
 * controller.start();
 * ```
 */
export class RunController {
  private world: World;
  private input: InputManager;
  private state: RunState = 'init';
  private frame = 0;
  private accumulator = 0;
  private seed: RunSeed;
  private rng: RNG;
  private readonly options: RunControllerOptions;
  private readonly events?: RunControllerEvents;
  private currentRun?: RunBootstrapResult;

  private static readonly INPUT_RESOURCE_KEY = 'engine.input-manager' as ResourceKey<InputManager>;
  private static readonly HEALTH_COMPONENT_KEY =
    'component.health' as ComponentKey<HealthComponent>;

  /**
   * Builds a controller that keeps world updates deterministic for a given seed.
   *
   * @remarks
   * Clones configuration data to avoid accidental external mutation and registers the core input
   * resource immediately.
   *
   * @param world - ECS instance that will receive update ticks.
   * @param input - Input facade exposing per-frame state.
   * @param options - Seeded configuration and timestep target.
   * @throws Error when the target delta is zero or negative.
   * @example
   * ```ts
   * const controller = new RunController(world, input, { seed: { value: 0 }, targetDeltaMs: 16 });
   * ```
   */
  constructor(world: World, input: InputManager, options: RunControllerOptions) {
    if (options.targetDeltaMs <= 0) {
      throw new Error('RunController requires a positive target delta.');
    }
    this.world = world;
    this.input = input;
    this.options = {
      targetDeltaMs: options.targetDeltaMs,
      seed: { value: options.seed.value },
    };
    this.events = options.events ? { ...options.events } : undefined;
    this.state = 'init';
    this.frame = 0;
    this.seed = { value: this.options.seed.value };
    this.rng = createMulberry32(this.seed.value);
    this.registerCoreResources();
  }

  /**
   * Transitions the run into the playing state and seeds the initial entities.
   *
   * @remarks
   * Idempotent; repeated calls after the initial start have no effect.
   *
   * @throws This method never throws; it exits early unless the run is in the `init` state.
   * @example
   * ```ts
   * controller.start();
   * ```
   */
  start(): void {
    if (this.state !== 'init') {
      return;
    }

    this.currentRun = bootstrapRun(this.world, this.seed);
    this.state = 'playing';
  }

  /**
   * Steps the simulation forward by one or more fixed timesteps while the run is active.
   *
   * @remarks
   * Accumulates elapsed time and advances the world in deterministic steps sized by
   * `targetDeltaMs`. When the run has ended, the method still polls input so players can restart
   * without refreshing.
   *
   * @param delta - Elapsed milliseconds since the previous update invocation.
   * @throws This method never throws; non-positive deltas are ignored.
   * @example
   * ```ts
   * controller.update(16);
   * ```
   */
  update(delta: number): void {
    if (delta <= 0) {
      return;
    }
    if (this.state === 'game-over') {
      this.processGameOverInput();
      return;
    }
    if (this.state !== 'playing') {
      return;
    }

    this.accumulator += delta;
    const step = this.options.targetDeltaMs;

    while (this.accumulator >= step) {
      const frame = this.frame;
      this.input.beginFrame(frame);
      const context: TickContext = {
        delta: step,
        frame,
        rng: this.rng,
      };
      this.world.update(context);
      this.frame = frame + 1;
      this.accumulator -= step;
    }
  }

  /**
   * Switches the run into the game-over state and flushes any accumulated time budget.
   *
   * @remarks
   * Forces the accumulator to a single step so subsequent updates no longer advance the world.
   *
   * @throws This method never throws; it no-ops when the run is not in the `playing` state.
   * @example
   * ```ts
   * controller.triggerGameOver();
   * ```
   */
  triggerGameOver(): void {
    if (this.state !== 'playing') {
      return;
    }

    this.accumulator = this.options.targetDeltaMs;
    this.state = 'game-over';
    const seed = { value: this.seed.value };
    this.events?.onGameOver?.(seed);
  }

  /**
   * Resets controller state so the run can be started again with the original seed.
   *
   * @remarks
   * Clears the world, resets timers, and re-registers core resources before returning to `init`.
   *
   * @throws This method never throws; the world reset handles cleanup internally.
   * @example
   * ```ts
   * controller.restart();
   * controller.start();
   * ```
   */
  restart(): void {
    const originalSeed = this.seed.value;
    this.world.reset();
    this.frame = 0;
    this.accumulator = 0;
    this.state = 'init';
    this.rng = createMulberry32(originalSeed);
    this.currentRun = undefined;
    this.registerCoreResources();
    this.events?.onRestart?.();
  }

  /**
   * Returns the metadata captured when the current run was bootstrapped.
   *
   * @remarks
   * Consumers should treat the returned reference as read-only; the controller reuses the stored
   * object across the run so caller mutations would desynchronise internal state.
   *
   * @returns Run bootstrap data when the controller has started; otherwise `undefined`.
   * @throws This method never throws; callers should handle the `undefined` case while in `init`.
   * @example
   * ```ts
   * const run = controller.getCurrentRun();
   * console.log(run?.playerEntityId);
   * ```
   */
  getCurrentRun(): RunBootstrapResult | undefined {
    return this.currentRun;
  }

  /**
   * Retrieves the current player handle and health component reference.
   *
   * @remarks
   * Provides HUD and gameplay systems with a stable identifier that survives component store
   * re-registration between runs.
   *
   * @returns Player snapshot containing the entity id and mutable health component.
   * @throws This method never throws; it returns `undefined` until the run has started.
   * @example
   * ```ts
   * const player = controller.getPlayerSnapshot();
   * if (player) {
   *   console.log(player.health.current);
   * }
   * ```
   */
  getPlayerSnapshot(): PlayerSnapshot | undefined {
    if (!this.currentRun) {
      return undefined;
    }

    const health = this.world.getComponent(
      this.currentRun.playerEntityId,
      RunController.HEALTH_COMPONENT_KEY,
    );
    if (!health) {
      return undefined;
    }

    return {
      entityId: this.currentRun.playerEntityId,
      health,
    };
  }

  /**
   * Ensures world-level resources are registered after construction or reset.
   *
   * @remarks
   * Registers the input manager as a world resource if it is not already present.
   *
   * @throws This method never throws; it conditionally registers the resource.
   * @example
   * ```ts
   * // Invoked internally during construction and restart.
   * ```
   */
  private registerCoreResources(): void {
    if (!this.world.hasResource(RunController.INPUT_RESOURCE_KEY)) {
      this.world.registerResource(RunController.INPUT_RESOURCE_KEY, this.input);
    }

    const dispatcher: RunLifecycleDispatcher = {
      triggerGameOver: () => {
        this.triggerGameOver();
      },
    };
    this.world.removeResource(RUN_LIFECYCLE_DISPATCH_KEY);
    this.world.registerResource(RUN_LIFECYCLE_DISPATCH_KEY, dispatcher);
  }

  /**
   * Processes restart input while the run sits on the game-over screen.
   *
   * @remarks
   * Continues to advance the frame counter so input queries remain consistent even when the world
   * is paused.
   *
   * @example
   * ```ts
   * controller.update(delta); // when state === 'game-over'
   * ```
   */
  private processGameOverInput(): void {
    const frame = this.frame;
    this.input.beginFrame(frame);
    this.frame = frame + 1;

    if (this.input.isPressed('KeyR')) {
      this.restart();
      this.start();
    }
  }
}
