/*
 * Supporting helper to bootstrap a jsdom-powered browser environment for tests.
 * The direct interaction with jsdom's window object requires a few unsafe accesses,
 * so we locally disable the corresponding lint checks.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { JSDOM } from 'jsdom';

import { ensureParse5ForCommonJS } from '../parse5-shim';

/**
 * Bundle of handles returned when a browser-like environment is set up for tests.
 *
 * @remarks
 * Exposes the jsdom window alongside a cleanup callback that restores any globals assigned during
 * setup.
 *
 * @example
 * ```ts
 * const env = await setupBrowserEnv();
 * env.cleanup();
 * ```
 */
export interface BrowserEnv {
  window: Window;
  cleanup: () => void;
}

/**
 * Tracks original global entries so they can be restored during cleanup.
 *
 * @remarks
 * Each assignment records the overwritten global value so cleanup can restore or delete it later.
 */
interface AssignedEntry {
  key: string;
  previous: unknown;
}

/**
 * Assigns a value onto the global object while recording prior state for later restoration.
 *
 * @remarks
 * Mutates the provided `entries` array so the caller can reverse assignments in LIFO order.
 *
 * @param entries - Mutable list that receives the captured assignment metadata.
 * @param key - Global field name to override.
 * @param value - Replacement value injected into the global scope.
 * @throws This function never throws; it mirrors property assignment on `globalThis`.
 * @example
 * ```ts
 * const entries: AssignedEntry[] = [];
 * assignGlobal(entries, 'fetch', () => Promise.resolve());
 * ```
 */
const assignGlobal = (entries: AssignedEntry[], key: string, value: unknown): void => {
  entries.push({ key, previous: (globalThis as Record<string, unknown>)[key] });
  (globalThis as Record<string, unknown>)[key] = value;
};

/**
 * Bootstraps a jsdom-driven browser environment and injects key globals for DOM-centric tests.
 *
 * @remarks
 * Ensures a compatible parse5 implementation is loaded, initialises jsdom, attaches browser-like
 * globals to `globalThis`, and returns handles for test cleanup.
 *
 * @param html - HTML skeleton used to initialise the document. Defaults to a blank page.
 * @returns Promise that resolves with the jsdom window handle and cleanup callback.
 * @throws Error when parse5 cannot be prepared or jsdom initialisation fails.
 * @example
 * ```ts
 * const { window, cleanup } = await setupBrowserEnv('<!DOCTYPE html><html></html>');
 * cleanup();
 * ```
 */
export const setupBrowserEnv = async (
  html = '<!DOCTYPE html><html><body></body></html>',
): Promise<BrowserEnv> => {
  await ensureParse5ForCommonJS();

  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    url: 'http://localhost/',
  });

  const { window } = dom;
  const typedWindow = window;

  const assignedEntries: AssignedEntry[] = [];
  assignGlobal(assignedEntries, 'window', typedWindow);
  assignGlobal(assignedEntries, 'document', window.document);
  assignGlobal(assignedEntries, 'Event', typedWindow.Event);
  assignGlobal(assignedEntries, 'KeyboardEvent', typedWindow.KeyboardEvent);
  assignGlobal(assignedEntries, 'MouseEvent', typedWindow.MouseEvent);
  assignGlobal(assignedEntries, 'CustomEvent', typedWindow.CustomEvent);
  assignGlobal(
    assignedEntries,
    'requestAnimationFrame',
    typedWindow.requestAnimationFrame.bind(typedWindow),
  );
  assignGlobal(
    assignedEntries,
    'cancelAnimationFrame',
    typedWindow.cancelAnimationFrame.bind(typedWindow),
  );
  if (typeof typedWindow.ResizeObserver !== 'undefined') {
    assignGlobal(assignedEntries, 'ResizeObserver', typedWindow.ResizeObserver);
  }
  assignGlobal(assignedEntries, 'HTMLCanvasElement', typedWindow.HTMLCanvasElement);
  assignGlobal(assignedEntries, 'HTMLElement', typedWindow.HTMLElement);
  assignGlobal(assignedEntries, 'HTMLDivElement', typedWindow.HTMLDivElement);
  assignGlobal(assignedEntries, 'CanvasRenderingContext2D', typedWindow.CanvasRenderingContext2D);

  const cleanup = (): void => {
    for (const { key, previous } of assignedEntries) {
      if (typeof previous === 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (globalThis as Record<string, unknown>)[key];
      } else {
        (globalThis as Record<string, unknown>)[key] = previous;
      }
    }
    dom.window.close();
  };

  return { window: typedWindow, cleanup };
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
