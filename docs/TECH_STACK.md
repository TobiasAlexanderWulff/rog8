# Rog8 – Tech Stack

## 🧠 Engine & Sprache
- **TypeScript** für Typsicherheit und gute Dev-Experience  
- **Vite** für ultraschnelles HMR-Development  
- **ECS-Architektur** (Entity-Component-System) für modulare Spiellogik

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

## 🧩 Struktur
''' text
src/
├─ engine/ # ECS, RNG, timing
├─ render/ # canvas, spritesheet-gen, palette, dithering
├─ audio/ # sfx-gen, music-gen
├─ world/ # mapgen, rooms, placement
├─ combat/ # damage, ai, status
├─ content/ # JSON-Daten
├─ ui/ # HUD, Menüs
└─ game/ # main loop, states
'''

## 🧰 Tools
- **pnpm** für Paketmanagement  
- **Prettier + ESLint** für Format & Style  
- **Vitest** für Unit-Tests  
- **Tiled / Aseprite (optional)** nur zur Visualisierung von Seeds  
- **GitHub Actions** für Deploy auf GitHub Pages

## 🌐 Deployment
- **GitHub Pages / Cloudflare Pages** für Web-Builds  
- Build-Script: `vite build` → `/dist` → Auto-Deploy  
