/* eslint-disable @typescript-eslint/no-unused-vars */

import type { System, World, TickContext } from '../engine/world';

/**
 * Registers the chase AI system with the provided world instance.
 *
 * @param world ECS world that should host the system.
 */
export const registerChaseSystem = (world: World): void => {
  // TODO: Register chase AI system against the world once ECS wiring exists.
  void world;
};

/**
 * Moves enemies toward their targets based on line-of-sight and aggro rules.
 *
 * @param world ECS world to mutate.
 * @param context Frame metadata containing delta time and RNG.
 */
export const chaseSystem: System = (world, context) => {
  // TODO: Move enemies toward their target while respecting collisions.
  void world;
  void context;
};
