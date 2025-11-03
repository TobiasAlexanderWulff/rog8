/**
 * @fileoverview Utilities to expose the ESM-only parse5 module to CommonJS consumers.
 */
import * as Module from 'node:module';

const rootRequire = Module.createRequire(import.meta.url);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let prepared = false;

/**
 * Ensures that requiring `parse5` from CommonJS returns the ESM exports.
 */
export const ensureParse5ForCommonJS = async (): Promise<void> => {
  if (prepared) {
    return;
  }
  prepared = true;

  try {
    const jsdomPackagePath = rootRequire.resolve('jsdom/package.json');
    const jsdomRequire = Module.createRequire(jsdomPackagePath);
    const parse5Specifier = jsdomRequire.resolve('parse5');
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

    const shimModule = new Module.Module(parse5Specifier);
    shimModule.filename = parse5Specifier;
    const lookupPaths =
      jsdomRequire.resolve.paths('parse5') ?? rootRequire.resolve.paths('parse5') ?? [];
    shimModule.paths = lookupPaths;
    shimModule.exports = moduleExports;
    shimModule.loaded = true;

    rootRequire.cache[parse5Specifier] = shimModule;
  } catch (error) {
    prepared = false;
    const message =
      error instanceof Error ? error.message : 'Unknown error while preparing parse5 shim';
    throw new Error(`Failed to prepare parse5 shim for Vitest: ${message}`);
  }
};
