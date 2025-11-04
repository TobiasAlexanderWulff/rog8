/* eslint-disable @typescript-eslint/no-unused-vars */

import type { System, World, TickContext, ResourceKey } from '../engine/world';
import type { ComponentKey, HealthComponent } from '../engine/components';
import type { EnemyComponent } from './enemy';

/**
 * Payload representing a melee attack that should be resolved.
 */
export interface MeleeAttackEvent {
  attackerId: number;
  targetId: number;
  // TODO: Include damage value and knockback details when combat math is defined.
}

export const MELEE_COOLDOWN_MS = 250; // TODO: Tune cooldown once playtests exist.

const MELEE_ATTACK_QUEUE_KEY = 'system.melee.attack-queue' as ResourceKey<MeleeAttackEvent[]>;
const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;
const DEFAULT_MELEE_DAMAGE = 1;

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
  const queue = world.getResource(MELEE_ATTACK_QUEUE_KEY);
  if (!queue || queue.length === 0) {
    return;
  }

  const healthStore = world.getComponentStore(HEALTH_COMPONENT_KEY);
  if (!healthStore) {
    queue.length = 0;
    return;
  }

  const enemyStore = world.getComponentStore(ENEMY_COMPONENT_KEY);

  for (let i = 0; i < queue.length; i += 1) {
    const attack = queue[i];
    if (!world.isEntityAlive(attack.attackerId) || !world.isEntityAlive(attack.targetId)) {
      continue;
    }

    const targetHealth = healthStore.get(attack.targetId);
    if (!targetHealth) {
      continue;
    }

    let damage = DEFAULT_MELEE_DAMAGE;
    const enemy = enemyStore?.get(attack.attackerId);
    if (enemy) {
      const enemyDamage = enemy.damage;
      if (Number.isFinite(enemyDamage) && enemyDamage > 0) {
        damage = enemyDamage;
      }
    }

    const nextHealth = targetHealth.current - damage;
    targetHealth.current = nextHealth > 0 ? nextHealth : 0;
  }

  queue.length = 0;
  void context;
};
