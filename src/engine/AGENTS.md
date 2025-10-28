# Src/Engine Agent Guide

## Scope

`src/engine/` owns the ECS runtime, scheduling, and systemic plumbing shared across the game. Treat this as foundational infrastructure.

## Expectations

- Keep systems pure and deterministic; inject randomness via seeded services defined in `shared/`.
- Expose engine APIs through stable TypeScript interfaces; document changes in `docs/TECH_STACK.md` when tooling shifts.
- Avoid leaking game-domain concerns (world, combat, UI) into the engine.

## Hygiene

- Co-locate engine-level tests under `src/engine/__tests__/` with seeded fixtures.
- Profile or benchmark helpers belong in `docs/plans/` before landing significant architectural refactors.
- When engine changes ripple outward, note required follow-up work in `docs/ROADMAP.md`.
