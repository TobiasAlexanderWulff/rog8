# Review Notes

- [x] Fix unknown enemy archetype in test (`src/combat/__tests__/melee-system.spec.ts:174`) — add `'brute'` to `EnemyArchetype` or use an existing archetype to satisfy the type check.
- [ ] `src/main.ts:38` – capture the HUD state returned from `createHud`, then call `updateHud`/`showGameOver` so the overlay reflects live health and game-over messaging.
- [ ] `src/engine/run-controller.ts:125` – stop hardcoding entity setup without tracking the player handle; persist the player id/health snapshot or wire in `bootstrapRun` so HUD updates have source data.
- [ ] `src/engine/run-controller.ts:171` – allow `RunController.update` to poll input while in `game-over`, listening for `KeyR` to trigger `restart()`/`start()` and hide the game-over overlay.
- [ ] `src/engine/run-controller.ts:208` – when `triggerGameOver()` runs, call `showGameOver(seed)` (and ensure restart clears it) to actually notify the HUD.
- [ ] `src/combat/melee-system.ts:135` – when the player’s health hits zero, notify the controller or emit a game-over event so the run transitions appropriately, enabling the HUD/game-over flow.
