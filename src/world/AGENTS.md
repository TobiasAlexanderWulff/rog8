# Src/World Agent Guide

## Scope
`src/world/` encapsulates overworld simulation, map generation, exploration systems, and related data flows.

## Expectations
- Model state changes through ECS components from `engine/`; avoid direct DOM or rendering calls.
- Keep procedural generation deterministic using seeded utilities from `shared/`.
- Document new mechanics or biomes in `docs/GAME_CONCEPT.md` and update the roadmap when scope evolves.

## Hygiene
- House specs under `src/world/__tests__/` with reproducible seeds noted in headers.
- Share cross-domain helpers via `src/shared/` rather than duplicating logic here.
- When introducing new content schemas, sync formats with `src/content/` and record the contract in docs.
