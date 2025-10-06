# Src/Assets Agent Guide

## Scope
`src/assets/` houses tracked art, audio, and data assets that ship with the game. Generated or temporary artifacts belong in ignored subdirectories (see `.gitignore`).

## Expectations
- Commit only source assets that are necessary for builds; keep large binaries optimized.
- Document asset provenance and regeneration steps in adjacent README snippets or `docs/plans/`.
- Route runtime loaders through typed helpers in `src/shared/` or domain modules.

## Hygiene
- Store generated outputs under `src/assets/generated/` or `src/assets/tmp/` (gitignored).
- Verify licensing and attribution before adding third-party assets; note credits in `docs/GAME_CONCEPT.md` if applicable.
- Update this guide if asset pipelines evolve or new conventions emerge.
