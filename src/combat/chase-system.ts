/* eslint-disable @typescript-eslint/no-unused-vars */

import type { System, World, TickContext } from '../engine/world';

export const registerChaseSystem = (world: World): void => {
  // TODO: Register chase AI system against the world once ECS wiring exists.
  void world;
};

export const chaseSystem: System = (world, context) => {
  // TODO: Move enemies toward their target while respecting collisions.
  void world;
  void context;
};
