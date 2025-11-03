import { ComponentStore, type ComponentKey, type EntityId } from './components';
import type { RNG } from '../shared/random';

/**
 * Context passed to systems on each tick, exposing frame timing and deterministic RNG.
 */
export interface TickContext {
  delta: number;
  frame: number;
  rng: RNG;
}

/**
 * Fixed signature each system adheres to when mutating the world state.
 *
 * @param world Active world instance being updated.
 * @param context Frame metadata for timing and RNG usage.
 */
export type System = (world: World, context: TickContext) => void;

/**
 * Minimal entity reference handled by the ECS runtime.
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
   * @returns Fresh entity backed by the internal entity map.
   */
  createEntity(): Entity {
    const entity: Entity = { id: this.nextEntityId++ };
    this.entities.set(entity.id, entity);
    return entity;
  }

  /**
   * Schedules an entity for destruction together with all attached components.
   *
   * @param entity Entity reference or identifier scheduled for removal.
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
   * @param componentName Unique component key associated with the store.
   * @returns Newly created component store.
   * @throws Error when a store for the component already exists.
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
   * @param componentName Component identifier to look up.
   * @returns Component store when available; otherwise undefined.
   */
  getComponentStore<T>(componentName: ComponentKey<T>): ComponentStore<T> | undefined {
    return this.componentStores.get(componentName) as ComponentStore<T> | undefined;
  }

  /**
   * Attaches a component instance to an entity.
   *
   * @param entity Entity reference or identifier that owns the component.
   * @param componentName Component key corresponding to the store.
   * @param component Component data to attach.
   * @throws Error when the entity is not alive or the store is absent.
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
   * @param entity Entity reference or identifier to query.
   * @param componentName Component key to look up.
   * @returns True when the component exists on the entity.
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
   * @param entity Entity reference or identifier to inspect.
   * @param componentName Component key to retrieve.
   * @returns Component data if present; otherwise undefined.
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
   * @param entity Entity reference or identifier whose component should be removed.
   * @param componentName Component key to detach.
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
   * @param entity Entity reference or identifier queued for detachment.
   * @param componentName Component key to remove.
   */
  queueRemoveComponent<T>(entity: Entity | EntityId, componentName: ComponentKey<T>): void {
    const entityId = this.resolveEntityId(entity);
    this.queueComponentRemoval(entityId, componentName);
  }

  /**
   * Registers a system that will run once per update tick.
   *
   * @param system System callback to register.
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
   * @param resourceKey Identifier used by systems to locate the resource.
   * @param resource Resource instance to store.
   * @throws Error when a resource with the same key already exists.
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
   * @param resourceKey Identifier tied to the resource.
   * @returns True when the resource exists.
   */
  hasResource(resourceKey: ResourceKey): boolean {
    return this.resources.has(resourceKey);
  }

  /**
   * Retrieves a resource when it has been registered.
   *
   * @param resourceKey Identifier tied to the resource.
   * @returns Resource instance or undefined when absent.
   */
  getResource<T>(resourceKey: ResourceKey<T>): T | undefined {
    return this.resources.get(resourceKey) as T | undefined;
  }

  /**
   * Removes a resource and returns whether it existed.
   *
   * @param resourceKey Identifier tied to the resource.
   * @returns True when the resource was removed.
   */
  removeResource(resourceKey: ResourceKey): boolean {
    return this.resources.delete(resourceKey);
  }

  /**
   * Executes all registered systems with the provided tick context.
   *
   * @param context Frame metadata that each system receives.
   */
  update(context: TickContext): void {
    for (const system of this.systems) {
      system(this, context);
    }

    this.flushComponentRemovals();
    this.flushEntityRemovals();
  }

  /**
   * Clears entities, component state, pending queues, and resources while
   * preserving registered systems and component stores.
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
   * @param entityId Identifier of the entity that lost a component.
   * @param componentName Component key that was removed.
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
   * @param entity Entity object or identifier.
   * @returns Normalised entity ID.
   */
  private resolveEntityId(entity: Entity | EntityId): EntityId {
    return typeof entity === 'number' ? entity : entity.id;
  }

  /**
   * Throws when an entity is missing or scheduled for removal.
   *
   * @param entityId Identifier that should point to a live entity.
   * @throws Error if the entity is not tracked or queued for destruction.
   */
  private assertEntityAlive(entityId: EntityId): void {
    if (!this.entities.has(entityId) || this.pendingEntityRemovals.has(entityId)) {
      throw new Error(`Entity ${entityId} is not alive.`);
    }
  }

  /**
   * Retrieves a component store or throws when it has not been registered.
   *
   * @param componentName Component key tied to the store.
   * @returns Component store associated with the key.
   * @throws Error if the store is missing.
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
   * @param entityId Entity identifier that owns the component.
   * @param componentName Component key to remove.
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
   * @param entityId Entity identifier.
   * @param componentName Component key.
   * @returns Stable composite key combining entity and component names.
   */
  private toRemovalKey(entityId: EntityId, componentName: ComponentName): string {
    return `${componentName}:${entityId}`;
  }

  /**
   * Reports whether the world still considers an entity alive.
   *
   * @param entity Entity reference or identifier.
   * @returns True when the entity exists and is not queued for removal.
   */
  isEntityAlive(entity: Entity | EntityId): boolean {
    const entityId = this.resolveEntityId(entity);
    return this.entities.has(entityId) && !this.pendingEntityRemovals.has(entityId);
  }
}
