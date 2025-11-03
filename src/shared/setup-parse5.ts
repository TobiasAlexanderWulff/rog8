/**
 * @fileoverview Bridges ESM-only parse5 into CommonJS consumers.
 *
 * Vitest still loads jsdom in CommonJS mode, which attempts to `require('parse5')`.
 * parse5 v8 ships as pure ESM, so we eagerly import it and seed Node's module cache
 * with the module exports to keep jsdom (and other CJS consumers) working.
 */
import { ensureParse5ForCommonJS } from './parse5-shim';

await ensureParse5ForCommonJS();
