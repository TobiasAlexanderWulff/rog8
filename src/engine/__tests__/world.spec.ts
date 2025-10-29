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

/**
 * Validates that entity and component interactions follow deterministic semantics.
 *
 * @returns {void}
 */
describe('World component lifecycle', () => {
  /**
   * Ensures the world rejects duplicate component store registrations.
   *
   * @returns {void}
   */
  it('registers component stores and rejects duplicate keys', () => {
    const world = new World();
    // Register the first store to trigger the subsequent duplicate registration guard.
    world.registerComponentStore<{ x: number }>('Transform');

    expect(() => world.registerComponentStore<{ x: number }>('Transform')).toThrowError(
      'Component store already registered: Transform',
    );
  });

  /**
   * Confirms basic component lifecycle operations (add/query/remove) behave as expected.
   *
   * @returns {void}
   */
  it('attaches, queries, and removes components tied to an entity', () => {
    const world = new World();
    // Provide a store to host positional data for the entity.
    world.registerComponentStore<{ x: number; y: number }>('Position');

    const entity = world.createEntity();
    // Attach an initial component payload to the freshly minted entity.
    world.addComponent(entity, 'Position', { x: 1, y: 2 });

    expect(world.hasComponent(entity, 'Position')).toBe(true);
    expect(world.getComponent(entity, 'Position')).toEqual({ x: 1, y: 2 });

    world.removeComponent(entity, 'Position');
    expect(world.hasComponent(entity, 'Position')).toBe(false);
  });

  /**
   * Verifies that deferred removals survive until the next tick before mutating storage.
   *
   * @returns {void}
   */
  it('defers queued component removals until the world finishes a tick', () => {
    const world = new World();
    // Store used to tag entities for removal.
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

  /**
   * Checks that re-adding a component before the flush cancels a pending removal.
   *
   * @returns {void}
   */
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

  /**
   * Verifies entity destruction cascades through attached components after the next tick.
   *
   * @returns {void}
   */
  it('destroys entities and clears component state after the next tick', () => {
    const world = new World();
    // Shared health store ensures destruction removes lingering state.
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

/**
 * Exercises world-level resource management and reset mechanics.
 *
 * @returns {void}
 */
describe('World resources and reset', () => {
  const SAMPLE_RESOURCE = 'resource.sample' as ResourceKey<{ id: string }>;

  /**
   * Validates the register/get/remove flow for singleton world resources.
   *
   * @returns {void}
   */
  it('registers, reads, and removes resources', () => {
    const world = new World();
    // Seed a singleton resource so systems can fetch it during a tick.
    world.registerResource(SAMPLE_RESOURCE, { id: 'alpha' });

    expect(world.getResource(SAMPLE_RESOURCE)).toEqual({ id: 'alpha' });
    expect(world.hasResource(SAMPLE_RESOURCE)).toBe(true);

    const removed = world.removeResource(SAMPLE_RESOURCE);
    expect(removed).toBe(true);
    expect(world.hasResource(SAMPLE_RESOURCE)).toBe(false);
    expect(world.getResource(SAMPLE_RESOURCE)).toBeUndefined();
  });

  /**
   * Ensures registering the same resource twice surfaces a useful error.
   *
   * @returns {void}
   */
  it('rejects duplicate resource keys', () => {
    const world = new World();
    // Seed the initial resource, then attempt to overwrite it.
    world.registerResource(SAMPLE_RESOURCE, { id: 'alpha' });

    expect(() => {
      world.registerResource(SAMPLE_RESOURCE, { id: 'beta' });
    }).toThrowError('Resource already registered: resource.sample');
  });

  /**
   * Confirms reset clears all ephemera while leaving the world ready for a fresh run.
   *
   * @returns {void}
   */
  it('clears entities, components, and resources during reset', () => {
    const world = new World();
    const healthStore = world.registerComponentStore<{ hp: number }>('Health');
    // Attach a resource so the reset must remove it alongside entity data.
    world.registerResource(SAMPLE_RESOURCE, { id: 'alpha' });

    const entity = world.createEntity();
    // Populate the entity to verify component stores are flushed.
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
