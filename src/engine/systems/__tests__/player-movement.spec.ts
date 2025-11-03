import { describe, expect, it, vi } from 'vitest';
import { InputManager, type KeyBinding } from '../../input';
import { World, type ResourceKey } from '../../world';
import {
  type ComponentKey,
  type PlayerComponent,
  type TransformComponent,
  type VelocityComponent,
} from '../../components';
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
    const world = new World();
    const optionsKey = 'system.player-movement.options' as ResourceKey<PlayerMovementOptions>;
    const context = {
      delta: 16,
      frame: 1,
      rng: {
        next: () => 0,
        nextFloat: () => 0,
        nextInt: () => 0,
      },
    };

    const getResourceSpy = vi.spyOn(world, 'getResource');
    const getComponentStoreSpy = vi.spyOn(world, 'getComponentStore');

    playerMovementSystem(world, context);

    expect(getResourceSpy).toHaveBeenCalledTimes(1);
    expect(getResourceSpy).toHaveBeenCalledWith(optionsKey);
    expect(getComponentStoreSpy).not.toHaveBeenCalled();

    getResourceSpy.mockClear();
    getComponentStoreSpy.mockClear();

    const options: PlayerMovementOptions = {
      input: new InputManager(),
      speedScalar: 1,
      acceleration: 0,
    };
    world.registerResource(optionsKey, options);

    const heldSpy = vi.spyOn(options.input, 'isHeld');
    const pressedSpy = vi.spyOn(options.input, 'isPressed');

    playerMovementSystem(world, context);

    expect(getResourceSpy).toHaveBeenCalledTimes(1);
    expect(getResourceSpy).toHaveBeenCalledWith(optionsKey);
    expect(getComponentStoreSpy).toHaveBeenCalledTimes(3);
    expect(heldSpy).not.toHaveBeenCalled();
    expect(pressedSpy).not.toHaveBeenCalled();
  });

  it('applies desired velocity instantly when no acceleration cap is set', () => {
    const world = new World();
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const velocityKey = 'component.velocity' as ComponentKey<VelocityComponent>;
    const playerKey = 'component.player' as ComponentKey<PlayerComponent>;
    const optionsKey = 'system.player-movement.options' as ResourceKey<PlayerMovementOptions>;

    world.registerComponentStore<TransformComponent>(transformKey);
    world.registerComponentStore<VelocityComponent>(velocityKey);
    world.registerComponentStore<PlayerComponent>(playerKey);

    const entity = world.createEntity();
    world.addComponent(entity, transformKey, { x: 0, y: 0 });
    world.addComponent(entity, velocityKey, { vx: 0, vy: 0 });
    world.addComponent(entity, playerKey, { name: 'hero' });

    const input = new InputManager();
    const isHeldSpy = vi
      .spyOn(input, 'isHeld')
      .mockImplementation((key: KeyBinding) => key === 'KeyD' || key === 'KeyS');
    const isPressedSpy = vi.spyOn(input, 'isPressed').mockReturnValue(false);

    const speedScalar = 6;
    world.registerResource(optionsKey, {
      input,
      speedScalar,
      acceleration: 0,
    });

    const context = {
      delta: 16,
      frame: 1,
      rng: {
        next: () => 0,
        nextFloat: () => 0,
        nextInt: () => 0,
      },
    };

    playerMovementSystem(world, context);

    const velocity = world.getComponent(entity, velocityKey);
    if (!velocity) {
      throw new Error('expected velocity component to be applied');
    }
    const expectedVelocity = speedScalar * Math.SQRT1_2;

    expect(velocity.vx).toBeCloseTo(expectedVelocity);
    expect(velocity.vy).toBeCloseTo(expectedVelocity);
    expect(isHeldSpy).toHaveBeenCalledWith('KeyD');
    expect(isHeldSpy).toHaveBeenCalledWith('KeyS');
    expect(isPressedSpy).toHaveBeenCalledTimes(6);
    expect(isPressedSpy).toHaveBeenNthCalledWith(1, 'ArrowUp');
    expect(isPressedSpy).toHaveBeenNthCalledWith(2, 'KeyW');
    expect(isPressedSpy).toHaveBeenNthCalledWith(3, 'ArrowDown');
    expect(isPressedSpy).toHaveBeenNthCalledWith(4, 'ArrowLeft');
    expect(isPressedSpy).toHaveBeenNthCalledWith(5, 'KeyA');
    expect(isPressedSpy).toHaveBeenNthCalledWith(6, 'ArrowRight');
  });

  it('smooths velocity changes when an acceleration cap is provided', () => {
    const world = new World();
    const optionsKey = 'system.player-movement.options' as ResourceKey<PlayerMovementOptions>;
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const velocityKey = 'component.velocity' as ComponentKey<VelocityComponent>;
    const playerKey = 'component.player' as ComponentKey<PlayerComponent>;

    world.registerComponentStore(transformKey);
    world.registerComponentStore(velocityKey);
    world.registerComponentStore(playerKey);

    const player = world.createEntity();
    world.addComponent(player, transformKey, { x: 0, y: 0 });
    world.addComponent(player, velocityKey, { vx: 0, vy: 0 });
    world.addComponent(player, playerKey, { name: 'hero' });

    const input = {
      isHeld: (key: KeyBinding) => key === 'ArrowRight',
      isPressed: () => false,
    } as unknown as InputManager;

    const acceleration = 0.005;
    world.registerResource(optionsKey, {
      input,
      speedScalar: 1,
      acceleration,
    });

    const rng = { next: () => 0, nextFloat: () => 0, nextInt: () => 0 };

    playerMovementSystem(world, { delta: 10, frame: 1, rng });

    const velocityAfterFirst = world.getComponent(player, velocityKey);
    expect(velocityAfterFirst?.vx).toBeDefined();
    expect(velocityAfterFirst?.vx).toBeCloseTo(acceleration * 10, 5);
    expect(velocityAfterFirst?.vy).toBe(0);

    const firstStep = velocityAfterFirst?.vx ?? 0;

    playerMovementSystem(world, { delta: 40, frame: 2, rng });

    const velocityAfterSecond = world.getComponent(player, velocityKey);
    expect(velocityAfterSecond?.vx).toBeDefined();
    expect(velocityAfterSecond?.vx).toBeCloseTo(firstStep + acceleration * 40, 5);
    expect(velocityAfterSecond?.vx).toBeLessThan(1);
    expect(velocityAfterSecond?.vy).toBe(0);
  });

  it('updates transform position using the resolved velocity', () => {
    const world = new World();
    const optionsKey = 'system.player-movement.options' as ResourceKey<PlayerMovementOptions>;
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const velocityKey = 'component.velocity' as ComponentKey<VelocityComponent>;
    const playerKey = 'component.player' as ComponentKey<PlayerComponent>;

    world.registerComponentStore(transformKey);
    world.registerComponentStore(velocityKey);
    world.registerComponentStore(playerKey);

    const player = world.createEntity();
    const transform: TransformComponent = { x: 3, y: 7 };
    const velocity: VelocityComponent = { vx: 0, vy: 0 };

    world.addComponent(player, transformKey, transform);
    world.addComponent(player, velocityKey, velocity);
    world.addComponent(player, playerKey, { name: 'hero' });

    const input = {
      isHeld: (key: KeyBinding) => key === 'KeyD',
      isPressed: () => false,
    } as unknown as InputManager;

    const delta = 20;
    const acceleration = 0.05;
    const speedScalar = 4;

    world.registerResource(optionsKey, {
      input,
      speedScalar,
      acceleration,
    });

    const rng = { next: () => 0, nextFloat: () => 0, nextInt: () => 0 };
    const startX = transform.x;
    const startY = transform.y;

    playerMovementSystem(world, { delta, frame: 1, rng });

    const resolvedVelocity = world.getComponent(player, velocityKey);
    const resolvedTransform = world.getComponent(player, transformKey);

    expect(resolvedVelocity).toBeDefined();
    expect(resolvedTransform).toBeDefined();

    const expectedVx = acceleration * delta;
    const expectedX = startX + expectedVx * delta;

    expect(resolvedVelocity?.vx).toBeCloseTo(expectedVx);
    expect(resolvedVelocity?.vy).toBe(0);
    expect(resolvedTransform?.x).toBeCloseTo(expectedX);
    expect(resolvedTransform?.y).toBe(startY);
  });
});
