/* eslint-disable @typescript-eslint/no-unused-vars */

import type { System, World, TickContext } from '../engine/world';

export interface MeleeAttackEvent {
  attackerId: number;
  targetId: number;
  // TODO: Include damage value and knockback details when combat math is defined.
}

export const MELEE_COOLDOWN_MS = 250; // TODO: Tune cooldown once playtests exist.

export const registerMeleeSystem = (world: World): void => {
  // TODO: Register melee combat update loop and event routing.
  void world;
};

export const meleeSystem: System = (world, context) => {
  // TODO: Resolve queued melee attacks and apply damage to involved entities.
  void world;
  void context;
};
