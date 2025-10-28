/* eslint-disable @typescript-eslint/no-unused-vars */

import type { System, World, TickContext } from '../world';
import type { InputManager } from '../input';

export interface PlayerMovementOptions {
  input: InputManager;
  // TODO: Add movement speed scalar or acceleration values.
}

export const registerPlayerMovementSystem = (
  world: World,
  options: PlayerMovementOptions,
): void => {
  // TODO: Store options and link the movement system into the ECS.
  void world;
  void options;
};

export const playerMovementSystem: System = (world, context) => {
  // TODO: Consume input state and update player velocity/transform components.
  void world;
  void context;
};
