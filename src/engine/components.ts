export interface TransformComponent {
  x: number;
  y: number;
  // TODO: Add angle or scale if future systems require it.
}

export interface VelocityComponent {
  vx: number;
  vy: number;
  // TODO: Encode acceleration or friction constants when movement tuning begins.
}

export interface HealthComponent {
  current: number;
  max: number;
  // TODO: Add invulnerability frames or damage metadata once combat is ready.
}

export interface PlayerComponent {
  name: string;
  // TODO: Include input bindings or sprite references when they exist.
}
