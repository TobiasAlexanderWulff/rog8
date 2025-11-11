import { bootstrapCanvas, createRenderLoop, type RenderContext } from './render/bootstrap';
import { InputManager } from './engine/input';
import { World, type ResourceKey } from './engine/world';
import { RunController, type RunControllerEvents } from './engine/run-controller';
import { createHud, hideGameOver, showGameOver, type HudState } from './ui/hud';
import { RunSeed } from './shared/random';
import { syncHud } from './ui/hud-sync';
import { registerPlayerMovementSystem } from './engine/systems/player-movement';
import { registerChaseSystem } from './combat/chase-system';
import { registerMeleeSystem } from './combat/melee-system';
import type { ComponentKey, PlayerComponent, TransformComponent } from './engine/components';
import type { EnemyComponent } from './combat/enemy';
import type { MapGrid } from './world/mapgen/simple';
import type { RunBootstrapResult } from './world/run-setup';
import {
  generatePlayerSprite,
  type PlayerSpriteAtlas,
  type PlayerSpriteFrame,
  persistSpriteAtlas,
} from './render/sprites';
import { drawSpriteFrame, prepareSpriteFrames } from './render/sprites/draw';

const ROOT_ID = 'app';
const PLAYER_SPEED_TILES_PER_MS = 0.005;
const PLAYER_ACCELERATION_PER_MS2 = 0;

const TRANSFORM_COMPONENT_KEY = 'component.transform' as ComponentKey<TransformComponent>;
const PLAYER_COMPONENT_KEY = 'component.player' as ComponentKey<PlayerComponent>;
const ENEMY_COMPONENT_KEY = 'component.enemy' as ComponentKey<EnemyComponent>;

const SCENE_COLORS = {
  background: '#020617',
  floor: '#0f172a',
  wall: '#1d263b',
  player: '#38bdf8',
  enemy: '#f97316',
  bootText: '#94a3b8',
};
const MAP_GRID_RESOURCE_KEY = 'resource.map-grid' as ResourceKey<MapGrid>;
const PLAYER_SPRITE_RESOURCE_KEY = 'resource.player-sprite' as ResourceKey<PlayerSpriteAtlas>;

/**
 * Generates the initial seed that drives deterministic game runs.
 *
 * @remarks
 * Pulls a 32-bit sample from the Web Crypto API so each run starts with a unique deterministic seed
 * while staying within the range expected by the RNG subsystem. Falls back to a timestamp/XOR based
 * mix when secure randomness is unavailable (e.g. older browsers).
 *
 * @returns Seed wrapper containing a 32-bit unsigned integer.
 * @throws This function never throws; it relies on synchronous bitwise operations.
 * @example
 * ```ts
 * const seed = createInitialSeed();
 * console.log(seed.value);
 * ```
 */
export function createInitialSeed(): RunSeed {
  const getRandomSeed = (): number => {
    const cryptoApi = globalThis.crypto as Crypto | undefined;
    if (cryptoApi?.getRandomValues) {
      const sample = new Uint32Array(1);
      cryptoApi.getRandomValues(sample);
      return sample[0] >>> 0;
    }
    const fallback = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    return fallback;
  };

  return { value: getRandomSeed() };
}

interface GameBootstrapContext {
  seed: RunSeed;
  renderContext: RenderContext;
  world: World;
  input: InputManager;
  targetDeltaMs: number;
  events: RunControllerEvents;
  hudRoot?: HTMLElement;
}

/**
 * Wires together the deterministic seed, ECS world, rendering context, and HUD container.
 *
 * @remarks
 * Provides the fully initialised runtime dependencies so {@link main} can focus on loop orchestration.
 *
 * @param rootId - Identifier for the DOM element that hosts the canvas.
 * @returns Structured runtime references required to start the run controller.
 */
function bootstrapGame(rootId: string): GameBootstrapContext {
  const seed = createInitialSeed();
  const renderContext = bootstrapCanvas(rootId);
  const world = new World();
  const input = new InputManager();
  registerPlayerSpriteResource(world, seed);
  const targetDeltaMs = 1000 / 60;
  const events: RunControllerEvents = {
    onGameOver(seedValue: RunSeed) {
      showGameOver(seedValue);
    },
    onRestart() {
      registerPlayerSpriteResource(world, seed);
      hideGameOver();
    },
  };

  return {
    seed,
    renderContext,
    world,
    input,
    targetDeltaMs,
    events,
    hudRoot: document.getElementById('hud') ?? undefined,
  };
}

function configurePlayerMovement(world: World, input: InputManager, map: MapGrid): void {
  registerPlayerMovementSystem(world, {
    input,
    speedScalar: PLAYER_SPEED_TILES_PER_MS,
    acceleration: PLAYER_ACCELERATION_PER_MS2,
    map,
  });
}

function createRunSynchronizer(
  world: World,
  input: InputManager,
  controller: RunController,
): () => void {
  let currentRun: RunBootstrapResult | undefined;
  return (): void => {
    const nextRun = controller.getCurrentRun();
    if (!nextRun || nextRun === currentRun) {
      return;
    }
    configurePlayerMovement(world, input, nextRun.map.grid);
    currentRun = nextRun;
  };
}

