# ECS Foundation Plan

## Scope

- Establish the baseline ECS infrastructure inside `src/engine/world.ts` and `src/engine/components.ts`.
- Keep the plan engine-focused while flagging integration points with `run-controller`, gameplay modules, and runtime services.
- Capture gaps and follow-ups that block Milestone A deliverables in the Phase 1 MVP plan.

## Current State Snapshot

- `World` class only stores registered systems and increments entity IDs; entity/component lifecycle is not implemented.
- Entities expose `id` only; there is no storage for components or lookup helpers.
- `components.ts` defines interface shapes (`Transform`, `Velocity`, `Health`, `Player`) but lacks any component registry or storage abstraction.
- Systems under `src/engine/systems/` assume forthcoming ECS helpers (e.g., queries) and currently cannot operate.
- `RunController` (`src/engine/run-controller.ts`) constructs a `World` instance and ticks it each frame, so the world reset semantics must plug into restart logic.

## Objectives

1. Provide deterministic component storage that supports add/remove/query by `EntityId`.
2. Extend `World` so it owns entity lifecycle, component stores, and system scheduling with reproducible order.
3. Expose ergonomics for systems: iterating entities matching component sets, mutating components, and batching removals without breaking determinism.
4. Wire reset hooks that allow `RunController.restart()` to rebuild world state without leaking data.
5. Document integration contracts for gameplay modules that will register components/systems.

## Dependencies & Integration Notes

- **Run Controller (`src/engine/run-controller.ts`)**  
  Needs `World.reset()` (or equivalent) to clear entities/components between runs while reusing the same seed-driven systems.

- **Input Manager (`src/engine/input.ts`)**  
  Systems reading player input should receive the manager via tick context or world resources; the plan should outline how resources get injected without global state.

- **Collision Helpers (`src/engine/collision.ts`)**  
  Movement systems will require deterministic access to collision data; note whether collision maps live as components or resources.

- **Domain Systems (`src/world/*`, `src/combat/*`, `src/render/*`)**  
  These modules will define their own components and register systems; we must specify registration APIs and ordering guarantees they rely on.

- **Shared RNG (`src/shared/random.ts`)**  
  Tick context already carries an RNG; component operations must avoid hidden randomness to preserve deterministic seeds.

## Implementation Outline

### 1. Component Storage Layer

- Implement a generic `ComponentStore<T>` that maps `EntityId` to component data with O(1) access.
- Provide methods: `add(entityId, data)`, `get(entityId)`, `has(entityId)`, `remove(entityId)`, `entries()`.
- Consider lightweight iterators or array snapshots for deterministic iteration (copy-on-write or sorted IDs).
- Track dirty removals to avoid mutating stores while systems iterate; queue removals for post-tick cleanup.

### 2. Component Registry & Metadata

- Introduce a registry to assign stable component keys (e.g., symbols or incremental IDs) so systems can request stores without string lookups.
- Define helper types (`ComponentType<T>`, `ComponentHandle`) to enforce type safety.
- Document how domain code registers new components (e.g., via `registerComponent('Transform', createTransformStore)`).
- Note any runtime cost considerations (e.g., preallocating arrays vs. lazy creation).

### 3. Entity Lifecycle in `World`

- Add `createEntity()` to allocate an ID, track active entities, and optionally accept initial components.
- Implement `destroyEntity()` that marks entities for removal and triggers component store cleanup after the current tick.
- Maintain deterministic entity order (e.g., ascending IDs); avoid reuse of IDs within a run to keep replays stable.
- Provide `world.addComponent(entity, componentType, data)` / `world.getComponent<Entity, Component>()` helpers that delegate to the registry.

### 4. System Registration & Execution

- Store systems with explicit priority or registration index to guarantee deterministic iteration order (`Array<{priority, system}>`).
- Extend `addSystem` to accept optional priority metadata; default to 0 to maintain current behaviour.
- During `update`, iterate systems in sorted order and apply queued entity/component removals after each system or after the full tick (decide and document).
- Expose `world.withQuery(['Transform', 'Velocity'], callback)` style helpers or iterators so systems can efficiently process matching entities.

### 5. World Resources & Context

- Provide a resource map (e.g., `Map<ResourceKey, unknown>`) for singleton services like `InputManager` or collision grids.
- Add APIs `registerResource`, `getResource`, `removeResource`, ensuring deterministic availability.
- Update `TickContext` or `World` so systems can access resources without reaching into singletons.

### 6. Reset & Serialization Hooks

- Implement `world.reset()` or `world.clear()` to wipe entities, component stores, pending queues, and resources.
- Document how restart flows should repopulate the world (e.g., `run-controller` re-registers systems vs. preserving them).
- Plan for future save/load by keeping component stores serializable (e.g., provide `toJSON` stubs or guidelines).

## Testing & Validation Strategy

- Unit tests under `src/engine/__tests__/` covering:
  - Component add/remove/get semantics and deterministic iteration order.
  - Entity creation/destroy with deferred cleanup.
  - System execution order respecting priorities.
  - World reset clearing entities while retaining registered systems if required.
- Integrate with existing RNG tests to confirm ECS operations do not mutate RNG state unexpectedly.
- Capture known flakiness (Vitest harness) in test headers per repository testing guidelines.

## Open Questions & Follow-Ups

- Should components be pure data or allow computed getters? (Affects serialization.)
- Do we need archetype-style chunking for performance, or is Map-based storage sufficient for Phase 1?
- How should cross-system events be delivered (event queue vs. component tags)? Plan follow-up design if current scope only covers polling.
- Confirm whether system registration happens once at bootstrap or per run reset; document expectations in `docs/TECH_STACK.md` after implementation.

## Deliverables Checklist

- [ ] Component storage abstractions in `src/engine/components.ts`.
- [ ] Updated `World` class with entity/component APIs and deterministic system scheduling.
- [ ] Resource management helpers (world-level).
- [ ] Reset/cleanup API consumed by `RunController`.
- [ ] Unit tests validating ECS behaviour.
- [ ] Documentation updates (`docs/TECH_STACK.md`, any affected `AGENTS.md`) describing new ECS contracts.
