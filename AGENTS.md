# Repository Guidelines

## Project Structure & Module Organization

Source lives in `src/`, grouped by domain: `engine/` (ECS runtime), `render/` (canvas helpers), `audio/` (synth logic), `world/` and `combat/` (gameplay), and `ui/` (HUD states). Place shared helpers in `src/shared/`, content JSON in `src/content/`, and generated assets under `src/assets/`. Keep high-level references in `docs/` next to the concept, roadmap, and tech stack briefs.

## Build, Test, and Development Commands

Enable Corepack and pin pnpm via `corepack use pnpm@10.19.0`, then run `pnpm install`. Use `pnpm dev` for the Vite dev server at `http://localhost:5173`. Ship builds with `pnpm build` (outputs to `dist/`), preview locally via `pnpm preview`, lint with `pnpm lint`, run type checks with `pnpm typecheck`, execute tests with `pnpm test` (note the harness flakiness), and keep formatting consistent with `pnpm format` / `pnpm format:check`.

## Coding Style & Naming Conventions

Follow Prettier + ESLint defaults: two-space indentation, semicolons, single quotes. Use camelCase for variables and systems, PascalCase for classes and ECS components, and kebab-case for files (`status-effects.ts`). Prefer explicit types over `any` and keep systems pure to preserve deterministic seeds.

- Document TypeScript APIs with full [TSDoc](https://tsdoc.org/) syntax. When adding or editing docstrings, prefer `/** ... */` blocks that include `@remarks`, `@example`, `@throws`, and other relevant tags so consumers get complete IntelliSense context. Fully leverage TSDoc sections to capture invariants, side effects, and usage patterns, demoting legacy JSDoc-style `@param`/`@returns` usage unless required for clarity—translate guidance into canonical TSDoc tags instead.

## Versioning & Core Docs

Bump `package.json` with Semantic Versioning for every shipped change and tag releases. Document major features or mechanics in `docs/` and maintain them. Keep the root `README.md` as the authoritative quickstart and `.gitignore` trimmed so generated sprites, builds, and logs stay out of version control.

## Agent Documentation Hygiene

Every directory guiding autonomous work must own an `AGENTS.md` that explains local expectations; update them alongside structural changes and cross-link root guidance when useful.

- Track outstanding code review feedback in `review-notes.md` at the repo root until addressed.

## Testing Guidelines

Specs live in `src/**/__tests__/` mirroring module paths (`src/world/__tests__/mapgen.spec.ts`). The automation harness still has a deadlock bug, so run `pnpm test` only when you actively need results and record any flaky behaviour alongside TODOs. Continue writing deterministic tests with seeded fixtures and note intentional gaps in the file header.

## Planning & Scope Management

If a task widens, split it, capture sub-plans, and reflect scope changes in `docs/ROADMAP.md`. Draft implementation outlines in `docs/plans/` before major features so plan, roadmap, and code stay aligned.

## Issue Tracking & Automation

- Use GitHub Issues when it helps you stay organised—reference plan sections in titles (`Phase1: Canvas setup`) to keep the backlog tidy.
- The helper script `node scripts/create-phase1-issues.js` can scaffold tasks from `docs/plans/phase-1-mvp-plan.md`; run it with `--dry-run` first so you can review output before creating real issues.
- Keep labels lightweight (`phase-1` is enough for now) and skip milestone setup unless you decide to schedule releases.
- When the script creates duplicate issues, close extras with a quick note to yourself that points to the primary ticket.

## Commit & Pull Request Guidelines

Stick to Conventional Commits (`feat: add roguelike map generator`) and keep each commit focused on one system or bug fix. When you open a PR or push to a hosted remote, include a concise summary, attach screenshots or GIFs for visual tweaks, and note playtest seeds plus any doc sections you updated.

- After completing a task, if uncommitted changes remain, suggest an appropriate Conventional Commit message alongside the handoff so follow-up commits stay consistent.
