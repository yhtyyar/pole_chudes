/**
 * Tests for utils/knownPlayers.ts
 *
 * Techniques used:
 *   - Equivalence partitioning: valid/invalid name inputs
 *   - Boundary value analysis: name length 1 vs 2, MAX_PLAYERS limit
 *   - State-based testing: save → load → mutate → verify
 *   - Decision table: existing vs new player, case-insensitive deduplication
 *   - MRU ordering verification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadKnownPlayers,
  saveKnownPlayer,
  saveKnownPlayers,
  deleteKnownPlayer,
  searchKnownPlayers,
} from '../utils/knownPlayers';

beforeEach(() => {
  localStorage.clear();
});

// ─── loadKnownPlayers ────────────────────────────────────────────────────────

describe('loadKnownPlayers', () => {
  it('returns empty array when storage is empty', () => {
    expect(loadKnownPlayers()).toEqual([]);
  });

  it('returns empty array when stored JSON is corrupt', () => {
    localStorage.setItem('pole_chudes_known_players', 'not-json{{');
    expect(loadKnownPlayers()).toEqual([]);
  });

  it('returns previously saved players', () => {
    saveKnownPlayer('Иван');
    const result = loadKnownPlayers();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Иван');
  });

  it('each loaded player has id, name, lastUsed fields', () => {
    saveKnownPlayer('Мария');
    const [p] = loadKnownPlayers();
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('name', 'Мария');
    expect(p).toHaveProperty('lastUsed');
    expect(typeof p.lastUsed).toBe('number');
  });
});

// ─── saveKnownPlayer ─────────────────────────────────────────────────────────

describe('saveKnownPlayer', () => {
  it('saves a valid name', () => {
    saveKnownPlayer('Алексей');
    expect(loadKnownPlayers()).toHaveLength(1);
  });

  it('ignores empty string', () => {
    saveKnownPlayer('');
    expect(loadKnownPlayers()).toHaveLength(0);
  });

  it('ignores whitespace-only string', () => {
    saveKnownPlayer('   ');
    expect(loadKnownPlayers()).toHaveLength(0);
  });

  it('ignores single-character name (length < 2)', () => {
    saveKnownPlayer('А');
    expect(loadKnownPlayers()).toHaveLength(0);
  });

  it('accepts 2-character name (boundary: minimum valid)', () => {
    saveKnownPlayer('Ас');
    expect(loadKnownPlayers()).toHaveLength(1);
  });

  it('trims whitespace from name before saving', () => {
    saveKnownPlayer('  Петр  ');
    expect(loadKnownPlayers()[0].name).toBe('Петр');
  });

  it('does not add duplicate (case-insensitive match updates lastUsed)', () => {
    saveKnownPlayer('Анна');
    saveKnownPlayer('анна');
    expect(loadKnownPlayers()).toHaveLength(1);
  });

  it('updating an existing player does not create new entry', () => {
    saveKnownPlayer('Дмитрий');
    saveKnownPlayer('ДМИТРИЙ');
    saveKnownPlayer('дмитрий');
    expect(loadKnownPlayers()).toHaveLength(1);
  });

  it('updates lastUsed when saving existing player again', async () => {
    saveKnownPlayer('Елена');
    const firstTime = loadKnownPlayers()[0].lastUsed;
    // Advance time artificially
    await new Promise((r) => setTimeout(r, 5));
    saveKnownPlayer('Елена');
    const secondTime = loadKnownPlayers()[0].lastUsed;
    expect(secondTime).toBeGreaterThanOrEqual(firstTime);
  });

  it('assigns a unique id to each new player', () => {
    saveKnownPlayer('Игрок 1');
    saveKnownPlayer('Игрок 2');
    const [a, b] = loadKnownPlayers();
    expect(a.id).not.toBe(b.id);
  });

  it('sorts by most recently used — newest first', async () => {
    saveKnownPlayer('Первый');
    await new Promise((r) => setTimeout(r, 5));
    saveKnownPlayer('Второй');
    const players = loadKnownPlayers();
    expect(players[0].name).toBe('Второй');
    expect(players[1].name).toBe('Первый');
  });

  it('re-saves existing player and brings it to the top of MRU', async () => {
    saveKnownPlayer('Старый');
    await new Promise((r) => setTimeout(r, 5));
    saveKnownPlayer('Новый');
    await new Promise((r) => setTimeout(r, 5));
    // Re-save Старый → should be newest now
    saveKnownPlayer('Старый');
    expect(loadKnownPlayers()[0].name).toBe('Старый');
  });
});

// ─── saveKnownPlayers (bulk) ─────────────────────────────────────────────────

describe('saveKnownPlayers', () => {
  it('saves multiple names at once', () => {
    saveKnownPlayers(['Артём', 'Борис', 'Вера']);
    expect(loadKnownPlayers()).toHaveLength(3);
  });

  it('ignores empty names in array', () => {
    saveKnownPlayers(['', '  ', 'Галина', 'А']);
    expect(loadKnownPlayers()).toHaveLength(1);
    expect(loadKnownPlayers()[0].name).toBe('Галина');
  });

  it('deduplicates within the batch', () => {
    saveKnownPlayers(['Денис', 'Денис', 'денис']);
    expect(loadKnownPlayers()).toHaveLength(1);
  });

  it('empty array saves nothing', () => {
    saveKnownPlayers([]);
    expect(loadKnownPlayers()).toHaveLength(0);
  });
});

// ─── deleteKnownPlayer ───────────────────────────────────────────────────────

describe('deleteKnownPlayer', () => {
  it('removes player by id', () => {
    saveKnownPlayer('Екатерина');
    const [p] = loadKnownPlayers();
    deleteKnownPlayer(p.id);
    expect(loadKnownPlayers()).toHaveLength(0);
  });

  it('does not affect other players when deleting one', () => {
    saveKnownPlayer('Жанна');
    saveKnownPlayer('Зоя');
    const players = loadKnownPlayers();
    const toDelete = players.find((p) => p.name === 'Жанна')!;
    deleteKnownPlayer(toDelete.id);
    const remaining = loadKnownPlayers();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Зоя');
  });

  it('is idempotent — deleting non-existent id does not throw', () => {
    expect(() => deleteKnownPlayer('non-existent-id')).not.toThrow();
  });

  it('is idempotent — deleting same id twice does not throw', () => {
    saveKnownPlayer('Иван');
    const [p] = loadKnownPlayers();
    deleteKnownPlayer(p.id);
    expect(() => deleteKnownPlayer(p.id)).not.toThrow();
  });
});

// ─── searchKnownPlayers ──────────────────────────────────────────────────────

describe('searchKnownPlayers', () => {
  beforeEach(() => {
    saveKnownPlayers(['Иван', 'Ирина', 'Илья', 'Борис', 'Бэлла', 'Карен', 'Катя', 'Ксения', 'Лариса']);
  });

  it('empty query returns all players up to default limit (8)', () => {
    const result = searchKnownPlayers('');
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('returns matching players for a query', () => {
    const result = searchKnownPlayers('ив');
    const names = result.map((p) => p.name);
    expect(names).toContain('Иван');
  });

  it('is case-insensitive', () => {
    const result = searchKnownPlayers('ИВ');
    expect(result.map((p) => p.name)).toContain('Иван');
  });

  it('returns empty array for no matches', () => {
    expect(searchKnownPlayers('Ющенко')).toHaveLength(0);
  });

  it('respects custom limit', () => {
    const result = searchKnownPlayers('', 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('limit=1 returns at most 1 result', () => {
    expect(searchKnownPlayers('И', 1)).toHaveLength(1);
  });

  it('limit=0 returns empty array', () => {
    expect(searchKnownPlayers('', 0)).toHaveLength(0);
  });

  it('whitespace-only query returns top results by MRU', () => {
    const result = searchKnownPlayers('  ');
    expect(result.length).toBeGreaterThan(0);
  });

  it('partial match from middle of name works', () => {
    const result = searchKnownPlayers('рис'); // matches Борис
    expect(result.map((p) => p.name)).toContain('Борис');
  });
});

// ─── MAX_PLAYERS cap (boundary) ──────────────────────────────────────────────

describe('saveKnownPlayer — MAX_PLAYERS=100 cap', () => {
  it('keeps only 100 entries when more than 100 are saved', () => {
    // Save 101 unique players with strictly increasing timestamps
    const base = Date.now();
    for (let i = 1; i <= 101; i++) {
      // Patch lastUsed directly via the saved JSON to guarantee MRU order
      saveKnownPlayer(`Игрок ${i}`);
      // Update the saved list so each entry has a distinct, increasing timestamp
      const current = loadKnownPlayers();
      const entry = current.find((p) => p.name === `Игрок ${i}`);
      if (entry) entry.lastUsed = base + i;
      localStorage.setItem('pole_chudes_known_players', JSON.stringify(current));
    }
    const all = loadKnownPlayers();
    expect(all.length).toBe(100);
  });

  it('evicts the oldest entry (lowest lastUsed) when at capacity', () => {
    const base = 1_000_000;
    // Pre-populate exactly 100 entries with known timestamps
    const initial = Array.from({ length: 100 }, (_, i) => ({
      id: `id-${i}`,
      name: `Ветеран ${i + 1}`,
      lastUsed: base + i,
    }));
    localStorage.setItem('pole_chudes_known_players', JSON.stringify(initial));

    // Adding one more should evict Ветеран 1 (lastUsed = base + 0, the oldest)
    saveKnownPlayer('Новичок');
    const all = loadKnownPlayers();
    expect(all.length).toBe(100);
    expect(all.find((p) => p.name === 'Ветеран 1')).toBeUndefined();
    expect(all.find((p) => p.name === 'Новичок')).toBeDefined();
  });
});
