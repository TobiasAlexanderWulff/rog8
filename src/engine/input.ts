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
    }
  >();

  constructor() {
    // TODO: Set up key listeners once real input wiring is ready.
  }

  /**
   * Attaches keyboard listeners to track pressed, held, and released keys.
   *
   * @param target - The window object that dispatches keyboard events.
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
        this.frameState.held.delete(binding);
        this.frameState.released.add(binding);
        this.releasedFrames.set(binding, this.frameState.frame);
      }
    };

    target.addEventListener('keydown', keydown);
    target.addEventListener('keyup', keyup);

    this.listeners.set(target, { keydown, keyup });
  }

  /**
   * Remove registered key listeners from the given window to prevent leaks.
   *
   * @param target The window instance to detach the listeners from.
   */
  detach(target: Window): void {
    const listeners = this.listeners.get(target);
    if (!listeners) {
      return;
    }

    // Remove the exact listener references registered during attach.
    target.removeEventListener('keydown', listeners.keydown);
    target.removeEventListener('keyup', listeners.keyup);
    this.listeners.delete(target);
  }

  /**
   * Resets transient input state for the upcoming frame while keeping the held bindings alive.
   *
   * @param frame Frame index being processed.
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
   * @param key The binding to check.
   * @returns True only if this frame registered a fresh key press.
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
   * @param key Key binding to evaluate.
   * @returns True when the key remains down beyond its initial press frame.
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
   * @param key The binding to query for a release event.
   * @returns True if the key transitioned to released this frame; otherwise, false.
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
