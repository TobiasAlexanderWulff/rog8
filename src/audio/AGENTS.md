# Src/Audio Agent Guide

## Scope
`src/audio/` owns synthesis, sequencing, and audio routing for the project.

## Expectations
- Keep audio graphs deterministic by deriving all randomness from seeded inputs.
- Prefer Web Audio API abstractions layered behind typed helpers to simplify testing.
- Store reusable envelopes, oscillators, and effect chains in modular files.

## Hygiene
- Place fixtures and golden references under `src/audio/__tests__/` and document tolerances.
- Version any static audio assets under `src/assets/` and keep generated buffers out of git via `.gitignore`.
- Coordinate large audio pipeline shifts with `docs/plans/` and surface risks in `docs/ROADMAP.md`.
