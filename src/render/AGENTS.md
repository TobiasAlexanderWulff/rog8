# Src/Render Agent Guide

## Scope

`src/render/` implements canvas helpers, draw pipelines, and presentation logic decoupled from gameplay.

## Expectations

- Keep rendering systems stateless where possible; feed them precomputed view models from game domains.
- Centralize browser/Canvas API interactions here and gate feature detection with shared utilities.
- Document visual changes in screenshots or short clips for PRs.

## Hygiene

- Mirror tests under `src/render/__tests__/` using deterministic snapshots or pixel mocks.
- Avoid bundling heavyweight assets; reference generated sprites under `src/assets/` instead.
- Coordinate shader or renderer overhauls with a plan in `docs/plans/` before large rewrites.
