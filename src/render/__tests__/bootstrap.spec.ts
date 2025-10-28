/** @vitest-environment jsdom */
/**
 * @fileoverview Render bootstrap tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  bootstrapCanvas,
  createRenderLoop,
  drawPlaceholderScene,
  type RenderContext,
} from '../bootstrap';

/**
 * Placeholder suite for bootstrapCanvas until DOM harness is configured.
 */
describe('bootstrapCanvas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('bootstraps a canvas element into the requested root', () => {
    document.body.innerHTML = '';

    const contextStub = { imageSmoothingEnabled: true } as unknown as CanvasRenderingContext2D;
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
 * Placeholder suite for createRenderLoop.
 */
describe('createRenderLoop', () => {
  it('steps the tick callback at a fixed interval', () => {
    const rafQueue: Array<{ id: number; callback: FrameRequestCallback }> = [];
    let nextRafId = 1;

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = nextRafId++;
      rafQueue.push({ id, callback });
      return id;
    });

    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      const index = rafQueue.findIndex((entry) => entry.id === id);
      if (index >= 0) {
        rafQueue.splice(index, 1);
      }
    });

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

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = nextRafId++;
      rafQueue.push({ id, callback });
      return id;
    });

    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      const index = rafQueue.findIndex((entry) => entry.id === id);
      if (index >= 0) {
        rafQueue.splice(index, 1);
      }
    });

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
    // TODO: Capture canvas calls once a 2D context spy utility exists.
  });
});
