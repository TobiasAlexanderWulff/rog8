/**
 * @fileoverview Provides the player movement ECS system and the registration helper
 * for wiring it into the game world.
 */

import type { System, World, ResourceKey } from '../world';
import type {
  ComponentKey,
  PlayerComponent,
  TransformComponent,
  VelocityComponent,
} from '../components';
import type { InputManager, KeyBinding } from '../input';
import type { MapGrid } from '../../world/mapgen/simple';
import { checkCollision } from '../collision';

/**
 * Runtime dependencies for the player movement system.
 *
 * @remarks
 * Encapsulates input state, tunable movement parameters, and the collision map the player
 * navigates.
 *
 * @example
 * ```ts
 * const options: PlayerMovementOptions = {
 *   input,
 *   speedScalar: 5,
 *   acceleration: 0.02,
 *   map,
 * };
 * ```
 */
export interface PlayerMovementOptions {
  input: InputManager;
  speedScalar: number;
  acceleration: number;
  map: MapGrid;
}

const PLAYER_MOVEMENT_OPTIONS_KEY =
  'system.player-movement.options' as ResourceKey<PlayerMovementOptions>;

const TRANSFORM_COMPONENT_KEY = 'component.transform' as ComponentKey<TransformComponent>;
const VELOCITY_COMPONENT_KEY = 'component.velocity' as ComponentKey<VelocityComponent>;
const PLAYER_COMPONENT_KEY = 'component.player' as ComponentKey<PlayerComponent>;

/**
 * Installs the player movement system with the provided configuration.
 *
 * @remarks
 * Stores the supplied options as a world resource and registers the system so it executes each
 * frame.
 *
 * @param world - ECS world that manages entities and components.
 * @param options - Handles required to read input and adjust velocities.
 * @throws This function never throws; it replaces any existing options resource.
 * @example
 * ```ts
 * registerPlayerMovementSystem(world, options);
 * ```
 */
export const registerPlayerMovementSystem = (
  world: World,
  options: PlayerMovementOptions,
): void => {
  // Always replace stale options so changes take effect immediately.
  world.removeResource(PLAYER_MOVEMENT_OPTIONS_KEY);
  world.registerResource(PLAYER_MOVEMENT_OPTIONS_KEY, options);
  world.addSystem(playerMovementSystem);
};

/**
 * Applies player-facing movement by sampling the current input state.
 *
 * @remarks
 * Adjusts velocity vectors toward desired input directions and resolves collisions against the map
 * grid.
 *
 * @param world - ECS world to mutate.
 * @param context - Frame metadata including RNG and delta time.
 * @throws This system never throws; missing dependencies short-circuit the update.
 * @example
 * ```ts
 * import { createMulberry32 } from '../../shared/random';
 *
 * playerMovementSystem(world, { delta: 16, frame: 1, rng: createMulberry32(0) });
 * ```
 */
export const playerMovementSystem: System = (world, context) => {
  const options = world.getResource(PLAYER_MOVEMENT_OPTIONS_KEY);
  if (!options) {
    // System is disabled until configured with shared options.
    return;
  }

  const transformStore = world.getComponentStore(TRANSFORM_COMPONENT_KEY);
  const velocityStore = world.getComponentStore(VELOCITY_COMPONENT_KEY);
  const playerStore = world.getComponentStore(PLAYER_COMPONENT_KEY);
  if (!transformStore || !velocityStore || !playerStore) {
    // Required component stores are not present, so defer until they exist.
    return;
  }

  const players = playerStore.entries();
  if (players.length === 0) {
    return;
  }

  const { input, speedScalar, acceleration, map } = options;
  const frameDelta = context.delta;
  const rawStep = acceleration > 0 ? acceleration * frameDelta : Number.POSITIVE_INFINITY;
  const hasAccelerationLimit = Number.isFinite(rawStep);
  const maxStep = hasAccelerationLimit ? rawStep : 0;

  // Treat a key as active when either held or freshly pressed this frame.
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
    // Maintain consistent speed diagonally by normalising the input vector.
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

        // Clamp the delta so acceleration respects the per-frame limit.
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

    let resolvedX = transform.x;
    let resolvedY = transform.y;

    if (nextVx !== 0) {
      const candidateX = resolvedX + nextVx * frameDelta;
      const tileX = Math.floor(candidateX);
      const tileY = Math.floor(resolvedY);
      const collision = checkCollision(map, tileX, tileY);
      if (collision.blocked) {
        velocity.vx = 0;
      } else {
        resolvedX = candidateX;
      }
    }

    if (nextVy !== 0) {
      const candidateY = resolvedY + nextVy * frameDelta;
      const tileX = Math.floor(resolvedX);
      const tileY = Math.floor(candidateY);
      const collision = checkCollision(map, tileX, tileY);
      if (collision.blocked) {
        velocity.vy = 0;
      } else {
        resolvedY = candidateY;
      }
    }

    transform.x = resolvedX;
    transform.y = resolvedY;
  }
};
