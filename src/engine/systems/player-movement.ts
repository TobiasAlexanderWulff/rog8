/* eslint-disable @typescript-eslint/no-unused-vars */

import type { System, World, TickContext } from '../world';
import type { InputManager } from '../input';

/**
 * Configuration shared with the player movement system.
 */
export interface PlayerMovementOptions {
  input: InputManager;
  // TODO: Add movement speed scalar or acceleration values.
}

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
  // TODO: Store options and link the movement system into the ECS.
  void world;
  void options;
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
