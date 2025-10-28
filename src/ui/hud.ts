/* eslint-disable @typescript-eslint/no-unused-vars */

import type { RunSeed } from '../shared/random';

export interface HudState {
  health: { current: number; max: number };
  seed: RunSeed;
  // TODO: Extend with key/coin/floor counters in Milestone B.
}

export function createHud(root: HTMLElement): HudState {
  // TODO: Mount HUD elements (canvas overlay or DOM) under the provided root.
  void root;
  throw new Error('TODO: createHud not implemented yet');
}

export function updateHud(state: HudState): void {
  // TODO: Redraw or re-render HUD elements based on latest state.
  void state;
}

export function showGameOver(seed: RunSeed): void {
  // TODO: Surface a simple game-over message and show restart instructions.
  void seed;
}
