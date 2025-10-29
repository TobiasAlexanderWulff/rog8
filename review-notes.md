# Review Notes

- **[P1] Avoid reseeding RNG every update** — `src/engine/run-controller.ts:36-44`  
  `update` rebuilds a `Mulberry32` from the same seed each frame, so randomness never advances. Persist the RNG instance (or clone and advance it) instead of recreating it per tick.
