export type KeyBinding =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'KeyW'
  | 'KeyA'
  | 'KeyS'
  | 'KeyD'
  | 'Space'
  | 'KeyR';

/**
 * Snapshot of input bindings for a single frame.
 *
 * @remarks
 * The sets mirror the keys pressed, held, or released during the current frame number supplied to
 * {@link InputManager.beginFrame}.
 *
 * @example
 * ```ts
 * const state: FrameInputState = {
 *   pressed: new Set(),
 *   held: new Set(),
 *   released: new Set(),
 *   frame: 0,
 * };
 * ```
 */
export interface FrameInputState {
  pressed: Set<KeyBinding>;
  held: Set<KeyBinding>;
  released: Set<KeyBinding>;
  frame: number;
}

const TRACKED_KEYS: readonly KeyBinding[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'KeyR',
];

const TRACKED_KEY_LOOKUP = new Set<string>(TRACKED_KEYS);

/**
 * Narrows arbitrary keyboard codes to the subset tracked by the input manager.
 *
 * @remarks
 * Helps TypeScript narrow `KeyboardEvent.code` values to the known `KeyBinding` union.
 *
 * @param code - Raw keyboard code to validate.
 * @returns `true` when the code is tracked.
 * @throws This function never throws; it performs a lookup against a predefined set.
 * @example
 * ```ts
 * if (isTrackedKey(event.code)) {
 *   // safe to treat as a KeyBinding
 * }
 * ```
 */
function isTrackedKey(code: string): code is KeyBinding {
  return TRACKED_KEY_LOOKUP.has(code);
}

/**
 * Tracks keyboard input state and surfaces per-frame pressed/held/released queries.
 *
 * @remarks
 * Automatically attaches to the global window when running in a browser context and can be used in
 * headless tests by manually providing a jsdom window.
 *
 * @example
 * ```ts
 * const manager = new InputManager();
 * manager.beginFrame(1);
 * if (manager.isPressed('Space')) {
 *   // act on jump input
 * }
 * ```
 */
export class InputManager {
  private bindings: Set<KeyBinding> = new Set();
  private pressedFrames: Map<KeyBinding, number> = new Map();
  private releasedFrames: Map<KeyBinding, number> = new Map();
  private frameState: FrameInputState = {
    pressed: new Set(),
    held: new Set(),
    released: new Set(),
    frame: 0,
  };
  private listeners = new WeakMap<
    Window,
    {
      keydown: (event: KeyboardEvent) => void;
      keyup: (event: KeyboardEvent) => void;
      blur: () => void;
      visibilitychange?: () => void;
    }
  >();

  constructor() {
    if (typeof window !== 'undefined') {
      this.attach(window);
    }
  }

  /**
   * Attaches keyboard listeners to track pressed, held, and released keys.
   *
   * @remarks
   * Repeated calls with the same window are ignored to prevent duplicate listener registration.
   *
   * @param target - Window instance that dispatches keyboard events.
   * @throws This method never throws; unsupported targets are ignored.
   * @example
   * ```ts
   * manager.attach(window);
   * ```
   */
  attach(target: Window): void {
    // Bail out if listeners for this window instance were already registered.
    if (this.listeners.has(target)) {
      return;
    }

    const keydown = (event: KeyboardEvent): void => {
      const code = event.code;
      if (!isTrackedKey(code)) {
        return;
      }
      const binding = code;

      if (!this.bindings.has(binding)) {
        // First press this frame: register for pressed + held sets and memoize the frame.
        this.frameState.pressed.add(binding);
        this.frameState.held.add(binding);
        this.pressedFrames.set(binding, this.frameState.frame);
        this.bindings.add(binding);
      }
    };

    const keyup = (event: KeyboardEvent): void => {
      const code = event.code;
      if (!isTrackedKey(code)) {
        return;
      }
      const binding = code;

      if (this.bindings.delete(binding)) {
        // Transition to released state while keeping frame metadata in sync.
        this.frameState.held.delete(binding);
        this.frameState.released.add(binding);
        this.releasedFrames.set(binding, this.frameState.frame);
      }
    };

    const clearBindings = (): void => {
      this.resetState();
    };

    const blur = (): void => {
      clearBindings();
    };

    const visibilitychange =
      typeof target.document !== 'undefined'
        ? (): void => {
            if (target.document.visibilityState !== 'visible') {
              clearBindings();
            }
          }
        : undefined;

    target.addEventListener('keydown', keydown);
    target.addEventListener('keyup', keyup);
    target.addEventListener('blur', blur);
    if (visibilitychange) {
      target.document.addEventListener('visibilitychange', visibilitychange);
    }

    this.listeners.set(target, { keydown, keyup, blur, visibilitychange });
  }

