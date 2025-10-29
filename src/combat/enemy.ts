/**
 * Supported enemy archetypes that drive spawn behaviour and stats.
 */
export type EnemyArchetype = 'grunt' | 'placeholder';

/**
 * Component attached to enemy entities describing their archetype.
 */
export interface EnemyComponent {
  archetype: EnemyArchetype;
  // TODO: Add combat stats (HP, speed, damage) once tuning begins.
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
