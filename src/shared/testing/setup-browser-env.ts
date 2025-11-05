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
 * Attributes:
 *   window: jsdom window instance mirroring browser globals.
 *   cleanup: Callback that tears down injected globals and releases the window.
 */
export interface BrowserEnv {
  window: Window;
  cleanup: () => void;
}

/**
 * Tracks original global entries so they can be restored during cleanup.
 *
 * Attributes:
 *   key: Global identifier assigned on setup.
 *   previous: Prior value stored under the global identifier.
 */
interface AssignedEntry {
  key: string;
  previous: unknown;
}

/**
 * Assigns a value onto the global object while recording prior state for later restoration.
 *
 * Args:
 *   entries (AssignedEntry[]): Mutable list that receives the captured assignment metadata.
 *   key (string): Global field name to override.
 *   value (unknown): Replacement value injected into the global scope.
 */
const assignGlobal = (entries: AssignedEntry[], key: string, value: unknown): void => {
  entries.push({ key, previous: (globalThis as Record<string, unknown>)[key] });
  (globalThis as Record<string, unknown>)[key] = value;
};

/**
 * Bootstraps a jsdom-driven browser environment and injects key globals for DOM-centric tests.
 *
 * Args:
 *   html (string | undefined): HTML skeleton used to initialise the document. Defaults to a blank page.
 *
 * Returns:
 *   Promise<BrowserEnv>: Resolves with the jsdom window handle and cleanup callback.
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
