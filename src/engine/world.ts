import { ComponentStore, type ComponentKey, type EntityId } from './components';
import type { RNG } from '../shared/random';

/**
 * Context passed to systems on each tick, exposing frame timing and deterministic RNG.
 *
 * @remarks
 * Instances originate from the run controller and let systems coordinate deterministic behaviour
 * based on a shared frame counter and pseudo-random generator.
 *
 * @example
 * ```ts
 * const mySystem: System = (_world, context) => {
 *   if (context.frame % 2 === 0) {
 *     // react on alternating frames
 *   }
 * };
 * ```
 */
export interface TickContext {
  delta: number;
  frame: number;
  rng: RNG;
}

/**
 * Fixed signature each system adheres to when mutating the world state.
 *
 * @remarks
 * Systems execute in registration order during `World.update`, receiving the mutable world and the
 * current tick context for timing and deterministic randomness.
 *
 * @param world - Active world instance being updated.
 * @param context - Frame metadata that conveys timing and RNG usage.
 * @example
 * ```ts
 * const exampleSystem: System = (world, context) => {
 *   if (context.delta > 0) {
 *     // mutate world components here
 *   }
 * };
 * ```
 */
export type System = (world: World, context: TickContext) => void;

/**
 * Minimal entity reference handled by the ECS runtime.
 *
 * @remarks
 * Entity identifiers are issued via `World.createEntity` and remain stable until the entity is
 * destroyed at the end of an update tick.
 *
 * @example
 * ```ts
 * const entity = world.createEntity();
 * console.log(entity.id);
 * ```
 */
export interface Entity {
  id: EntityId;
}

type ComponentName = ComponentKey;

export type ResourceKey<T = unknown> = string & {
  readonly __resourceBrand?: T;
};

/**
 * Core ECS world that tracks entities, component stores, and registered systems.
 *
 * @remarks
 * The world coordinates safe scheduling of component removals and entity destruction so systems
 * can iterate over data without defensive copying.
 *
 * @example
 * ```ts
 * const world = new World();
 * const entity = world.createEntity();
 * ```
 */
export class World {
  private systems: System[] = [];
  private nextEntityId: EntityId = 1;
  private readonly entities = new Map<EntityId, Entity>();
  private readonly componentStores = new Map<ComponentName, ComponentStore<unknown>>();
  private readonly componentsByEntity = new Map<EntityId, Set<ComponentName>>();
  private readonly pendingEntityRemovals = new Set<EntityId>();
  private readonly pendingComponentRemovals = new Map<
    string,
    { componentName: ComponentName; entityId: EntityId }
  >();
  private readonly resources = new Map<ResourceKey, unknown>();

  /**
   * Allocates a new entity and assigns a unique identifier.
   *
   * @remarks
   * New entities start without components; attach data via `addComponent` before systems attempt
   * to read from them.
   *
   * @returns Fresh entity backed by the internal entity map.
   * @throws This method never throws; it only touches internal bookkeeping.
   * @example
   * ```ts
   * const transformKey = 'transform' as ComponentKey<{ x: number; y: number }>;
   * const player = world.createEntity();
   * world.addComponent(player, transformKey, { x: 0, y: 0 });
   * ```
   */
  createEntity(): Entity {
    const entity: Entity = { id: this.nextEntityId++ };
    this.entities.set(entity.id, entity);
    return entity;
  }

  /**
   * Schedules an entity for destruction together with all attached components.
   *
   * @remarks
   * Destruction occurs after the current update tick finishes so ongoing system iterations remain
   * safe.
   *
   * @param entity - Entity reference or identifier scheduled for removal.
   * @throws This method never throws; missing entities are ignored.
   * @example
   * ```ts
   * world.destroyEntity(player);
   * ```
   */
  destroyEntity(entity: Entity | EntityId): void {
    const entityId = this.resolveEntityId(entity);
    if (!this.entities.has(entityId)) {
      return;
    }

    if (!this.pendingEntityRemovals.has(entityId)) {
      this.pendingEntityRemovals.add(entityId);
    }

    const componentNames = this.componentsByEntity.get(entityId);
    if (!componentNames) {
      return;
    }

    for (const componentName of componentNames) {
      this.queueComponentRemoval(entityId, componentName);
    }
  }

