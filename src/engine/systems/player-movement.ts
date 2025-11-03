import type { System, World, ResourceKey } from '../world';
import type {
  ComponentKey,
  PlayerComponent,
  TransformComponent,
  VelocityComponent,
} from '../components';
import type { InputManager, KeyBinding } from '../input';

/**
 * Configuration shared with the player movement system.
 */
export interface PlayerMovementOptions {
  input: InputManager;
  speedScalar: number;
  acceleration: number;
}

const PLAYER_MOVEMENT_OPTIONS_KEY =
  'system.player-movement.options' as ResourceKey<PlayerMovementOptions>;

const TRANSFORM_COMPONENT_KEY = 'component.transform' as ComponentKey<TransformComponent>;
const VELOCITY_COMPONENT_KEY = 'component.velocity' as ComponentKey<VelocityComponent>;
const PLAYER_COMPONENT_KEY = 'component.player' as ComponentKey<PlayerComponent>;

/**
 * Installs the player movement system with the provided configuration.
 *
 * @param world ECS world that manages entities and components.
 * @param options Handles required to read input and adjust velocities.
 */
export const registerPlayerMovementSystem = (
  world: World,
  options: PlayerMovementOptions,
): void => {
  world.removeResource(PLAYER_MOVEMENT_OPTIONS_KEY);
  world.registerResource(PLAYER_MOVEMENT_OPTIONS_KEY, options);
  world.addSystem(playerMovementSystem);
};

/**
 * Applies player-facing movement by sampling the current input state.
 *
 * @param world ECS world to mutate.
 * @param context Frame metadata including RNG and delta time.
 */
export const playerMovementSystem: System = (world, context) => {
  const options = world.getResource(PLAYER_MOVEMENT_OPTIONS_KEY);
  if (!options) {
    return;
  }

  const transformStore = world.getComponentStore(TRANSFORM_COMPONENT_KEY);
  const velocityStore = world.getComponentStore(VELOCITY_COMPONENT_KEY);
  const playerStore = world.getComponentStore(PLAYER_COMPONENT_KEY);
  if (!transformStore || !velocityStore || !playerStore) {
    return;
  }

  const players = playerStore.entries();
  if (players.length === 0) {
    return;
  }

  const { input, speedScalar, acceleration } = options;
  const frameDelta = context.delta;
  const rawStep = acceleration > 0 ? acceleration * frameDelta : Number.POSITIVE_INFINITY;
  const hasAccelerationLimit = Number.isFinite(rawStep);
  const maxStep = hasAccelerationLimit ? rawStep : 0;

  const isActive = (key: KeyBinding): boolean => input.isHeld(key) || input.isPressed(key);

  const up = isActive('ArrowUp') || isActive('KeyW');
  const down = isActive('ArrowDown') || isActive('KeyS');
  const left = isActive('ArrowLeft') || isActive('KeyA');
  const right = isActive('ArrowRight') || isActive('KeyD');

  let inputX = 0;
  if (left !== right) {
    inputX = right ? 1 : -1;
  }

  let inputY = 0;
  if (up !== down) {
    inputY = down ? 1 : -1;
  }

  if (inputX !== 0 && inputY !== 0) {
    const normalise = Math.SQRT1_2;
    inputX *= normalise;
    inputY *= normalise;
  }

  const desiredVx = inputX * speedScalar;
  const desiredVy = inputY * speedScalar;

  const adjustAxis: (current: number, target: number) => number = hasAccelerationLimit
    ? (current: number, target: number): number => {
        const diff = target - current;
        if (diff === 0) {
          return current;
        }

        const magnitude = diff > 0 ? diff : -diff;
        if (magnitude <= maxStep) {
          return target;
        }

        return current + (diff > 0 ? maxStep : -maxStep);
      }
    : (_current: number, target: number): number => target;

  for (const [entityId] of players) {
    const velocity = velocityStore.get(entityId);
    const transform = transformStore.get(entityId);
    if (!velocity || !transform) {
      continue;
    }

    const nextVx = adjustAxis(velocity.vx, desiredVx);
    const nextVy = adjustAxis(velocity.vy, desiredVy);

    velocity.vx = nextVx;
    velocity.vy = nextVy;

    transform.x += nextVx * frameDelta;
    transform.y += nextVy * frameDelta;
  }
};
