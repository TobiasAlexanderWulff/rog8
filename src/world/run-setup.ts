import type { World, ResourceKey } from '../engine/world';
import type {
  ComponentKey,
  HealthComponent,
  PlayerComponent,
  TransformComponent,
  VelocityComponent,
} from '../engine/components';
import { createEnemyComponent, type EnemyComponent } from '../combat/enemy';
import { createMulberry32, type RunSeed } from '../shared/random';
import { generateSimpleMap, type GeneratedMap, type MapGrid } from './mapgen/simple';

const TRANSFORM_COMPONENT_KEY = 'component.transform' as ComponentKey<TransformComponent>;
const VELOCITY_COMPONENT_KEY = 'component.velocity' as ComponentKey<VelocityComponent>;
const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;
const PLAYER_COMPONENT_KEY = 'component.player' as ComponentKey<PlayerComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;
const MAP_GRID_RESOURCE_KEY = 'resource.map-grid' as ResourceKey<MapGrid>;

const PLAYER_STARTING_HEALTH = 5;

/**
 * Output produced when a new run is initialised.
 *
 * Attributes:
 *   map: Generated tile grid and metadata for the run.
 *   playerEntityId: Identifier of the spawned player entity.
 *   enemyEntityIds: Entity identifiers for spawned enemies.
 */
export interface RunBootstrapResult {
  map: GeneratedMap;
  playerEntityId: number;
  enemyEntityIds: number[];
  // TODO: Include additional state (hud, audio cues) when available.
}

/**
 * Constructs the initial world state for a new run.
 *
 * Args:
 *   world (World): ECS world to populate.
 *   seed (RunSeed): Seed that governs deterministic generation.
 *
 * Returns:
 *   RunBootstrapResult: Identifiers and map data required to start the run.
 */
export function bootstrapRun(world: World, seed: RunSeed): RunBootstrapResult {
  const ensureComponentStore = <T>(componentKey: ComponentKey<T>): void => {
    if (!world.getComponentStore(componentKey)) {
      world.registerComponentStore(componentKey);
    }
  };

  ensureComponentStore(TRANSFORM_COMPONENT_KEY);
  ensureComponentStore(VELOCITY_COMPONENT_KEY);
  ensureComponentStore(HEALTH_COMPONENT_KEY);
  ensureComponentStore(PLAYER_COMPONENT_KEY);
  ensureComponentStore(ENEMY_COMPONENT_KEY);

  const rng = createMulberry32(seed.value);
  const map = generateSimpleMap(rng);

  const player = world.createEntity();
  world.addComponent(player, TRANSFORM_COMPONENT_KEY, {
    x: map.metadata.playerSpawn.x,
    y: map.metadata.playerSpawn.y,
  });
  world.addComponent(player, VELOCITY_COMPONENT_KEY, { vx: 0, vy: 0 });
  world.addComponent(player, HEALTH_COMPONENT_KEY, {
    current: PLAYER_STARTING_HEALTH,
    max: PLAYER_STARTING_HEALTH,
  });
  world.addComponent(player, PLAYER_COMPONENT_KEY, { name: 'Player' });

  const enemyEntityIds = map.metadata.enemySpawns.map((spawn) => {
    const enemy = world.createEntity();
    const enemyComponent = createEnemyComponent('grunt');
    world.addComponent(enemy, TRANSFORM_COMPONENT_KEY, { x: spawn.x, y: spawn.y });
    world.addComponent(enemy, HEALTH_COMPONENT_KEY, {
      current: enemyComponent.maxHp,
      max: enemyComponent.maxHp,
    });
    world.addComponent(enemy, ENEMY_COMPONENT_KEY, enemyComponent);
    return enemy.id;
  });

  world.removeResource(MAP_GRID_RESOURCE_KEY);
  world.registerResource(MAP_GRID_RESOURCE_KEY, map.grid);

  return {
    map,
    playerEntityId: player.id,
    enemyEntityIds,
  };
}
