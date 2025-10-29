/**
 * @fileoverview Validates the ComponentStore deterministic storage helpers.
 * The Vitest harness is occasionally flaky; rerun locally if execution stalls.
 */
import { describe, expect, it } from 'vitest';

import { ComponentStore, type EntityId } from '../components';

describe('ComponentStore', () => {
  it('adds and retrieves components by entity id', () => {
    const store = new ComponentStore<{ life: number }>();
    const entityId: EntityId = 1;

    expect(store.has(entityId)).toBe(false);
    expect(store.get(entityId)).toBeUndefined();

    store.add(entityId, { life: 3 });

    expect(store.has(entityId)).toBe(true);
    expect(store.get(entityId)).toEqual({ life: 3 });
  });

  it('returns entries sorted by entity id for deterministic iteration', () => {
    const store = new ComponentStore<{ name: string }>();

    store.add(7, { name: 'seven' });
    store.add(2, { name: 'two' });
    store.add(10, { name: 'ten' });

    const entries = store.entries();
    expect(entries).toEqual([
      [2, { name: 'two' }],
      [7, { name: 'seven' }],
      [10, { name: 'ten' }],
    ]);
  });

  it('defers removals until queued deletions are flushed', () => {
    const store = new ComponentStore<{ value: number }>();

    store.add(1, { value: 100 });
    store.add(5, { value: 200 });

    store.queueRemoval(1);

    // Component remains accessible until removal queue is flushed.
    expect(store.has(1)).toBe(true);
    expect(store.entries()).toEqual([
      [1, { value: 100 }],
      [5, { value: 200 }],
    ]);

    store.flushQueuedRemovals();

    expect(store.has(1)).toBe(false);
    expect(store.entries()).toEqual([[5, { value: 200 }]]);
  });

  it('removes components immediately when requested', () => {
    const store = new ComponentStore<{ humidity: number }>();

    store.add(3, { humidity: 42 });
    store.add(4, { humidity: 7 });

    store.remove(3);

    expect(store.has(3)).toBe(false);
    expect(store.entries()).toEqual([[4, { humidity: 7 }]]);
  });

  it('clears components and pending removals when reset', () => {
    const store = new ComponentStore<{ score: number }>();

    store.add(1, { score: 10 });
    store.queueRemoval(1);

    store.clear();

    expect(store.entries()).toEqual([]);
    store.flushQueuedRemovals();
    expect(store.entries()).toEqual([]);
  });
});
