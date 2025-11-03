/**
 * @fileoverview Bridges ESM-only parse5 into CommonJS consumers.
 *
 * Vitest still loads jsdom in CommonJS mode, which attempts to `require('parse5')`.
 * parse5 v8 ships as pure ESM, so we eagerly import it and seed Node's module cache
 * with the module exports to keep jsdom (and other CJS consumers) working.
 */
import * as Module from 'node:module';

const require = Module.createRequire(import.meta.url);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

try {
  const parse5Specifier = require.resolve('parse5');
  const loadedModule: unknown = await import(parse5Specifier);

  if (!isRecord(loadedModule)) {
    throw new Error('parse5 exports unexpectedly resolved to a non-object module');
  }

  const moduleExports: Record<string, unknown> = { ...loadedModule };
  const potentialDefault = (loadedModule as { default?: unknown }).default;

  if (isRecord(potentialDefault)) {
    for (const [key, value] of Object.entries(potentialDefault)) {
      if (!(key in moduleExports)) {
        moduleExports[key] = value;
      }
    }
  } else if (typeof potentialDefault !== 'undefined') {
    moduleExports.default = potentialDefault;
  }

  // Seed the CommonJS module cache so `require('parse5')` returns the ESM exports.
  const shimModule = new Module.Module(parse5Specifier);
  shimModule.filename = parse5Specifier;
  shimModule.paths = require.resolve.paths('parse5') ?? [];
  shimModule.exports = moduleExports;
  shimModule.loaded = true;

  require.cache[parse5Specifier] = shimModule;
} catch (error) {
  // When parse5 is unavailable we surface a clearer diagnostic for follow-up.
  const message =
    error instanceof Error ? error.message : 'Unknown error while preparing parse5 shim';
  throw new Error(`Failed to prepare parse5 shim for Vitest: ${message}`);
}
