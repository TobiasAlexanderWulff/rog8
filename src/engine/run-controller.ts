import { createMulberry32, RunSeed } from '../shared/random';
import type { RNG } from '../shared/random';
import { World, TickContext, type ResourceKey } from './world';
import type {
  ComponentKey,
  HealthComponent,
  PlayerComponent,
  TransformComponent,
  VelocityComponent,
} from './components';
import { createEnemyComponent, type EnemyComponent } from '../combat/enemy';
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

  private static readonly INPUT_RESOURCE_KEY = 'engine.input-manager' as ResourceKey<InputManager>;
  private static readonly TRANSFORM_COMPONENT_KEY =
    'component.transform' as ComponentKey<TransformComponent>;
  private static readonly VELOCITY_COMPONENT_KEY =
    'component.velocity' as ComponentKey<VelocityComponent>;
  private static readonly HEALTH_COMPONENT_KEY =
    'component.health' as ComponentKey<HealthComponent>;
  private static readonly PLAYER_COMPONENT_KEY =
    'component.player' as ComponentKey<PlayerComponent>;
  private static readonly ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;
  private static readonly PLAYER_STARTING_HEALTH = 5;

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

    this.ensureComponentStore(RunController.TRANSFORM_COMPONENT_KEY);
    this.ensureComponentStore(RunController.VELOCITY_COMPONENT_KEY);
    this.ensureComponentStore(RunController.HEALTH_COMPONENT_KEY);
    this.ensureComponentStore(RunController.PLAYER_COMPONENT_KEY);
    this.ensureComponentStore(RunController.ENEMY_COMPONENT_KEY);

    const player = this.world.createEntity();
    this.world.addComponent(player, RunController.TRANSFORM_COMPONENT_KEY, { x: 0, y: 0 });
    this.world.addComponent(player, RunController.VELOCITY_COMPONENT_KEY, { vx: 0, vy: 0 });
    this.world.addComponent(player, RunController.HEALTH_COMPONENT_KEY, {
      current: RunController.PLAYER_STARTING_HEALTH,
      max: RunController.PLAYER_STARTING_HEALTH,
    });
    this.world.addComponent(player, RunController.PLAYER_COMPONENT_KEY, { name: 'Player' });

    const enemy = this.world.createEntity();
    const enemyComponent = createEnemyComponent('grunt');
    this.world.addComponent(enemy, RunController.TRANSFORM_COMPONENT_KEY, { x: 5, y: 5 });
    this.world.addComponent(enemy, RunController.HEALTH_COMPONENT_KEY, {
      current: enemyComponent.maxHp,
      max: enemyComponent.maxHp,
    });
    this.world.addComponent(enemy, RunController.ENEMY_COMPONENT_KEY, enemyComponent);

    this.state = 'playing';
  }

  /**
   * Steps the simulation forward by one or more fixed timesteps while the run is active.
   *
   * @remarks
   * Accumulates elapsed time and advances the world in deterministic steps sized by
   * `targetDeltaMs`.
   *
   * @param delta - Elapsed milliseconds since the previous update invocation.
   * @throws This method never throws; non-positive deltas are ignored.
   * @example
   * ```ts
   * controller.update(16);
   * ```
   */
  update(delta: number): void {
    if (this.state !== 'playing') {
      return;
    }
    if (delta <= 0) {
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
    this.registerCoreResources();
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
  }

  /**
   * Registers a component store if the world does not yet track the component type.
   *
   * @remarks
   * Prevents duplicate registrations by checking for an existing store before invoking
   * `registerComponentStore`.
   *
   * @param componentKey - Identifier for the component store to ensure.
   * @throws This method never throws; redundant registrations are avoided.
   * @example
   * ```ts
   * // Called internally before attaching components to new entities.
   * ```
   */
  private ensureComponentStore<T>(componentKey: ComponentKey<T>): void {
    if (!this.world.getComponentStore(componentKey)) {
      this.world.registerComponentStore(componentKey);
    }
  }
}
