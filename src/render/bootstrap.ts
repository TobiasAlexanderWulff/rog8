import { RunSeed, withSeed } from '../shared/random';

/**
 * Rendering resources and scaling metadata backing the 2D canvas.
 *
 * @remarks
 * Provides the canvas element, its 2D context, the integer scale applied to upscale the virtual
 * resolution, and a teardown helper to clean up event listeners.
 *
 * @example
 * ```ts
 * const context = bootstrapCanvas();
 * context.teardown();
 * ```
 */
export interface RenderContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  scale: number;
  teardown: () => void;
}

/**
 * Run loop handle used to control fixed-step rendering ticks.
 *
 * @remarks
 * Call {@link RenderLoop.start} to begin the fixed-step loop and {@link RenderLoop.stop} to halt it.
 *
 * @example
 * ```ts
 * const loop = createRenderLoop(context, () => {});
 * loop.start();
 * loop.stop();
 * ```
 */
export interface RenderLoop {
  start(): void;
  stop(): void;
}

/**
 * Bootstraps a 256×144 canvas element and centers it within the provided root.
 *
 * @remarks
 * Creates or reuses a canvas beneath the specified root, enforces pixelated rendering, and wires up
 * resize listeners to maintain integer scaling.
 *
 * @param rootId - ID of the container element that should host the canvas. A div is created
 * automatically when the element is missing.
 * @returns Render context with the canvas, its 2D context, and the integer scale.
 * @throws Error when the browser does not support the 2D canvas context.
 * @example
 * ```ts
 * const renderContext = bootstrapCanvas('game-root');
 * ```
 */
