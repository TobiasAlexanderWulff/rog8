/**
 * @fileoverview Render bootstrap tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bootstrapCanvas,
  createRenderLoop,
  drawPlaceholderScene,
  type RenderContext,
} from '../bootstrap';
import { withSeed, type RunSeed } from '../../shared/random';
import { setupBrowserEnv } from '../../shared/testing/setup-browser-env';

let cleanup: (() => void) | undefined;

beforeEach(async () => {
  const env = await setupBrowserEnv();
  cleanup = env.cleanup;
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

/**
 * Suite for bootstrapCanvas.
 */
describe('bootstrapCanvas', () => {
  it('bootstraps a canvas element into the requested root', () => {
    document.body.innerHTML = '';

    const contextStub = { imageSmoothingEnabled: true } as unknown as CanvasRenderingContext2D;
    // Simulate the minimal subset of layout properties the bootstrapper reads from the host node.
    const computedStyle = document.createElement('div').style;
    computedStyle.display = 'block';
    computedStyle.alignItems = 'normal';
    computedStyle.justifyContent = 'flex-start';
    computedStyle.width = 'auto';
    computedStyle.height = 'auto';

    const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedStyle);
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(contextStub);

    const renderContext = bootstrapCanvas('game-root');
    const root = document.getElementById('game-root');

    expect(getContextSpy).toHaveBeenCalledWith('2d');
    expect(root).toBeInstanceOf(HTMLDivElement);
    expect(root && document.body.contains(root)).toBe(true);

    if (!(root instanceof HTMLDivElement)) {
      throw new Error('bootstrapCanvas did not create a div container');
    }
    const host = root;
    expect(host.style.display).toBe('flex');
    expect(host.style.alignItems).toBe('center');
    expect(host.style.justifyContent).toBe('center');
    expect(host.style.width).toBe('100vw');
    expect(host.style.height).toBe('100vh');

    const { canvas, context, scale } = renderContext;

    expect(context).toBe(contextStub);
    expect(contextStub.imageSmoothingEnabled).toBe(false);
    expect(getComputedStyleSpy).toHaveBeenCalledWith(host);

    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.id).toBe('game-root-canvas');
    expect(canvas.width).toBe(256);
    expect(canvas.height).toBe(144);
    expect(canvas.style.display).toBe('block');
    expect(canvas.style.imageRendering).toBe('pixelated');
    expect(canvas.style.width).toBe(`${256 * scale}px`);
    expect(canvas.style.height).toBe(`${144 * scale}px`);
    expect(scale).toBeGreaterThanOrEqual(1);
    expect(host.contains(canvas)).toBe(true);

    renderContext.teardown();
  });

  it('calculates integer scaling based on available viewport size', () => {
    document.body.innerHTML = '<div id="game-root"></div>';

    const root = document.getElementById('game-root');
    if (!(root instanceof HTMLDivElement)) {
      throw new Error('Expected to find render root container');
    }

    const contextStub = { imageSmoothingEnabled: true } as unknown as CanvasRenderingContext2D;
    // Reuse the synthetic computed style so resizing math sees predictable values.
    const computedStyle = document.createElement('div').style;
    computedStyle.display = 'block';
    computedStyle.alignItems = 'normal';
    computedStyle.justifyContent = 'flex-start';
    computedStyle.width = 'auto';
    computedStyle.height = 'auto';

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedStyle);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contextStub);

    const widthSpy = vi.spyOn(root, 'clientWidth', 'get').mockReturnValue(512);
    const heightSpy = vi.spyOn(root, 'clientHeight', 'get').mockReturnValue(288);

    const renderContext = bootstrapCanvas('game-root');
    const { canvas } = renderContext;

    expect(renderContext.scale).toBe(2);
    expect(canvas.style.width).toBe('512px');
    expect(canvas.style.height).toBe('288px');

    widthSpy.mockReturnValue(768);
    heightSpy.mockReturnValue(432);
    window.dispatchEvent(new Event('resize'));

    expect(renderContext.scale).toBe(3);
    expect(canvas.style.width).toBe('768px');
    expect(canvas.style.height).toBe('432px');

    widthSpy.mockReturnValue(128);
    heightSpy.mockReturnValue(72);
    window.dispatchEvent(new Event('resize'));

    expect(renderContext.scale).toBe(1);
    expect(canvas.style.width).toBe('256px');
    expect(canvas.style.height).toBe('144px');

    renderContext.teardown();
  });
});

