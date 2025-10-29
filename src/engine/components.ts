export interface TransformComponent {
  x: number;
  y: number;
  // TODO: Add angle or scale if future systems require it.
}

export interface VelocityComponent {
  vx: number;
  vy: number;
  // TODO: Encode acceleration or friction constants when movement tuning begins.
}

export interface HealthComponent {
  current: number;
  max: number;
  // TODO: Add invulnerability frames or damage metadata once combat is ready.
}

export interface PlayerComponent {
  name: string;
  // TODO: Include input bindings or sprite references when they exist.
}

export type EntityId = number;
export type ComponentKey<T = unknown> = string & {
  readonly __componentBrand?: T;
};

/**
 * Generic component storage that maps entity IDs to component data with deterministic iteration.
 */
export class ComponentStore<T> {
  private readonly components = new Map<EntityId, T>();
  private readonly queuedRemovals = new Set<EntityId>();

  add(entityId: EntityId, component: T): void {
    this.components.set(entityId, component);
  }

  get(entityId: EntityId): T | undefined {
    return this.components.get(entityId);
  }

  has(entityId: EntityId): boolean {
    return this.components.has(entityId);
  }

  /**
   * Removes a component immediately. Use queueRemoval when deferring cleanup until after iteration.
   */
  remove(entityId: EntityId): void {
    this.components.delete(entityId);
    this.queuedRemovals.delete(entityId);
  }

  /**
   * Queues component removal to avoid invalidating iterators mid-tick.
   */
  queueRemoval(entityId: EntityId): void {
    if (this.components.has(entityId)) {
      this.queuedRemovals.add(entityId);
    }
  }

  /**
   * Applies any queued removals. Call once per tick after systems finish iterating.
   */
  flushQueuedRemovals(): void {
    if (this.queuedRemovals.size === 0) {
      return;
    }

    for (const entityId of this.queuedRemovals) {
      this.components.delete(entityId);
    }

    this.queuedRemovals.clear();
  }

  /**
   * Returns the current components as an array sorted by entity ID for deterministic iteration.
   */
  entries(): Array<[EntityId, T]> {
    if (this.components.size === 0) {
      return [];
    }

    return Array.from(this.components.entries()).sort((a, b) => a[0] - b[0]);
  }

  clear(): void {
    this.components.clear();
    this.queuedRemovals.clear();
  }
}
