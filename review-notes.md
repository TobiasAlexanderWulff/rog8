# Review Notes

- **[P0] Stop throwing from `createHud` stub** — `src/ui/hud.ts:10-13`  
  `main.ts` calls `createHud` whenever `#hud` exists, and `index.html` always renders that element. The factory still throws `Error('TODO: createHud not implemented yet')`, so startup always crashes. Guard the invocation or return a no-op placeholder until the HUD ships.
- **[P1] Avoid reseeding RNG every update** — `src/engine/run-controller.ts:36-44`  
  `update` rebuilds a `Mulberry32` from the same seed each frame, so randomness never advances. Persist the RNG instance (or clone and advance it) instead of recreating it per tick.
