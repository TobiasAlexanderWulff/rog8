# HUD Styling Improvement Plan

## Summary

- Establishes the layout, typography, and responsive rules the HUD must adopt before the Milestone B visual pass expands content and rendering fidelity.
- Keeps the overlay DOM defined in `src/ui/hud.ts` but layers modern CSS primitives (custom properties, flex/grid, container queries) so we can evolve visuals without revisiting runtime code.
- Ensures deterministic runs stay readable across desktop/laptop/tablet widths while leaving room for extra stats (keys, coins, floors) called out in `docs/plans/phase-1-mvp-plan.md#hud-extensions-keys-coins-floor`.

## Goals

1. Ship a polished HUD overlay whose layout reinforces gameplay hierarchy (HP > run seed > future inventory).
2. Introduce a font stack and scale system that supports crisp pixel text inside the 256×144 canvas context as well as higher-DPI wrappers.
3. Define responsive breakpoints + state transitions so the HUD remains legible when Vite's dev server is resized or embedded.
4. Document implementation phases, dependencies, and validation so Milestone B art can focus on sprites/tiles without redesigning the HUD again.

## Current HUD Snapshot

- Rendering/logic already wired: `createHud`, `updateHud`, and `showGameOver` generate semantic rows with `.hud-row`, `.hud-label`, `.hud-value`.
- No CSS exists; overlay inherits browser defaults, so spacing, alignment, and typography drift between devices.
- Overlay anchoring is implicit (div appended after `#app`). It should explicitly pin to the viewport/canvas bounds so letterboxed layouts do not push it off-screen.
- Game-over presentation currently reuses the base rows; it needs distinct styling + focus management to read as a modal within the HUD layer.

## Layout Polish

### Overlay Structure

- Position `#hud` as an absolute layer atop the canvas (top: 0, left: 0, width/height: 100%) with `pointer-events: none` to avoid intercepting gameplay input.
- Create `.hud-overlay` as a flex column anchored to the canvas safe area (padding tokens described below). Use `gap` for vertical rhythm and `mix-blend-mode: normal` so text stays readable over dark/light scenes.
- Introduce CSS custom properties for spacing (`--hud-gap`, `--hud-pad`, `--hud-radius`) and colors (`--hud-bg`, `--hud-muted`, `--hud-accent`) seeded from the current scene color palette in `src/main.ts` (`SCENE_COLORS`). These will later sync with Milestone B palette swaps.

### Data Blocks

- Keep each `.hud-row` as a CSS grid with two columns (`auto 1fr`) to align the label and value. Use `text-transform: uppercase` on labels, `font-variant-numeric: tabular-nums` on values for deterministic width.
- Add `.hud-row--status` background chips to highlight HP (semi-transparent panel with blur/backdrop) and `.hud-row--seed` as a pill that can truncate long seed values gracefully (use `overflow-wrap: anywhere` for debug seeds).
- Reserve horizontal space for upcoming counters by allowing `.hud-row-stack` (flex row) when the viewport is wide enough; collapse back to column-layout on narrow states.

### Game-Over Layer

- Style `.hud-row--game-over` as a centered card anchored near the canvas middle using CSS transforms so it reads as an overlay panel.
- Provide semantic color tokens (`--hud-alert-bg`, `--hud-alert-text`) to differentiate failure states, and leave room for success/victory styling later.
- Add a subtle focus outline if we later provide keyboard focus or buttons (restart, seed copy) to keep accessibility intact.

## Typography System

- Font stack: `--hud-font-sans: 'Space Grotesk', 'IBM Plex Sans', system-ui, sans-serif` for labels/headings; `--hud-font-mono: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace` for numeric values. Host custom fonts locally under `src/assets/fonts/` when art is ready; until then rely on system fallbacks to avoid blocking renders.
- Base size: `--hud-font-size: clamp(12px, 1.6vw, 18px)` ensuring HUD stays legible on both 720p recordings and laptop screens.
- Weight map: labels at 500, values at 600, game-over title at 700. Apply `letter-spacing: 0.08em` to labels to mimic arcade/UI aesthetics.
- Introduce CSS logical tokens for line-height (`--hud-line: 1.2`) and drop-shadows to keep text crisp over variable backdrops.

