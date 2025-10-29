import type { RNG } from '../../shared/random';

/**
 * Basic tile representation used for procedural map generation.
 */
export interface Tile {
  type: 'wall' | 'floor';
  // TODO: Embed collision flags or biome data when needed.
}

/**
 * Tile grid storing width, height, and linearised tile array.
 */
export interface MapGrid {
  width: number;
  height: number;
  tiles: Tile[];
  // TODO: Add helper accessors for tile lookups/updates.
}

/**
 * Metadata describing spawn points and exits for generated maps.
 */
export interface MapMetadata {
  playerSpawn: { x: number; y: number };
  enemySpawns: Array<{ x: number; y: number }>;
  exit: { x: number; y: number };
  // TODO: Store corridor data or room descriptors for future systems.
}

/**
 * Container bundling the generated grid with metadata used by other systems.
 */
export interface GeneratedMap {
  grid: MapGrid;
  metadata: MapMetadata;
}

/**
 * Generates a deterministic map layout using the provided RNG.
 *
 * @param rng Deterministic RNG seeded by the current run.
 * @returns Grid and metadata describing the generated floor.
 */
export function generateSimpleMap(rng: RNG): GeneratedMap {
  // TODO: Implement seeded rooms-and-corridors generator.
  void rng;
  throw new Error('TODO: generateSimpleMap not implemented yet');
}
