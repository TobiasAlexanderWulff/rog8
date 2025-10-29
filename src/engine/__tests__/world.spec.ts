/**
 * @fileoverview World lifecycle integration tests covering component store wiring.
 * Re-run locally if Vitest deadlocks due to the known harness flake.
 */
import { describe, expect, it } from 'vitest';

import { World, type TickContext, type ResourceKey } from '../world';

const noopRng = {
  next: () => 0,
  nextFloat: () => 0,
  nextInt: (min: number, _max: number) => min,
};

const tickContext: TickContext = {
  delta: 0,
  frame: 0,
  rng: noopRng,
};

describe('World component lifecycle', () => {
  it('registers component stores and rejects duplicate keys', () => {
    const world = new World();
    world.registerComponentStore<{ x: number }>('Transform');

    expect(() => world.registerComponentStore<{ x: number }>('Transform')).toThrowError(
      'Component store already registered: Transform',
    );
  });

  it('attaches, queries, and removes components tied to an entity', () => {
    const world = new World();
    world.registerComponentStore<{ x: number; y: number }>('Position');

    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 1, y: 2 });

    expect(world.hasComponent(entity, 'Position')).toBe(true);
    expect(world.getComponent(entity, 'Position')).toEqual({ x: 1, y: 2 });

    world.removeComponent(entity, 'Position');
    expect(world.hasComponent(entity, 'Position')).toBe(false);
  });

  it('defers queued component removals until the world finishes a tick', () => {
    const world = new World();
    world.registerComponentStore<{ tag: string }>('Tag');

    const entity = world.createEntity();
    world.addComponent(entity, 'Tag', { tag: 'keep' });

    world.queueRemoveComponent(entity, 'Tag');

    // Removal is deferred until update runs.
    expect(world.hasComponent(entity, 'Tag')).toBe(true);

    world.update(tickContext);

    expect(world.hasComponent(entity, 'Tag')).toBe(false);
    expect(world.getComponent(entity, 'Tag')).toBeUndefined();
  });

  it('cancels queued component removals when re-adding before the flush', () => {
    const world = new World();
    world.registerComponentStore<{ tag: string }>('Tag');

    const entity = world.createEntity();
    world.addComponent(entity, 'Tag', { tag: 'initial' });

    world.queueRemoveComponent(entity, 'Tag');
    world.addComponent(entity, 'Tag', { tag: 'persist' });

    world.update(tickContext);

    expect(world.hasComponent(entity, 'Tag')).toBe(true);
    expect(world.getComponent(entity, 'Tag')).toEqual({ tag: 'persist' });
  });

  it('destroys entities and clears component state after the next tick', () => {
    const world = new World();
    world.registerComponentStore<{ hp: number }>('Health');

    const entity = world.createEntity();
    world.addComponent(entity, 'Health', { hp: 10 });

    world.destroyEntity(entity);

    expect(world.isEntityAlive(entity)).toBe(false);
    // Component data is still visible until the next update.
    expect(world.hasComponent(entity, 'Health')).toBe(true);

    world.update(tickContext);

    expect(world.hasComponent(entity, 'Health')).toBe(false);
    expect(world.getComponent(entity, 'Health')).toBeUndefined();
    expect(world.isEntityAlive(entity)).toBe(false);
  });
});

describe('World resources and reset', () => {
  const SAMPLE_RESOURCE = 'resource.sample' as ResourceKey<{ id: string }>;

  it('registers, reads, and removes resources', () => {
    const world = new World();
    world.registerResource(SAMPLE_RESOURCE, { id: 'alpha' });

    expect(world.getResource(SAMPLE_RESOURCE)).toEqual({ id: 'alpha' });
    expect(world.hasResource(SAMPLE_RESOURCE)).toBe(true);

    const removed = world.removeResource(SAMPLE_RESOURCE);
    expect(removed).toBe(true);
    expect(world.hasResource(SAMPLE_RESOURCE)).toBe(false);
    expect(world.getResource(SAMPLE_RESOURCE)).toBeUndefined();
  });

  it('rejects duplicate resource keys', () => {
    const world = new World();
    world.registerResource(SAMPLE_RESOURCE, { id: 'alpha' });

    expect(() => {
      world.registerResource(SAMPLE_RESOURCE, { id: 'beta' });
    }).toThrowError('Resource already registered: resource.sample');
  });

  it('clears entities, components, and resources during reset', () => {
    const world = new World();
    const healthStore = world.registerComponentStore<{ hp: number }>('Health');
    world.registerResource(SAMPLE_RESOURCE, { id: 'alpha' });

    const entity = world.createEntity();
    world.addComponent(entity, 'Health', { hp: 5 });

    world.reset();

    expect(world.isEntityAlive(entity)).toBe(false);
    expect(world.hasComponent(entity, 'Health')).toBe(false);
    expect(world.getComponent(entity, 'Health')).toBeUndefined();
    expect(world.getResource(SAMPLE_RESOURCE)).toBeUndefined();
    expect(healthStore.entries()).toEqual([]);

    const freshEntity = world.createEntity();
    expect(freshEntity.id).toBe(1);
  });
});
