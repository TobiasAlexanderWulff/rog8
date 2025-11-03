/* eslint-disable @typescript-eslint/no-unused-vars */

import type { System, World, TickContext, ResourceKey } from '../world';
import type { InputManager } from '../input';

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
  // TODO: Consume input state and update player velocity/transform components.
  void world;
  void context;
};
