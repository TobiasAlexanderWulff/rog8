# Review Notes

- [x] Cancel queued removals on re-add (`src/engine/world.ts:83-105`) — re-adding a component after `queueRemoveComponent` still leaves it in the removal queues, so `flushComponentRemovals` deletes the component at the end of the tick; clear any pending removal when re-adding.
- [x] Prevent duplicate player movement system registration (`src/engine/systems/player-movement.ts:53`) — `registerPlayerMovementSystem` re-adds the system each time it runs, and because `World.reset()` preserves the systems array this leads to the player movement system executing multiple times per tick after a world reset; guard against double registration.
