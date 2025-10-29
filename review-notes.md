# Review Notes

- [x] Cancel queued removals on re-add (`src/engine/world.ts:83-105`) — re-adding a component after `queueRemoveComponent` still leaves it in the removal queues, so `flushComponentRemovals` deletes the component at the end of the tick; clear any pending removal when re-adding.
