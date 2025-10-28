export type EnemyArchetype = 'grunt' | 'placeholder';

export interface EnemyComponent {
  archetype: EnemyArchetype;
  // TODO: Add combat stats (HP, speed, damage) once tuning begins.
}

export interface ChaseAIComponent {
  targetEntityId: number | null;
  aggroRadius: number;
  // TODO: Track pathfinding state or movement speed modifiers.
}

export function spawnEnemy(archetype: EnemyArchetype): void {
  // TODO: Integrate with the World/ECS to actually instantiate an enemy entity.
  void archetype;
}
