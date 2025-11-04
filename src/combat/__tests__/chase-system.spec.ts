/**
 * @fileoverview Chase AI system scaffolding tests.
 */
import { describe, expect, it, vi } from 'vitest';

import type { ComponentKey, ComponentStore, TransformComponent } from '../../engine/components';
import { World, type ResourceKey } from '../../engine/world';
import type { MapGrid } from '../../world/mapgen/simple';
import * as collisionModule from '../../engine/collision';
import type { ChaseAIComponent, EnemyComponent } from '../enemy';
import { chaseSystem, registerChaseSystem } from '../chase-system';

/**
 * Validates the system registration helper for the chase AI.
 *
 * @returns {void} Nothing; Vitest assertions throw on failure.
 */
describe('registerChaseSystem', () => {
  it('wires the chase system into the world pipeline', () => {
    const addSystem = vi.fn();
    const mockWorld = { addSystem } as unknown as Parameters<typeof registerChaseSystem>[0];

    registerChaseSystem(mockWorld);

    expect(addSystem).toHaveBeenCalledTimes(1);
    expect(addSystem).toHaveBeenCalledWith(chaseSystem);
  });
});

/**
 * Covers the chase system runtime behaviour across edge cases.
 *
 * @returns {void} Nothing; Vitest assertions throw on failure.
 */
