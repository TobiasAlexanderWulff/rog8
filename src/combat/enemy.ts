/**
 * Supported enemy archetypes that drive spawn behaviour and stats.
 */
export type EnemyArchetype = 'grunt' | 'placeholder';

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
  // TODO: Track pathfinding state or movement speed modifiers.
}

/**
 * Spawns a new enemy of the given archetype into the world.
 *
 * @param archetype Enemy type to instantiate.
 */
export function spawnEnemy(archetype: EnemyArchetype): void {
  // TODO: Integrate with the World/ECS to actually instantiate an enemy entity.
  void archetype;
}
