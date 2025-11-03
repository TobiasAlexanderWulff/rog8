/**
 * @fileoverview src/engine/input.ts test coverage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InputManager } from '../input';
import { setupBrowserEnv } from '../../shared/testing/setup-browser-env';

/**
 * Exercises the InputManager lifecycle for DOM event binding and frame tracking.
 */

describe('InputManager', () => {
  let cleanup: (() => void) | undefined;

  beforeEach(async () => {
    const env = await setupBrowserEnv();
    cleanup = env.cleanup;
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.restoreAllMocks();
  });

  /**
   * Verifies that constructing the manager in a browser context wires keyboard and visibility listeners.
   */
  it('attaches keyboard listeners when constructed in a browser context', () => {
    // Arrange spies on global event registration to observe constructor side effects.
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const docAddEventListenerSpy = vi.spyOn(window.document, 'addEventListener');

    // Act: instantiate the manager which should eagerly attach listeners.
    void new InputManager();

    // Assert: each expected listener is registered exactly once.
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));
    expect(docAddEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    addEventListenerSpy.mockRestore();
    docAddEventListenerSpy.mockRestore();
  });

  /**
   * Ensures that invoking attach multiple times does not duplicate DOM listeners.
   */
  it('avoids registering duplicate listeners when attach is called repeatedly', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const docAddEventListenerSpy = vi.spyOn(window.document, 'addEventListener');

    const manager = new InputManager();

    // Capture the constructor-installed listener counts as our baseline.
    const initialWindowCalls = {
      keydown: addEventListenerSpy.mock.calls.filter(([event]) => event === 'keydown').length,
      keyup: addEventListenerSpy.mock.calls.filter(([event]) => event === 'keyup').length,
      blur: addEventListenerSpy.mock.calls.filter(([event]) => event === 'blur').length,
    };
    const initialDocVisibilityCalls = docAddEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'visibilitychange',
    ).length;

    manager.attach(window);
    manager.attach(window);

    expect(addEventListenerSpy.mock.calls.filter(([event]) => event === 'keydown')).toHaveLength(
      initialWindowCalls.keydown,
    );
    expect(addEventListenerSpy.mock.calls.filter(([event]) => event === 'keyup')).toHaveLength(
      initialWindowCalls.keyup,
    );
    expect(addEventListenerSpy.mock.calls.filter(([event]) => event === 'blur')).toHaveLength(
      initialWindowCalls.blur,
    );
    expect(
      docAddEventListenerSpy.mock.calls.filter(([event]) => event === 'visibilitychange'),
    ).toHaveLength(initialDocVisibilityCalls);

    addEventListenerSpy.mockRestore();
    docAddEventListenerSpy.mockRestore();
  });

  /**
   * Confirms that a key marked down within the current frame is reported as freshly pressed.
   */
  it('tracks newly pressed keys within the current frame', () => {
    const manager = new InputManager();
    manager.beginFrame(1);

    // Simulate a single keydown during the active frame.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    expect(manager.isPressed('Space')).toBe(true);
  });

  /**
   * Validates that keys remain in the held state across frame boundaries until released.
   */
  it('persists held keys across multiple frames', () => {
    const manager = new InputManager();
    manager.beginFrame(1);

    // Seed the held key state.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    // Advance subsequent frames and ensure the held flag persists.
    manager.beginFrame(2);
    expect(manager.isHeld('Space')).toBe(true);

    manager.beginFrame(3);
    expect(manager.isHeld('Space')).toBe(true);
  });

  /**
   * Checks that the release signal fires exactly on the frame matching a keyup event.
   */
  it('reports releases on the frame the key is lifted', () => {
    const manager = new InputManager();
    manager.beginFrame(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(manager.isReleased('Space')).toBe(false);

    manager.beginFrame(2);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    expect(manager.isReleased('Space')).toBe(true);

    manager.beginFrame(3);
    expect(manager.isReleased('Space')).toBe(false);
  });

  /**
   * Verifies that blur and detach operations clear transient input state across internal collections.
   */
  it('clears transient state when detached or when the window blurs', () => {
    const manager = new InputManager();
    manager.beginFrame(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    const internals = manager as unknown as {
      bindings: Set<string>;
      frameState: {
        pressed: Set<string>;
        held: Set<string>;
        released: Set<string>;
      };
      pressedFrames: Map<string, number>;
      releasedFrames: Map<string, number>;
    };

    // Inspect internal collections to confirm they track the active binding.
    expect(internals.bindings.size).toBe(1);
    expect(internals.frameState.pressed.size).toBe(1);
    expect(internals.frameState.held.size).toBe(1);
    expect(internals.pressedFrames.size).toBe(1);

    // Simulate a window blur, which should purge active input state.
    window.dispatchEvent(new Event('blur'));

    expect(internals.bindings.size).toBe(0);
    expect(internals.frameState.pressed.size).toBe(0);
    expect(internals.frameState.held.size).toBe(0);
    expect(internals.pressedFrames.size).toBe(0);

    manager.beginFrame(2);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(internals.frameState.released.size).toBe(1);
    expect(internals.releasedFrames.size).toBe(1);

    // Detaching the manager should reset any remaining transient release data.
    manager.detach(window);

    expect(internals.frameState.released.size).toBe(0);
    expect(internals.releasedFrames.size).toBe(0);
  });
});
