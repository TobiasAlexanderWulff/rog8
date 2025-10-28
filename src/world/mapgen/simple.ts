import type { RNG } from '../../shared/random';

export interface Tile {
  type: 'wall' | 'floor';
  // TODO: Embed collision flags or biome data when needed.
}

export interface MapGrid {
  width: number;
  height: number;
  tiles: Tile[];
  // TODO: Add helper accessors for tile lookups/updates.
}

export interface MapMetadata {
  playerSpawn: { x: number; y: number };
  enemySpawns: Array<{ x: number; y: number }>;
  exit: { x: number; y: number };
  // TODO: Store corridor data or room descriptors for future systems.
}

export interface GeneratedMap {
  grid: MapGrid;
  metadata: MapMetadata;
}

export function generateSimpleMap(rng: RNG): GeneratedMap {
  // TODO: Implement seeded rooms-and-corridors generator.
  void rng;
  throw new Error('TODO: generateSimpleMap not implemented yet');
}
