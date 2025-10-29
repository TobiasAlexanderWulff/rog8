import type { World } from '../engine/world';
import type { RunSeed } from '../shared/random';
import type { GeneratedMap } from './mapgen/simple';

/**
 * Output produced when a new run is initialised.
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
 * @param world ECS world to populate.
 * @param seed Seed that governs deterministic generation.
 * @returns Identifiers and map data required to start the run.
 */
export function bootstrapRun(world: World, seed: RunSeed): RunBootstrapResult {
  // TODO: Generate map, spawn entities, and return relevant identifiers.
  void world;
  void seed;
  throw new Error('TODO: bootstrapRun not implemented yet');
}
