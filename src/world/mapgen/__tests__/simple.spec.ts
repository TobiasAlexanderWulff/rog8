/**
 * @fileoverview Tests verifying map tile flag packing and grid helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  TileCollisionFlag,
  getTile,
  packTileFlags,
  setTile,
  unpackBiomeId,
  unpackCollision,
  type MapGrid,
  type Tile,
} from '../simple';

/**
 * Validates packing helpers that consolidate collision and biome identifiers.
 */
describe('packTileFlags', () => {
  it('packs collision and biome into a single integer', () => {
    const collision =
      TileCollisionFlag.Blocking | TileCollisionFlag.VisionBlocking | TileCollisionFlag.Liquid;
    const biomeId = 57;

    const packed = packTileFlags(collision, biomeId);
    const expectedPacked = collision | ((biomeId & 0xff) << 4);

    expect(packed).toBe(expectedPacked);
  });

  it('masks biome ids down to the supported range before packing', () => {
    // Ensure the function safely truncates biome ids that exceed the 8-bit storage limit.
    const collision = TileCollisionFlag.Blocking;
    const biomeId = 0x1ff;

    const packed = packTileFlags(collision, biomeId);
    const expected = collision | ((biomeId & 0xff) << 4);

    expect(packed).toBe(expected);
  });
});

/**
 * Confirms collision masks survive packing and ignore unrelated bit noise.
 */
describe('unpackCollision', () => {
  it('retrieves only collision-related bits from packed flags', () => {
    const collision =
      TileCollisionFlag.Blocking | TileCollisionFlag.Hazard | TileCollisionFlag.Liquid;
    const biomeId = 87;
    const unrelatedBits = 0xf000;

    // Pack extra bits to mimic metadata that should be ignored by the unpacker.
    const packed = packTileFlags(collision, biomeId) | unrelatedBits;

    expect(unpackCollision(packed)).toBe(collision);
  });
});

/**
 * Ensures biome identifiers can be recovered cleanly after mixed metadata writes.
 */
describe('unpackBiomeId', () => {
  it('extracts the biome id from packed flags', () => {
    // Padding with high bits simulates unrelated flag data introduced by other systems.
    const collision = TileCollisionFlag.Blocking | TileCollisionFlag.Liquid;
    const biomeId = 0x1ab;
    const packed = packTileFlags(collision, biomeId);
    const withNoise = packed | 0xf000;

    expect(unpackBiomeId(withNoise)).toBe(biomeId & 0xff);
  });
});

/**
 * Exercises read helpers to guarantee safe tile retrieval from the map grid.
 */
describe('getTile', () => {
  it('returns the tile at the given coordinates when in bounds', () => {
    const targetTile: Tile = {
      type: 'floor',
      flags: packTileFlags(TileCollisionFlag.None, 1),
    };
    // 2x2 grid keeps indexing simple while still covering interior positions.
    const grid: MapGrid = {
      width: 2,
      height: 2,
      tiles: [
        { type: 'wall', flags: packTileFlags(TileCollisionFlag.Blocking, 0) },
        targetTile,
        { type: 'floor', flags: packTileFlags(TileCollisionFlag.None, 2) },
        { type: 'wall', flags: packTileFlags(TileCollisionFlag.Blocking, 3) },
      ],
    };

    expect(getTile(grid, 1, 0)).toBe(targetTile);
  });

  it('returns undefined when requesting coordinates out of bounds', () => {
    // Verifies guard clauses handle every edge while leaving valid tiles untouched.
    const grid: MapGrid = {
      width: 2,
      height: 2,
      tiles: [
        { type: 'wall', flags: packTileFlags(TileCollisionFlag.Blocking, 0) },
        { type: 'floor', flags: packTileFlags(TileCollisionFlag.None, 1) },
        { type: 'floor', flags: packTileFlags(TileCollisionFlag.None, 2) },
        { type: 'wall', flags: packTileFlags(TileCollisionFlag.Blocking, 3) },
      ],
    };

    expect(getTile(grid, -1, 0)).toBeUndefined();
    expect(getTile(grid, 0, -1)).toBeUndefined();
    expect(getTile(grid, grid.width, 0)).toBeUndefined();
    expect(getTile(grid, 0, grid.height)).toBeUndefined();
  });
});

/**
 * Exercises write helpers to ensure tile mutations remain bounded and deterministic.
 */
describe('setTile', () => {
  it('updates the tile when the coordinates are within bounds', () => {
    // Replacement tile mimics procedural updates that rewrite existing floor data.
    const grid: MapGrid = {
      width: 2,
      height: 2,
      tiles: [
        { type: 'wall', flags: packTileFlags(TileCollisionFlag.Blocking, 0) },
        { type: 'floor', flags: packTileFlags(TileCollisionFlag.None, 1) },
        { type: 'floor', flags: packTileFlags(TileCollisionFlag.None, 2) },
        { type: 'wall', flags: packTileFlags(TileCollisionFlag.Blocking, 3) },
      ],
    };
    const replacement: Tile = {
      type: 'floor',
      flags: packTileFlags(TileCollisionFlag.None, 9),
    };

    setTile(grid, 1, 1, replacement);

    expect(grid.tiles[3]).toBe(replacement);
  });

  it('ignores writes outside the grid bounds', () => {
    // Attempting to write beyond the boundary should leave the tile array untouched.
    const grid: MapGrid = {
      width: 2,
      height: 2,
      tiles: [
        { type: 'wall', flags: packTileFlags(TileCollisionFlag.Blocking, 0) },
        { type: 'floor', flags: packTileFlags(TileCollisionFlag.None, 1) },
        { type: 'floor', flags: packTileFlags(TileCollisionFlag.None, 2) },
        { type: 'wall', flags: packTileFlags(TileCollisionFlag.Blocking, 3) },
      ],
    };
    const snapshot = [...grid.tiles];
    const newTile: Tile = {
      type: 'floor',
      flags: packTileFlags(TileCollisionFlag.None, 99),
    };

    setTile(grid, -1, 0, newTile);
    setTile(grid, 0, -1, newTile);
    setTile(grid, grid.width, 0, newTile);
    setTile(grid, 0, grid.height, newTile);

    snapshot.forEach((tile, index) => {
      expect(grid.tiles[index]).toBe(tile);
    });
  });
});
