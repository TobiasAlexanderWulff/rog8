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
    // TODO: Return true only for keys pressed on the current frame.
    return this.frameState.pressed.has(key);
  }

  isHeld(key: KeyBinding): boolean {
    // TODO: Return true for keys that remain held across frames.
    return this.frameState.held.has(key);
  }

  isReleased(key: KeyBinding): boolean {
    // TODO: Return true only on the frame where the key was released.
    return this.frameState.released.has(key);
  }
}
