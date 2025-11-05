/**
 * Numeric seed used to initialize deterministic random number generators.
 *
 * @remarks
 * Seeds are treated as unsigned 32-bit values by RNG implementations to guarantee deterministic
 * wrapping behaviour.
 *
 * @example
 * ```ts
 * const seed: Seed = 0xdeadbeef;
 * ```
 */
export type Seed = number;

/**
 * Interface for deterministic RNG instances used across the simulation runtime.
 *
 * @remarks
 * All RNGs expose helpers for raw 32-bit samples, floating point [0, 1) values, and inclusive
 * integer ranges.
 *
 * @example
 * ```ts
 * const rng = createMulberry32(123);
 * const roll = rng.nextInt(1, 6);
 * ```
 */
export interface RNG {
  next(): number;
  nextFloat(): number;
  nextInt(min: number, max: number): number;
}

/**
 * Wrapper for storing the campaign or run seed.
 *
 * @remarks
 * Keeps the primitive seed value wrapped so it can be extended with metadata later without
 * changing call sites.
 *
 * @example
 * ```ts
 * const seed: RunSeed = { value: 7 };
 * ```
 */
export interface RunSeed {
  value: Seed;
}

const RNG_META = Symbol('rngMeta');

/**
 * Metadata attached to RNG instances so implementations can expose cloning hooks.
 *
 * @remarks
 * The metadata captures the RNG algorithm identifier so clone operations can dispatch to the
 * appropriate implementation.
 */
type RngMeta = {
  type: string;
};

/**
 * Mulberry32-specific metadata exposed via {@link RNG_META}.
 *
 * @remarks
 * Extends {@link RngMeta} with a state accessor so clones can resume from the same point in the
 * sequence.
 */
type Mulberry32Meta = RngMeta & {
  type: 'mulberry32';
  getState(): number;
};

/**
 * RNG instances tagged with optional metadata needed for safe cloning.
 *
 * @remarks
 * The metadata lives on a symbol to keep standard RNG method signatures uncluttered.
 */
type TaggedRng = RNG & {
  [RNG_META]?: RngMeta;
};

/**
 * Type guard that narrows metadata to the Mulberry32 implementation.
 *
 * @remarks
 * Ensures clone routines can access Mulberry32-specific helpers safely.
 *
 * @param meta - Metadata attached to an RNG instance.
 * @returns `true` when the metadata references a Mulberry32 RNG.
 * @throws This function never throws; it relies on a discriminator check.
 * @example
 * ```ts
 * const isMulberry = isMulberry32Meta({ type: 'mulberry32', getState: () => 0 });
 * ```
 */
function isMulberry32Meta(meta: RngMeta): meta is Mulberry32Meta {
  return meta.type === 'mulberry32';
}

/**
 * Builds a Mulberry32 RNG that exposes deterministic iteration over 32-bit integers.
 *
 * @remarks
 * Mulberry32 offers fast, non-cryptographic randomness suitable for gameplay systems that require
 * reproducibility.
 *
 * @param seed - Unsigned 32-bit seed that initializes the Mulberry32 state.
 * @returns RNG instance bound to the provided seed.
 * @throws This function never throws; the state initialisation is deterministic for any input.
 * @example
 * ```ts
 * const rng = createMulberry32(42);
 * console.log(rng.nextFloat());
 * ```
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
 * @remarks
 * Guarantees the consumer observes a fresh RNG instance whose state does not leak across calls.
 *
 * @param seed - Deterministic seed used to initialize the RNG.
 * @param consumer - Callback that receives a seeded RNG instance.
 * @returns Result returned by the consumer callback.
 * @throws This function never throws; it forwards any consumer exception transparently.
 * @example
 * ```ts
 * const result = withSeed(99, (rng) => rng.nextInt(1, 10));
 * ```
 */
export function withSeed<T>(seed: Seed, consumer: (rng: RNG) => T): T {
  return consumer(createMulberry32(seed));
}

/**
 * Creates a new RNG that mirrors the state of the provided instance.
 *
 * @remarks
 * Only RNGs produced by {@link createMulberry32} expose the required metadata for safe cloning.
 *
 * @param rng - RNG instance to clone. Must be created via {@link createMulberry32}.
 * @returns New RNG that continues from the same deterministic state.
 * @throws Error when the RNG does not expose clone metadata.
 * @example
 * ```ts
 * const rng = createMulberry32(123);
 * const clone = cloneRng(rng);
 * console.log(rng.next(), clone.next());
 * ```
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
