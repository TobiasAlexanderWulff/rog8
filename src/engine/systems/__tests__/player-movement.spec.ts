import { describe, expect, it, vi } from 'vitest';
import { InputManager } from '../../input';
import { World, type ResourceKey } from '../../world';
import {
  playerMovementSystem,
  registerPlayerMovementSystem,
  type PlayerMovementOptions,
} from '../player-movement';

describe('registerPlayerMovementSystem', () => {
  it('registers the movement system and shared options on the world', () => {
    const world = new World();
    const optionsKey = 'system.player-movement.options' as ResourceKey<PlayerMovementOptions>;
    const initialOptions: PlayerMovementOptions = {
      input: new InputManager(),
      speedScalar: 1,
      acceleration: 2,
    };
    const nextOptions: PlayerMovementOptions = {
      input: new InputManager(),
      speedScalar: 6,
      acceleration: 3,
    };

    world.registerResource(optionsKey, initialOptions);

    const removeResourceSpy = vi.spyOn(world, 'removeResource');
    const registerResourceSpy = vi.spyOn(world, 'registerResource');
    const addSystemSpy = vi.spyOn(world, 'addSystem');

    registerPlayerMovementSystem(world, nextOptions);

    expect(removeResourceSpy).toHaveBeenCalledTimes(1);
    expect(removeResourceSpy).toHaveBeenCalledWith(optionsKey);
    expect(registerResourceSpy).toHaveBeenCalledTimes(1);
    expect(registerResourceSpy).toHaveBeenCalledWith(optionsKey, nextOptions);
    expect(removeResourceSpy.mock.invocationCallOrder[0]).toBeLessThan(
      registerResourceSpy.mock.invocationCallOrder[0],
    );
    expect(addSystemSpy).toHaveBeenCalledTimes(1);
    expect(addSystemSpy).toHaveBeenCalledWith(playerMovementSystem);
    expect(world.getResource(optionsKey)).toBe(nextOptions);
  });
});

describe('playerMovementSystem', () => {
  it('exits early when required resources are missing', () => {
    // TODO: implement after setting up component/resource stores
  });

  it('applies desired velocity instantly when no acceleration cap is set', () => {
    // TODO: calculate expected velocity with an unbounded acceleration scalar
  });

  it('smooths velocity changes when an acceleration cap is provided', () => {
    // TODO: verify gradual velocity adjustments based on delta time
  });

  it('updates transform position using the resolved velocity', () => {
    // TODO: assert positional integration based on final velocity
  });
});
