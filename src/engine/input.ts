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

export class InputManager {
  private bindings: Set<KeyBinding> = new Set();
  private frameState: FrameInputState = {
    pressed: new Set(),
    held: new Set(),
    released: new Set(),
    frame: 0,
  };

  constructor() {
    // TODO: Set up key listeners once real input wiring is ready.
  }

  attach(target: Window): void {
    // TODO: Register keydown/keyup listeners on the provided window target.
    void target;
  }

  detach(target: Window): void {
    // TODO: Remove previously registered listeners to avoid leaks.
    void target;
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
