/**
 * @fileoverview Verifies the RunController lifecycle hooks, deterministic timing loop,
 * and world orchestration by simulating representative run states.
 */
import { describe, expect, it, vi } from 'vitest';
import { RunController, type RunState } from '../run-controller';
import { World, type ResourceKey } from '../world';
import { InputManager, type FrameInputState, type KeyBinding } from '../input';
import { createMulberry32 } from '../../shared/random';
import type {
  ComponentKey,
  HealthComponent,
  PlayerComponent,
  TransformComponent,
  VelocityComponent,
} from '../components';
import { createEnemyComponent, type EnemyComponent } from '../../combat/enemy';

function simulateKeyPress(manager: InputManager, key: KeyBinding, frame: number): void {
  const internals = manager as unknown as {
    pressedFrames: Map<KeyBinding, number>;
    frameState: FrameInputState;
  };
  internals.pressedFrames.set(key, frame);
  internals.frameState.frame = frame;
}

describe('RunController', () => {
  /**
   * Ensures the constructor fails fast when timing configuration lacks a positive step value.
   *
   * @returns {void}
   */
  it('throws when constructed with a non-positive target delta', () => {
    const world = new World();
    const input = new InputManager();
    const options = {
      targetDeltaMs: 0,
      seed: { value: 1234 },
    };

    expect(() => new RunController(world, input, options)).toThrowError(
      'RunController requires a positive target delta.',
    );
  });

  /**
   * Confirms that invoking start seeds all canonical entities and injects core resources.
   *
   * @returns {void}
   */
  it('spawns core entities and registers resources on start', () => {
    const world = new World();
    const input = new InputManager();
    const controller = new RunController(world, input, {
      targetDeltaMs: 16,
      seed: { value: 123 },
    });

    controller.start();

    const inputResourceKey = 'engine.input-manager' as ResourceKey<InputManager>;
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const velocityKey = 'component.velocity' as ComponentKey<VelocityComponent>;
    const healthKey = 'component.health' as ComponentKey<HealthComponent>;
    const playerKey = 'component.player' as ComponentKey<PlayerComponent>;
    const enemyKey = 'component.enemy' as ComponentKey<EnemyComponent>;

    expect(world.getResource(inputResourceKey)).toBe(input);

    const playerId = 1;
    expect(world.getComponent(playerId, transformKey)).toEqual({ x: 0, y: 0 });
    expect(world.getComponent(playerId, velocityKey)).toEqual({ vx: 0, vy: 0 });
    expect(world.getComponent(playerId, healthKey)).toEqual({ current: 5, max: 5 });
    expect(world.getComponent(playerId, playerKey)).toEqual({ name: 'Player' });

    const enemyId = 2;
    expect(world.getComponent(enemyId, transformKey)).toEqual({ x: 5, y: 5 });
    expect(world.getComponent(enemyId, healthKey)).toEqual({ current: 1, max: 1 });
    expect(world.getComponent(enemyId, enemyKey)).toEqual(createEnemyComponent('grunt'));
  });

  it('ignores subsequent start calls after entering the playing state', () => {
    const world = new World();
    const input = new InputManager();
    const controller = new RunController(world, input, {
      targetDeltaMs: 16,
      seed: { value: 987 },
    });

    controller.start();

    // Capture the initial game state so a redundant start call can be compared against it.
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const velocityKey = 'component.velocity' as ComponentKey<VelocityComponent>;
    const healthKey = 'component.health' as ComponentKey<HealthComponent>;
    const playerKey = 'component.player' as ComponentKey<PlayerComponent>;
    const enemyKey = 'component.enemy' as ComponentKey<EnemyComponent>;

    const transformSnapshot = world.getComponentStore(transformKey)?.entries() ?? [];
    const velocitySnapshot = world.getComponentStore(velocityKey)?.entries() ?? [];
    const healthSnapshot = world.getComponentStore(healthKey)?.entries() ?? [];
    const playerSnapshot = world.getComponentStore(playerKey)?.entries() ?? [];
    const enemySnapshot = world.getComponentStore(enemyKey)?.entries() ?? [];

    controller.start();

    expect(world.getComponentStore(transformKey)?.entries()).toEqual(transformSnapshot);
    expect(world.getComponentStore(velocityKey)?.entries()).toEqual(velocitySnapshot);
    expect(world.getComponentStore(healthKey)?.entries()).toEqual(healthSnapshot);
    expect(world.getComponentStore(playerKey)?.entries()).toEqual(playerSnapshot);
    expect(world.getComponentStore(enemyKey)?.entries()).toEqual(enemySnapshot);

    expect(world.getComponent(3, transformKey)).toBeUndefined();
  });

  /**
   * Verifies that the fixed-time accumulator only advances the world once the threshold is met.
   *
   * @returns {void}
   */
  it('advances the world when enough time accrues in the accumulator', () => {
    const targetDeltaMs = 16;
    const seed = 4242;
    const world = new World();
    const input = new InputManager();
    const controller = new RunController(world, input, {
      targetDeltaMs,
      seed: { value: seed },
    });

    controller.start();

    const updateSpy = vi.spyOn(world, 'update');

    controller.update(targetDeltaMs / 2);
    expect(updateSpy).not.toHaveBeenCalled();

    controller.update(targetDeltaMs / 2);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    const [firstContext] = updateSpy.mock.calls[0];
    expect(firstContext.delta).toBe(targetDeltaMs);
    expect(firstContext.frame).toBe(0);

    const expectedRng = createMulberry32(seed);
    expect(firstContext.rng.nextFloat()).toBeCloseTo(expectedRng.nextFloat());

    controller.update(targetDeltaMs);
    expect(updateSpy).toHaveBeenCalledTimes(2);

    const [secondContext] = updateSpy.mock.calls[1];
    expect(secondContext.frame).toBe(1);
    expect(secondContext.delta).toBe(targetDeltaMs);
    expect(secondContext.rng).toBe(firstContext.rng);
    // Deterministic RNG reuse ensures systems remain reproducible across fixed updates.
    expect(secondContext.rng.nextInt(0, 100)).toBe(expectedRng.nextInt(0, 100));
  });

  /**
   * Checks that triggering game over transitions state and drains any partially accumulated time.
   *
   * @returns {void}
   */
  it('transitions to game over and flushes pending time when triggered', () => {
    const targetDeltaMs = 16;
    const world = new World();
    const input = new InputManager();
    const controller = new RunController(world, input, {
      targetDeltaMs,
      seed: { value: 5678 },
    });

    controller.start();

    const updateSpy = vi.spyOn(world, 'update');
    const internals = controller as unknown as { state: RunState; accumulator: number };

    controller.update(targetDeltaMs / 2);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(internals.accumulator).toBe(targetDeltaMs / 2);

    controller.triggerGameOver();

    expect(internals.state).toBe('game-over');
    expect(internals.accumulator).toBe(targetDeltaMs);

    controller.update(targetDeltaMs);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(internals.accumulator).toBe(targetDeltaMs);
  });

  it('resets to the initial state while preserving the original seed on restart', () => {
    const targetDeltaMs = 16;
    const seedValue = 31415;
    const world = new World();
    const input = new InputManager();
    const controller = new RunController(world, input, {
      targetDeltaMs,
      seed: { value: seedValue },
    });

    const inputResourceKey = 'engine.input-manager' as ResourceKey<InputManager>;
    const transformKey = 'component.transform' as ComponentKey<TransformComponent>;
    const internals = controller as unknown as {
      state: RunState;
      frame: number;
      accumulator: number;
    };
    const rngSamples: number[] = [];

    world.addSystem((_world, context) => {
      rngSamples.push(context.rng.nextInt(0, 1000));
    });

    controller.start();
    controller.update(targetDeltaMs);
    controller.triggerGameOver();

    expect(internals.state).toBe('game-over');
    const firstRunSamples = [...rngSamples];
    expect(firstRunSamples.length).toBeGreaterThan(0);

    controller.restart();

    expect(internals.state).toBe('init');
    expect(internals.frame).toBe(0);
    expect(internals.accumulator).toBe(0);
    expect(world.getResource(inputResourceKey)).toBe(input);
    expect(world.getComponent(1, transformKey)).toBeUndefined();

    rngSamples.length = 0;
    controller.start();
    controller.update(targetDeltaMs);

    expect(rngSamples).toEqual(firstRunSamples);
  });

  it('invokes lifecycle event hooks on game over and restart', () => {
    const targetDeltaMs = 16;
    const seedValue = 5150;
    const world = new World();
    const input = new InputManager();
    const onGameOver = vi.fn();
    const onRestart = vi.fn();

    const controller = new RunController(world, input, {
      targetDeltaMs,
      seed: { value: seedValue },
      events: {
        onGameOver,
        onRestart,
      },
    });

    controller.start();
    controller.triggerGameOver();

    expect(onGameOver).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith({ value: seedValue });

    controller.triggerGameOver();
    expect(onGameOver).toHaveBeenCalledTimes(1);

    controller.restart();

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('listens for restart input while in the game-over state', () => {
    const targetDeltaMs = 16;
    const seedValue = 9001;
    const world = new World();
    const input = new InputManager();
    const onRestart = vi.fn();

    const controller = new RunController(world, input, {
      targetDeltaMs,
      seed: { value: seedValue },
      events: { onRestart },
    });

    controller.start();
    controller.triggerGameOver();

    const internals = controller as unknown as { state: RunState; frame: number };
    expect(internals.state).toBe('game-over');

    simulateKeyPress(input, 'KeyR', internals.frame);
    controller.update(targetDeltaMs);

    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(internals.state).toBe('playing');
  });
});