  /**
   * Registers a component store so it can be referenced by systems.
   *
   * @remarks
   * Register stores during bootstrap before attaching components to entities to ensure systems can
   * resolve data consistently.
   *
   * @param componentName - Unique component key associated with the store.
   * @returns Newly created component store.
   * @throws Error when a store for the component already exists.
   * @example
   * ```ts
   * const transformKey = 'transform' as ComponentKey<{ x: number; y: number }>;
   * const transformStore = world.registerComponentStore(transformKey);
   * ```
   */
  registerComponentStore<T>(componentName: ComponentKey<T>): ComponentStore<T> {
    if (this.componentStores.has(componentName)) {
      throw new Error(`Component store already registered: ${componentName}`);
    }

    const store = new ComponentStore<T>();
    this.componentStores.set(componentName, store);
    return store;
  }

  /**
   * Retrieves a component store if it has been registered previously.
   *
   * @remarks
   * Returns `undefined` when the store has not been registered, allowing callers to bail out
   * gracefully.
   *
   * @param componentName - Component identifier to look up.
   * @returns Component store when available; otherwise `undefined`.
   * @throws This method never throws; callers should handle an `undefined` result.
   * @example
   * ```ts
   * const transformKey = 'transform' as ComponentKey<{ x: number; y: number }>;
   * const store = world.getComponentStore(transformKey);
   * ```
   */
  getComponentStore<T>(componentName: ComponentKey<T>): ComponentStore<T> | undefined {
    return this.componentStores.get(componentName) as ComponentStore<T> | undefined;
  }

  /**
   * Attaches a component instance to an entity.
   *
   * @remarks
   * Pending removals for the same component are cleared automatically so a component can be
   * re-added within the same tick.
   *
   * @param entity - Entity reference or identifier that owns the component.
   * @param componentName - Component key corresponding to the store.
   * @param component - Component data to attach.
   * @throws Error when the entity is not alive or the store is absent.
   * @example
   * ```ts
   * const transformKey = 'transform' as ComponentKey<{ x: number; y: number }>;
   * world.addComponent(player, transformKey, { x: 0, y: 0 });
   * ```
   */
  addComponent<T>(entity: Entity | EntityId, componentName: ComponentKey<T>, component: T): void {
    const entityId = this.resolveEntityId(entity);
    this.assertEntityAlive(entityId);
    const store = this.requireComponentStore<T>(componentName);
    store.add(entityId, component);
    const removalKey = this.toRemovalKey(entityId, componentName);
    if (this.pendingComponentRemovals.has(removalKey)) {
      this.pendingComponentRemovals.delete(removalKey);
    }
    let componentSet = this.componentsByEntity.get(entityId);
    if (!componentSet) {
      componentSet = new Set<ComponentName>();
      this.componentsByEntity.set(entityId, componentSet);
    }
    componentSet.add(componentName);
  }

  /**
   * Checks whether an entity has a specific component attached.
   *
   * @remarks
   * The lookup short-circuits when the entity is unknown or scheduled for removal.
   *
   * @param entity - Entity reference or identifier to query.
   * @param componentName - Component key to look up.
   * @returns `true` when the component exists on the entity.
   * @throws This method never throws; it returns `false` for unknown entities or components.
   * @example
   * ```ts
   * const transformKey = 'transform' as ComponentKey<{ x: number; y: number }>;
   * const hasTransform = world.hasComponent(player, transformKey);
   * ```
   */
  hasComponent(entity: Entity | EntityId, componentName: ComponentName): boolean {
    const entityId = this.resolveEntityId(entity);
    if (!this.entities.has(entityId)) {
      return false;
    }

    const store = this.getComponentStore(componentName);
    return store?.has(entityId) ?? false;
  }

  /**
   * Retrieves component data attached to a specific entity.
   *
   * @remarks
   * Returns `undefined` when either the entity is absent or the component store lacks the data.
   *
   * @param entity - Entity reference or identifier to inspect.
   * @param componentName - Component key to retrieve.
   * @returns Component data if present; otherwise `undefined`.
   * @throws This method never throws; callers should handle an `undefined` result.
   * @example
   * ```ts
   * const transformKey = 'transform' as ComponentKey<{ x: number; y: number }>;
   * const transform = world.getComponent(player, transformKey);
   * ```
   */
  getComponent<T>(entity: Entity | EntityId, componentName: ComponentKey<T>): T | undefined {
    const entityId = this.resolveEntityId(entity);
    if (!this.entities.has(entityId)) {
      return undefined;
    }

    const store = this.getComponentStore<T>(componentName);
    return store?.get(entityId);
  }

