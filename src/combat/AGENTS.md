# Src/Combat Agent Guide

## Scope

`src/combat/` manages battle systems, turn resolution, AI behaviors, and combat-specific data structures.

## Expectations

- Drive combat through ECS components and systems defined in `engine/`.
- Ensure balancing math is deterministic; document tuning knobs and seeded simulators.
- Record new mechanics or status effects in `docs/GAME_CONCEPT.md` and link to design plans when appropriate.

## Hygiene

- Keep tests in `src/combat/__tests__/`, focusing on reproducible encounter fixtures.
- Share common math or utility functions via `src/shared/` to reduce duplication.
- Note outstanding tuning tasks or follow-up experiments in `docs/ROADMAP.md`.
