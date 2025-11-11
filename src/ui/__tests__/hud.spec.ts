/**
 * @fileoverview HUD module tests.
 */
import { afterEach, beforeEach, describe, it, vi } from 'vitest';

import { createHud, hideGameOver, showGameOver, updateHud } from '../hud';
import { setupBrowserEnv } from '../../shared/testing/setup-browser-env';

let cleanup: (() => void) | undefined;

/**
 * Seeds a fresh jsdom window and HUD root before each test case.
 *
 * Returns:
 *   Promise<void>: Resolves when the browser environment is initialised.
 */
beforeEach(async () => {
  const env = await setupBrowserEnv();
  cleanup = env.cleanup;
  document.body.innerHTML = '<div id="hud-root"></div>';
});

/**
 * Resets the DOM and restores mocks plus environment bindings after each test.
 *
 * Returns:
 *   void: Always completes synchronously without a return value.
 */
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  cleanup?.();
  cleanup = undefined;
});

describe('createHud', () => {
  it('initialises the overlay container and returns the base state', () => {
    const rootElement = document.querySelector<HTMLDivElement>('#hud-root');
    expect(rootElement).not.toBeNull();
    const root = rootElement as HTMLDivElement;

    const state = createHud(root);

    expect(state).toStrictEqual({
      health: { current: 0, max: 0 },
      seed: { value: 0 },
      sprite: {
        palette: {
          base: '#000000',
          trim: '#000000',
          highlight: '#000000',
          outline: '#000000',
        },
        features: [],
      },
    });

    expect(root.dataset.hudReady).toBe('true');
    expect(root.childElementCount).toBe(1);

    const overlayElement = root.querySelector<HTMLElement>('[data-hud-layer="overlay"]');
    expect(overlayElement).not.toBeNull();
    const overlay = overlayElement as HTMLElement;

    expect(root.firstElementChild).toBe(overlay);
    expect(overlay.className).toBe('hud-overlay');

    const rows = Array.from(overlay.children) as HTMLElement[];
    expect(rows).toHaveLength(4);

    const [healthRow, seedRow, paletteRow, spriteRow] = rows;
    expect(healthRow.className).toBe('hud-row hud-row--status');
    const healthLabel = healthRow.querySelector('.hud-label');
    expect(healthLabel?.textContent).toBe('HP');
    const healthValue = healthRow.querySelector<HTMLElement>('[data-hud-health="true"]');
    expect(healthValue?.textContent).toBe('0 / 0');
    expect(healthValue?.dataset.hudHealth).toBe('true');

    expect(seedRow.className).toBe('hud-row hud-row--seed');
    const seedLabel = seedRow.querySelector('.hud-label');
    expect(seedLabel?.textContent).toBe('Seed');
    const seedValue = seedRow.querySelector<HTMLElement>('[data-hud-seed="true"]');
    expect(seedValue?.textContent).toBe('0');
    expect(seedValue?.dataset.hudSeed).toBe('true');

    expect(paletteRow.className).toBe('hud-row hud-row--palette');
    const paletteLabel = paletteRow.querySelector('.hud-label');
    expect(paletteLabel?.textContent).toBe('Palette');
    const paletteContainer = paletteRow.querySelector<HTMLElement>('[data-hud-palette="true"]');
    expect(paletteContainer?.children).toHaveLength(4);

    expect(spriteRow.className).toBe('hud-row hud-row--sprite');
    const spriteLabel = spriteRow.querySelector('.hud-label');
    expect(spriteLabel?.textContent).toBe('Sprite');
    const spriteValue = spriteRow.querySelector<HTMLElement>('[data-hud-sprite-features="true"]');
    expect(spriteValue?.textContent).toBe('—');
  });
});

describe('updateHud', () => {
  it('renders the latest health and seed values', () => {
    const rootElement = document.querySelector<HTMLDivElement>('#hud-root');
    expect(rootElement).not.toBeNull();
    const root = rootElement as HTMLDivElement;

    createHud(root);

    const healthValue = root.querySelector<HTMLElement>('[data-hud-health="true"]');
    const seedValue = root.querySelector<HTMLElement>('[data-hud-seed="true"]');
    expect(healthValue?.textContent).toBe('0 / 0');
    expect(seedValue?.textContent).toBe('0');

    updateHud({
      health: { current: 12, max: 34 },
      seed: { value: 98765 },
      sprite: {
        palette: {
          base: '#123456',
          trim: '#654321',
          highlight: '#abcdef',
          outline: '#fedcba',
        },
        features: ['visor:mono', 'antenna'],
      },
    });

    expect(healthValue?.textContent).toBe('12 / 34');
    expect(seedValue?.textContent).toBe('98765');

    const paletteChips = root.querySelectorAll<HTMLElement>(
      '[data-hud-palette="true"] [data-hud-palette-color]',
    );
    expect(paletteChips).toHaveLength(4);
    expect(Array.from(paletteChips).map((chip) => chip.textContent)).toEqual([
      '#123456',
      '#654321',
      '#abcdef',
      '#fedcba',
    ]);
    const spriteValue = root.querySelector<HTMLElement>('[data-hud-sprite-features="true"]');
    expect(spriteValue?.textContent).toBe('visor:mono, antenna');
  });
});

describe('showGameOver', () => {
  it('reveals the game-over overlay, including seed and instructions', () => {
    const rootElement = document.querySelector<HTMLDivElement>('#hud-root');
    expect(rootElement).not.toBeNull();
    const root = rootElement as HTMLDivElement;

    createHud(root);

    const overlay = root.querySelector<HTMLElement>('[data-hud-layer="overlay"]');
    expect(overlay).not.toBeNull();

    const seed = { value: 4242 };
    showGameOver(seed);

    const container = overlay?.querySelector<HTMLElement>('[data-hud-game-over="true"]');
    expect(container).not.toBeNull();
    expect(container?.className).toBe('hud-row hud-row--game-over');

    const title = container?.querySelector<HTMLElement>('[data-hud-game-over-title="true"]');
    expect(title?.textContent).toBe(`Game Over — Seed ${seed.value}`);

    const instructions = container?.querySelector<HTMLElement>(
      '[data-hud-game-over-instructions="true"]',
    );
    expect(instructions?.textContent).toBe('Press R to restart');

    expect(overlay?.lastElementChild).toBe(container);
  });
});

describe('hideGameOver', () => {
  it('removes the game-over overlay when present', () => {
    const rootElement = document.querySelector<HTMLDivElement>('#hud-root');
    expect(rootElement).not.toBeNull();
    const root = rootElement as HTMLDivElement;

    createHud(root);

    const overlay = root.querySelector<HTMLElement>('[data-hud-layer="overlay"]');
    expect(overlay).not.toBeNull();

    const seed = { value: 1010 };
    showGameOver(seed);

    let container = overlay?.querySelector<HTMLElement>('[data-hud-game-over="true"]');
    expect(container).not.toBeNull();

    hideGameOver();

    container = overlay?.querySelector<HTMLElement>('[data-hud-game-over="true"]');
    expect(container).toBeNull();
    expect(overlay?.childElementCount).toBe(4);
  });
});
