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

function isTrackedKey(code: string): code is KeyBinding {
  return TRACKED_KEY_LOOKUP.has(code);
}

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
   * Args:
   *   target: Window instance that dispatches keyboard events.
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
      if (this.bindings.size === 0) {
        return;
      }

      this.bindings.clear();
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
   * Args:
   *   target: Window instance to detach the listeners from.
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
    // TODO: Reset internal key state on detach so reattach starts clean.
    this.listeners.delete(target);
  }

  /**
   * Resets transient input state for the upcoming frame while keeping the held bindings alive.
   *
   * Args:
   *   frame: Frame index being processed.
   */
  beginFrame(frame: number): void {
    // TODO: Call beginFrame from the main loop every tick so frameState advances.
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
   * Args:
   *   key: Binding to check for a fresh press.
   *
   * Returns:
   *   True only if this frame registered a fresh key press.
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
   * Args:
   *   key: Binding to evaluate for held state.
   *
   * Returns:
   *   True when the key remains down beyond its initial press frame.
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
   * Args:
   *   key: Binding to query for a release event.
   *
   * Returns:
   *   True if the key transitioned to released this frame; otherwise, false.
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
