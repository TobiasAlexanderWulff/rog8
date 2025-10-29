import type { RunSeed } from '../shared/random';

/**
 * Reactive HUD data exposed to rendering routines.
 */
export interface HudState {
  health: { current: number; max: number };
  seed: RunSeed;
  // TODO: Extend with key/coin/floor counters in Milestone B.
}

/**
 * Mounts and initialises the HUD under the provided root element.
 *
 * @param root DOM node that will host the HUD.
 * @returns Initial HUD state snapshot.
 */
export function createHud(root: HTMLElement): HudState {
  // TODO: Mount HUD elements (canvas overlay or DOM) under the provided root.
  root.replaceChildren();
  root.setAttribute('data-hud-ready', 'false');

  return {
    health: { current: 0, max: 0 },
    seed: { value: 0 },
  };
}

/**
 * Updates the HUD visuals to reflect the latest state.
 *
 * @param state Current HUD data to render.
 */
export function updateHud(state: HudState): void {
  // TODO: Redraw or re-render HUD elements based on latest state.
  void state;
}

/**
 * Displays a simple game-over overlay highlighting the seed used.
 *
 * @param seed Run seed associated with the failed attempt.
 */
export function showGameOver(seed: RunSeed): void {
  // TODO: Surface a simple game-over message and show restart instructions.
  void seed;
}
