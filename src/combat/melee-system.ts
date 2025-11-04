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
const MELEE_ATTACK_DISPATCH_KEY = 'system.melee.dispatch-attack' as ResourceKey<
  (event: MeleeAttackEvent) => void
>;
const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;
const DEFAULT_MELEE_DAMAGE = 1;

/**
 * Installs the melee system into the provided world instance.
 *
 * @param world ECS world that hosts systems and components.
 */
export const registerMeleeSystem = (world: World): void => {
  const existingQueue = world.getResource(MELEE_ATTACK_QUEUE_KEY);
  if (existingQueue && !Array.isArray(existingQueue)) {
    throw new Error('Melee attack queue resource must be an array.');
  }

  const attackQueue: MeleeAttackEvent[] = existingQueue ?? [];
  if (!existingQueue) {
    world.registerResource(MELEE_ATTACK_QUEUE_KEY, attackQueue);
  } else if (attackQueue.length !== 0) {
    attackQueue.length = 0;
  }

  const dispatchAttack = (event: MeleeAttackEvent): void => {
    const attackerId = event.attackerId;
    const targetId = event.targetId;
    if (!Number.isFinite(attackerId) || !Number.isFinite(targetId)) {
      return;
    }

    attackQueue.push({
      attackerId: Math.trunc(attackerId),
      targetId: Math.trunc(targetId),
    });
  };

  world.removeResource(MELEE_ATTACK_DISPATCH_KEY);
  world.registerResource(MELEE_ATTACK_DISPATCH_KEY, dispatchAttack);
  world.addSystem(meleeSystem);
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