/**
 * Suite for createRenderLoop.
 */
describe('createRenderLoop', () => {
  it('steps the tick callback at a fixed interval', () => {
    const rafQueue: Array<{ id: number; callback: FrameRequestCallback }> = [];
    let nextRafId = 1;

    // Stub requestAnimationFrame to capture callbacks instead of scheduling real browser frames.
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = nextRafId++;
      rafQueue.push({ id, callback });
      return id;
    });

    // Provide a cancelAnimationFrame implementation that removes entries from the queue.
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      const index = rafQueue.findIndex((entry) => entry.id === id);
      if (index >= 0) {
        rafQueue.splice(index, 1);
      }
    });

    // Advance the loop manually by invoking the next queued animation frame.
    const dispatchFrame = (timestamp: number): void => {
      if (rafQueue.length === 0) {
        throw new Error('No scheduled animation frame to dispatch');
      }
      const { callback } = rafQueue.shift() as { id: number; callback: FrameRequestCallback };
      callback(timestamp);
    };

    const tickSpy = vi.fn();
    const loop = createRenderLoop({} as RenderContext, tickSpy);

    loop.start();
    expect(rafQueue.length).toBe(1);

    dispatchFrame(0);
    expect(tickSpy).toHaveBeenCalledTimes(1);
    expect(tickSpy).toHaveBeenLastCalledWith(0);

    dispatchFrame(17);
    expect(tickSpy).toHaveBeenCalledTimes(2);
    expect(tickSpy).toHaveBeenLastCalledWith(1);

    dispatchFrame(34);
    expect(tickSpy).toHaveBeenCalledTimes(3);
    expect(tickSpy).toHaveBeenLastCalledWith(2);

    dispatchFrame(200);
    expect(tickSpy).toHaveBeenCalledTimes(8);
    const frames = tickSpy.mock.calls.map((call): number => {
      const [frame] = call as [number];
      return frame;
    });
    expect(frames).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    loop.stop();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(rafQueue.length).toBe(0);

    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it('resets loop state on stop', () => {
    const rafQueue: Array<{ id: number; callback: FrameRequestCallback }> = [];
    let nextRafId = 1;

    // Capture frame callbacks so the test controls loop progression explicitly.
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = nextRafId++;
      rafQueue.push({ id, callback });
      return id;
    });

    // Mirror cancelAnimationFrame behaviour to ensure stop clears pending callbacks.
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      const index = rafQueue.findIndex((entry) => entry.id === id);
      if (index >= 0) {
        rafQueue.splice(index, 1);
      }
    });

    // Helper that dispatches the next queued frame with a supplied timestamp.
    const dispatchFrame = (timestamp: number): void => {
      if (rafQueue.length === 0) {
        throw new Error('No scheduled animation frame to dispatch');
      }
      const { callback } = rafQueue.shift() as { id: number; callback: FrameRequestCallback };
      callback(timestamp);
    };

    const tickSpy = vi.fn();
    const loop = createRenderLoop({} as RenderContext, tickSpy);

    loop.start();
    expect(rafQueue.length).toBe(1);

    dispatchFrame(0);
    dispatchFrame(17);
    dispatchFrame(34);
    const framesBeforeStop = tickSpy.mock.calls.map((call): number => {
      const [frame] = call as [number];
      return frame;
    });
    expect(framesBeforeStop.length).toBeGreaterThan(1);
    expect(framesBeforeStop.at(-1)).toBeGreaterThan(0);

    loop.stop();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(rafQueue.length).toBe(0);

    tickSpy.mockClear();

    loop.start();
    expect(rafQueue.length).toBe(1);

    dispatchFrame(0);
    expect(tickSpy).toHaveBeenCalledTimes(1);
    expect(tickSpy).toHaveBeenLastCalledWith(0);

    dispatchFrame(17);
    const framesAfterRestart = tickSpy.mock.calls.map((call): number => {
      const [frame] = call as [number];
      return frame;
    });
    expect(framesAfterRestart).toEqual([0, 1]);

    loop.stop();
    expect(cancelSpy).toHaveBeenCalledTimes(2);
    expect(rafQueue.length).toBe(0);

    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });
});

