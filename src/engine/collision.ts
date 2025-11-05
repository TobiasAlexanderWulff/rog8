import { TileCollisionFlag, type MapGrid } from '../world/mapgen/simple';

/**
 * Result from collision queries against the map grid.
 *
 * @remarks
 * The structure encodes basic separation data that movement systems can use to react to walls and
 * other blocking tiles.
 *
 * @example
 * ```ts
 * const result: CollisionResult = { blocked: false, penetrationDepth: 0, slideVectorX: 0, slideVectorY: 0 };
 * ```
 */
export interface CollisionResult {
  blocked: boolean;
  penetrationDepth: number;
  slideVectorX: number;
  slideVectorY: number;
}

/**
 * Determines whether a map coordinate intersects a blocking tile.
 *
 * @remarks
 * Coordinates outside the map bounds are treated as blocked so entities cannot leave the level.
 *
 * @param map - Tile grid describing the walkable space.
 * @param x - Tile-space X coordinate to check.
 * @param y - Tile-space Y coordinate to check.
 * @returns Collision information for the requested location.
 * @throws This function never throws; it returns a blocked result when the query falls outside the grid.
 * @example
 * ```ts
 * const result = checkCollision(map, 3, 5);
 * if (result.blocked) {
 *   // resolve collision
 * }
 * ```
 */
export function checkCollision(map: MapGrid, x: number, y: number): CollisionResult {
  const width = map.width;
  const height = map.height;

  if (x < 0 || y < 0 || x >= width || y >= height) {
    return {
      blocked: true,
      penetrationDepth: 0,
      slideVectorX: 0,
      slideVectorY: 0,
    };
  }

  const tileFlags = map.tiles[y * width + x].flags;
  const blocked = (tileFlags & TileCollisionFlag.Blocking) !== 0;

  return {
    blocked,
    penetrationDepth: 0,
    slideVectorX: 0,
    slideVectorY: 0,
  };
}
