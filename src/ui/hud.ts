import type { RunSeed } from '../shared/random';

/**
 * Represents the reactive HUD metrics that rendering routines consume.
 *
 * Attributes:
 *   health: Current and maximum hit points for the player.
 *   seed: Deterministic run seed surfaced for debugging and sharing.
 */
export interface HudState {
  health: { current: number; max: number };
  seed: RunSeed;
  // TODO: Extend with key/coin/floor counters in Milestone B.
}

/**
 * Creates the HUD overlay, attaches it to the provided root element, and returns the default state.
 *
 * Args:
 *   root (HTMLElement): DOM node that hosts the HUD. Its children are replaced with the overlay.
 *
 * Returns:
 *   HudState: Baseline HUD snapshot that mirrors the initial DOM contents.
 */
export function createHud(root: HTMLElement): HudState {
  const overlay = document.createElement('section');
  overlay.className = 'hud-overlay';
  overlay.dataset.hudLayer = 'overlay';

  const healthRow = document.createElement('div');
  healthRow.className = 'hud-row hud-row--status';

  const healthLabel = document.createElement('span');
  healthLabel.className = 'hud-label';
  healthLabel.textContent = 'HP';

  const healthValue = document.createElement('span');
  healthValue.className = 'hud-value';
  healthValue.dataset.hudHealth = 'true';
  healthValue.textContent = '0 / 0';

  healthRow.append(healthLabel, healthValue);

  const seedRow = document.createElement('div');
  seedRow.className = 'hud-row hud-row--seed';

  const seedLabel = document.createElement('span');
  seedLabel.className = 'hud-label';
  seedLabel.textContent = 'Seed';

  const seedValue = document.createElement('span');
  seedValue.className = 'hud-value';
  seedValue.dataset.hudSeed = 'true';
  seedValue.textContent = '0';

  seedRow.append(seedLabel, seedValue);

  overlay.append(healthRow, seedRow);

  root.replaceChildren(overlay);
  root.setAttribute('data-hud-ready', 'true');

  return {
    health: { current: 0, max: 0 },
    seed: { value: 0 },
  };
}

/**
 * Propagates the supplied HUD state into the overlay so the UI reflects the latest values.
 *
 * Args:
 *   state (HudState): Current HUD metrics to render.
 */
export function updateHud(state: HudState): void {
  const overlay = document.querySelector<HTMLElement>('[data-hud-layer="overlay"]');
  if (!overlay) {
    return;
  }

  const healthValue = overlay.querySelector<HTMLElement>('[data-hud-health="true"]');
  if (healthValue) {
    const { current, max } = state.health;
    const nextValue = `${current} / ${max}`;
    if (healthValue.textContent !== nextValue) {
      healthValue.textContent = nextValue;
    }
  }

  const seedValue = overlay.querySelector<HTMLElement>('[data-hud-seed="true"]');
  if (seedValue) {
    const nextValue = `${state.seed.value}`;
    if (seedValue.textContent !== nextValue) {
      seedValue.textContent = nextValue;
    }
  }
}

/**
 * Reveals the game-over overlay, highlighting the seed used for the failed run.
 *
 * Args:
 *   seed (RunSeed): Deterministic seed associated with the attempt.
 */
export function showGameOver(seed: RunSeed): void {
  const overlay = document.querySelector<HTMLElement>('[data-hud-layer="overlay"]');
  if (!overlay) {
    return;
  }

  let container = overlay.querySelector<HTMLElement>('[data-hud-game-over="true"]');
  if (!container) {
    container = document.createElement('div');
    container.className = 'hud-row hud-row--game-over';
    container.dataset.hudGameOver = 'true';

    const title = document.createElement('span');
    title.className = 'hud-label';
    title.dataset.hudGameOverTitle = 'true';
    container.appendChild(title);

    const instructions = document.createElement('span');
    instructions.className = 'hud-value';
    instructions.dataset.hudGameOverInstructions = 'true';
    container.appendChild(instructions);

    overlay.appendChild(container);
  }

  const title = container.querySelector<HTMLElement>('[data-hud-game-over-title="true"]');
  if (title) {
    const nextTitle = `Game Over — Seed ${seed.value}`;
    if (title.textContent !== nextTitle) {
      title.textContent = nextTitle;
    }
  }

  const instructions = container.querySelector<HTMLElement>(
    '[data-hud-game-over-instructions="true"]',
  );
  if (instructions) {
    const nextInstructions = 'Press R to restart';
    if (instructions.textContent !== nextInstructions) {
      instructions.textContent = nextInstructions;
    }
  }
}
