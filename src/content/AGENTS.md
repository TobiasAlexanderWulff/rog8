# Src/Content Agent Guide

## Scope
`src/content/` stores JSON or data-driven definitions for items, encounters, maps, and other authored content.

## Expectations
- Keep files deterministic and schema-validated; document schema changes alongside code updates.
- Reference seeds or generation logic from `src/world/` and `src/combat/` as appropriate.
- Maintain human-readable formats with comments or docs stored separately when needed.

## Hygiene
- Validate content through dedicated loaders or tests under `src/content/__tests__/`.
- Avoid checking in generated content; instead, capture source parameters and generation steps in `docs/plans/` if reproducibility matters.
- Link significant content updates back to `docs/GAME_CONCEPT.md` and `docs/ROADMAP.md` for traceability.
