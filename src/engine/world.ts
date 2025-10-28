import type { RNG } from '../shared/random';

export interface TickContext {
  delta: number;
  frame: number;
  rng: RNG;
}

export type System = (world: World, context: TickContext) => void;

export interface Entity {
  id: number;
  // TODO: Attach component bags once ECS shape is decided.
}

export class World {
  private systems: System[] = [];
  private nextEntityId = 1;

  createEntity(): Entity {
    // TODO: Populate with component storage once ECS is in place.
    return { id: this.nextEntityId++ };
  }

  addSystem(system: System): void {
    // TODO: Enforce deterministic registration order if necessary.
    this.systems.push(system);
  }

  update(context: TickContext): void {
    // TODO: Iterate systems in deterministic order each tick.
    for (const system of this.systems) {
      system(this, context);
    }
  }
}
