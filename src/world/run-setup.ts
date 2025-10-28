import type { World } from '../engine/world';
import type { RunSeed } from '../shared/random';
import type { GeneratedMap } from './mapgen/simple';

export interface RunBootstrapResult {
  map: GeneratedMap;
  playerEntityId: number;
  enemyEntityIds: number[];
  // TODO: Include additional state (hud, audio cues) when available.
}

export function bootstrapRun(world: World, seed: RunSeed): RunBootstrapResult {
  // TODO: Generate map, spawn entities, and return relevant identifiers.
  void world;
  void seed;
  throw new Error('TODO: bootstrapRun not implemented yet');
}
