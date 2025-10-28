# Review Notes

- **[P0] Avoid crashing in `createHud`** — `src/ui/hud.ts:9-12`  
  `main.ts` invokes `createHud` whenever `#hud` exists, and `index.html` always renders that element. The stub currently throws `Error('TODO: createHud not implemented yet')`, so the runtime crashes immediately. Either remove the call until the HUD works or return a no-op placeholder so the app keeps running.
- **[P1] Keep RNG progress between frames** — `src/engine/run-controller.ts:36-38`  
  `update` rebuilds a new `Mulberry32` with `this.seed.value` every frame, so each tick replays identical random samples. Persist a single RNG instance (or clone from shared mutable state once per call) so systems advance randomness correctly.
