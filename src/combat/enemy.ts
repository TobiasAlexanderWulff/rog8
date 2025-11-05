import type { World } from '../engine/world';
import type { ComponentKey, TransformComponent, HealthComponent } from '../engine/components';

const TRANSFORM_COMPONENT_KEY = 'component.transform' as ComponentKey<TransformComponent>;
const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;

/**
 * Supported enemy archetypes that drive spawn behaviour and stats.
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
 */
export interface EnemyComponent extends EnemyCombatStats {
  archetype: EnemyArchetype;
}

/**
 * Creates an enemy combat component instance for the requested archetype.
 *
 * Args:
 *   archetype (EnemyArchetype): Enemy template that controls base stats.
 *
 * Returns:
 *   EnemyComponent: Fresh component instance for the archetype.
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
 * Args:
 *   world (World): Active world that should host the enemy entity.
 *   archetype (EnemyArchetype): Enemy type to instantiate.
 *   position ({ x: number; y: number }): Spawn position in tile coordinates.
 *
 * Returns:
 *   number: Identifier of the newly created enemy entity.
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