export function bootstrapCanvas(rootId = 'app'): RenderContext {
  const VIRTUAL_WIDTH = 256;
  const VIRTUAL_HEIGHT = 144;

  // Ensure the requested host element exists, creating a fresh container otherwise.
  const root =
    document.getElementById(rootId) ??
    (() => {
      const container = document.createElement('div');
      container.id = rootId;
      document.body.appendChild(container);
      return container;
    })();

  let canvas: HTMLCanvasElement;
  if (root instanceof HTMLCanvasElement) {
    canvas = root;
  } else {
    // Reuse an existing canvas child, or fabricate a new one when absent.
    const existingCanvas = root.querySelector('canvas');
    if (existingCanvas instanceof HTMLCanvasElement) {
      canvas = existingCanvas;
    } else {
      canvas = document.createElement('canvas');
      canvas.id = `${rootId}-canvas`;
      root.appendChild(canvas);
    }
    if (root instanceof HTMLElement && root !== document.body) {
      const computed = window.getComputedStyle(root);

      // Promote the host container to a flex layout when it is still in the browser defaults.
      if (!root.style.display.trim() && computed.display === 'block') {
        root.style.display = 'flex';
      }
      // Center the canvas vertically as long as the container has no explicit alignment rules.
      const alignDefault = computed.alignItems === 'normal' || computed.alignItems === 'stretch';
      if (!root.style.alignItems.trim() && alignDefault) {
        root.style.alignItems = 'center';
      }
      // Mirror the vertical centering logic horizontally to keep the canvas centered in both axes.
      const justifyDefault =
        computed.justifyContent === 'normal' ||
        computed.justifyContent === 'flex-start' ||
        computed.justifyContent === 'start';
      if (!root.style.justifyContent.trim() && justifyDefault) {
        root.style.justifyContent = 'center';
      }
      // Expand the container to the viewport when it otherwise collapses to 0×0 dimensions.
      if (!root.style.width.trim() && (computed.width === 'auto' || computed.width === '0px')) {
        root.style.width = '100vw';
      }
      if (!root.style.height.trim() && (computed.height === 'auto' || computed.height === '0px')) {
        root.style.height = '100vh';
      }
    }
  }

  canvas.width = VIRTUAL_WIDTH;
  canvas.height = VIRTUAL_HEIGHT;
  canvas.style.display = 'block';
  // Enforce crisp nearest-neighbour sampling so the upscaled pixels stay sharp.
  canvas.style.imageRendering = 'pixelated';

  // Compute an integer scale that maintains the aspect ratio within the available space.
  const availableWidth =
    (canvas.parentElement?.clientWidth ?? window.innerWidth) || window.innerWidth;
  const availableHeight =
    (canvas.parentElement?.clientHeight ?? window.innerHeight) || window.innerHeight;
  let scale = Math.max(
    1,
    Math.floor(Math.min(availableWidth / VIRTUAL_WIDTH, availableHeight / VIRTUAL_HEIGHT)),
  );

  canvas.style.width = `${VIRTUAL_WIDTH * scale}px`;
  canvas.style.height = `${VIRTUAL_HEIGHT * scale}px`;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('CanvasRenderingContext2D not supported');
  }
  // Disable smoothing so scaled sprites render using hard edges.
  context.imageSmoothingEnabled = false;

  // Defer cleanup work until callers explicitly tear down the render context.
  const teardownCallbacks: Array<() => void> = [];
  let tornDown = false;
  const teardown = (): void => {
    if (tornDown) {
      return;
    }
    tornDown = true;
    while (teardownCallbacks.length > 0) {
      const cleanup = teardownCallbacks.pop();
      if (cleanup) {
        cleanup();
      }
    }
  };

  const renderContext: RenderContext = { canvas, context, scale, teardown };

  /**
   * Recalculates the integer canvas scale so the virtual resolution
   * keeps its aspect ratio within the available space.
   */
  const recalcScale = (): void => {
    const width = (canvas.parentElement?.clientWidth ?? window.innerWidth) || window.innerWidth;
    const height = (canvas.parentElement?.clientHeight ?? window.innerHeight) || window.innerHeight;
    const nextScale = Math.max(
      1,
      Math.floor(Math.min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT)),
    );

    if (nextScale === scale) {
      return;
    }

    scale = nextScale;
    canvas.style.width = `${VIRTUAL_WIDTH * scale}px`;
    canvas.style.height = `${VIRTUAL_HEIGHT * scale}px`;
    renderContext.scale = scale;
  };

  // Recompute the scale when the viewport changes so full-window canvases stay in sync.
  window.addEventListener('resize', recalcScale);
  teardownCallbacks.push(() => {
    window.removeEventListener('resize', recalcScale);
  });

  if (typeof ResizeObserver !== 'undefined') {
    const parent = canvas.parentElement;
    if (parent) {
      // Track container resizes (e.g. flexbox adjustments) to keep the canvas scaled accurately.
      const observer = new ResizeObserver(() => {
        recalcScale();
      });
      observer.observe(parent);
      teardownCallbacks.push(() => {
        observer.disconnect();
      });
    }
  }

  return renderContext;
}

/**
 * Creates a fixed-step render loop that repeatedly executes a tick callback.
 *
 * @remarks
 * Locks updates to 60 Hz with an accumulator so long frames can catch up while capping total work
 * per animation frame.
 *
 * @param _context - Render context associated with the loop. Currently unused but kept for parity
 * with future integrations.
 * @param tick - Callback invoked on each fixed frame with the incrementing frame number.
 * @returns Start/stop controls for the render loop.
 * @throws This function never throws; it relies on `requestAnimationFrame`.
 * @example
 * ```ts
 * const loop = createRenderLoop(renderContext, (frame) => {
 *   console.log('frame', frame);
 * });
 * loop.start();
 * ```
 */
