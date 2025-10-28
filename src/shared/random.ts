/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Numeric seed used to initialize deterministic random number generators.
 */
export type Seed = number;

/**
 * Interface for deterministic RNG instances used across the simulation runtime.
 */
export interface RNG {
  next(): number;
  nextFloat(): number;
  nextInt(min: number, max: number): number;
}

/**
 * Wrapper for storing the campaign or run seed.
 */
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

/**
 * Builds a Mulberry32 RNG that exposes deterministic iteration over 32-bit integers.
 *
 * @param seed Unsigned 32-bit seed that initializes the Mulberry32 state.
 * @return RNG instance bound to the provided seed.
 */
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

/**
 * Executes a consumer with a temporary Mulberry32 RNG seeded deterministically.
 *
 * @param seed Deterministic seed used to initialize the RNG.
 * @param consumer Callback that receives a seeded RNG instance.
 * @return Result returned by the consumer callback.
 */
export function withSeed<T>(seed: Seed, consumer: (rng: RNG) => T): T {
  return consumer(createMulberry32(seed));
}

/**
 * Creates a new RNG that mirrors the state of the provided instance.
 *
 * @param rng RNG instance to clone. Must be created via {@link createMulberry32}.
 * @return New RNG that continues from the same deterministic state.
 * @throws Error when the RNG does not expose clone metadata.
 */
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
