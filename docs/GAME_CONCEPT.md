# Rog8 – Procedural 8-Bit Roguelike

## 🎯 Vision

Ein moderner Roguelike mit 8-bit-Ästhetik, bei dem alles – Welt, Gegner, Musik, Sound, Grafiken – deterministisch aus einem Seed generiert wird. Ziel ist ein technisch minimalistisches, aber spielmechanisch tiefes Erlebnis, das sich bei jedem Run neu anfühlt.

## 🧩 Core Gameplay Loop

1. Erkunden zufällig generierter Level
2. Kämpfen gegen einfache, klar lesbare Gegner
3. Loot & Relikte einsammeln
4. Entscheidungen treffen (Risk/Reward)
5. Tiefer in die Ebenen vordringen
6. Sterben, Meta-Fortschritt freischalten
7. Neuen Run starten

## ⚙️ Designprinzipien

- **Alles generierbar**: Tiles, Sprites, SFX, Musik aus Code.
- **Seed-Determinismus**: Gleicher Seed → identische Welt.
- **8-bit-Authentizität**: Limitierte Paletten, grobe Pixel, kurze Loops.
- **Klarheit** über Realismus: Fokus auf Spielgefühl, nicht Grafik.
- **Schneller Spaß**: Innerhalb von 30 Sekunden ins Spiel.

## 🌍 Weltaufbau

- Prozedurale Level mit Biomen (Ruinen, Frost, Lava, Synth-Lab)
- Räume über Cellular-Automata + Room-Corridor-Hybrid
- Secrets über Noise-Schwellen
- Shops, Altäre, Mini-Bosssräume

## ⚔️ Gegner & Kampf

- Gegnerverhalten als finite state machines
- Affixe: z. B. „explodiert beim Tod“ oder „beschwört Slimes“
- Waffenfamilien: Nahkampf, Fernkampf, Tech
- Echtzeit-Kampf mit klarer Hitbox-Logik
- Statuseffekte: Gift, Frost, Feuer, Schock

## 💎 Progression

- **In-Run:** Relikte, Tränke, Waffen-Mods
- **Meta:** Neue Start-Relikte, Biome, Gegnerpools
- Kein Power-Creep – Fokus auf Vielfalt

## 🎨 8-Bit Look & Feel

- Virtuelle Auflösung: 256×144 px, integer scaling
- Tiles/Sprites: 16×16 px, symmetrische Bitmap-Generierung
- Farbpaletten: 4–16 Farben pro Biome
- Dithering, harte Outlines, keine Subpixel

## 🔊 Audio & Musik

- WebAudio-basiert, alles generiert per Code
- **SFX:** Bytebeat, 8-bit Square/Triangle/Noise
- **Musik:** 3-Kanal-Chiptune (Lead, Bass, Drums)
- Seed → Tonart + BPM + Pattern

## 🧠 Zielgruppe

Retro-Fans, Entwickler-Nerds, Minimalisten, Speedrunner.

## 🏁 Langfristige Features

- Daily Seed + Leaderboard
- Boss-Raum mit 2-Phasen-AI
- Controller-Support
- Web-Save & Replay-Viewer
