/**
 * @fileoverview Combat enemy component scaffolding tests.
 */
import { describe, expect, it, vi } from 'vitest';

import { createEnemyComponent, spawnEnemy } from '../enemy';
import type { ComponentKey, TransformComponent, HealthComponent } from '../../engine/components';
import type { EnemyComponent } from '../enemy';
import { World } from '../../engine/world';

const TRANSFORM_COMPONENT_KEY = 'component.transform' as ComponentKey<TransformComponent>;
const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;

describe('createEnemyComponent', () => {
  it('creates combat stats for grunt archetype', () => {
    const component = createEnemyComponent('grunt');

    expect(component.archetype).toBe('grunt');
    expect(component.maxHp).toBe(1);
    expect(component.speed).toBe(1.5);
    expect(component.damage).toBe(1);
  });

  it('creates combat stats for placeholder archetype', () => {
    const component = createEnemyComponent('placeholder');

    expect(component.archetype).toBe('placeholder');
    expect(component.maxHp).toBe(1);
    expect(component.speed).toBe(1);
    expect(component.damage).toBe(0);
  });

  it('produces isolated component instances per spawn', () => {
    const first = createEnemyComponent('grunt');
    const second = createEnemyComponent('grunt');

    expect(first).not.toBe(second);

    first.maxHp = 42;
    first.damage = 7;

    expect(second.maxHp).toBe(1);
    expect(second.damage).toBe(1);
  });
});

describe('spawnEnemy', () => {
  it('registers dependent stores when absent', () => {
    const world = new World();
    const registerSpy = vi.spyOn(world, 'registerComponentStore');

    expect(world.getComponentStore(TRANSFORM_COMPONENT_KEY)).toBeUndefined();
    expect(world.getComponentStore(HEALTH_COMPONENT_KEY)).toBeUndefined();
    expect(world.getComponentStore(ENEMY_COMPONENT_KEY)).toBeUndefined();

    spawnEnemy(world, 'grunt');

    expect(registerSpy).toHaveBeenCalledTimes(3);
    expect(registerSpy).toHaveBeenNthCalledWith(1, TRANSFORM_COMPONENT_KEY);
    expect(registerSpy).toHaveBeenNthCalledWith(2, HEALTH_COMPONENT_KEY);
    expect(registerSpy).toHaveBeenNthCalledWith(3, ENEMY_COMPONENT_KEY);
    expect(world.getComponentStore(TRANSFORM_COMPONENT_KEY)).toBeDefined();
    expect(world.getComponentStore(HEALTH_COMPONENT_KEY)).toBeDefined();
    expect(world.getComponentStore(ENEMY_COMPONENT_KEY)).toBeDefined();

    registerSpy.mockClear();

    spawnEnemy(world, 'grunt');

    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('initializes health and transform components using defaults', () => {
    const world = new World();

    const entityId = spawnEnemy(world, 'grunt');

    expect(world.getComponent(entityId, TRANSFORM_COMPONENT_KEY)).toEqual({ x: 0, y: 0 });
    expect(world.getComponent(entityId, HEALTH_COMPONENT_KEY)).toEqual({ current: 1, max: 1 });
    expect(world.getComponent(entityId, ENEMY_COMPONENT_KEY)).toEqual({
      archetype: 'grunt',
      maxHp: 1,
      speed: 1.5,
      damage: 1,
    });
  });

  it('respects provided spawn coordinates', () => {
    const world = new World();
    const spawnPosition = { x: 12, y: -4 };

    const entityId = spawnEnemy(world, 'grunt', spawnPosition);
    const transform = world.getComponent(entityId, TRANSFORM_COMPONENT_KEY);

    expect(transform).toEqual({ x: 12, y: -4 });
    expect(transform).not.toBe(spawnPosition);
  });
});