/**
 * Placeholder suite for drawPlaceholderScene.
 */
describe('drawPlaceholderScene', () => {
  it('draws deterministic placeholder content for a given seed', () => {
    const width = 256;
    const height = 144;
    const cellSize = 8;
    const seed: RunSeed = { value: 0x12345678 };
    const scale = 3;

    const { context: ctx, calls } = createCanvasContextSpy();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const renderContext: RenderContext = {
      canvas,
      context: ctx,
      scale,
      teardown: vi.fn(),
    };

    drawPlaceholderScene(renderContext, seed);

    const methodCalls = calls.filter(isMethodCall);
    const propertyCalls = calls.filter(isPropertyCall);

    expect(methodCalls[0]).toEqual({ kind: 'method', name: 'save', args: [] });
    expect(methodCalls.find((call) => call.name === 'setTransform')).toEqual({
      kind: 'method',
      name: 'setTransform',
      args: [1, 0, 0, 1, 0, 0],
    });
    expect(methodCalls.find((call) => call.name === 'clearRect')).toEqual({
      kind: 'method',
      name: 'clearRect',
      args: [0, 0, width, height],
    });

    const fillRectCalls = methodCalls.filter((call) => call.name === 'fillRect');
    expect(fillRectCalls).toHaveLength(13);
    expect(fillRectCalls[0].args).toEqual([0, 0, width, height]);

    // Regenerate the random geometry with the same seed to build the authoritative expectations.
    const expectedShapes = withSeed(seed.value, (rng) => {
      const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7'];
      const cellsX = Math.floor(width / cellSize);
      const cellsY = Math.floor(height / cellSize);
      const shapes: Array<{ rect: [number, number, number, number]; color: string }> = [];
      for (let i = 0; i < 12; i += 1) {
        const wCells = rng.nextInt(1, 4);
        const hCells = rng.nextInt(1, 4);
        const maxX = Math.max(0, cellsX - wCells);
        const maxY = Math.max(0, cellsY - hCells);
        const x = rng.nextInt(0, maxX) * cellSize;
        const y = rng.nextInt(0, maxY) * cellSize;
        const color = palette[rng.nextInt(0, palette.length - 1)];
        shapes.push({ rect: [x, y, wCells * cellSize, hCells * cellSize], color });
      }
      return shapes;
    });

    const shapeRects = fillRectCalls
      .slice(1)
      .map((call) => call.args as [number, number, number, number]);
    expect(shapeRects).toEqual(expectedShapes.map((shape) => shape.rect));

    const fillStyleCalls = propertyCalls.filter((call) => call.name === 'fillStyle');
    expect(fillStyleCalls[0]?.value).toBe('#0f172a');
    expect(fillStyleCalls.slice(1, 13).map((call) => call.value)).toEqual(
      expectedShapes.map((shape) => shape.color),
    );
    expect(fillStyleCalls.at(-1)?.value).toBe('#e2e8f0');

    const strokeStyleCalls = propertyCalls.filter((call) => call.name === 'strokeStyle');
    expect(strokeStyleCalls.map((call) => call.value)).toEqual(['#1e2a44', '#94a3b8']);

    const lineWidthCalls = propertyCalls.filter((call) => call.name === 'lineWidth');
    expect(lineWidthCalls.map((call) => call.value)).toEqual([1, 1]);

    expect(propertyCalls.find((call) => call.name === 'font')?.value).toBe('8px monospace');
    expect(propertyCalls.find((call) => call.name === 'textBaseline')?.value).toBe('top');

    const beginPathCalls = methodCalls.filter((call) => call.name === 'beginPath');
    expect(beginPathCalls).toHaveLength(2);

    const strokeCalls = methodCalls.filter((call) => call.name === 'stroke');
    expect(strokeCalls).toHaveLength(2);

    const moveLineCalls = methodCalls.filter(
      (call) => call.name === 'moveTo' || call.name === 'lineTo',
    );
    const expectedGridSegments =
      (Math.floor(width / cellSize) + 1) * 2 + (Math.floor(height / cellSize) + 1) * 2 + 4;
    expect(moveLineCalls).toHaveLength(expectedGridSegments);

    const centerX = Math.floor(width / 2) + 0.5;
    const centerY = Math.floor(height / 2) + 0.5;
    const crosshair = moveLineCalls.slice(-4);
    expect(crosshair).toEqual([
      { kind: 'method', name: 'moveTo', args: [centerX, 0] },
      { kind: 'method', name: 'lineTo', args: [centerX, height] },
      { kind: 'method', name: 'moveTo', args: [0, centerY] },
      { kind: 'method', name: 'lineTo', args: [width, centerY] },
    ]);

    const strokeRectCall = methodCalls.find((call) => call.name === 'strokeRect');
    expect(strokeRectCall).toEqual({
      kind: 'method',
      name: 'strokeRect',
      args: [0.5, 0.5, width - 1, height - 1],
    });

    const fillTextCalls = methodCalls.filter((call) => call.name === 'fillText');
    expect(fillTextCalls).toEqual([
      { kind: 'method', name: 'fillText', args: [`seed:${seed.value >>> 0}`, 4, 4] },
      { kind: 'method', name: 'fillText', args: [`scale:${scale}`, 4, 14] },
    ]);

    expect(methodCalls.at(-1)).toEqual({ kind: 'method', name: 'restore', args: [] });
  });
});