function renderGameScene(world: World, renderContext: RenderContext): void {
  const map = world.getResource<MapGrid>(MAP_GRID_RESOURCE_KEY);
  const spriteAtlas = world.getResource<PlayerSpriteAtlas>(PLAYER_SPRITE_RESOURCE_KEY);
  const { canvas, context } = renderContext;
  const width = canvas.width;
  const height = canvas.height;

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = SCENE_COLORS.background;
  context.fillRect(0, 0, width, height);

  if (!map) {
    context.fillStyle = SCENE_COLORS.bootText;
    context.font = '8px monospace';
    context.textBaseline = 'top';
    context.fillText('Bootstrapping run…', 8, 8);
    context.restore();
    return;
  }

  const tileSize = Math.max(1, Math.floor(Math.min(width / map.width, height / map.height)));
  const mapWidth = map.width * tileSize;
  const mapHeight = map.height * tileSize;
  const offsetX = Math.floor((width - mapWidth) / 2);
  const offsetY = Math.floor((height - mapHeight) / 2);
  const playerSpriteFrame = selectPlayerSpriteFrame(spriteAtlas);

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = map.tiles[y * map.width + x];
      context.fillStyle = tile.type === 'wall' ? SCENE_COLORS.wall : SCENE_COLORS.floor;
      context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
    }
  }

  const transformStore = world.getComponentStore(TRANSFORM_COMPONENT_KEY);
  const playerStore = world.getComponentStore(PLAYER_COMPONENT_KEY);
  const enemyStore = world.getComponentStore(ENEMY_COMPONENT_KEY);

  const drawEntity = (entityId: number, color: string, spriteFrame?: PlayerSpriteFrame): void => {
    if (!transformStore) {
      return;
    }
    const transform = transformStore.get(entityId);
    if (!transform) {
      return;
    }
    const px = offsetX + transform.x * tileSize;
    const py = offsetY + transform.y * tileSize;
    const size = Math.max(1, tileSize - 1);
    if (spriteFrame) {
      const spriteSize = size;
      const spriteOffsetX = px + Math.floor((tileSize - spriteSize) / 2);
      const spriteOffsetY = py + Math.floor((tileSize - spriteSize) / 2);
      const rendered = drawSpriteFrame(
        context,
        spriteFrame,
        spriteOffsetX,
        spriteOffsetY,
        spriteSize,
        spriteSize,
      );
      if (rendered) {
        return;
      }
    }
    context.fillStyle = color;
    context.fillRect(px, py, size, size);
  };

  if (playerStore) {
    for (const [entityId] of playerStore.entries()) {
      drawEntity(entityId, SCENE_COLORS.player, playerSpriteFrame);
    }
  }

  if (enemyStore) {
    for (const [entityId] of enemyStore.entries()) {
      drawEntity(entityId, SCENE_COLORS.enemy);
    }
  }

  context.restore();
}

function registerPlayerSpriteResource(world: World, seed: RunSeed): PlayerSpriteAtlas {
  const atlas = generatePlayerSprite(seed, { useFallbackOnError: true });
  persistSpriteAtlas(seed, atlas);
  if (world.hasResource(PLAYER_SPRITE_RESOURCE_KEY)) {
    world.removeResource(PLAYER_SPRITE_RESOURCE_KEY);
  }
  world.registerResource(PLAYER_SPRITE_RESOURCE_KEY, atlas);
  prepareSpriteFrames(atlas);
  return atlas;
}

function selectPlayerSpriteFrame(atlas?: PlayerSpriteAtlas): PlayerSpriteFrame | undefined {
  if (!atlas || atlas.frames.length === 0) {
    return undefined;
  }
  const idle = atlas.frames.find((frame) => frame.name === 'idle');
  return idle ?? atlas.frames[0];
}

/**
 * Entry point that wires together input, world, rendering, and HUD scaffolding.
 *
 * @remarks
 * The bootstrap is currently synchronous; future implementations should defer invocation to
 * `DOMContentLoaded` or Vite's entry lifecycle once additional subsystems exist.
 *
 * @throws This function never throws; dependent subsystems report errors internally.
 * @example
 * ```ts
 * main();
 * ```
 */
function main(): void {
  const { seed, renderContext, world, input, targetDeltaMs, events, hudRoot } =
    bootstrapGame(ROOT_ID);

  const controller = new RunController(world, input, {
    seed,
    targetDeltaMs,
    events,
  });
  registerMeleeSystem(world);
  registerChaseSystem(world);
  const syncRunState = createRunSynchronizer(world, input, controller);

  let hudState: HudState | undefined;
  if (hudRoot) {
    hudState = createHud(hudRoot);
  }

  const loop = createRenderLoop(renderContext, (_frame) => {
    syncRunState();
    controller.update(targetDeltaMs);
    renderGameScene(world, renderContext);

    if (hudState) {
      syncHud(world, hudState, seed);
    }
  });

  controller.start();
  syncRunState();

  if (hudState) {
    syncHud(world, hudState, seed);
  }

  loop.start();
}

// TODO: Wire this to DOMContentLoaded or Vite entry once ready.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  main();
}
