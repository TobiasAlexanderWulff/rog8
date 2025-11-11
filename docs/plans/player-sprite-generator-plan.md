# Player Sprite Generator Plan

## Summary

- Deliver Milestone B's seeded 16×16 player sprite pipeline so runs render bespoke art instead of placeholder rectangles.
- Keep the generator deterministic (Mulberry32) and self-contained inside `src/render/sprites/`, emitting palettes and pixel buffers that the render systems can consume without browser-specific dependencies.
- Ship a scaffold that supports both runtime generation and optional export to `src/assets/generated/` for inspection, plus a documented fallback sprite for debugging.

## Goals

- Mirror the `docs/ROADMAP.md` entry **Player-Sprite-Generator (16×16)** with a concrete implementation outline.
- Produce one idle frame at launch that can later expand to walk cycles without architectural changes.
- Support palette + trim variations derived from the run seed so rerolling seeds instantly showcases different looks.
- Expose generator metadata (colors, symmetry flags, feature rolls) for HUD/debug overlays and tests.

## Non-Goals

- Enemy, tile, or weapon sprite generation (tracked separately in future roadmap items).
- Animation tweening or sprite batching optimisations beyond a single-frame atlas.
- Authoring a CLI/GUI seed browser—scripts can follow once the generator lands.

## Requirements & Constraints

1. **Resolution:** 16×16 virtual pixels, mirrored along the vertical axis after drawing the left half (8 px) so silhouettes stay readable.
2. **Palette:** Three-color scheme (base/trim/highlight) plus one optional outline. Colors derive from HSL rolls with seeded offsets to keep saturation/value in the readable 30–90% range.
3. **Layers:** Body mask, accent mask (belt, visor, pauldron), and face slot reserved for eyes/visor to guarantee recognisable fronts.
4. **Determinism:** Given the same `RunSeed`, generator outputs identical `Uint8ClampedArray` data, metadata, and palette order.
5. **Export:** Dev builds can call `persistSpriteAtlas(seed, sprite)` to dump PNG/JSON under `src/assets/generated/player/` (gitignored) for quick QA checks.
6. **Fallback:** Provide `DEV_SPRITE` metadata that draws a cyan crosshair so the renderer never hard-crashes if generation fails.

## Pipeline Overview

1. **Seed Binding:** Convert `RunSeed` into a cloned Mulberry32 instance via `withSeed(seed.value, ...)`.
2. **Palette Selection:** Roll hue buckets (warm, cool, mono) then derive `base`, `trim`, `highlight`, and `outline` RGBA tuples using helper `createPalette(rng, overrides?)`.
3. **Silhouette Mask:**
   - Start with an 8×16 boolean grid seeded to ensure torso/head proportions.
   - Carve in negative space for arms/legs based on thresholds so players remain distinct yet humanoid.
   - Mirror horizontally to form the final 16×16 mask.
4. **Feature Pass:**
   - Reserve row(s) for visor/eyes; optionally roll antenna/backpack toggles.
   - Accent mask stores cells for `trim` vs `highlight`.
5. **Colorization:**
   - Convert boolean masks into `SpriteBuffer` (typed array) storing palette indices.
   - Outline pass runs last, marking perimeter pixels that touch transparent neighbours.
6. **Packaging:**
   - Wrap `ImageData`, palette, metadata (seed, rolls, symmetry) inside `PlayerSprite`.
   - Return `PlayerSpriteAtlas` (currently single frame) plus helper to convert to `ImageBitmap` for the render loop.

## Module Breakdown

| Module                                   | Responsibility                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/render/sprites/types.ts`            | Shared interfaces (`SpriteBuffer`, `PaletteColor`, `PlayerSprite`, `PlayerSpriteAtlas`).           |
| `src/render/sprites/palette.ts`          | HSL-to-RGBA helpers, deterministic palette rolls, clamp utilities.                                 |
| `src/render/sprites/player-generator.ts` | Public `generatePlayerSprite(seed, options?)` plus helper steps (mask builder, outline, metadata). |
| `src/render/sprites/export.ts`           | Optional dev-only persistence to `src/assets/generated/`. Guarded behind `import.meta.env.DEV`.    |
| `src/render/sprites/fallback.ts`         | Hard-coded `DEV_SPRITE` to keep rendering resilient.                                               |

## Integration Steps

1. **World Bootstrap:** During `RunController` startup (post-mapgen), call `generatePlayerSprite(seed)` and stash the result as a world resource (e.g., `resource.player-sprite`).
2. **Renderer:** Update `renderGameScene` to draw the sprite's `ImageBitmap` instead of rectangles, scaling via the already-computed tile size and `context.imageSmoothingEnabled=false`.
3. **HUD/Debug:** Surface palette metadata (hex strings) and sprite ID for quick verification in the HUD seed readout. ✅ Implemented via `src/ui/hud.ts` + `hud-sync` (palette chips + feature list).
4. **Persistence Toggle:** When `import.meta.env.DEV && import.meta.env.VITE_EXPORT_SPRITES === 'true'`, call `persistSpriteAtlas` so dev builds can inspect outputs; production skips file writes. ✅ Wired through `registerPlayerSpriteResource`.

## Testing & Validation

- **Unit Tests:** Place under `src/render/__tests__/player-generator.spec.ts`.
  - Given a fixed seed, palette and pixel buffer match stored snapshots (serialize as hex strings to avoid binary diffs).
  - Mirroring invariants: left half equals reversed right half for body mask.
  - Outline algorithm only colors transparent-adjacent pixels.
- **Manual QA:** Add seed checklist to `docs/ROADMAP.md` (append once implemented) capturing a few canonical seeds for quick visual inspection.
- **Performance:** Profile generation (should be <1ms) and ensure cached sprite reuse instead of regenerating each frame.

## Risks & Mitigations

- **Art Quality:** Purely random rolls can output mush. Clamp the number of filled pixels per row and enforce negative space slices; tune constants iteratively.
- **Serialization:** Writing PNG/JSON from the browser is awkward. Mitigate by providing `persistSpriteAtlas` hooks that rely on the Vite dev server proxy or targeted download links instead of Node FS.
- **Future Animations:** Keep atlas abstraction even for single-frame output so walking frames can append later without touching render consumers.

## Open Questions

1. Should trims ever overlap outlines, or do we keep outline color opaque for readability?
2. Do we plan to share palettes between player and upcoming tile generator (Phase 2). If yes, we might extract palette helpers to `src/shared/chromatic.ts`.
3. Export format preference: PNG blobs, JSON array, or custom textual diff? Default assumption: base64 PNG plus JSON metadata.

## Next Steps

1. Implement scaffolding modules with deterministic hooks and fallback sprite.
2. Wire plan reference into `docs/ROADMAP.md` to keep milestone status traceable.
3. Add TODOs/tests referencing this plan once actual generation logic is ready.
