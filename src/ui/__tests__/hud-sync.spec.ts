import { beforeEach, describe, expect, it, vi } from 'vitest';
import { World } from '../../engine/world';
import type { HudState } from '../hud';
import type { RunSeed } from '../../shared/random';
import type { HealthComponent, PlayerComponent } from '../../engine/components';
import { HEALTH_COMPONENT_KEY, PLAYER_COMPONENT_KEY, readPlayerHealth, syncHud } from '../hud-sync';

vi.mock('../hud', () => ({
  updateHud: vi.fn(),
}));

import { updateHud } from '../hud';

/**
 * Creates a deterministic HUD state fixture for tests.
 *
 * @remarks
 * Keeps the default values in sync with {@link createHud} so assertions compare against the same
 * baseline the DOM overlay expects.
 */
function createHudState(): HudState {
  return {
    health: { current: 0, max: 0 },
    seed: { value: 0 },
  };
}

/**
 * Builds a world instance that hosts a single player entity and health component.
 *
 * @remarks
 * Mirrors the component registration order used during runtime bootstrap to exercise
 * {@link readPlayerHealth} and {@link syncHud} under realistic conditions.
 *
 * @param health - Health component snapshot to attach to the player entity.
 * @returns Configured world with a player entity and health.
 */
function createWorldWithPlayer(health: HealthComponent): World {
  const world = new World();
  world.registerComponentStore(PLAYER_COMPONENT_KEY);
  world.registerComponentStore(HEALTH_COMPONENT_KEY);
  const player = world.createEntity();
  world.addComponent(player, PLAYER_COMPONENT_KEY, { name: 'Player' } satisfies PlayerComponent);
  world.addComponent(player, HEALTH_COMPONENT_KEY, health);
  return world;
}

describe('readPlayerHealth', () => {
  it('returns undefined when the player store is missing', () => {
    const world = new World();
    expect(readPlayerHealth(world)).toBeUndefined();
  });

  it('returns undefined when no player entity exists', () => {
    const world = new World();
    world.registerComponentStore(PLAYER_COMPONENT_KEY);
    expect(readPlayerHealth(world)).toBeUndefined();
  });

  it('returns player health when available', () => {
    const health: HealthComponent = { current: 3, max: 5 };
    const world = createWorldWithPlayer(health);
    expect(readPlayerHealth(world)).toEqual(health);
  });
});

describe('syncHud', () => {
  const seed: RunSeed = { value: 42 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the HUD with the latest player health and seed', () => {
    const hudState = createHudState();
    const world = createWorldWithPlayer({ current: 4, max: 7 });

    const result = syncHud(world, hudState, seed);

    expect(result).toBe(false);
    expect(hudState.health).toEqual({ current: 4, max: 7 });
    expect(hudState.seed.value).toBe(42);
    expect(updateHud).toHaveBeenCalledWith(hudState);
  });

  it('returns true when the player health reaches zero', () => {
    const hudState = createHudState();
    const world = createWorldWithPlayer({ current: 0, max: 7 });

    const result = syncHud(world, hudState, seed);

    expect(result).toBe(true);
    expect(updateHud).toHaveBeenCalledWith(hudState);
  });

  it('only updates the seed when the player is absent', () => {
    const hudState = createHudState();
    const world = new World();

    const result = syncHud(world, hudState, seed);

    expect(result).toBe(false);
    expect(hudState.health).toEqual({ current: 0, max: 0 });
    expect(hudState.seed.value).toBe(42);
    expect(updateHud).toHaveBeenCalledWith(hudState);
  });
});
