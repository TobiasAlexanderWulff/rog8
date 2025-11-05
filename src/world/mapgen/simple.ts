import type { RNG } from '../../shared/random';

/**
 * Collision and interaction flags encoded into tile metadata.
 */
export const enum TileCollisionFlag {
  None = 0,
  Blocking = 1,
  VisionBlocking = 2,
  Hazard = 4,
  Liquid = 8,
}

const BIOME_SHIFT = 4;
const BIOME_MASK = 0xff << BIOME_SHIFT;
const COLLISION_MASK =
  TileCollisionFlag.Blocking |
  TileCollisionFlag.VisionBlocking |
  TileCollisionFlag.Hazard |
  TileCollisionFlag.Liquid;
const BIOME_VALUE_MASK = 0xff;

/**
 * Packs collision and biome information into a single tile flag.
 *
 * Args:
 *   collision (TileCollisionFlag): Collision mask describing walkability and hazards.
 *   biomeId (number): Numeric biome identifier assigned to the tile.
 *
 * Returns:
 *   number: Value containing both collision and biome data.
 */
export function packTileFlags(collision: TileCollisionFlag, biomeId: number): number {
  const biome = (biomeId & BIOME_VALUE_MASK) << BIOME_SHIFT;
  return (collision & COLLISION_MASK) | (biome & BIOME_MASK);
}

/**
 * Extracts the collision bitmask from packed tile flags.
 *
 * Args:
 *   flags (number): Packed flag value produced by {@link packTileFlags}.
 *
 * Returns:
 *   TileCollisionFlag: Collision mask describing blocking and hazard states.
 */
export function unpackCollision(flags: number): TileCollisionFlag {
  return flags & COLLISION_MASK;
}

/**
 * Extracts the biome identifier from packed tile flags.
 *
 * Args:
 *   flags (number): Packed flag value produced by {@link packTileFlags}.
 *
 * Returns:
 *   number: Numeric biome identifier encoded in the flags.
 */
export function unpackBiomeId(flags: number): number {
  return (flags & BIOME_MASK) >> BIOME_SHIFT;
}

/**
 * Basic tile representation used for procedural map generation and simulation.
 */
export interface Tile {
  type: 'wall' | 'floor';
  flags: number;
}

/**
 * Rectangular tile grid storing dimensions and a linearised tile array.
 */
export interface MapGrid {
  width: number;
  height: number;
  tiles: Tile[];
}

/**
 * Axis-aligned hallway segment connecting two room centers.
 */
export interface CorridorSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
}

/**
 * Describes a rectangular room carved out during generation.
 */
export interface RoomDescriptor {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates the linear array index for a tile coordinate.
 *
 * Args:
 *   grid (MapGrid): Map grid containing the tile array.
 *   x (number): Tile column coordinate.
 *   y (number): Tile row coordinate.
 *
 * Returns:
 *   number: Index into `grid.tiles`.
 */
function tileIndex(grid: MapGrid, x: number, y: number): number {
  return y * grid.width + x;
}

/**
 * Safely retrieves a tile from the grid.
 *
 * Bounds checks are performed so callers can query out-of-range coordinates
 * without needing their own guards.
 *
 * Args:
 *   grid (MapGrid): Map grid to sample.
 *   x (number): Tile column coordinate.
 *   y (number): Tile row coordinate.
 *
 * Returns:
 *   Tile | undefined: Tile instance or `undefined` when outside bounds.
 */
export function getTile(grid: MapGrid, x: number, y: number): Tile | undefined {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return undefined;
  }

  return grid.tiles[tileIndex(grid, x, y)];
}

/**
 * Writes a tile into the grid when the coordinate is inside bounds.
 *
 * Args:
 *   grid (MapGrid): Map grid to update.
 *   x (number): Tile column coordinate.
 *   y (number): Tile row coordinate.
 *   tile (Tile): Tile payload to store at the coordinate.
 */
export function setTile(grid: MapGrid, x: number, y: number, tile: Tile): void {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return;
  }

  grid.tiles[tileIndex(grid, x, y)] = tile;
}

/**
 * Metadata describing spawn points, rooms, corridors, and exits for a map.
 */
