# Rog8

Procedural 8-bit roguelike where every run is deterministically generated from a single seed—maps, enemies, audio, sprites, and loot all emerge from the same code-driven pipeline.

## Status
- Current focus: Phase 1 MVP (seeded core loop, deterministic systems, minimal content)
- Repo is pre-playable; scaffolding, plans, and tooling are being laid out before implementation

## Overview
Rog8 explores a fully generated roguelike experience inspired by home-computer aesthetics. The engine is written in TypeScript atop Vite, following an Entity-Component-System (ECS) architecture. Rendering, audio, world generation, combat, and UI modules consume the shared deterministic seed, so replays of the same seed reproduce the run exactly.

### Planned Feature Highlights
- Seed-deterministic world, combat, audio, and visuals (mulberry32/xoshiro RNG stack)
- Pixel-perfect HTML5 Canvas renderer at 256×144 virtual resolution with integer scaling
- Procedural sprites, palettes, and chiptune soundscape generated on startup
- Modular ECS runtime designed for pure systems and predictable ticks
- HUD overlay that reflects run state (HP, keys, coins, floor) without breaking scaling

## Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- pnpm 8+

### Install Dependencies
```bash
pnpm install
```

### Development Workflow
- `pnpm dev` – start the Vite dev server at http://localhost:5173
- `pnpm build` – produce a production build under `dist/`
- `pnpm preview` – serve the built bundle locally for smoke tests
- `pnpm lint` – run ESLint/Prettier checks (required after procedural changes)

> ℹ️ **Testing:** There is a known agent deadlock bug in the harness—run `pnpm test` manually only when you need verification, and jot down any flaky behaviour for follow-up.

## Project Layout
```
.
|-- docs/                 # Concept brief, roadmap, tech stack, and implementation plans
|-- scripts/              # Automation helpers (e.g., GitHub issue sync)
|-- src/
|   |-- assets/           # Generated asset pipeline scaffolding
|   |-- audio/            # Seeded synth logic and music systems
|   |-- combat/           # Damage, AI behaviour, status effects
|   |-- content/          # JSON-driven biome and entity data
|   |-- engine/           # ECS runtime, RNG utilities, lifecycle management
|   |-- render/           # Canvas bootstrap, palette helpers, sprite generation
|   |-- shared/           # Cross-cutting utilities reused by multiple domains
|   |-- ui/               # HUD states, overlays, and menus
|   `-- world/            # Map generation and environment logic
`-- AGENTS.md             # Root contributor expectations and workflow guardrails
```
Each top-level directory that guides autonomous work maintains its own `AGENTS.md` with local conventions—review them before touching a module.

## Documentation & Planning
- Concept: `docs/GAME_CONCEPT.md`
- Technical overview: `docs/TECH_STACK.md`
- Roadmap: `docs/ROADMAP.md`
- Implementation plans: `docs/plans/`

Update the relevant doc when introducing new mechanics or altering the scope. Major structural changes should also cross-link the appropriate `AGENTS.md` files.

## Roadmap at a Glance
Phase 1 targets a playable minimal run: canvas setup, deterministic RNG, procedural player sprite, basic map generation, chase AI, melee and ranged combat, baseline SFX/music, HUD wiring, and restart with identical seed. Later phases expand biome variety, audio depth, progression, community features, and polish. See `docs/ROADMAP.md` for full details.

## Contribution Guidelines
- Use Prettier + ESLint defaults (two-space indent, semicolons, single quotes, explicit types)
- Keep systems pure to preserve deterministic seeds; thread RNG through dependency injection
- Follow Conventional Commits (`feat: add roguelike map generator`) and scope each commit to a single system or bug fix
- Before major features, draft an outline in `docs/plans/` and reflect scope changes in `docs/ROADMAP.md`
- When you want to track TODOs, feel free to use `scripts/create-phase1-issues.js` to sync entries; start with `--dry-run` to sanity-check output

## Support & Next Steps
If you need the test suite executed, platform deployment checked, or issue automation run without sandbox restrictions, just note the task in `docs/ROADMAP.md` or open a personal GitHub issue via the helper script. For visual updates, capture GIFs or screenshots for your own records and reference any touched plan or roadmap sections in commit messages.

Happy hacking—and don’t forget to note the seed of your favourite runs!
