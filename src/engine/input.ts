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

  attach(target: Window): void {
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

  detach(target: Window): void {
    const listeners = this.listeners.get(target);
    if (!listeners) {
      return;
    }

    target.removeEventListener('keydown', listeners.keydown);
    target.removeEventListener('keyup', listeners.keyup);
    this.listeners.delete(target);
  }

  beginFrame(frame: number): void {
    // TODO: Reset per-frame state while keeping held keys intact.
    this.frameState.frame = frame;
  }

  isPressed(key: KeyBinding): boolean {
    const pressedFrame = this.pressedFrames.get(key);
    if (pressedFrame === undefined) {
      return false;
    }
    if (pressedFrame === this.frameState.frame) {
      return true;
    }
    if (pressedFrame < this.frameState.frame) {
      this.pressedFrames.delete(key);
    }
    return false;
  }

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
      this.pressedFrames.delete(key);
      return true;
    }

    return false;
  }

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
      this.releasedFrames.delete(key);
      this.frameState.released.delete(key);
    }

    return false;
  }
}
