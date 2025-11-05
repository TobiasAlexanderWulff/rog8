// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { System, World, TickContext, ResourceKey } from '../engine/world';
import type { ComponentKey, HealthComponent, VelocityComponent } from '../engine/components';
import type { EnemyComponent } from './enemy';

/**
 * Snapshot of the impulse applied to a target after a melee hit.
 *
 * @remarks
 * Direction components are clamped to safe numeric values so downstream code can assume finite
 * values when updating velocity.
 *
 * @example
 * ```ts
 * const impulse: KnockbackImpulse = { directionX: 1, directionY: 0, magnitude: 2 };
 * ```
 */
export interface KnockbackImpulse {
  directionX: number;
  directionY: number;
  magnitude: number;
}

/**
 * Event describing an attacker striking a target.
 *
 * @remarks
 * Attack payloads are sanitized before they are processed so malformed data cannot crash combat
 * systems.
 *
 * @example
 * ```ts
 * const event: MeleeAttackEvent = { attackerId: 1, targetId: 2, damage: 3 };
 * ```
 */
export interface MeleeAttackEvent {
  attackerId: number;
  targetId: number;
  damage: number;
  knockback?: KnockbackImpulse;
}

export const MELEE_COOLDOWN_MS = 250; // TODO: Tune cooldown once playtests exist.

const MELEE_ATTACK_QUEUE_KEY = 'system.melee.attack-queue' as ResourceKey<MeleeAttackEvent[]>;
const MELEE_ATTACK_DISPATCH_KEY = 'system.melee.dispatch-attack' as ResourceKey<
  (event: MeleeAttackEvent) => void
>;
const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;
const VELOCITY_COMPONENT_KEY = 'component.velocity' as ComponentKey<VelocityComponent>;
const DEFAULT_MELEE_DAMAGE = 1;

/**
 * Installs the melee combat system on the provided world instance.
 *
 * @remarks
 * Ensures a shared attack queue resource exists, clears stale events, and registers a dispatch
 * callback that sanitizes attack payloads before enqueueing.
 *
 * @param world - ECS world that hosts systems and components.
 * @throws Error when an existing melee attack queue resource has an unexpected shape.
 * @example
 * ```ts
 * registerMeleeSystem(world);
 * ```
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

    const rawDamage = event.damage;
    const damage = Number.isFinite(rawDamage) && rawDamage > 0 ? rawDamage : DEFAULT_MELEE_DAMAGE;
    let knockback: KnockbackImpulse | undefined;
    if (event.knockback) {
      const { directionX, directionY, magnitude } = event.knockback;
      const dx = Number.isFinite(directionX) ? directionX : 0;
      const dy = Number.isFinite(directionY) ? directionY : 0;
      const force = Number.isFinite(magnitude) && magnitude > 0 ? magnitude : 0;
      if (dx !== 0 || dy !== 0 || force !== 0) {
        knockback = {
          directionX: dx,
          directionY: dy,
          magnitude: force,
        };
      }
    }

    attackQueue.push({
      attackerId: Math.trunc(attackerId),
      targetId: Math.trunc(targetId),
      damage,
      knockback,
    });
  };

  world.removeResource(MELEE_ATTACK_DISPATCH_KEY); // Replace any stale dispatcher from previous runs.
  world.registerResource(MELEE_ATTACK_DISPATCH_KEY, dispatchAttack);
  world.addSystem(meleeSystem);
};

/**
 * Resolves queued melee attack events and updates combat state.
 *
 * @remarks
 * Applies damage, enforces enemy overrides, handles knockback velocity mutations, and drains the
 * queue once processing completes.
 *
 * @param world - ECS world being updated.
 * @param context - Frame metadata including delta and RNG.
 * @throws This system never throws; malformed attack payloads are sanitized before use.
 * @example
 * ```ts
 * import { createMulberry32 } from '../shared/random';
 *
 * meleeSystem(world, { delta: 16, frame: 10, rng: createMulberry32(0) });
 * ```
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
  const velocityStore = world.getComponentStore(VELOCITY_COMPONENT_KEY);

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
    if (Number.isFinite(attack.damage) && attack.damage > 0) {
      damage = attack.damage;
    }

    const enemy = enemyStore?.get(attack.attackerId);
    if (enemy) {
      const enemyDamage = enemy.damage;
      if (!Number.isFinite(attack.damage) || attack.damage <= 0) {
        if (Number.isFinite(enemyDamage) && enemyDamage > 0) {
          damage = enemyDamage;
        }
      } else if (Number.isFinite(enemyDamage) && enemyDamage > damage) {
        damage = enemyDamage;
      }
    }

    const nextHealth = targetHealth.current - damage;
    targetHealth.current = nextHealth > 0 ? nextHealth : 0;

    const knockback = attack.knockback;
    if (!knockback || !velocityStore) {
      continue;
    }

    const targetVelocity = velocityStore.get(attack.targetId);
    if (!targetVelocity) {
      continue;
    }

    const directionX = Number.isFinite(knockback.directionX) ? knockback.directionX : 0;
    const directionY = Number.isFinite(knockback.directionY) ? knockback.directionY : 0;
    const magnitude =
      Number.isFinite(knockback.magnitude) && knockback.magnitude > 0 ? knockback.magnitude : 0;

    if (magnitude === 0 || (directionX === 0 && directionY === 0)) {
      continue;
    }

    targetVelocity.vx += directionX * magnitude;
    targetVelocity.vy += directionY * magnitude;
  }

  queue.length = 0;
  void context;
};
