/**
 * @fileoverview Unit tests for deterministic RNG helpers.
 */
// TODO: Replace manual test type declarations once shared test environment is wired up.
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;

import { cloneRng, createMulberry32, withSeed } from '../random';

/**
 * Test suite covering deterministic RNG functionality in src/shared/random.ts.
 */
describe('random utilities', () => {
  /**
   * Ensures repeated seeding yields reproducible sequences.
   */
  it('should produce deterministic sequences for the same seed', () => {
    const seed = 0xdeadbeef;
    const drawCount = 16;
    const first = createMulberry32(seed);
    const second = createMulberry32(seed);

    for (let i = 0; i < drawCount; i += 1) {
      const nextA = first.next();
      const nextB = second.next();
      if (nextA !== nextB) {
        throw new Error(`Expected identical outputs for identical seeds at iteration ${i}`);
      }
    }
  });

  /**
   * Confirms cloning maintains the original RNG progression.
   */
  it('should clone RNG state and continue the sequence identically', () => {
    const seed = 0x12345678;
    const original = createMulberry32(seed);
    const warmupDraws = 12;

    for (let i = 0; i < warmupDraws; i += 1) {
      original.next();
    }

    const clone = cloneRng(original);
    const compareCount = 24;

    for (let i = 0; i < compareCount; i += 1) {
      const originalValue = original.next();
      const cloneValue = clone.next();
      if (originalValue !== cloneValue) {
        throw new Error(
          `Cloned RNG diverged at iteration ${i}; expected ${originalValue} but received ${cloneValue}`,
        );
      }
    }
  });

  /**
   * Verifies seeded execution passes deterministic RNG instances to consumers.
   */
  it('should supply seeded RNG instances to consumers', () => {
    const seed = 0xbaadf00d;
    const drawCount = 16;

    const firstSequence = withSeed(seed, (rng) => {
      const values: number[] = [];
      for (let i = 0; i < drawCount; i += 1) {
        values.push(rng.next());
      }
      return values;
    });

    const secondSequence = withSeed(seed, (rng) => {
      const values: number[] = [];
      for (let i = 0; i < drawCount; i += 1) {
        values.push(rng.next());
      }
      return values;
    });

    for (let i = 0; i < drawCount; i += 1) {
      if (firstSequence[i] !== secondSequence[i]) {
        throw new Error(
          `Expected deterministic output for draw ${i}; received ${firstSequence[i]} vs ${secondSequence[i]}`,
        );
      }
    }
  });
});
