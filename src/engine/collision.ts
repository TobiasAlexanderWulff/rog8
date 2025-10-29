import type { MapGrid } from '../world/mapgen/simple';

/**
 * Result from collision queries against the map grid.
 */
export interface CollisionResult {
  blocked: boolean;
  // TODO: Add additional data such as penetration depth or slide vector.
}

/**
 * Determines whether a map coordinate intersects a blocking tile.
 *
 * @param map Tile grid describing the walkable space.
 * @param x Tile-space X coordinate to check.
 * @param y Tile-space Y coordinate to check.
 * @returns Collision information for the requested location.
 */
export function checkCollision(map: MapGrid, x: number, y: number): CollisionResult {
  // TODO: Inspect map tiles and determine if the position is walkable.
  void map;
  void x;
  void y;
  return { blocked: false };
}
