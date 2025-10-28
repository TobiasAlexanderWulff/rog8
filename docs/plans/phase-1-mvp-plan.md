# Phase 1 MVP Plan

## Summary
- Reorients Phase 1 toward shipping a "First Playable" vertical slice before layering on feature depth.
- Keeps deterministic architecture requirements while allowing placeholder art/audio until after first playable.
- Splits work into Milestone A (First Playable) and Milestone B (post-playable polish) to unblock rapid iteration.

## Goals
- Deliver a controllable run (move, fight, win/lose, restart) as soon as possible to validate the loop.
- Verify deterministic behaviour across render, world, enemy, and restart systems using shared seeds.
- Document deferred work so audio, ranged combat, and cosmetic generation can follow without blocking iteration.

## Milestone A – First Playable
### Seeded RNG Core
- Implementation
  - Add mulberry32 implementation in `src/shared/random.ts` plus helper functions for ints/floats.
  - Expose a run seed object that all systems read via dependency injection (engine context or ECS resource).
  - Provide simple utilities/tests to confirm identical seeds reproduce identical streams.
- Dependencies: Requires decision on default seed source (random vs fixed) surfaced by UI.
- Acceptance: Identical seeds yield identical sequences across systems; restart reuses the same seed without drift.

### Canvas Bootstrap & Input Loop
- Implementation
  - Create `src/render/bootstrap.ts` to mount a 256×144 canvas with integer scaling and letterboxing.
  - Set `imageSmoothing=false`, listen for resize, and ensure draw loop ties into engine tick/update cadence.
  - Add keyboard input manager (e.g., `src/engine/input.ts`) storing deterministic key state per frame.
- Dependencies: Needs HTML entry point wiring (Vite) and the RNG core for seed display/debug overlays.
- Acceptance: Placeholder scene renders at correct scale, resizing keeps integer pixels, and input state logs correctly.

### Player Entity & Movement
- Implementation
  - Define player components (`Player`, `Transform`, `Velocity`, `Health`) and register ECS systems.
  - Bind movement to WASD/arrow input, clamping speed and ensuring deterministic updates per tick.
  - Implement collision against tile map boundaries (solid tiles stop movement).
- Dependencies: Requires input loop and map collision data.
- Acceptance: Player moves consistently, cannot leave walkable tiles, and state resets cleanly on restart.

### Simple Mapgen Slice
- Implementation
  - Implement `src/world/mapgen/simple.ts` that builds rooms + corridors using the seeded RNG.
  - Output tile grid + spawn positions for player, exits, and initial enemy.
  - Supply metadata (walkable mask, collision grid) for other systems.
- Dependencies: Uses RNG core and must agree with engine tile definitions.
- Acceptance: Same seed → same layout; entrance connects to exit; at least one enemy spawn point is reachable.

### Enemy Encounter (Chase)
- Implementation
  - Create basic enemy component and spawn routine tied to mapgen metadata.
  - Implement chase AI moving toward player while respecting collisions and deterministic tick timing.
  - Define simple damage impact (touch or triggered attack) communicated via events/components.
- Dependencies: Requires player movement + map collision + RNG for spawn rolls.
- Acceptance: Enemy consistently approaches player, respects walls, and behaviour is repeatable per seed.

### Melee Combat MVP
- Implementation
  - Add melee attack action triggered by key (e.g., Space) with short cooldown.
  - Resolve hits through overlap/adjacency checks, applying deterministic damage to player/enemy health.
  - Emit combat events for HUD/logging and queue defeat/game-over states.
- Dependencies: Player/enemy components and chase behaviour.
- Acceptance: Player can defeat enemy, enemy can defeat player, and combat outcome repeats with same inputs/seed.

### HUD Essentials
- Implementation
  - Render minimal HUD overlay (within canvas or DOM) showing HP and current seed.
  - Update HUD via ECS query/event subscription when health or seed changes.
  - Provide basic game-over messaging to instruct restart key.
