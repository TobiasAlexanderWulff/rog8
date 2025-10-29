# Rog8 – Tech Stack

## 🧠 Engine & Sprache

- **TypeScript** für Typsicherheit und gute Dev-Experience
- **Vite** für ultraschnelles HMR-Development
- **ECS-Architektur** (Entity-Component-System) für modulare Spiellogik
  - Deterministische Component Stores, priorisierte Systemscheduling
  - Weltweite Resource-Map für Input, Collision u.ä.
  - `World.reset()` räumt Entities/Komponenten/Resources für Seed-Replays

## 🖼️ Rendering

- **HTML5 Canvas API**
  - Feste virtuelle Auflösung (256×144)
  - Integer-Scaling ohne Interpolation
  - Pixel-perfekte Darstellung (imageSmoothing = false)
- **Palette-Generator** für 8-bit-Farben (HSL-Quantisierung)
- **Sprite-Generator** (16×16 Symmetrie-Bitmap aus Seed)

## 🔊 Audio

- **WebAudio API**
  - OscillatorNodes (square, triangle, noise)
  - Envelope-Steuerung über GainNodes
  - Procedural Chiptune-Musik via Pattern-Arrays
  - Optional Bytebeat-Integration

## 🗺️ Prozedurale Generation

- **RNG:** mulberry32/xoshiro für deterministische Seeds
- **Mapgen:** Cellular Automata + BSP-Rooms + Noise
- **Biome-System:** JSON-basierte Presets für Tiles, Gegner, Paletten
- **Sprite-Gen:** Symmetrisches Bitmask-Verfahren
- **Sound-Seed:** Gleicher RunSeed erzeugt konsistente Musik/SFX

## 🧰 Tools

- **pnpm 10.19 (Corepack)** für Paketmanagement
- **Prettier + ESLint (Flat Config)** für Format & Style
- **Vitest 2.x** für Unit-Tests
- **Tiled / Aseprite (optional)** nur zur Visualisierung von Seeds
- **GitHub Actions** für Deploy auf GitHub Pages

### Projektstruktur

```text
src/
├─ assets/   # Generierte Assets & Pipelines
├─ audio/    # Seed-basierte Synth-Logik
├─ combat/   # Schaden, Status, KI
├─ content/  # JSON-Daten pro Seed/Biome
├─ engine/   # ECS, RNG, Laufzeit
├─ render/   # Canvas, Sprites, Paletten
├─ shared/   # Wiederverwendbare Utilities
├─ ui/       # HUD und Overlays
└─ world/    # Map-Generierung, Umgebung

main.ts      # Einstiegspunkt (Vite)
```

## 🌐 Deployment

- **GitHub Pages / Cloudflare Pages** für Web-Builds
- Build-Script: `vite build` → `/dist` → Auto-Deploy