  /**
   * Removes a component immediately from an entity.
   *
   * @remarks
   * Direct removal is safe for components that are not actively iterated in the current system.
   *
   * @param entity - Entity reference or identifier whose component should be removed.
   * @param componentName - Component key to detach.
   * @throws This method never throws; missing components are ignored.
   * @example
   * ```ts
   * const transformKey = 'transform' as ComponentKey<{ x: number; y: number }>;
   * world.removeComponent(player, transformKey);
   * ```
   */
  removeComponent<T>(entity: Entity | EntityId, componentName: ComponentKey<T>): void {
    const entityId = this.resolveEntityId(entity);
    const store = this.getComponentStore(componentName);
    if (!store || !store.has(entityId)) {
      return;
    }

    store.remove(entityId);
    this.afterComponentRemoval(entityId, componentName);
    const key = this.toRemovalKey(entityId, componentName);
    this.pendingComponentRemovals.delete(key);
  }

  /**
   * Defers component removal until after the current tick completes.
   *
   * @remarks
   * Use this helper when iterating over a component store and you need to remove the current entry
   * without invalidating the iterator.
   *
   * @param entity - Entity reference or identifier queued for detachment.
   * @param componentName - Component key to remove.
   * @throws This method never throws; missing components are ignored.
   * @example
   * ```ts
   * const transformKey = 'transform' as ComponentKey<{ x: number; y: number }>;
   * world.queueRemoveComponent(player, transformKey);
   * ```
   */
  queueRemoveComponent<T>(entity: Entity | EntityId, componentName: ComponentKey<T>): void {
    const entityId = this.resolveEntityId(entity);
    this.queueComponentRemoval(entityId, componentName);
  }

  /**
   * Registers a system that will run once per update tick.
   *
   * @remarks
   * Duplicate registrations are ignored so systems remain unique within the execution order.
   *
   * @param system - System callback to register.
   * @throws This method never throws; duplicate systems are ignored.
   * @example
   * ```ts
   * world.addSystem(playerMovementSystem);
   * ```
   */
  addSystem(system: System): void {
    if (this.systems.includes(system)) {
      return;
    }
    this.systems.push(system);
  }

  /**
   * Registers a world-level singleton resource.
   *
   * @remarks
   * Resources let systems share cross-cutting state, such as input buffers or configuration.
   *
   * @param resourceKey - Identifier used by systems to locate the resource.
   * @param resource - Resource instance to store.
   * @throws Error when a resource with the same key already exists.
   * @example
   * ```ts
   * const inputKey = 'input' as ResourceKey<{ pressedKeys: Set<string> }>;
   * world.registerResource(inputKey, { pressedKeys: new Set() });
   * ```
   */
  registerResource<T>(resourceKey: ResourceKey<T>, resource: T): void {
    if (this.resources.has(resourceKey)) {
      throw new Error(`Resource already registered: ${resourceKey}`);
    }
    this.resources.set(resourceKey, resource);
  }

  /**
   * Checks whether a resource is registered on the world.
   *
   * @remarks
   * Helpful for optional systems that only operate when a supporting resource is present.
   *
   * @param resourceKey - Identifier tied to the resource.
   * @returns `true` when the resource exists.
   * @throws This method never throws; it returns `false` when the resource is absent.
   * @example
   * ```ts
   * const inputKey = 'input' as ResourceKey<{ pressedKeys: Set<string> }>;
   * if (!world.hasResource(inputKey)) {
   *   // create resource or skip dependent systems
   * }
   * ```
   */
  hasResource(resourceKey: ResourceKey): boolean {
    return this.resources.has(resourceKey);
  }

  /**
   * Retrieves a resource when it has been registered.
   *
   * @remarks
   * Returns `undefined` when the resource is absent so callers can fall back to defaults.
   *
   * @param resourceKey - Identifier tied to the resource.
   * @returns Resource instance or `undefined` when absent.
   * @throws This method never throws; callers should handle an `undefined` result.
   * @example
   * ```ts
   * const inputKey = 'input' as ResourceKey<{ pressedKeys: Set<string> }>;
   * const input = world.getResource(inputKey);
   * ```
   */
  getResource<T>(resourceKey: ResourceKey<T>): T | undefined {
    return this.resources.get(resourceKey) as T | undefined;
  }

