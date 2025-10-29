import { describe, it } from 'vitest';
import {
  TileCollisionFlag,
  getTile,
  packTileFlags,
  setTile,
  unpackBiomeId,
  unpackCollision,
} from '../simple';

describe('packTileFlags', () => {
  it('packs collision and biome into a single integer', () => {
    // TODO: implement test case
  });

  it('masks biome ids down to the supported range before packing', () => {
    // TODO: implement test case
  });
});

describe('unpackCollision', () => {
  it('retrieves only collision-related bits from packed flags', () => {
    // TODO: implement test case
  });
});

describe('unpackBiomeId', () => {
  it('extracts the biome id from packed flags', () => {
    // TODO: implement test case
  });
});

describe('getTile', () => {
  it('returns the tile at the given coordinates when in bounds', () => {
    // TODO: implement test case
  });

  it('returns undefined when requesting coordinates out of bounds', () => {
    // TODO: implement test case
  });
});

describe('setTile', () => {
  it('updates the tile when the coordinates are within bounds', () => {
    // TODO: implement test case
  });

  it('ignores writes outside the grid bounds', () => {
    // TODO: implement test case
  });
});