describe('chaseSystem', () => {
  it('bails when no map resource is present', () => {
    const world = new World();
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const enemyKey = 'component.enemy' as ComponentKey<EnemyComponent>;
    const chaseKey = 'component.chase-ai' as ComponentKey<ChaseAIComponent>;

    world.registerComponentStore(transformKey);
    world.registerComponentStore(enemyKey);
    world.registerComponentStore(chaseKey);

    const enemy = world.createEntity();
    const target = world.createEntity();

    world.addComponent(enemy, transformKey, { x: 5, y: 5 });
    world.addComponent(target, transformKey, { x: 8, y: 8 });
    world.addComponent(enemy, enemyKey, {
      archetype: 'grunt',
      maxHp: 1,
      speed: 2,
      damage: 1,
    });
    world.addComponent(enemy, chaseKey, {
      targetEntityId: target.id,
      aggroRadius: 10,
      path: [],
      currentPathIndex: 0,
      speedMultiplier: 1,
    });

    const context = {
      delta: 16,
      frame: 1,
      rng: {
        next: () => 0,
        nextFloat: () => 0,
        nextInt: (_min: number, _max: number) => 0,
      },
    } as Parameters<typeof chaseSystem>[1];

    const transformBefore = world.getComponent(enemy, transformKey);
    if (!transformBefore) {
      throw new Error('Missing transform component on enemy entity');
    }
    const initialTransform = { ...transformBefore };

    // Resource lookup should be the only call made when the map is missing.
    const getResourceSpy = vi.spyOn(world, 'getResource');
    const getComponentStoreSpy = vi.spyOn(world, 'getComponentStore');

    chaseSystem(world, context);

    expect(getResourceSpy).toHaveBeenCalledTimes(1);
    expect(getResourceSpy).toHaveBeenCalledWith('resource.map-grid');
    expect(getComponentStoreSpy).not.toHaveBeenCalled();
    expect(world.getComponent(enemy, transformKey)).toStrictEqual(initialTransform);
  });

  it('skips entities missing required stores or components', () => {
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const enemyKey = 'component.enemy' as ComponentKey<EnemyComponent>;
    const chaseKey = 'component.chase-ai' as ComponentKey<ChaseAIComponent>;

    const mapStub = {
      width: 1,
      height: 1,
      tiles: [{ flags: 0 }],
    };

    const context = {
      delta: 16,
      frame: 1,
      rng: {
        next: () => 0,
        nextFloat: () => 0,
        nextInt: (_min: number, _max: number) => 0,
      },
    } as Parameters<typeof chaseSystem>[1];

    const createStoreStub = <T>(): Pick<ComponentStore<T>, 'entries' | 'get'> => ({
      entries: vi.fn((): Array<[number, T]> => []),
      get: vi.fn((_entityId: number): T | undefined => undefined),
    });

    const requiredKeys = [transformKey, enemyKey, chaseKey] as const;

    for (const missingKey of requiredKeys) {
      const transformStore =
        missingKey === transformKey ? undefined : createStoreStub<TransformComponent>();
      const enemyStore = missingKey === enemyKey ? undefined : createStoreStub<EnemyComponent>();
      const chaseStore = missingKey === chaseKey ? undefined : createStoreStub<ChaseAIComponent>();

      // Build a minimal world shape that mimics a single missing dependency.
      const worldStub = {
        getResource: vi.fn().mockReturnValue(mapStub),
        getComponentStore: vi.fn((componentKey: ComponentKey) => {
          if (componentKey === transformKey) {
            return transformStore as unknown as ComponentStore<TransformComponent> | undefined;
          }
          if (componentKey === enemyKey) {
            return enemyStore as unknown as ComponentStore<EnemyComponent> | undefined;
          }
          if (componentKey === chaseKey) {
            return chaseStore as unknown as ComponentStore<ChaseAIComponent> | undefined;
          }
          return undefined;
        }),
      };

      chaseSystem(worldStub as unknown as World, context);

      expect(worldStub.getResource).toHaveBeenCalledTimes(1);
      expect(worldStub.getComponentStore).toHaveBeenCalledTimes(3);

      if (transformStore) {
        expect(transformStore.entries).not.toHaveBeenCalled();
        expect(transformStore.get).not.toHaveBeenCalled();
      }

      if (enemyStore) {
        expect(enemyStore.entries).not.toHaveBeenCalled();
        expect(enemyStore.get).not.toHaveBeenCalled();
      }

      if (chaseStore) {
        expect(chaseStore.entries).not.toHaveBeenCalled();
        expect(chaseStore.get).not.toHaveBeenCalled();
      }
    }
  });

  it('moves enemies toward their targets with collision resolution', () => {
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const enemyKey = 'component.enemy' as ComponentKey<EnemyComponent>;
    const chaseKey = 'component.chase-ai' as ComponentKey<ChaseAIComponent>;

    const world = new World();
    world.registerComponentStore(transformKey);
    world.registerComponentStore(enemyKey);
    world.registerComponentStore(chaseKey);

    const map: MapGrid = {
      width: 10,
      height: 10,
      tiles: Array.from({ length: 100 }, () => ({ type: 'floor', flags: 0 })),
    };
    world.registerResource('resource.map-grid' as ResourceKey<MapGrid>, map);

    const enemy = world.createEntity();
    const target = world.createEntity();

    world.addComponent(enemy, transformKey, { x: 5, y: 5 });
    world.addComponent(target, transformKey, { x: 7, y: 6 });
    world.addComponent(enemy, enemyKey, {
      archetype: 'grunt',
      maxHp: 1,
      speed: 1,
      damage: 1,
    });
    world.addComponent(enemy, chaseKey, {
      targetEntityId: target.id,
      aggroRadius: 10,
      path: [],
      currentPathIndex: 0,
      speedMultiplier: 1,
    });

    const enemyTransform = world.getComponent(enemy, transformKey);
    const targetTransform = world.getComponent(target, transformKey);
    const enemyComponent = world.getComponent(enemy, enemyKey);
    const chaseComponent = world.getComponent(enemy, chaseKey);
    if (!enemyTransform || !targetTransform || !enemyComponent || !chaseComponent) {
      throw new Error('Missing component setup for chase system test');
    }

    const startPosition = { x: enemyTransform.x, y: enemyTransform.y };
    const context = {
      delta: 16,
      frame: 1,
      rng: {
        next: () => 0,
        nextFloat: () => 0,
        nextInt: (_min: number, _max: number) => 0,
      },
    } as Parameters<typeof chaseSystem>[1];

    const collisionCalls: Array<{ x: number; y: number }> = [];
    const checkCollisionSpy = vi.spyOn(collisionModule, 'checkCollision');
    checkCollisionSpy
      .mockImplementationOnce((_map, x, y) => {
        // On the first axis we simulate a collision so the system must retry.
        collisionCalls.push({ x, y });
        return {
          blocked: true,
          penetrationDepth: 0,
          slideVectorX: 0,
          slideVectorY: 0,
        };
      })
      .mockImplementationOnce((_map, x, y) => {
        // The follow-up attempt clears the path to confirm successful movement.
        collisionCalls.push({ x, y });
        return {
          blocked: false,
          penetrationDepth: 0,
          slideVectorX: 0,
          slideVectorY: 0,
        };
      });

    try {
      chaseSystem(world, context);

      expect(checkCollisionSpy).toHaveBeenCalledTimes(2);
      expect(collisionCalls).toStrictEqual([
        { x: 7, y: 5 },
        { x: 5, y: 6 },
      ]);

      const updatedTransform = world.getComponent(enemy, transformKey);
      if (!updatedTransform) {
        throw new Error('Enemy transform missing after chase system run');
      }

      expect(updatedTransform.x).toBeCloseTo(startPosition.x, 5);

      const dx = targetTransform.x - startPosition.x;
      const dy = targetTransform.y - startPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speedMultiplier = Number.isFinite(chaseComponent.speedMultiplier)
        ? chaseComponent.speedMultiplier
        : 1;
      const speed = enemyComponent.speed * (speedMultiplier || 0);
      const maxStep = speed * context.delta;
      const step = distance > maxStep ? maxStep : distance;
      const expectedY =
        distance > 0 && maxStep > 0 ? startPosition.y + (dy / distance) * step : startPosition.y;
      expect(updatedTransform.y).toBeCloseTo(expectedY, 5);
    } finally {
      checkCollisionSpy.mockRestore();
    }
  });
});
