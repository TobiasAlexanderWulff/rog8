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

/**
 * Metadata attached to RNG instances so implementations can expose cloning hooks.
 *
 * @property type Unique identifier of the RNG algorithm.
 */
type RngMeta = {
  type: string;
};

/**
 * Mulberry32-specific metadata exposed via {@link RNG_META}.
 *
 * @property type Literal discriminator for Mulberry32 RNGs.
 * @property getState Function that retrieves the current internal state.
 */
type Mulberry32Meta = RngMeta & {
  type: 'mulberry32';
  getState(): number;
};

/**
 * RNG instances tagged with optional metadata needed for safe cloning.
 */
type TaggedRng = RNG & {
  [RNG_META]?: RngMeta;
};

/**
 * Type guard that narrows metadata to the Mulberry32 implementation.
 *
 * Args:
 *   meta (RngMeta): Metadata attached to an RNG instance.
 *
 * Returns:
 *   boolean: True when the metadata references a Mulberry32 RNG.
 */
function isMulberry32Meta(meta: RngMeta): meta is Mulberry32Meta {
  return meta.type === 'mulberry32';
}

/**
 * Builds a Mulberry32 RNG that exposes deterministic iteration over 32-bit integers.
 *
 * Args:
 *   seed (Seed): Unsigned 32-bit seed that initializes the Mulberry32 state.
 *
 * Returns:
 *   RNG: Instance bound to the provided seed.
 */
export function createMulberry32(seed: Seed): RNG {
  // Track the unsigned 32-bit state in a closure so we can expose cloning hooks.
  const stateRef = { value: seed >>> 0 };

  // Core Mulberry32 step that advances the state and returns a new u32 sample.
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
      // NOTE: Modulo reduction introduces slight bias when span does not divide 2^32 evenly.
      const span = max - min + 1;
      return min + (nextUint32() % span);
    },
  };

  Object.defineProperty(rng, RNG_META, {
    value: {
      type: 'mulberry32',
      getState: () => stateRef.value,
    } satisfies Mulberry32Meta,
  });

  return rng;
}

/**
 * Executes a consumer with a temporary Mulberry32 RNG seeded deterministically.
 *
 * Args:
 *   seed (Seed): Deterministic seed used to initialize the RNG.
 *   consumer ((rng: RNG) => T): Callback that receives a seeded RNG instance.
 *
 * Returns:
 *   T: Result returned by the consumer callback.
 */
export function withSeed<T>(seed: Seed, consumer: (rng: RNG) => T): T {
  return consumer(createMulberry32(seed));
}

/**
 * Creates a new RNG that mirrors the state of the provided instance.
 *
 * Args:
 *   rng (RNG): RNG instance to clone. Must be created via {@link createMulberry32}.
 *
 * Returns:
 *   RNG: New RNG that continues from the same deterministic state.
 *
 * Throws:
 *   Error: When the RNG does not expose clone metadata.
 */
export function cloneRng(rng: RNG): RNG {
  const meta = (rng as TaggedRng)[RNG_META];
  if (!meta) {
    throw new Error('Unsupported RNG clone');
  }

  if (!isMulberry32Meta(meta)) {
    throw new Error(`Unsupported RNG type: ${meta.type}`);
  }

  return createMulberry32(meta.getState());
}
