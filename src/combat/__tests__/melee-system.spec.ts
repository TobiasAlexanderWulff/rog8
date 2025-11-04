import { describe, it, expect, beforeEach } from 'vitest';

import { World, type TickContext, type ResourceKey } from '../../engine/world';
import { registerMeleeSystem, meleeSystem, type MeleeAttackEvent } from '../melee-system';
import type { ComponentKey, HealthComponent, VelocityComponent } from '../../engine/components';
import type { EnemyComponent } from '../enemy';

const MELEE_ATTACK_QUEUE_KEY = 'system.melee.attack-queue' as ResourceKey<MeleeAttackEvent[]>;
const MELEE_ATTACK_DISPATCH_KEY = 'system.melee.dispatch-attack' as ResourceKey<
  (event: MeleeAttackEvent) => void
>;
const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;
const VELOCITY_COMPONENT_KEY = 'component.velocity' as ComponentKey<VelocityComponent>;

const createTickContext = (): TickContext => ({
  delta: 16,
  frame: 0,
  rng: {
    next: () => 0,
    nextFloat: () => 0,
    nextInt: () => 0,
  },
});

describe('melee-system', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.registerComponentStore(HEALTH_COMPONENT_KEY);
    world.registerComponentStore(ENEMY_COMPONENT_KEY);
    world.registerComponentStore(VELOCITY_COMPONENT_KEY);
  });

  it('registers melee resources and clears an existing queue', () => {
    const existingQueue: MeleeAttackEvent[] = [{ attackerId: 1, targetId: 2, damage: 3 }];
    const previousDispatch = (): void => {
      existingQueue.push({ attackerId: 9, targetId: 9, damage: 9 });
    };
    world.registerResource(MELEE_ATTACK_QUEUE_KEY, existingQueue);
    world.registerResource(MELEE_ATTACK_DISPATCH_KEY, previousDispatch);

    expect(world.hasResource(MELEE_ATTACK_QUEUE_KEY)).toBe(true);
    expect(world.hasResource(MELEE_ATTACK_DISPATCH_KEY)).toBe(true);

    registerMeleeSystem(world);

    expect(world.hasResource(MELEE_ATTACK_QUEUE_KEY)).toBe(true);
    expect(world.hasResource(MELEE_ATTACK_DISPATCH_KEY)).toBe(true);

    const queue = world.getResource(MELEE_ATTACK_QUEUE_KEY);
    expect(queue).toBeDefined();

    const dispatch = world.getResource(MELEE_ATTACK_DISPATCH_KEY);
    expect(dispatch).toBeDefined();

    if (!queue || !dispatch) {
      throw new Error('Expected melee resources to be registered.');
    }

    expect(queue).toBe(existingQueue);
    expect(queue).toHaveLength(0);
    expect(dispatch).not.toBe(previousDispatch);
    expect(typeof dispatch).toBe('function');

    dispatch({ attackerId: 4.8, targetId: 7.2, damage: -5 });
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      attackerId: 4,
      targetId: 7,
      damage: 1,
      knockback: undefined,
    });
  });

  it('applies queued melee damage to a healthy target', () => {
    registerMeleeSystem(world);

    const attacker = world.createEntity();
    const target = world.createEntity();
    world.addComponent(target, HEALTH_COMPONENT_KEY, {
      current: 5,
      max: 5,
    });
    const initialVelocity = { vx: 0.25, vy: -0.1 };
    world.addComponent(target, VELOCITY_COMPONENT_KEY, { ...initialVelocity });

    const queue = world.getResource(MELEE_ATTACK_QUEUE_KEY);
    expect(queue).toBeDefined();
    if (!queue) {
      throw new Error('Expected melee attack queue to exist.');
    }
    const knockback = {
      directionX: 0.6,
      directionY: -0.8,
      magnitude: 3,
    };
    queue.push({
      attackerId: attacker.id,
      targetId: target.id,
      damage: 2,
      knockback,
    });

    meleeSystem(world, createTickContext());

    const targetHealth = world.getComponent(target, HEALTH_COMPONENT_KEY);
    expect(targetHealth?.current).toBe(3);
    const targetVelocity = world.getComponent(target, VELOCITY_COMPONENT_KEY);
    const expectedVx = initialVelocity.vx + knockback.directionX * knockback.magnitude;
    const expectedVy = initialVelocity.vy + knockback.directionY * knockback.magnitude;
    expect(targetVelocity).toBeDefined();
    expect(targetVelocity?.vx).toBeCloseTo(expectedVx);
    expect(targetVelocity?.vy).toBeCloseTo(expectedVy);
    expect(queue).toHaveLength(0);
  });

  it('falls back to enemy damage when event damage is invalid', () => {
    registerMeleeSystem(world);

    const attacker = world.createEntity();
    const target = world.createEntity();

    world.addComponent(attacker, ENEMY_COMPONENT_KEY, {
      archetype: 'grunt',
      maxHp: 1,
      speed: 1,
      damage: 4,
    });

    world.addComponent(target, HEALTH_COMPONENT_KEY, {
      current: 10,
      max: 10,
    });

    const queue = world.getResource(MELEE_ATTACK_QUEUE_KEY);
    expect(queue).toBeDefined();
    if (!queue) {
      throw new Error('Expected melee attack queue to exist.');
    }
    queue.push({
      attackerId: attacker.id,
      targetId: target.id,
      damage: 0,
    });

    meleeSystem(world, createTickContext());

    const targetHealth = world.getComponent(target, HEALTH_COMPONENT_KEY);
    expect(targetHealth?.current).toBe(6);
  });

  it('resolves queued attacks from multiple attackers targeting the same entity', () => {
    registerMeleeSystem(world);

    const grunt = world.createEntity();
    const brute = world.createEntity();
    const rogue = world.createEntity();
    const target = world.createEntity();

    world.addComponent(grunt, ENEMY_COMPONENT_KEY, {
      archetype: 'grunt',
      maxHp: 4,
      speed: 1,
      damage: 3,
    });
    world.addComponent(brute, ENEMY_COMPONENT_KEY, {
      archetype: 'brute',
      maxHp: 12,
      speed: 0.75,
      damage: 7,
    });
    world.addComponent(target, HEALTH_COMPONENT_KEY, {
      current: 15,
      max: 15,
    });

    const queue = world.getResource(MELEE_ATTACK_QUEUE_KEY);
    expect(queue).toBeDefined();
    if (!queue) {
      throw new Error('Expected melee attack queue to exist.');
    }

    queue.push(
      {
        attackerId: grunt.id,
        targetId: target.id,
        damage: 0,
      },
      {
        attackerId: brute.id,
        targetId: target.id,
        damage: 4,
      },
      {
        attackerId: rogue.id,
        targetId: target.id,
        damage: 2,
      },
    );

    meleeSystem(world, createTickContext());

    const targetHealth = world.getComponent(target, HEALTH_COMPONENT_KEY);
    expect(targetHealth?.current).toBe(3);
    expect(queue).toHaveLength(0);
  });
});