export function createRenderLoop(
  _context: RenderContext,
  tick: (frame: number) => void,
): RenderLoop {
  // Lock the simulation to 60 Hz with an accumulator to catch up after long frames.
  const FIXED_STEP_MS = 1000 / 60;
  // Cap the maximum catch-up work so the loop cannot spiral when the tab was unfocused.
  const MAX_STEPS_PER_FRAME = 5;

  let rafId: number | null = null;
  let running = false;
  let frame = 0;
  let accumulator = 0;
  let lastTimestamp: number | null = null;

  /**
   * Advances the fixed-step loop, catching up with accumulated elapsed time.
   *
   * @remarks
   * Scheduled via `requestAnimationFrame` to maintain a fixed update cadence using an accumulator.
   *
   * @param timestamp - `requestAnimationFrame` timestamp in milliseconds.
   * @throws This function never throws; it relies on browser timing APIs.
   * @example
   * ```ts
   * // Invoked internally by the render loop; not called directly.
   * ```
   */
  const step = (timestamp: number): void => {
    if (!running) {
      return;
    }

    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      tick(frame++);
      rafId = window.requestAnimationFrame(step);
      return;
    }

    // Clamp catch-up work so a hiccup does not spiral into hundreds of ticks.
    let delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    const maxDelta = FIXED_STEP_MS * MAX_STEPS_PER_FRAME;
    if (delta > maxDelta) {
      delta = maxDelta;
    }

    accumulator += delta;

    // Execute fixed steps until we have consumed the accumulated real time.
    while (accumulator >= FIXED_STEP_MS) {
      tick(frame++);
      accumulator -= FIXED_STEP_MS;
    }

    rafId = window.requestAnimationFrame(step);
  };

  return {
    start(): void {
      if (running) {
        return;
      }
      // Reset loop state before scheduling the first animation frame.
      running = true;
      frame = 0;
      accumulator = 0;
      lastTimestamp = null;
      rafId = window.requestAnimationFrame(step);
    },
    stop(): void {
      if (!running) {
        return;
      }
      running = false;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      // Clear residual state so the loop restarts cleanly next time.
      accumulator = 0;
      lastTimestamp = null;
    },
  };
}

/**
 * Renders a deterministic placeholder scene that showcases seeded randomness.
 *
 * @remarks
 * Clears the canvas, paints a grid backdrop, draws seeded rectangles, and annotates seed metadata.
 *
 * @param context - Canvas context used for drawing the placeholder.
 * @param seed - Deterministic seed that governs the generated shapes.
 * @throws This function never throws; rendering relies on standard canvas APIs.
 * @example
 * ```ts
 * drawPlaceholderScene(renderContext, { value: 42 });
 * ```
 */
export function drawPlaceholderScene(context: RenderContext, seed: RunSeed): void {
  const { canvas, context: ctx, scale } = context;
  const width = canvas.width;
  const height = canvas.height;

  // Reset the canvas transform and clear any existing content.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const cellSize = 8;

  // Draw a subtle blueprint-style grid as the scene backdrop.
  ctx.strokeStyle = '#1e2a44';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += cellSize) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += cellSize) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  withSeed(seed.value, (rng) => {
    // Minimal palette that keeps the preview legible across dark and light monitors.
    const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7'];
    const shapes = 12;
    const cellsX = Math.floor(width / cellSize);
    const cellsY = Math.floor(height / cellSize);

    // Fill the grid with a few colorful rectangles positioned deterministically by the seed.
    for (let i = 0; i < shapes; i += 1) {
      const wCells = rng.nextInt(1, 4);
      const hCells = rng.nextInt(1, 4);
      const maxX = Math.max(0, cellsX - wCells);
      const maxY = Math.max(0, cellsY - hCells);
      const x = rng.nextInt(0, maxX) * cellSize;
      const y = rng.nextInt(0, maxY) * cellSize;

      ctx.fillStyle = palette[rng.nextInt(0, palette.length - 1)];
      ctx.fillRect(x, y, wCells * cellSize, hCells * cellSize);
    }

    // Outline the play area and draw crosshairs through the midpoint.
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const centerX = Math.floor(width / 2) + 0.5;
    const centerY = Math.floor(height / 2) + 0.5;

    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Annotate metadata so designers can verify the seed and scale at a glance.
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`seed:${seed.value >>> 0}`, 4, 4);
    ctx.fillText(`scale:${scale}`, 4, 14);
  });

  // Restore whatever transform state the caller had configured prior to drawing.
  ctx.restore();
}