type CanvasMethodCall = {
  kind: 'method';
  name: string;
  args: unknown[];
};

type CanvasPropertyCall = {
  kind: 'property';
  name: string;
  value: unknown;
};

type CanvasCall = CanvasMethodCall | CanvasPropertyCall;

/**
 * Reports whether a captured canvas call originated from a method invocation.
 *
 * @remarks
 * Canvas spy helpers record both method calls and property writes; this narrows to method calls.
 *
 * @param call - Call record captured from the spy context.
 * @returns `true` when the call corresponds to a canvas method.
 * @throws This function never throws; it inspects a discriminant field.
 * @example
 * ```ts
 * if (isMethodCall(call)) {
 *   // handle method-specific assertions
 * }
 * ```
 */
function isMethodCall(call: CanvasCall): call is CanvasMethodCall {
  return call.kind === 'method';
}

/**
 * Reports whether a captured canvas call originated from a property assignment.
 *
 * @remarks
 * Differentiates property writes from method calls in the captured spy history.
 *
 * @param call - Call record captured from the spy context.
 * @returns `true` when the call corresponds to a canvas property write.
 * @throws This function never throws; it inspects a discriminant field.
 * @example
 * ```ts
 * if (isPropertyCall(call)) {
 *   // assert property mutation
 * }
 * ```
 */
function isPropertyCall(call: CanvasCall): call is CanvasPropertyCall {
  return call.kind === 'property';
}

/**
 * Creates a spy canvas rendering context that records invoked methods and property mutations.
 *
 * @remarks
 * Generates a mock 2D context whose methods push entries into an array for later inspection.
 *
 * @returns Spy context and captured call history.
 * @throws This function never throws; it creates a plain object proxy.
 * @example
 * ```ts
 * const { context, calls } = createCanvasContextSpy();
 * context.fillRect(0, 0, 10, 10);
 * ```
 */
function createCanvasContextSpy(): { context: CanvasRenderingContext2D; calls: CanvasCall[] } {
  const calls: CanvasCall[] = [];
  const context = {} as CanvasRenderingContext2D;

  const methodNames = [
    'save',
    'setTransform',
    'clearRect',
    'fillRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'stroke',
    'strokeRect',
    'fillText',
    'restore',
  ] as const;

  const propertyNames = ['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textBaseline'] as const;

  for (const name of methodNames) {
    Object.defineProperty(context, name, {
      configurable: true,
      enumerable: true,
      value: (...args: unknown[]) => {
        calls.push({ kind: 'method', name, args });
      },
    });
  }

  for (const name of propertyNames) {
    let value: unknown;
    Object.defineProperty(context, name, {
      configurable: true,
      enumerable: true,
      get() {
        return value;
      },
      set(next: unknown) {
        value = next;
        calls.push({ kind: 'property', name, value: next });
      },
    });
  }

  return { context, calls };
}
