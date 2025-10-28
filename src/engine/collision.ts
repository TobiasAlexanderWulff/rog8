/* eslint-disable @typescript-eslint/no-unused-vars */

import type { MapGrid } from '../world/mapgen/simple';

export interface CollisionResult {
  blocked: boolean;
  // TODO: Add additional data such as penetration depth or slide vector.
}

export function checkCollision(map: MapGrid, x: number, y: number): CollisionResult {
  // TODO: Inspect map tiles and determine if the position is walkable.
  void map;
  void x;
  void y;
  return { blocked: false };
}
