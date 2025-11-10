import type { RunSeed } from '../shared/random';

/**
 * Represents the reactive HUD metrics that rendering routines consume.
 *
 * @remarks
 * The state mirrors the DOM overlay so rendering systems can adjust health and seed
 * displays without querying gameplay state directly.
 *
 * @example
 * ```ts
 * const hudState = createHud(document.body);
 * console.log(hudState.health.current);
 * ```
 */
export interface HudState {
  health: { current: number; max: number };
  seed: RunSeed;
  // TODO: Extend with key/coin/floor counters in Milestone B.
}

/**
 * Creates the HUD overlay, attaches it to the provided root element, and returns the default state.
 *
 * @remarks
 * The function clears existing children on the supplied root node, so pass a dedicated container.
 *
 * @param root - DOM node that hosts the HUD overlay.
 * @returns Baseline HUD snapshot that matches the rendered DOM contents.
 * @throws This function never throws; DOM APIs synchronously return the created elements.
 * @example
 * ```ts
 * const root = document.querySelector<HTMLElement>('#hud')!;
 * const state = createHud(root);
 * console.log(state.seed.value);
 * ```
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
 * @remarks
 * The update is idempotent: it only mutates text nodes when the incoming state differs,
 * keeping DOM churn minimal during animation frames.
 *
 * @param state - Current HUD metrics to render in the overlay.
 * @throws This function never throws; it becomes a no-op when the overlay cannot be located.
 * @example
 * ```ts
 * updateHud({ health: { current: 5, max: 10 }, seed: { value: 314 } });
 * ```
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
 * @remarks
 * Lazily creates the game-over DOM nodes so the HUD only pays the setup cost once.
 *
 * @param seed - Deterministic seed associated with the current attempt.
 * @throws This function never throws; missing HUD overlay simply short-circuits the update.
 * @example
 * ```ts
 * showGameOver({ value: 9001 });
 * ```
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

/**
 * Removes the game-over overlay so a restarted run presents the base HUD again.
 *
 * @remarks
 * Only mutates the DOM when the game-over container exists, keeping restarts idempotent when the
 * overlay has not been shown yet.
 *
 * @throws This function never throws; it silently returns when the overlay cannot be found.
 * @example
 * ```ts
 * hideGameOver();
 * ```
 */
export function hideGameOver(): void {
  const overlay = document.querySelector<HTMLElement>('[data-hud-layer="overlay"]');
  if (!overlay) {
    return;
  }

  const container = overlay.querySelector<HTMLElement>('[data-hud-game-over="true"]');
  if (container) {
    overlay.removeChild(container);
  }
}
