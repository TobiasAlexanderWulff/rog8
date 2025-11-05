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
 */
export type RunState = 'init' | 'playing' | 'game-over';

/**
 * Configuration provided when constructing a run controller.
 *
 * Attributes:
 *   seed: Base random seed that keeps the run deterministic.
 *   targetDeltaMs: Fixed timestep in milliseconds that the loop strives to maintain.
 */
export interface RunControllerOptions {
  seed: RunSeed;
  targetDeltaMs: number;
}

/**
 * Coordinates high-level game loop state, feeding ticks into the ECS world.
 *
 * Attributes:
 *   world: ECS world instance that receives deterministic updates.
 *   input: Input manager connected to the current run.
 *   state: Lifecycle state for the run (`init`, `playing`, or `game-over`).
 *   frame: Current frame count advanced during updates.
 *   accumulator: Time surplus cached to maintain a fixed timestep.
 *   seed: Stored seed value, allowing deterministic restarts.
 *   rng: Pseudorandom generator derived from the seed.
 *   options: Controller configuration cloned from constructor parameters.
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
   * Args:
   *   world (World): ECS instance that will receive update ticks.
   *   input (InputManager): Input facade exposing per-frame state.
   *   options (RunControllerOptions): Seeded configuration and timestep target.
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
   * Args:
   *   delta (number): Elapsed milliseconds since the previous update invocation.
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
   */
  private registerCoreResources(): void {
    if (!this.world.hasResource(RunController.INPUT_RESOURCE_KEY)) {
      this.world.registerResource(RunController.INPUT_RESOURCE_KEY, this.input);
    }
  }

  /**
   * Registers a component store if the world does not yet track the component type.
   *
   * Args:
   *   componentKey (ComponentKey<T>): Identifier for the component store to ensure.
   */
  private ensureComponentStore<T>(componentKey: ComponentKey<T>): void {
    if (!this.world.getComponentStore(componentKey)) {
      this.world.registerComponentStore(componentKey);
    }
  }
}
