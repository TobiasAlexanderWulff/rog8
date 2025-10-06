# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, grouped by domain: `engine/` (ECS runtime), `render/` (canvas helpers), `audio/` (synth logic), `world/` and `combat/` (gameplay), and `ui/` (HUD states). Place shared helpers in `src/shared/`, content JSON in `src/content/`, and generated assets under `src/assets/`. Keep high-level references in `docs/` next to the concept, roadmap, and tech stack briefs.

## Build, Test, and Development Commands
Run `pnpm install` once. Use `pnpm dev` for the Vite dev server at `http://localhost:5173`. Ship builds with `pnpm build` (outputs to `dist/`), preview locally via `pnpm preview`, and lint with `pnpm lint` after procedural changes.

## Coding Style & Naming Conventions
Follow Prettier + ESLint defaults: two-space indentation, semicolons, single quotes. Use camelCase for variables and systems, PascalCase for classes and ECS components, and kebab-case for files (`status-effects.ts`). Prefer explicit types over `any` and keep systems pure to preserve deterministic seeds.

## Versioning & Core Docs
Bump `package.json` with Semantic Versioning for every shipped change and tag releases. Document major features or mechanics in `docs/` and maintain them. Keep the root `README.md` as the authoritative quickstart and `.gitignore` trimmed so generated sprites, builds, and logs stay out of version control.

## Agent Documentation Hygiene
Every directory guiding autonomous work must own an `AGENTS.md` that explains local expectations; update them alongside structural changes and cross-link root guidance when useful.

## Testing Guidelines
Specs live in `src/**/__tests__/` mirroring module paths (`src/world/__tests__/mapgen.spec.ts`). Because of the known agent deadlock bug, do not run the suite yourself; request a maintainer to execute `pnpm test` (or `--watch`) and report results. Continue writing deterministic tests with seeded fixtures and note intentional gaps in the file header.

## Planning & Scope Management
If a task widens, split it, capture sub-plans, and reflect scope changes in `docs/ROADMAP.md`. Draft implementation outlines in `docs/plans/` before major features so plan, roadmap, and code stay aligned.

## Commit & Pull Request Guidelines
With no history yet, adopt Conventional Commits (`feat: add roguelike map generator`). Keep commits scoped to one system or bug fix. Pull requests need a concise summary, screenshots or GIFs for visual tweaks, reproduction steps for bug fixes, checked playtest seeds, and links to any roadmap or plan documents touched.
