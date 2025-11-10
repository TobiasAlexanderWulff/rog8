/**
 * Spatial component that tracks entity position in tile units.
 *
 * @remarks
 * Position is expressed in tile coordinates rather than world units to align with grid-based
 * traversal.
 *
 * @example
 * ```ts
 * const transform: TransformComponent = { x: 4, y: 7 };
 * ```
 */
export interface TransformComponent {
  x: number;
  y: number;
}

/**
 * Velocity vector expressed in tile units per millisecond.
 *
 * @remarks
 * Stores velocities compatible with transform updates that operate in tile space.
 *
 * @example
 * ```ts
 * const velocity: VelocityComponent = { vx: 0.5, vy: 0 };
 * ```
 */
export interface VelocityComponent {
  vx: number;
  vy: number;
}

/**
 * Health totals used by combat systems for damage application.
 *
 * @remarks
 * Health values are clamped to non-negative integers by combat systems.
 *
 * @example
 * ```ts
 * const health: HealthComponent = { current: 10, max: 10 };
 * ```
 */
export interface HealthComponent {
  current: number;
  max: number;
}

/**
 * Marker component to tag an entity as the local player.
 *
 * @remarks
 * Allows systems to query for the player entity without relying on entity identifiers.
 *
 * @example
 * ```ts
 * const player: PlayerComponent = { name: 'Hero' };
 * ```
 */
export interface PlayerComponent {
  name: string;
}

export type EntityId = number;
export type ComponentKey<T = unknown> = string & {
  readonly __componentBrand?: T;
};

/**
 * Generic component storage that maps entity IDs to component data with deterministic iteration.
 *
 * @remarks
 * Maintains insertion order by sorting entity identifiers, offering stable iteration during system
 * updates.
 *
 * @example
 * ```ts
 * const store = new ComponentStore<TransformComponent>();
 * store.add(1, { x: 0, y: 0 });
 * ```
 */
export class ComponentStore<T> {
  private readonly components = new Map<EntityId, T>();
  private readonly queuedRemovals = new Set<EntityId>();

  /**
   * Stores component data for the given entity, overwriting existing state.
   *
   * @remarks
   * Clears any pending removal for the entity so subsequent flushes do not drop the component.
   *
   * @param entityId - Entity identifier that owns the component.
   * @param component - Component data to persist.
   * @throws This method never throws; it mutates an internal map.
   * @example
   * ```ts
   * store.add(1, { x: 0, y: 0 });
   * ```
   */
  add(entityId: EntityId, component: T): void {
    this.components.set(entityId, component);
    this.queuedRemovals.delete(entityId);
  }

  /**
   * Retrieves component data when present on the store.
   *
   * @remarks
   * Returns `undefined` when no component has been attached to the entity.
   *
   * @param entityId - Entity identifier to query.
   * @returns Component instance or `undefined` when missing.
   * @throws This method never throws; it performs a map lookup.
   * @example
   * ```ts
   * const transform = store.get(1);
   * ```
   */
  get(entityId: EntityId): T | undefined {
    return this.components.get(entityId);
  }

  /**
   * Checks whether an entity currently has component data stored.
   *
   * @remarks
   * Useful for guarding component reads when optional relationships exist.
   *
   * @param entityId - Entity identifier to inspect.
   * @returns `true` when the store contains an entry for the identifier.
   * @throws This method never throws; it checks membership in a map.
   * @example
   * ```ts
   * if (store.has(1)) {
   *   // read component
   * }
   * ```
   */
  has(entityId: EntityId): boolean {
    return this.components.has(entityId);
  }

  /**
   * Removes a component immediately. Use {@link queueRemoval} when deferring cleanup until after iteration.
   *
   * @remarks
   * Also clears any pending removal markers so a later flush does not attempt to remove it again.
   *
   * @param entityId - Entity identifier whose component should be removed.
   * @throws This method never throws; missing components are ignored.
   * @example
   * ```ts
   * store.remove(1);
   * ```
   */
  remove(entityId: EntityId): void {
    this.components.delete(entityId);
    this.queuedRemovals.delete(entityId);
  }

  /**
   * Queues component removal to avoid invalidating iterators mid-tick.
   *
   * @remarks
   * Defer removals while iterating over store entries to keep iteration safe.
   *
   * @param entityId - Entity identifier to mark for deferred removal.
   * @throws This method never throws; it records the identifier for later cleanup.
   * @example
   * ```ts
   * store.queueRemoval(1);
   * ```
   */
  queueRemoval(entityId: EntityId): void {
    if (this.components.has(entityId)) {
      this.queuedRemovals.add(entityId);
    }
  }

  /**
   * Applies any queued removals. Call once per tick after systems finish iterating.
   *
   * @remarks
   * Processes the removal queue and clears it so subsequent frames see the updated state.
   *
   * @throws This method never throws; it mutates internal collections.
   * @example
   * ```ts
   * store.flushQueuedRemovals();
   * ```
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
   *
   * @remarks
   * Sorting entity identifiers ensures stable iteration order across frames and runtime
   * environments.
   *
   * @returns Sorted entity-component pairs.
   * @throws This method never throws; it copies and sorts entries.
   * @example
   * ```ts
   * const entries = store.entries();
   * ```
   */
  entries(): Array<[EntityId, T]> {
    if (this.components.size === 0) {
      return [];
    }

    return Array.from(this.components.entries()).sort((a, b) => a[0] - b[0]);
  }

  /**
   * Removes all components and pending removals from the store.
   *
   * @remarks
   * Restores the store to an empty state, clearing both direct entries and deferred removal queues.
   *
   * @throws This method never throws; it clears internal collections.
   * @example
   * ```ts
   * store.clear();
   * ```
   */
  clear(): void {
    this.components.clear();
    this.queuedRemovals.clear();
  }
}
