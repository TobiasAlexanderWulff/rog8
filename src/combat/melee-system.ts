/* eslint-disable @typescript-eslint/no-unused-vars */

import type { System, World, TickContext } from '../engine/world';

/**
 * Payload representing a melee attack that should be resolved.
 */
export interface MeleeAttackEvent {
  attackerId: number;
  targetId: number;
  // TODO: Include damage value and knockback details when combat math is defined.
}

export const MELEE_COOLDOWN_MS = 250; // TODO: Tune cooldown once playtests exist.

/**
 * Installs the melee system into the provided world instance.
 *
 * @param world ECS world that hosts systems and components.
 */
export const registerMeleeSystem = (world: World): void => {
  // TODO: Register melee combat update loop and event routing.
  void world;
};

/**
 * Resolves outstanding melee attack events and updates combat state.
 *
 * @param world ECS world being updated.
 * @param context Frame metadata including delta and RNG.
 */
export const meleeSystem: System = (world, context) => {
  // TODO: Resolve queued melee attacks and apply damage to involved entities.
  void world;
  void context;
};
