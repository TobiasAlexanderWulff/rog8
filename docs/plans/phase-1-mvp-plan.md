# Phase 1 MVP Plan

## Summary
- Aligns with [Phase 1 in the roadmap](../ROADMAP.md#%F0%9F%A7%B1-phase-1-mvp-23-wochen) to deliver a fully playable minimal roguelike run without scoping on calendar time.
- Focuses on seed-deterministic systems across rendering, world generation, combat, audio, and UI so later phases build on stable foundations.
- Explicitly limits content breadth; the MVP prioritises functionality, repeatability, and clear hooks for Phase 2 expansion.

## Goals
- Ship a deterministic gameplay loop: title spawn → explore seeded map → fight enemies → collect loot → reset with identical seed.
- Establish baseline tooling (rendering, ECS systems, audio mixers) that satisfies MVP requirements and exposes extension points.
- Verify that each deliverable integrates with `engine/`, `render/`, `audio/`, `world/`, `combat/`, and `ui/` modules following repo conventions.

## Deliverables

### Canvas setup with integer scaling
- Implementation
  - Introduce a render bootstrap in `src/render/` that initialises a pixel-perfect canvas sized by design resolution and display scale factor.
  - Ensure resize handling keeps integer scaling (no fractional pixels) and letterboxes unused space.
  - Expose helpers for drawing sprites (including offscreen buffers) shared with future render systems.
- Dependencies: Requires baseline HTML shell (Vite entry) and knowledge of expected design resolution (confirm in Open Questions).
- Acceptance: Canvas renders placeholder scene at intended resolution, scaling remains stable across window resizes, and render utilities are documented in `docs/TECH_STACK.md` if new concepts emerge.

### Seeded RNG (mulberry32)
- Implementation
  - Add deterministic RNG utility under `src/shared/random.ts` implementing mulberry32 with seed injection.
  - Provide helpers for common distributions used in mapgen, loot, and audio (uniform int ranges, float ranges).
  - Integrate RNG source with ECS systems via dependency injection to avoid global state.
- Dependencies: Confirm seed source (user input vs system default) with UI plan; requires storage for restart state.
- Acceptance: Unit tests cover repeatability for identical seeds, systems consume injected RNG, and restarting with same seed replays identical outputs.

### Player sprite generator (16×16)
- Implementation
  - Create procedural sprite generator inside `src/assets/` pipeline, optionally using seed to derive palette and features.
  - Export generated sprite as in-memory atlas; provide fallback static asset for debugging.
  - Integrate with render system to draw sprite in scene; document sprite params in `docs/GAME_CONCEPT.md` if changed.
- Dependencies: Needs RNG utilities, canvas helper for drawing, and knowledge of player animation frames.
- Acceptance: Sprite deterministically matches seed, renders correctly on canvas, and generator outputs validated via snapshot (image or data structure).

### Simple map generation (rooms & corridors)
- Implementation
  - Place procedural mapgen in `src/world/mapgen/` generating rectangular rooms connected by corridors using seeded RNG.
  - Define tile data structures and collision layers compatible with engine ECS.
  - Add tests under `src/world/__tests__/` verifying deterministic layout and connectivity constraints.
- Dependencies: RNG, tile definitions, entity placement system.
- Acceptance: Map always connects entrance to exit, tile budget respects target room count, and generation results stable across reruns with same seed.

### Enemies with chase AI state
- Implementation
  - Define base enemy component (PascalCase) and behaviour system in `src/combat/` or `src/engine/` behaviour pipeline.
  - Implement chase behaviour (move toward player) with configurable speed/aggro radius.
  - Integrate pathing against map collision grid; ensure deterministic movement tied to tick updates.
- Dependencies: Map collision data, player position tracking, physics/movement module.
- Acceptance: Enemies spawn per map seed, pursue player reliably, and no desync occurs on restart.

### Combat (melee & ranged)
- Implementation
  - Establish combat system in `src/combat/` handling attack inputs, damage resolution, and hit feedback.
  - Define melee (adjacent tiles) and ranged (projectile) mechanics, including projectile pooling in engine.
  - Wire into audio (`hit`, `shoot`) and UI feedback (HP changes) so states update synchronously.
- Dependencies: Enemy and player components, map collision, RNG for damage variation if any.
- Acceptance: Combat resolves deterministically, projectiles respect collision, and both player/enemy deaths trigger appropriate states.

### Six baseline SFX
- Implementation
  - Build audio asset generator in `src/audio/` to synthesize seeded SFX for hit, shoot, death, pickup, step, UI events.
  - Provide audio bus/mixer configuration with volume normalization and global mute toggle.
  - Trigger sounds from relevant systems via event dispatcher.
- Dependencies: RNG for sound parameters, event system hooks.
- Acceptance: All six events play distinct sounds, respond to seed, and mix without clipping.

### Single music loop (seed-based)
- Implementation
  - Create lightweight procedural music generator or pre-seeded loop in `src/audio/music/` seeded from run seed.
  - Ensure seamless looping, start/stop tied to run lifecycle, and mixing respects SFX bus levels.
- Dependencies: Audio mixer, RNG.
- Acceptance: Loop plays on run start, stops on restart, and deterministic patterns for given seed.

### HUD (HP, keys, coins, floor)
- Implementation
  - Develop HUD module in `src/ui/` rendering textual and iconographic elements atop canvas via overlay or within canvas.
  - Bind HUD state to ECS components (player health, inventory) and floor progression from world state.
  - Include minimal styling aligning with pixel aesthetic; ensure readability under integer scaling.
- Dependencies: Data from combat/world modules, render layering.
- Acceptance: HUD stays in sync with state updates, scales cleanly, and updates deterministically on restart.

### Restart with same seed
- Implementation
  - Add run controller managing lifecycle state (start, game over, restart) in `src/engine/`.
  - Persist current seed across restart event, resetting RNG streams and reinitialising subsystems deterministically.
  - Provide UI affordance (keyboard shortcut or menu) to trigger restart and optional seed display for debugging.
- Dependencies: RNG integration across systems, state cleanup routines.
- Acceptance: Restart reproduces identical map, enemies, audio, and HUD values with no residual state.

## Dependencies & Integration Notes
- ECS coordination: ensure new systems register with existing engine scheduler; pipe deterministic tick rate.
- Asset pipeline: generated sprites/audio must respect `.gitignore` expectations; avoid writing to disk at runtime.
- Documentation: update relevant docs (`docs/TECH_STACK.md`, `docs/GAME_CONCEPT.md`) when introducing new concepts or parameters.

## Validation Strategy
- Provide targeted unit tests where determinism is critical (RNG, mapgen, restart logic).
- Implement manual test checklist covering run start, combat loop, audio triggers, HUD updates, and restart scenario.
- Request maintainer to execute `pnpm test` and `pnpm lint` before merging; document test instructions in PR template if needed.

## Risks
- Render scaling artefacts if device pixel ratio handling is inconsistent across browsers; mitigate with integration tests on desktop targets.
- Deterministic restart may fail if any subsystem caches non-seeded state (e.g., audio randomization); conduct cross-system review before sign-off.
- Procedural asset generation could impact startup time; profile and cache results in memory to avoid frame drops.

## Open Questions (Resolved)
- Base resolution: Target `256×144` to preserve a 16×16 tile grid while filling modern 16:9 displays; monitor performance/readability and revisit if needed.
- Seed source: Generate a random seed each run, surface it in the HUD or debug overlay, and ensure restart reuses it until Phase 2 introduces full seed input UX.
- Placeholder assets: Keep procedural generation for core sprites (player/enemies) but permit temporary static UI assets (fonts/icons) tracked for replacement in Phase 2.

## Next Steps
- Finalise outstanding decisions in Open Questions with stakeholders.
- Sequence implementation order (render/RNG → mapgen → entities → combat → audio → HUD → restart) and create tasks in issue tracker.
- Begin prototyping canvas setup and RNG foundation to unblock downstream systems.
