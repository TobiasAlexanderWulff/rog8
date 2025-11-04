/**
 * @fileoverview Combat enemy component scaffolding tests.
 */
import { describe, expect, it } from 'vitest';

import { createEnemyComponent, spawnEnemy } from '../enemy';

describe('createEnemyComponent', () => {
  it('creates combat stats for grunt archetype', () => {
    const component = createEnemyComponent('grunt');

    expect(component.archetype).toBe('grunt');
    expect(component.maxHp).toBe(1);
    expect(component.speed).toBe(1.5);
    expect(component.damage).toBe(1);
  });

  it('creates combat stats for placeholder archetype', () => {
    const component = createEnemyComponent('placeholder');

    expect(component.archetype).toBe('placeholder');
    expect(component.maxHp).toBe(1);
    expect(component.speed).toBe(1);
    expect(component.damage).toBe(0);
  });

  it('produces isolated component instances per spawn', () => {
    const first = createEnemyComponent('grunt');
    const second = createEnemyComponent('grunt');

    expect(first).not.toBe(second);

    first.maxHp = 42;
    first.damage = 7;

    expect(second.maxHp).toBe(1);
    expect(second.damage).toBe(1);
  });
});

describe('spawnEnemy', () => {
  it('registers dependent stores when absent', () => {
    // TODO: confirm component stores are created lazily on spawn
    expect(spawnEnemy).toBeDefined();
  });

  it('initializes health and transform components using defaults', () => {
    // TODO: assert spawned entities receive default component payloads
    expect(spawnEnemy).toBeDefined();
  });

  it('respects provided spawn coordinates', () => {
    // TODO: validate spawn position propagation across components
    expect(spawnEnemy).toBeDefined();
  });
});
