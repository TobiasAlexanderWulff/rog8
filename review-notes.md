# Review Notes

- [x] Ensure melee resources are re-registered after `RunController.restart()` so post-restart runs still process damage (`src/engine/run-controller.ts:271`, `src/combat/melee-system.ts:75`).
- [x] Plan HUD styling improvements (layout polish, typography, responsive states) before implementing the Milestone B visual pass (see `docs/plans/hud-styling-plan.md`).
- [ ] Milestone B follow-up: replace the temporary rectangle renderer with the seeded sprite/tile pipeline (plus accompanying audio cues) outlined in `docs/plans/phase-1-mvp-plan.md#milestone-b` and the dedicated sprite brief in `docs/plans/player-sprite-generator-plan.md`.
