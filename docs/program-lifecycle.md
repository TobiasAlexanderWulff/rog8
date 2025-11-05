# Program Lifecycle

This brief maps how the run currently flows through the engine versus the target lifecycle we expect to ship. Use it to keep ECS, UI, audio, and content tracks aligned as we extend the loop beyond the present MVP spike.

The standalone diagram for presentations lives at `docs/assets/program-lifecycle.svg` (PNG fallback at `docs/assets/program-lifecycle.png`). Rendered from Graphviz, it highlights the current MVP state machine alongside the target stages and support loops, so you can drop it straight into slides or share it externally.

## Current Lifecycle (MVP Snapshot)

- **Bootstrap** – `RunController` is constructed with a pre-wired `World` and `InputManager` (`src/engine/run-controller.ts`). Construction validates the fixed timestep, clones the seed, spins up the deterministic RNG, and registers the input resource with the world.
- **Start** – `start()` (idempotent) ensures the core component stores exist, spawns one player entity plus a single enemy grunt, hydrates their components, and transitions `RunState` from `init` to `playing`.
- **Tick Loop** – `update(delta)` bails unless the run is `playing`; it accumulates elapsed time until a full `targetDeltaMs` slice is available, begins a new input frame, and executes `world.update(context)` to run all registered systems. Frames advance deterministically because every tick shares the same `rng` seeded at bootstrap.
- **Game Over** – External systems call `triggerGameOver()` when the player dies. The method freezes the accumulator to one step and flips the state to `game-over`, effectively halting further world updates.
- **Restart** – `restart()` resets the world, timers, and state back to `init`, rehydrates the RNG with the original seed, re-registers core resources, and leaves the run ready for another `start()` call.
- **Coverage Gaps** – No pause/resume handling, no floor progression, no save/meta layer, no HUD or audio orchestration yet, and restart always reuses the original seed.

## Final Lifecycle (Target Experience)

1. **Boot & Services**
   - Load persistent settings, input mappings, and seeded unlocks from storage.
   - Warm the renderer, audio graph, and content registries; pre-compose deterministic seeds for daily/phase events.
   - Register cross-cutting resources (render targets, audio buses, analytics hooks) with the world before player flow begins.
2. **Front Door**
   - Present a title screen with continue/new-run/seed-entry options plus accessibility toggles.
   - Handle patch notes and integrity checks before exposing play buttons.
3. **Run Preparation**
   - When starting a new run, lock in the seed, instantiate the world, and enqueue biome/map generation systems.
   - Spawn the player, companions, and first-floor enemies via world factories; prime HUD widgets with initial values; stage intro SFX/music stems.
4. **Gameplay Loop**
   - Fixed-step update remains authoritative. Each frame:
     - Input manager captures the current frame snapshot.
     - Systems execute in deterministic order (movement, combat, AI, render, audio).
     - HUD/world synchronise via resource bridges.
   - Support dynamic state transitions: pause/resume, cutscenes, inter-floor travel, boss phases.
   - Emit combat logs, loot tables, and audio cues tied to the shared RNG for replay fidelity.
5. **Post-Run Resolution**
   - On victory or defeat, transition to summary screens with stats, unlock rolls, and seed sharing.
   - Persist meta-progression, daily leaderboard submissions, and accessibility preferences before returning to the front door.
6. **Systems Hygiene**
   - Ensure restart paths can branch: same-seed retry, new random seed, or continue from checkpoint.
   - Allow safe teardown of services (audio/renderer/input) when quitting without leaking listeners or component stores.

## Bridging the Gap

- Extend `RunState` to cover pause, intermission, and summary states; document their transitions.
- Introduce lifecycle-specific systems (bootstrapping, world generation, run summary) in `engine/` and `ui/`.
- Wire HUD, audio, and content loading phases so they align with the lifecycle checkpoints above.
- Track deliverables in `docs/ROADMAP.md` and surface blockers in `review-notes.md` as we close the delta between the MVP loop and the final experience.
