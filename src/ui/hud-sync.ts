import type { RunSeed } from '../shared/random';
import { updateHud, type HudState } from './hud';
import type { World } from '../engine/world';
import type { ComponentKey, HealthComponent, PlayerComponent } from '../engine/components';

/**
 * Component key used to reference the player marker within the ECS world.
 *
 * @remarks
 * The key mirrors the identifier registered by {@link RunController} to avoid implicit coupling.
 */
export const PLAYER_COMPONENT_KEY = 'component.player' as ComponentKey<PlayerComponent>;

/**
 * Component key used to resolve health data from the ECS world.
 *
 * @remarks
 * Shared with bootstrap routines so HUD synchronisation can converge on a consistent component id.
 */
export const HEALTH_COMPONENT_KEY = 'component.health' as ComponentKey<HealthComponent>;

/**
 * Retrieves the player's health component from the ECS world.
 *
 * @remarks
 * The helper assumes a single player entity; it returns the first entry found in the player
 * component store and gracefully handles worlds that have not spawned a player yet.
 *
 * @param world - ECS world whose player health should be read.
 * @returns Player health component when present; otherwise `undefined`.
 * @throws This function never throws; it returns `undefined` when the component is unavailable.
 * @example
 * ```ts
 * const health = readPlayerHealth(world);
 * if (health) {
 *   console.log(health.current);
 * }
 * ```
 */
export function readPlayerHealth(world: World): HealthComponent | undefined {
  const playerStore = world.getComponentStore(PLAYER_COMPONENT_KEY);
  if (!playerStore) {
    return undefined;
  }

  const entries = playerStore.entries();
  if (entries.length === 0) {
    return undefined;
  }

  const [playerId] = entries[0];
  return world.getComponent(playerId, HEALTH_COMPONENT_KEY);
}

/**
 * Synchronises the HUD state with the latest player health and current seed.
 *
 * @remarks
 * The function mutates the supplied HUD state object so callers can reuse the same reference across
 * frames, minimising allocations during the render loop.
 *
 * @param world - ECS world from which HUD data should be sourced.
 * @param hudState - Mutable HUD snapshot that mirrors the overlay.
 * @param seed - Deterministic seed associated with the current run.
 * @returns `true` when the player health is present and has reached zero.
 * @throws This function never throws; it skips updates when required components are missing.
 * @example
 * ```ts
 * const isGameOver = syncHud(world, hudState, seed);
 * if (isGameOver) {
 *   showGameOver(seed);
 * }
 * ```
 */
export function syncHud(world: World, hudState: HudState, seed: RunSeed): boolean {
  hudState.seed.value = seed.value;
  const playerHealth = readPlayerHealth(world);
  if (playerHealth) {
    hudState.health.current = playerHealth.current;
    hudState.health.max = playerHealth.max;
  }
  updateHud(hudState);
  return playerHealth?.current === 0;
}