export interface MapMetadata {
  playerSpawn: { x: number; y: number };
  enemySpawns: Array<{ x: number; y: number }>;
  exit: { x: number; y: number };
  corridors: CorridorSegment[];
  rooms: RoomDescriptor[];
}

/**
 * Container bundling the generated grid with metadata used by other systems.
 */
export interface GeneratedMap {
  grid: MapGrid;
  metadata: MapMetadata;
}

/**
 * Generates a deterministic map layout composed of rooms and corridors.
 *
 * The algorithm scatters rectangular rooms, ensures overlap padding, and then
 * connects room centers with L-shaped corridors to guarantee traversability.
 *
 * Args:
 *   rng (RNG): Deterministic RNG seeded by the current run.
 *
 * Returns:
 *   GeneratedMap: Grid and metadata describing the generated floor.
 */
export function generateSimpleMap(rng: RNG): GeneratedMap {
  const MAP_WIDTH = 64;
  const MAP_HEIGHT = 64;
  const DEFAULT_BIOME = 0;
  const ROOM_ATTEMPTS = 64;
  const MIN_ROOMS = 6;
  const MAX_ROOMS = 10;
  const MIN_ROOM_SIZE = 6;
  const MAX_ROOM_SIZE = 12;

  // Factory for wall tiles with default biome and blocking flags.
  const makeWallTile = (): Tile => ({
    type: 'wall',
    flags: packTileFlags(
      TileCollisionFlag.Blocking | TileCollisionFlag.VisionBlocking,
      DEFAULT_BIOME,
    ),
  });

  // Factory for walkable floor tiles assigned to the default biome.
  const makeFloorTile = (): Tile => ({
    type: 'floor',
    flags: packTileFlags(TileCollisionFlag.None, DEFAULT_BIOME),
  });

  const tiles = new Array<Tile>(MAP_WIDTH * MAP_HEIGHT);
  // Start with solid walls so subsequent carving leaves explicit floors.
  for (let i = 0; i < tiles.length; i += 1) {
    tiles[i] = makeWallTile();
  }

  const grid: MapGrid = { width: MAP_WIDTH, height: MAP_HEIGHT, tiles };

  const rooms: RoomDescriptor[] = [];

  /**
   * Tests whether two rooms overlap when expanded by a padding margin.
   *
   * Args:
   *   a (RoomDescriptor): First room descriptor.
   *   b (RoomDescriptor): Second room descriptor.
   *   padding (number): Additional spacing required between rooms.
   *
   * Returns:
   *   boolean: True if the rooms intersect after padding is applied.
   */
  const intersects = (a: RoomDescriptor, b: RoomDescriptor, padding: number): boolean => {
    return !(
      a.x + a.width + padding <= b.x ||
      b.x + b.width + padding <= a.x ||
      a.y + a.height + padding <= b.y ||
      b.y + b.height + padding <= a.y
    );
  };

  /**
   * Carves out a rectangular region of floor tiles in the grid.
   *
   * Args:
   *   x (number): Left edge of the rectangle.
   *   y (number): Top edge of the rectangle.
   *   width (number): Rectangle width in tiles.
   *   height (number): Rectangle height in tiles.
   */
  const carveRect = (x: number, y: number, width: number, height: number): void => {
    const startX = Math.max(0, x);
    const endX = Math.min(grid.width, x + width);
    const startY = Math.max(0, y);
    const endY = Math.min(grid.height, y + height);
    for (let yy = startY; yy < endY; yy += 1) {
      const rowIndex = yy * grid.width;
      for (let xx = startX; xx < endX; xx += 1) {
        grid.tiles[rowIndex + xx] = makeFloorTile();
      }
    }
  };

  const roomCount = rng.nextInt(MIN_ROOMS, MAX_ROOMS);
  for (let attempt = 0; attempt < ROOM_ATTEMPTS && rooms.length < roomCount; attempt += 1) {
    const width = rng.nextInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const height = rng.nextInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const maxX = MAP_WIDTH - width - 2;
    const maxY = MAP_HEIGHT - height - 2;
    if (maxX <= 1 || maxY <= 1) {
      break;
    }
    const x = rng.nextInt(1, maxX);
    const y = rng.nextInt(1, maxY);
    const candidate: RoomDescriptor = {
      id: rooms.length,
      x,
      y,
      width,
      height,
    };

    let blocked = false;
    for (const existing of rooms) {
      if (intersects(candidate, existing, 2)) {
        blocked = true;
        break;
      }
    }

    if (blocked) {
      continue;
    }

    rooms.push(candidate);
    carveRect(candidate.x, candidate.y, candidate.width, candidate.height);
  }

  if (rooms.length === 0) {
    // Fallback: carve a central room so the seed always yields traversable space.
    const width = MAX_ROOM_SIZE;
    const height = MAX_ROOM_SIZE;
    const x = Math.floor((MAP_WIDTH - width) / 2);
    const y = Math.floor((MAP_HEIGHT - height) / 2);
    const fallback: RoomDescriptor = { id: 0, x, y, width, height };
    rooms.push(fallback);
    carveRect(x, y, width, height);
  }

  const roomCenters = rooms.map((room) => ({
    room,
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  }));

  // Record carved corridor segments so other systems can reason about navigation.
  const corridors: CorridorSegment[] = [];
  const corridorWidth = 1;

  /**
   * Carves a horizontal corridor segment between two column positions.
   *
   * Args:
   *   y (number): Row within the grid to carve.
   *   x0 (number): Starting column.
   *   x1 (number): Ending column.
   */
  const carveHorizontal = (y: number, x0: number, x1: number): void => {
    const start = Math.max(0, Math.min(x0, x1));
    const end = Math.min(grid.width - 1, Math.max(x0, x1));
    const rowIndex = y * grid.width;
    for (let xx = start; xx <= end; xx += 1) {
      grid.tiles[rowIndex + xx] = makeFloorTile();
    }
  };

  /**
   * Carves a vertical corridor segment between two row positions.
   *
   * Args:
   *   x (number): Column within the grid to carve.
   *   y0 (number): Starting row.
   *   y1 (number): Ending row.
   */
  const carveVertical = (x: number, y0: number, y1: number): void => {
    const start = Math.max(0, Math.min(y0, y1));
    const end = Math.min(grid.height - 1, Math.max(y0, y1));
    for (let yy = start; yy <= end; yy += 1) {
      grid.tiles[yy * grid.width + x] = makeFloorTile();
    }
  };

  // Connect rooms in left-to-right order to keep corridor generation deterministic.
  roomCenters.sort((a, b) => a.x - b.x);
  for (let i = 1; i < roomCenters.length; i += 1) {
    const prev = roomCenters[i - 1];
    const current = roomCenters[i];

    const horizontalY = prev.y;
    carveHorizontal(horizontalY, prev.x, current.x);
    corridors.push({
      startX: Math.min(prev.x, current.x),
      startY: horizontalY,
      endX: Math.max(prev.x, current.x),
      endY: horizontalY,
      width: corridorWidth,
    });

    carveVertical(current.x, horizontalY, current.y);
    corridors.push({
      startX: current.x,
      startY: Math.min(horizontalY, current.y),
      endX: current.x,
      endY: Math.max(horizontalY, current.y),
      width: corridorWidth,
    });
  }

  /**
   * Computes the grid coordinate of a room's center tile.
   *
   * Args:
   *   room (RoomDescriptor): Room descriptor to sample.
   *
   * Returns:
   *   { x: number; y: number }: Approximate central coordinate for the room.
   */
  const centerOf = (room: RoomDescriptor): { x: number; y: number } => ({
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  });

  const playerRoom = rooms[0];
  const playerSpawn = centerOf(playerRoom);

  const exitRoom = rooms[rooms.length - 1];
  const exit = centerOf(exitRoom);

  const enemySpawns: Array<{ x: number; y: number }> = [];
  // Populate enemy spawns from the remaining room centers, capped to avoid crowding.
  for (let i = 1; i < rooms.length; i += 1) {
    const room = rooms[i];
    const center = centerOf(room);
    enemySpawns.push(center);
    if (enemySpawns.length >= 6) {
      break;
    }
  }

  const metadata: MapMetadata = {
    playerSpawn,
    enemySpawns,
    exit,
    corridors,
    rooms,
  };

  return {
    grid,
    metadata,
  };
}
