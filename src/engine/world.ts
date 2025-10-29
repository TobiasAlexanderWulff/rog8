import { ComponentStore, type ComponentKey, type EntityId } from './components';
import type { RNG } from '../shared/random';

export interface TickContext {
  delta: number;
  frame: number;
  rng: RNG;
}

export type System = (world: World, context: TickContext) => void;

export interface Entity {
  id: EntityId;
}

type ComponentName = ComponentKey;

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

  createEntity(): Entity {
    const entity: Entity = { id: this.nextEntityId++ };
    this.entities.set(entity.id, entity);
    return entity;
  }

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

  registerComponentStore<T>(componentName: ComponentKey<T>): ComponentStore<T> {
    if (this.componentStores.has(componentName)) {
      throw new Error(`Component store already registered: ${componentName}`);
    }

    const store = new ComponentStore<T>();
    this.componentStores.set(componentName, store);
    return store;
  }

  getComponentStore<T>(componentName: ComponentKey<T>): ComponentStore<T> | undefined {
    return this.componentStores.get(componentName) as ComponentStore<T> | undefined;
  }

  addComponent<T>(entity: Entity | EntityId, componentName: ComponentKey<T>, component: T): void {
    const entityId = this.resolveEntityId(entity);
    this.assertEntityAlive(entityId);
    const store = this.requireComponentStore<T>(componentName);
    store.add(entityId, component);
    let componentSet = this.componentsByEntity.get(entityId);
    if (!componentSet) {
      componentSet = new Set<ComponentName>();
      this.componentsByEntity.set(entityId, componentSet);
    }
    componentSet.add(componentName);
  }

  hasComponent(entity: Entity | EntityId, componentName: ComponentName): boolean {
    const entityId = this.resolveEntityId(entity);
    if (!this.entities.has(entityId)) {
      return false;
    }

    const store = this.getComponentStore(componentName);
    return store?.has(entityId) ?? false;
  }

  getComponent<T>(entity: Entity | EntityId, componentName: ComponentKey<T>): T | undefined {
    const entityId = this.resolveEntityId(entity);
    if (!this.entities.has(entityId)) {
      return undefined;
    }

    const store = this.getComponentStore<T>(componentName);
    return store?.get(entityId);
  }

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

  queueRemoveComponent<T>(entity: Entity | EntityId, componentName: ComponentKey<T>): void {
    const entityId = this.resolveEntityId(entity);
    this.queueComponentRemoval(entityId, componentName);
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  update(context: TickContext): void {
    for (const system of this.systems) {
      system(this, context);
    }

    this.flushComponentRemovals();
    this.flushEntityRemovals();
  }

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

  private resolveEntityId(entity: Entity | EntityId): EntityId {
    return typeof entity === 'number' ? entity : entity.id;
  }

  private assertEntityAlive(entityId: EntityId): void {
    if (!this.entities.has(entityId) || this.pendingEntityRemovals.has(entityId)) {
      throw new Error(`Entity ${entityId} is not alive.`);
    }
  }

  private requireComponentStore<T>(componentName: ComponentKey<T>): ComponentStore<T> {
    const store = this.getComponentStore<T>(componentName);
    if (!store) {
      throw new Error(`Component store not registered: ${componentName}`);
    }
    return store;
  }

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

  private toRemovalKey(entityId: EntityId, componentName: ComponentName): string {
    return `${componentName}:${entityId}`;
  }

  isEntityAlive(entity: Entity | EntityId): boolean {
    const entityId = this.resolveEntityId(entity);
    return this.entities.has(entityId) && !this.pendingEntityRemovals.has(entityId);
  }
}
