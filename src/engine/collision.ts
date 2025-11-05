import { TileCollisionFlag, type MapGrid } from '../world/mapgen/simple';

/**
 * Result from collision queries against the map grid.
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
 * Args:
 *   map (MapGrid): Tile grid describing the walkable space.
 *   x (number): Tile-space X coordinate to check.
 *   y (number): Tile-space Y coordinate to check.
 *
 * Returns:
 *   CollisionResult: Collision information for the requested location.
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