  /**
   * Removes registered key listeners from the given window to prevent leaks.
   *
   * @remarks
   * Also clears cached state so subsequent frames start with a clean slate.
   *
   * @param target - Window instance to detach the listeners from.
   * @throws This method never throws; unknown windows are ignored.
   * @example
   * ```ts
   * manager.detach(window);
   * ```
   */
  detach(target: Window): void {
    const listeners = this.listeners.get(target);
    if (!listeners) {
      return;
    }

    // Remove the exact listener references registered during attach.
    target.removeEventListener('keydown', listeners.keydown);
    target.removeEventListener('keyup', listeners.keyup);
    target.removeEventListener('blur', listeners.blur);
    if (listeners.visibilitychange && typeof target.document !== 'undefined') {
      target.document.removeEventListener('visibilitychange', listeners.visibilitychange);
    }
    this.resetState();
    this.listeners.delete(target);
  }

  private resetState(): void {
    if (this.bindings.size !== 0) {
      this.bindings.clear();
    }
    if (this.frameState.pressed.size !== 0) {
      this.frameState.pressed.clear();
    }
    if (this.frameState.held.size !== 0) {
      this.frameState.held.clear();
    }
    if (this.frameState.released.size !== 0) {
      this.frameState.released.clear();
    }
    if (this.pressedFrames.size !== 0) {
      this.pressedFrames.clear();
    }
    if (this.releasedFrames.size !== 0) {
      this.releasedFrames.clear();
    }
  }

  /**
   * Resets transient input state for the upcoming frame while keeping the held bindings alive.
   *
   * @remarks
   * Call once per frame to rotate the pressed and released sets while maintaining held bindings.
   *
   * @param frame - Frame index being processed.
   * @throws This method never throws; it only mutates internal caches.
   * @example
   * ```ts
   * manager.beginFrame(frameNumber);
   * ```
   */
  beginFrame(frame: number): void {
    if (this.frameState.pressed.size !== 0) {
      this.frameState.pressed.clear();
    }

    if (this.frameState.released.size !== 0) {
      this.frameState.released.clear();
    }

    if (this.frameState.held.size !== this.bindings.size) {
      // Rehydrate held keys so consumers still reference the same Set instance.
      this.frameState.held.clear();
      for (const binding of this.bindings) {
        this.frameState.held.add(binding);
      }
    }

    this.frameState.frame = frame;
  }

  /**
   * Determines whether a key was newly pressed during the active frame.
   *
   * @remarks
   * Returns `true` exactly once when a binding transitions from up to down.
   *
   * @param key - Binding to check for a fresh press.
   * @returns `true` only if this frame registered a fresh key press.
   * @throws This method never throws; it queries internal maps.
   * @example
   * ```ts
   * if (manager.isPressed('Space')) {
   *   // fire jump action
   * }
   * ```
   */
  isPressed(key: KeyBinding): boolean {
    const pressedFrame = this.pressedFrames.get(key);
    if (pressedFrame === undefined) {
      return false;
    }
    // Only treat the key as pressed if its recorded frame matches the current one.
    if (pressedFrame === this.frameState.frame) {
      return true;
    }
    if (pressedFrame < this.frameState.frame) {
      this.pressedFrames.delete(key);
    }
    return false;
  }

  /**
   * Determines whether a key should be treated as held on the current frame.
   *
   * @remarks
   * Held bindings persist across frames until the key is released.
   *
   * @param key - Binding to evaluate for held state.
   * @returns `true` when the key remains down beyond its initial press frame.
   * @throws This method never throws; it checks cached sets and frame metadata.
   * @example
   * ```ts
   * if (manager.isHeld('ArrowUp')) {
   *   // continue moving north
   * }
   * ```
   */
  isHeld(key: KeyBinding): boolean {
    if (!this.frameState.held.has(key)) {
      return false;
    }

    const pressedFrame = this.pressedFrames.get(key);
    if (pressedFrame === undefined) {
      return true;
    }

    const frame = this.frameState.frame;
    if (pressedFrame < frame) {
      // Key persisted across frames; clear stale press tracking while reporting as held.
      this.pressedFrames.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Determines whether the given key was released during the current frame.
   *
   * @remarks
   * Reports releases only for the frame on which they occur and clears stale tracking afterwards.
   *
   * @param key - Binding to query for a release event.
   * @returns `true` if the key transitioned to released this frame; otherwise, `false`.
   * @throws This method never throws; it manipulates cached release frames.
   * @example
   * ```ts
   * if (manager.isReleased('KeyR')) {
   *   // restart run
   * }
   * ```
   */
  isReleased(key: KeyBinding): boolean {
    const releasedFrame = this.releasedFrames.get(key);
    if (releasedFrame === undefined) {
      return false;
    }

    const frame = this.frameState.frame;
    if (releasedFrame === frame) {
      return true;
    }

    if (releasedFrame < frame) {
      // The release occurred on a previous frame, so clear the cached state.
      this.releasedFrames.delete(key);
      this.frameState.released.delete(key);
    }

    return false;
  }
}
