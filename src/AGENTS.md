# Src Agent Guide

## Scope

This directory houses all runtime code grouped by domain (`engine/`, `render/`, `audio/`, `world/`, `combat/`, `ui/`, and shared infrastructure). Keep source files aligned with the structure called out in the repository root `../AGENTS.md`.

## Expectations

- Use TypeScript with strict typing; avoid `any` unless a TODO justifies it.
- Preserve deterministic behavior: systems should be pure and driven from seeded inputs.
- Mirror tests under `__tests__/` per module, noting known gaps in the file header.
- Cross-reference relevant docs in `../docs/` when behavior changes.

## Workflow

- Introduce new domains via subdirectories, each with its own `AGENTS.md` outlining local rules.
- Coordinate major feature work with a plan in `../docs/plans/` and update `../docs/ROADMAP.md` for scope changes.

## Hygiene

- Stick to kebab-case filenames and keep modules small and composable.
- Prefer repository-relative imports and centralize shared helpers in `shared/`.
- Ensure generated artifacts land under `assets/` or a tracked output directory and remain gitignored when appropriate.
