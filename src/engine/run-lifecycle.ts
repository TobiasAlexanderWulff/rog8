import type { ResourceKey } from './world';

/**
 * Dispatcher resource that exposes run lifecycle transitions to ECS systems.
 *
 * @remarks
 * Systems retrieve the dispatcher from the world and invoke `triggerGameOver` when the player dies
 * so the controller can halt the simulation and notify presentation layers.
 *
 * @example
 * ```ts
 * const dispatcher = world.getResource(RUN_LIFECYCLE_DISPATCH_KEY);
 * dispatcher?.triggerGameOver();
 * ```
 */
export interface RunLifecycleDispatcher {
  triggerGameOver(): void;
}

/**
 * Resource key used to register the {@link RunLifecycleDispatcher} within the world.
 *
 * @remarks
 * The controller re-registers the dispatcher after every restart to keep the callbacks bound to the
 * latest instance.
 */
export const RUN_LIFECYCLE_DISPATCH_KEY =
  'engine.run.lifecycle-dispatch' as ResourceKey<RunLifecycleDispatcher>;
