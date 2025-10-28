/* eslint-disable @typescript-eslint/no-unused-vars */

import { createMulberry32, RunSeed } from '../shared/random';
import { World, TickContext } from './world';
import { InputManager } from './input';

export type RunState = 'init' | 'playing' | 'game-over';

export interface RunControllerOptions {
  seed: RunSeed;
  targetDeltaMs: number;
}

export class RunController {
  private world: World;
  private input: InputManager;
  private state: RunState = 'init';
  private frame = 0;
  private seed: RunSeed;

  constructor(world: World, input: InputManager, options: RunControllerOptions) {
    // TODO: Store options and bootstrap initial state.
    this.world = world;
    this.input = input;
    this.seed = options.seed;
  }

  start(): void {
    // TODO: Transition into the playing state and spawn initial entities.
    this.state = 'playing';
  }

  update(delta: number): void {
    // TODO: Advance world ticks deterministically based on delta and stored seed.
    if (this.state !== 'playing') {
      return;
    }
    const rng = createMulberry32(this.seed.value);
    const context: TickContext = {
      delta,
      frame: this.frame++,
      rng,
    };
    this.world.update(context);
  }

  triggerGameOver(): void {
    // TODO: Handle transitions from playing to game-over state.
    this.state = 'game-over';
  }

  restart(): void {
    // TODO: Reset world/entities while keeping the original seed.
    this.frame = 0;
    this.state = 'init';
  }
}
