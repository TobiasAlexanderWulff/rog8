/* eslint-disable @typescript-eslint/no-unused-vars */

export type Seed = number;

export interface RNG {
  next(): number;
  nextFloat(): number;
  nextInt(min: number, max: number): number;
}

export interface RunSeed {
  value: Seed;
}

export function createMulberry32(seed: Seed): RNG {
  let state = seed >>> 0;

  const nextUint32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };

  return {
    next(): number {
      return nextUint32();
    },
    nextFloat(): number {
      return nextUint32() / 0x100000000;
    },
    nextInt(min: number, max: number): number {
      if (max < min) {
        const tmp = min;
        min = max;
        max = tmp;
      }
      const span = max - min + 1;
      return min + (nextUint32() % span);
    },
  };
}

export function withSeed<T>(seed: Seed, consumer: (rng: RNG) => T): T {
  return consumer(createMulberry32(seed));
}

export function cloneRng(rng: RNG): RNG {
  // TODO: Allow cloning RNG state so systems can fork deterministic streams.
  throw new Error('TODO: cloneRng not implemented yet');
}
