import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialSeed } from '../main';

describe('createInitialSeed', () => {
  let originalCryptoDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto') ?? undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
    } else {
      delete (globalThis as { crypto?: Crypto }).crypto;
    }
  });

  it('samples a 32-bit value via Web Crypto when available', () => {
    const getRandomValues = vi.fn((buffer: Uint32Array) => {
      buffer[0] = 0xdeadbeef;
      return buffer;
    });

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: { getRandomValues } as unknown as Crypto,
    });

    const seed = createInitialSeed();

    expect(seed.value).toBe(0xdeadbeef >>> 0);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it('falls back to timestamp/random mixing when Web Crypto is unavailable', () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: undefined,
    });

    const nowValue = 0x1234abcd;
    const randomValue = 0.25;

    vi.spyOn(Date, 'now').mockReturnValue(nowValue);
    vi.spyOn(Math, 'random').mockReturnValue(randomValue);

    const seed = createInitialSeed();
    const expected = (nowValue ^ Math.floor(randomValue * 0xffffffff)) >>> 0;

    expect(seed.value).toBe(expected);
  });
});
