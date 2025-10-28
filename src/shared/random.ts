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

const RNG_META = Symbol('rngMeta');

type Mulberry32Meta = {
  type: 'mulberry32';
  getState(): number;
};

type TaggedRng = RNG & {
  [RNG_META]?: Mulberry32Meta;
};

export function createMulberry32(seed: Seed): RNG {
  const stateRef = { value: seed >>> 0 };

  const nextUint32 = (): number => {
    stateRef.value = (stateRef.value + 0x6d2b79f5) >>> 0;
    let t = stateRef.value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };

  const rng: TaggedRng = {
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

  Object.defineProperty(rng, RNG_META, {
    value: {
      type: 'mulberry32',
      getState: () => stateRef.value,
    } as Mulberry32Meta,
  });

  return rng;
}

export function withSeed<T>(seed: Seed, consumer: (rng: RNG) => T): T {
  return consumer(createMulberry32(seed));
}

export function cloneRng(rng: RNG): RNG {
  const meta = (rng as TaggedRng)[RNG_META];
  if (!meta) {
    throw new Error('Unsupported RNG clone');
  }

  if (meta.type === 'mulberry32') {
    return createMulberry32(meta.getState());
  }

  throw new Error(`Unsupported RNG type: ${meta.type}`);
}
