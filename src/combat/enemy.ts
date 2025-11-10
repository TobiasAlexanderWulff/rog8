import type { World } from '../engine/world';
import type { ComponentKey, TransformComponent, HealthComponent } from '../engine/components';

const TRANSFORM_COMPONENT_KEY = 'component.transform' as ComponentKey<TransformComponent>;
const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;

/**
 * Supported enemy archetypes that drive spawn behaviour and stats.
 *
 * @remarks
 * Extend this union and the accompanying `ARCHETYPE_STATS` map when introducing new enemy types.
 *
 * @example
 * ```ts
 * const archetype: EnemyArchetype = 'grunt';
 * ```
 */
export type EnemyArchetype = 'grunt' | 'brute' | 'placeholder';

export interface EnemyCombatStats {
  maxHp: number;
  speed: number;
  damage: number;
}

const ARCHETYPE_STATS: Record<EnemyArchetype, EnemyCombatStats> = {
  grunt: {
    maxHp: 1,
    speed: 1.5,
    damage: 1,
  },
  brute: {
    maxHp: 12,
    speed: 0.75,
    damage: 7,
  },
  placeholder: {
    maxHp: 1,
    speed: 1,
    damage: 0,
  },
};

/**
 * Component attached to enemy entities describing their archetype.
 *
 * @remarks
 * The component mixes in combat stats so gameplay systems can read speed and damage without
 * consulting the archetype table again.
 *
 * @example
 * ```ts
 * const enemy: EnemyComponent = { archetype: 'grunt', maxHp: 1, speed: 1.5, damage: 1 };
 * ```
 */
export interface EnemyComponent extends EnemyCombatStats {
  archetype: EnemyArchetype;
}

/**
 * Creates an enemy combat component instance for the requested archetype.
 *
 * @remarks
 * Copies the combat stat template so runtime mutations (e.g., buffs) do not affect the shared
 * archetype definition.
 *
 * @param archetype - Enemy template that controls base stats.
 * @returns Fresh component instance for the archetype.
 * @throws This function never throws; it reads data from a static lookup table.
 * @example
 * ```ts
 * const grunt = createEnemyComponent('grunt');
 * console.log(grunt.maxHp);
 * ```
 */
export function createEnemyComponent(archetype: EnemyArchetype): EnemyComponent {
  const stats = ARCHETYPE_STATS[archetype];
  return {
    archetype,
    maxHp: stats.maxHp,
    speed: stats.speed,
    damage: stats.damage,
  };
}

/**
 * Component used by chase AI systems to track pursuit metadata.
 *
 * @remarks
 * Stores both the path and current target so behaviour systems can react without recomputing path
 * state every frame.
 *
 * @example
 * ```ts
 * const chase: ChaseAIComponent = {
 *   targetEntityId: null,
 *   aggroRadius: 6,
 *   path: [],
 *   currentPathIndex: 0,
 *   speedMultiplier: 1,
 * };
 * ```
 */
export interface ChaseAIComponent {
  targetEntityId: number | null;
  aggroRadius: number;
  path: { x: number; y: number }[];
  currentPathIndex: number;
  speedMultiplier: number;
}

/**
 * Spawns a new enemy of the given archetype into the world.
 *
 * @remarks
 * Component stores are lazily registered so callers do not have to seed them separately before
 * spawning enemies.
 *
 * @param world - Active world that should host the enemy entity.
 * @param archetype - Enemy type to instantiate.
 * @param position - Spawn position in tile coordinates.
 * @returns Identifier of the newly created enemy entity.
 * @throws This function never throws; component store registration is guarded.
 * @example
 * ```ts
 * const enemyId = spawnEnemy(world, 'grunt', { x: 10, y: 12 });
 * ```
 */
export function spawnEnemy(
  world: World,
  archetype: EnemyArchetype,
  position: { x: number; y: number } = { x: 0, y: 0 },
): number {
  // Ensure the world exposes the component stores required for spawning.
  if (!world.getComponentStore(TRANSFORM_COMPONENT_KEY)) {
    world.registerComponentStore(TRANSFORM_COMPONENT_KEY);
  }
  if (!world.getComponentStore(HEALTH_COMPONENT_KEY)) {
    world.registerComponentStore(HEALTH_COMPONENT_KEY);
  }
  if (!world.getComponentStore(ENEMY_COMPONENT_KEY)) {
    world.registerComponentStore(ENEMY_COMPONENT_KEY);
  }

  const entity = world.createEntity();
  const enemyComponent = createEnemyComponent(archetype);

  // Position, health, and combat stats are seeded in separate components.
  world.addComponent(entity, TRANSFORM_COMPONENT_KEY, { x: position.x, y: position.y });
  world.addComponent(entity, HEALTH_COMPONENT_KEY, {
    current: enemyComponent.maxHp,
    max: enemyComponent.maxHp,
  });
  world.addComponent(entity, ENEMY_COMPONENT_KEY, enemyComponent);

  return entity.id;
}