  /**
   * Removes a resource and returns whether it existed.
   *
   * @remarks
   * Returns `false` when the resource was not tracked, letting callers detect redundant cleanup.
   *
   * @param resourceKey - Identifier tied to the resource.
   * @returns `true` when the resource was removed.
   * @throws This method never throws; it returns `false` if the resource was missing.
   * @example
   * ```ts
   * const inputKey = 'input' as ResourceKey<unknown>;
   * world.removeResource(inputKey);
   * ```
   */
  removeResource(resourceKey: ResourceKey): boolean {
    return this.resources.delete(resourceKey);
  }

  /**
   * Executes all registered systems with the provided tick context.
   *
   * @remarks
   * Systems run sequentially in the order they were added, and deferred removals are flushed after
   * every tick.
   *
   * @param context - Frame metadata that each system receives.
   * @throws Propagates any error thrown by a registered system.
   * @example
   * ```ts
   * import { createMulberry32 } from '../shared/random';
   *
   * const context: TickContext = { delta: 16, frame: 1, rng: createMulberry32(0) };
   * world.update(context);
   * ```
   */
  update(context: TickContext): void {
    for (const system of this.systems) {
      system(this, context);
    }

    this.flushComponentRemovals();
    this.flushEntityRemovals();
  }

  /**
   * Clears entities, component state, pending queues, and resources while preserving registered
   * systems and component stores.
   *
   * @remarks
   * Use this when restarting a run without rebuilding the bootstrap scaffolding.
   *
   * @throws This method never throws; any registered systems and component stores remain intact.
   * @example
   * ```ts
   * world.reset();
   * ```
   */
  reset(): void {
    this.entities.clear();
    this.componentsByEntity.clear();
    this.pendingEntityRemovals.clear();
    this.pendingComponentRemovals.clear();
    this.resources.clear();

    for (const store of this.componentStores.values()) {
      store.clear();
    }

    this.nextEntityId = 1;
  }

  /**
   * Applies any deferred component removals and updates bookkeeping structures.
   *
   * @remarks
   * Triggered automatically after each update tick to keep stores and entity indices consistent.
   *
   * @throws This method never throws; it only mutates internal bookkeeping.
   * @example
   * ```ts
   * // Invoked internally by world.update(context); manual calls are unnecessary.
   * ```
   */
  private flushComponentRemovals(): void {
    if (this.pendingComponentRemovals.size === 0) {
      return;
    }

    const pendingRemovals = Array.from(this.pendingComponentRemovals.values());
    const storesToFlush = new Set<ComponentName>();
    for (const { componentName } of pendingRemovals) {
      storesToFlush.add(componentName);
    }

    for (const componentName of storesToFlush) {
      const store = this.componentStores.get(componentName);
      store?.flushQueuedRemovals();
    }

    for (const { componentName, entityId } of pendingRemovals) {
      this.afterComponentRemoval(entityId, componentName);
    }

    this.pendingComponentRemovals.clear();
  }

  /**
   * Removes entities that were marked for deletion after the current tick completed.
   *
   * @remarks
   * Consolidates the deferred entity removal queue to maintain stable iteration semantics.
   *
   * @throws This method never throws; it only mutates internal bookkeeping.
   * @example
   * ```ts
   * // Called internally by world.update(context); do not invoke directly.
   * ```
   */
  private flushEntityRemovals(): void {
    if (this.pendingEntityRemovals.size === 0) {
      return;
    }

    for (const entityId of this.pendingEntityRemovals) {
      this.entities.delete(entityId);
      this.componentsByEntity.delete(entityId);
    }

    this.pendingEntityRemovals.clear();
  }

  /**
   * Updates component tracking after a component is removed from an entity.
   *
   * @remarks
   * Keeps the reverse lookup map synchronised so entity/component relationships remain accurate.
   *
   * @param entityId - Identifier of the entity that lost a component.
   * @param componentName - Component key that was removed.
   * @throws This method never throws; missing bookkeeping entries are ignored.
   * @example
   * ```ts
   * // Invoked internally by component removal helpers.
   * ```
   */
  private afterComponentRemoval(entityId: EntityId, componentName: ComponentName): void {
    const componentSet = this.componentsByEntity.get(entityId);
    if (!componentSet) {
      return;
    }

    componentSet.delete(componentName);
    if (componentSet.size === 0) {
      this.componentsByEntity.delete(entityId);
    }
  }

