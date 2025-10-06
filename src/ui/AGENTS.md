# Src/UI Agent Guide

## Scope
`src/ui/` covers HUD state, overlays, menus, and input adapters that bridge gameplay to presentation.

## Expectations
- Keep UI state derived from world/combat data via selector helpers; avoid business logic duplication.
- Use deterministic mock state for tests and story-style fixtures.
- Document meaningful UX changes in PR summaries with supporting captures.

## Hygiene
- Place UI tests in `src/ui/__tests__/` and prefer lightweight, deterministic render harnesses.
- Centralize shared components or hooks under `src/shared/` when reused outside UI.
- Sync UI terminology with docs by updating `docs/GAME_CONCEPT.md` or related references as needed.
