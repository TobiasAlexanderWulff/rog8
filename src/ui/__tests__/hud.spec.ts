/**
 * @fileoverview HUD module tests.
 */
import { afterEach, beforeEach, describe, it, vi } from 'vitest';

import { createHud, showGameOver, updateHud } from '../hud';
import { setupBrowserEnv } from '../../shared/testing/setup-browser-env';

let cleanup: (() => void) | undefined;

beforeEach(async () => {
  const env = await setupBrowserEnv();
  cleanup = env.cleanup;
  document.body.innerHTML = '<div id="hud-root"></div>';
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('createHud', () => {
  it('initialises the overlay container and returns the base state', () => {
    // TODO: Assert DOM structure and initial state snapshot once HUD layout is stable.
    void createHud;
  });
});

describe('updateHud', () => {
  it('renders the latest health and seed values', () => {
    // TODO: Seed DOM with HUD elements and verify text content updates after invoking updateHud.
    void updateHud;
  });
});

describe('showGameOver', () => {
  it('reveals the game-over overlay, including seed and instructions', () => {
    // TODO: Mount HUD overlay, trigger showGameOver, and validate copy once UX is final.
    void showGameOver;
  });
});
