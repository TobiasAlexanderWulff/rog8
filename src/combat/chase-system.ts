import { checkCollision } from '../engine/collision';
import type { ComponentKey, TransformComponent } from '../engine/components';
import type { System, World, ResourceKey, TickContext } from '../engine/world';
import type { MapGrid } from '../world/mapgen/simple';
import type { ChaseAIComponent, EnemyComponent } from './enemy';

const TRANSFORM_COMPONENT_KEY = 'component.transform' as ComponentKey<TransformComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;
const CHASE_AI_COMPONENT_KEY = 'component.chase-ai' as ComponentKey<ChaseAIComponent>;
const MAP_GRID_RESOURCE_KEY = 'resource.map-grid' as ResourceKey<MapGrid>;

/**
 * Registers the chase AI system with the provided world instance.
 *
 * @param world ECS world that should host the system.
 */
export const registerChaseSystem = (world: World): void => {
  world.addSystem(chaseSystem);
};

/**
 * Moves enemies toward their targets based on line-of-sight and aggro rules.
 *
 * @param world ECS world to mutate.
 * @param context Frame metadata containing delta time and RNG.
 */
export const chaseSystem: System = (world, context) => {
  const map = world.getResource(MAP_GRID_RESOURCE_KEY);
  if (!map) {
    return;
  }

  const transformStore = world.getComponentStore(TRANSFORM_COMPONENT_KEY);
  const enemyStore = world.getComponentStore(ENEMY_COMPONENT_KEY);
  const chaseStore = world.getComponentStore(CHASE_AI_COMPONENT_KEY);
  if (!transformStore || !enemyStore || !chaseStore) {
    return;
  }

  const frameDelta = context.delta;
  if (frameDelta <= 0) {
    return;
  }

  for (const [entityId, chase] of chaseStore.entries()) {
    const targetId = chase.targetEntityId;
    if (targetId == null) {
      continue;
    }

    const transform = transformStore.get(entityId);
    const targetTransform = transformStore.get(targetId);
    const enemy = enemyStore.get(entityId);

    if (!transform || !targetTransform || !enemy) {
      continue;
    }

    const dx = targetTransform.x - transform.x;
    const dy = targetTransform.y - transform.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq === 0) {
      continue;
    }

    const speedMultiplier = Number.isFinite(chase.speedMultiplier) ? chase.speedMultiplier : 1;
    const speed = enemy.speed * (speedMultiplier || 0);
    if (speed <= 0) {
      continue;
    }

    const distance = Math.sqrt(distanceSq);
    const maxStep = speed * frameDelta;
    if (maxStep <= 0) {
      continue;
    }

    const step = distance > maxStep ? maxStep : distance;
    const invDistance = 1 / distance;
    const moveX = dx * invDistance * step;
    const moveY = dy * invDistance * step;

    let resolvedX = transform.x;
    let resolvedY = transform.y;

    if (moveX !== 0) {
      const candidateX = resolvedX + moveX;
      const tileX = Math.floor(candidateX);
      const tileY = Math.floor(resolvedY);
      if (!checkCollision(map, tileX, tileY).blocked) {
        resolvedX = candidateX;
      }
    }

    if (moveY !== 0) {
      const candidateY = resolvedY + moveY;
      const tileX = Math.floor(resolvedX);
      const tileY = Math.floor(candidateY);
      if (!checkCollision(map, tileX, tileY).blocked) {
        resolvedY = candidateY;
      }
    }

    transform.x = resolvedX;
    transform.y = resolvedY;
  }
};