- Dependencies: Requires combat system events and render bootstrap layering.
- Acceptance: HUD stays in sync with health changes and shows seed without jitter across restarts.

### Restart with Same Seed
- Implementation
  - Build run controller managing states: init, playing, game over, restart.
  - On restart, reset ECS world using stored seed, clearing transient state (enemies, projectiles, timers).
  - Hook restart to keypress (e.g., R) and after loss, optionally auto-prompt player.
- Dependencies: All previous systems must expose reset hooks.
- Acceptance: Restart reproduces identical map/enemy placements and player stats; no stale data persists.

## Milestone B – Post-Playable Enhancements
### Procedural Player Sprite Generator (16×16)
- Implementation
  - Generate seeded sprite atlas under `src/assets/` (mirrored bitmap + palette from seed).
  - Provide fallback dev sprite and integrate into render system in place of placeholder.
  - Document generator knobs in `docs/TECH_STACK.md` if new concepts appear.
- Dependencies: Requires RNG core and render bootstrap.
- Acceptance: Same seed yields identical sprites; player sprite swaps seamlessly without breaking scaling.

### Ranged Combat & Projectiles
- Implementation
  - Introduce projectile components/system with deterministic travel + collision.
  - Allow player (and optionally enemy) to fire ranged attacks with cooldowns.
  - Clean up projectiles on collision or when out of bounds.
- Dependencies: Melee combat foundation, map collision.
- Acceptance: Projectiles function deterministically, respect walls, and integrate with restart flow.

### Six Baseline SFX
- Implementation
  - Implement seeded SFX generator for hit/shoot/death/pickup/step/UI.
  - Route playback through WebAudio mixer with volume controls and mute.
  - Trigger sounds from combat and HUD events.
- Dependencies: Combat events, run controller.
- Acceptance: Each event plays unique sound without clipping; same seed reproduces sound parameters.

### Single Music Loop (Seed-Based)
- Implementation
  - Add procedural loop or curated pattern seeded from run seed in `src/audio/music/`.
  - Start loop on run start, stop/reset on restart.
  - Balance mix against SFX bus.
- Dependencies: Audio mixer foundation.
- Acceptance: Loop plays seamlessly, respects seed, and restarts cleanly.

### HUD Extensions (Keys, Coins, Floor)
- Implementation
  - Expand HUD to include inventory counters and floor tracking once systems exist.
  - Hook into world/combat systems for key/coin increments and floor transitions.
  - Maintain readability and deterministic updates.
- Dependencies: Future content systems.
- Acceptance: HUD reflects extended data without regressing core metrics.

## Dependencies & Integration Notes
- Finish Milestone A sequentially; avoid parallel work that blocks restart/reset testing.
- ECS registration order must remain deterministic; seed and timing injected via run controller.
- Use placeholders (solid colours, silent audio) during Milestone A to keep focus on loop validation.

## Validation Strategy
- Unit tests for RNG and mapgen determinism; smoke tests for restart flow.
- Manual playtest checklist: spawn → move → fight → die/win → restart; record observations per seed.
- When milestones land, run `pnpm lint` and `pnpm test` yourself (or note any blockers in the roadmap) before merging.

## Risks
- Restart bugs if any system caches non-seeded globals; enforce reset hooks.
- Input handling must be deterministic across browsers; consider key-repeat normalisation.
- Placeholder art/audio may linger—track follow-up issues under Milestone B to ensure polish happens.

## Open Questions (Resolved)
- Base resolution remains 256×144 with integer scaling.
- Seed source: random seed per run, surfaced in HUD; restart reuses stored seed until we add full seed selector UI.
- Placeholder policy: Milestone A may ship with coloured rectangles and silence; replace via Milestone B deliverables.

## Next Steps
- Sequence Milestone A deliverables into Github issues via `scripts/create-phase1-issues.js --dry-run` to validate descriptions.
- Kick off work with Canvas/RNG + Player movement to reach a controllable prototype quickly.
- After first playable, reassess audio/visual scope and adjust roadmap entries as needed.