## Responsive Behaviour

- **Baseline (≤640px width):** Stack HUD rows vertically, center-align text, expand rows to full width, and pin overlay to top center with generous vertical gap so touchscreen/laptop portrait displays keep readability.
- **Comfort (641–1023px):** Left-align overlay, limit width to 360px, align rows using two-column grid, and show HP + seed side-by-side using `.hud-row-stack` flex wrapper.
- **Wide (≥1024px or canvas letterboxed):** Anchor overlay to top-left with extra padding; expose horizontal HUD bar (HP | Seed | future counters) and enable optional mini-log slot for flavor text once Milestone B unlocks it.
- Add a densified mode triggered by height constraints (`@media (max-height: 540px)`) that shrinks font size by 1 step and reduces padding to avoid covering too much canvas real estate.
- Respect `prefers-reduced-motion` by disabling any blur/fade transitions; default animation can be a simple opacity transition for game-over reveal on capable devices.

## Implementation Phases

1. **Scaffold Styles (Day 1)**
   - Add `src/ui/hud.css`, import from `src/main.ts`, and register base variables on `:root` + `#hud`.
   - Implement overlay positioning, base flex/spacing, typography tokens, and `prefers-reduced-motion` guard.

2. **Layout Modules (Day 2)**
   - Style `.hud-row` variants, seed/HP chips, and responsive media queries or container queries (prefer `@container` on `#hud` if browser support meets targets, fallback to `@media`).
   - Add classes/hooks for future counters (`.hud-metric`, `.hud-metric-label`, `.hud-metric-value`) so Milestone B HUD extensions drop in without reworking CSS.

3. **Game-Over & Responsive Polish (Day 3)**
   - Implement overlay card styling, focus outlines, and motion tokens.
   - Test across Chrome, Firefox, and Safari responsive modes to ensure breakpoints hold; capture screenshots for PR docs.
   - Update docs (`docs/ROADMAP.md` entry under HUD, `docs/program-lifecycle.md` if lifecycle references HUD states) to reflect the finished styling pass.

## Dependencies & Collaboration Notes

- Coordinate with render layer owners to ensure canvas padding/letterboxing math exposes safe insets for the HUD overlay (may require exposing `RenderContext` sizes to CSS via custom properties).
- Milestone B art direction may adjust color palette; keep tokens defined in CSS and optionally mirror them in TypeScript constants for runtime-driven themes.
- Future HUD data (keys/coins/floor) must only require DOM insertions, not CSS rewrites. Provide utility classes and document them once implemented.

## Risks & Open Questions

- **Font licensing:** confirm whether we can bundle the proposed fonts or need open-source alternatives before implementation.
- **Container query support:** if targeting older browsers, we may stick to viewport media queries; note fallback plan in implementation docs.
- **Performance:** backdrop-filter/blur effects can hurt low-end devices; profile during implementation and provide a `data-hud-simple="true"` escape hatch if needed.
- **Accessibility:** need to confirm color contrast against both dark and light biome palettes once Milestone B tiles land.

## Validation Strategy

- Manual QA using browser devtools responsive emulator (mobile portrait, 13″ laptop, ultrawide) plus screenshot diffing for future regressions.
- Add a lightweight Vitest DOM snapshot under `src/ui/__tests__/hud.spec.ts` verifying that CSS class hooks exist (no styling assertions, just structure), and document visual test expectations in file headers.
- Capture before/after screenshots in the eventual PR and attach seed numbers used (per contribution guidelines).

## Next Steps

1. Mirror this plan in `docs/ROADMAP.md` Milestone B notes so stakeholders know HUD styling is prepped.
2. Create implementation issues (e.g., `Phase1: HUD styling phase 1/2/3`) or run `scripts/create-phase1-issues.js --dry-run` to template them.
3. Execute the three implementation phases, then close the corresponding review note once merged (this plan satisfies the planning requirement).
