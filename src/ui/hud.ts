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
 * Updates the HUD visuals to reflect the latest state.
 *
 * @param state Current HUD data to render.
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
 * Displays a simple game-over overlay highlighting the seed used.
 *
 * @param seed Run seed associated with the failed attempt.
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