  /**
   * Normalises an entity reference into a bare identifier.
   *
   * @remarks
   * Accepts either entity objects or numeric identifiers to support ergonomic API surfaces.
   *
   * @param entity - Entity object or identifier.
   * @returns Normalised entity ID.
   * @throws This method never throws; its behaviour is purely functional.
   * @example
   * ```ts
   * // Used internally by public world helpers that accept either form.
   * ```
   */
  private resolveEntityId(entity: Entity | EntityId): EntityId {
    return typeof entity === 'number' ? entity : entity.id;
  }

  /**
   * Throws when an entity is missing or scheduled for removal.
   *
   * @remarks
   * Guards critical operations that must not operate on stale entity references.
   *
   * @param entityId - Identifier that should point to a live entity.
   * @throws Error if the entity is not tracked or queued for destruction.
   * @example
   * ```ts
   * // Used internally before mutating component stores.
   * ```
   */
  private assertEntityAlive(entityId: EntityId): void {
    if (!this.entities.has(entityId) || this.pendingEntityRemovals.has(entityId)) {
      throw new Error(`Entity ${entityId} is not alive.`);
    }
  }

  /**
   * Retrieves a component store or throws when it has not been registered.
   *
   * @remarks
   * Ensures systems fail fast when required component stores are absent.
   *
   * @param componentName - Component key tied to the store.
   * @returns Component store associated with the key.
   * @throws Error if the store is missing.
   * @example
   * ```ts
   * // Internal guard before attaching or reading component data.
   * ```
   */
  private requireComponentStore<T>(componentName: ComponentKey<T>): ComponentStore<T> {
    const store = this.getComponentStore<T>(componentName);
    if (!store) {
      throw new Error(`Component store not registered: ${componentName}`);
    }
    return store;
  }

  /**
   * Queues a component for removal while preserving safe iteration semantics.
   *
   * @remarks
   * Allows systems to mark components for deletion without affecting the current iteration pass.
   *
   * @param entityId - Entity identifier that owns the component.
   * @param componentName - Component key to remove.
   * @throws This method never throws; it becomes a no-op when the component is absent.
   * @example
   * ```ts
   * // Called by queueRemoveComponent to defer removal safely.
   * ```
   */
  private queueComponentRemoval(entityId: EntityId, componentName: ComponentName): void {
    const store = this.getComponentStore(componentName);
    if (!store || !store.has(entityId)) {
      return;
    }

    const key = this.toRemovalKey(entityId, componentName);
    if (this.pendingComponentRemovals.has(key)) {
      return;
    }

    store.queueRemoval(entityId);
    this.pendingComponentRemovals.set(key, { componentName, entityId });
  }

  /**
   * Produces a stable key for tracking deferred component removals.
   *
   * @remarks
   * Combines the component name and entity identifier to guarantee uniqueness across frames.
   *
   * @param entityId - Entity identifier.
   * @param componentName - Component key.
   * @returns Stable composite key combining entity and component names.
   * @throws This method never throws; it performs deterministic string formatting.
   * @example
   * ```ts
   * // Internal helper used when scheduling deferred removals.
   * ```
   */
  private toRemovalKey(entityId: EntityId, componentName: ComponentName): string {
    return `${componentName}:${entityId}`;
  }

  /**
   * Reports whether the world still considers an entity alive.
   *
   * @remarks
   * Useful for sanity checks inside systems that cache entity identifiers across frames.
   *
   * @param entity - Entity reference or identifier.
   * @returns `true` when the entity exists and is not queued for removal.
   * @throws This method never throws; unknown entities simply return `false`.
   * @example
   * ```ts
   * if (!world.isEntityAlive(player)) {
   *   // respawn or clean up references
   * }
   * ```
   */
  isEntityAlive(entity: Entity | EntityId): boolean {
    const entityId = this.resolveEntityId(entity);
    return this.entities.has(entityId) && !this.pendingEntityRemovals.has(entityId);
  }
}
