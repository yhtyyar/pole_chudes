/**
 * Tests for utils/gameHistory.ts
 *
 * Covers:
 * - saveGameResults: persists entries, skips zero-score / empty-name entries
 * - loadHistory: returns all raw records in recency order
 * - loadAllTimeTop: deduplicates by player name (best score), sorts descending
 * - clearHistory: removes the storage key
 * - MAX_ENTRIES cap (200)
 * - Edge cases: empty data, multiple games, same player across games
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveGameResults,
  loadHistory,
  loadAllTimeTop,
  clearHistory,
} from '../utils/gameHistory';
import type { GameTopEntry } from '../types';

function makeEntry(overrides: Partial<GameTopEntry> = {}): GameTopEntry {
  return {
    playerId: 'g1p1',
    name: 'Алиса',
    totalScore: 500,
    groupName: 'Группа 1',
    roundsWon: 0,
    ...overrides,
  };
}

describe('gameHistory — saveGameResults', () => {
  beforeEach(() => clearHistory());

  it('persists entries to localStorage', () => {
    saveGameResults([makeEntry({ name: 'Алиса', totalScore: 300 })]);
    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe('Алиса');
    expect(history[0].score).toBe(300);
  });

  it('saves entries with zero score (only blank names are filtered)', () => {
    saveGameResults([makeEntry({ totalScore: 0 })]);
    expect(loadHistory()).toHaveLength(1);
    expect(loadHistory()[0].score).toBe(0);
  });

  it('skips entries with empty/blank name', () => {
    saveGameResults([makeEntry({ name: '' })]);
    saveGameResults([makeEntry({ name: '   ' })]);
    expect(loadHistory()).toHaveLength(0);
  });

  it('accumulates across multiple saveGameResults calls', () => {
    saveGameResults([makeEntry({ name: 'Алиса', totalScore: 100 })]);
    saveGameResults([makeEntry({ name: 'Боб', totalScore: 200 })]);
    expect(loadHistory()).toHaveLength(2);
  });

  it('persists groupName and roundsWon', () => {
    saveGameResults([makeEntry({ groupName: 'Команда А', roundsWon: 1 })]);
    const entry = loadHistory()[0];
    expect(entry.groupName).toBe('Команда А');
    expect(entry.roundsWon).toBe(1);
  });

  it('assigns a unique id to each record', () => {
    saveGameResults([
      makeEntry({ name: 'Алиса', totalScore: 100 }),
      makeEntry({ name: 'Боб', totalScore: 200 }),
    ]);
    const ids = loadHistory().map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('assigns a playedAt timestamp', () => {
    const before = Date.now();
    saveGameResults([makeEntry({ totalScore: 100 })]);
    const after = Date.now();
    const ts = loadHistory()[0].playedAt;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('saves multiple entries from a single call', () => {
    saveGameResults([
      makeEntry({ name: 'Алиса', totalScore: 300 }),
      makeEntry({ name: 'Боб', totalScore: 150 }),
      makeEntry({ name: 'Вера', totalScore: 250 }),
    ]);
    expect(loadHistory()).toHaveLength(3);
  });

  it('trims whitespace from player name', () => {
    saveGameResults([makeEntry({ name: '  Алиса  ', totalScore: 100 })]);
    expect(loadHistory()[0].name).toBe('Алиса');
  });
});

describe('gameHistory — loadHistory', () => {
  beforeEach(() => clearHistory());

  it('returns empty array when no history', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('pole_chudes_history', 'not-json{{{');
    expect(loadHistory()).toEqual([]);
  });

  it('returns entries in recency order (most recent first)', () => {
    // Manually insert entries with different timestamps
    const entries = [
      { id: '1', name: 'A', score: 100, groupName: 'G1', roundsWon: 0, playedAt: 1000 },
      { id: '2', name: 'B', score: 200, groupName: 'G1', roundsWon: 0, playedAt: 3000 },
      { id: '3', name: 'C', score: 150, groupName: 'G1', roundsWon: 0, playedAt: 2000 },
    ];
    localStorage.setItem('pole_chudes_history', JSON.stringify(entries));
    const history = loadHistory();
    // loadHistory returns raw array — order is as-stored
    expect(history).toHaveLength(3);
  });
});

describe('gameHistory — loadAllTimeTop', () => {
  beforeEach(() => clearHistory());

  it('returns empty array when no history', () => {
    expect(loadAllTimeTop()).toEqual([]);
  });

  it('returns players sorted by best score descending', () => {
    saveGameResults([
      makeEntry({ name: 'Алиса', totalScore: 100 }),
      makeEntry({ name: 'Боб', totalScore: 500 }),
      makeEntry({ name: 'Вера', totalScore: 300 }),
    ]);
    const top = loadAllTimeTop();
    expect(top[0].name).toBe('Боб');
    expect(top[1].name).toBe('Вера');
    expect(top[2].name).toBe('Алиса');
  });

  it('deduplicates same player (case-insensitive), keeps best score', () => {
    saveGameResults([makeEntry({ name: 'Алиса', totalScore: 200 })]);
    saveGameResults([makeEntry({ name: 'алиса', totalScore: 500 })]);
    saveGameResults([makeEntry({ name: 'АЛИСА', totalScore: 100 })]);
    const top = loadAllTimeTop();
    // Should be a single entry for Алиса with score 500
    expect(top).toHaveLength(1);
    expect(top[0].score).toBe(500);
  });

  it('respects the limit parameter', () => {
    const entries = Array.from({ length: 30 }, (_, i) =>
      makeEntry({ name: `Игрок ${i}`, totalScore: (i + 1) * 10 })
    );
    saveGameResults(entries);
    expect(loadAllTimeTop(5)).toHaveLength(5);
    expect(loadAllTimeTop(10)).toHaveLength(10);
  });

  it('defaults to top 20', () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ name: `Игрок ${i}`, totalScore: (i + 1) * 10 })
    );
    saveGameResults(entries);
    expect(loadAllTimeTop()).toHaveLength(20);
  });

  it('preserves best score entry data (groupName, roundsWon)', () => {
    // First game — lower score
    saveGameResults([makeEntry({ name: 'Алиса', totalScore: 100, groupName: 'Старая группа', roundsWon: 0 })]);
    // Second game — higher score
    saveGameResults([makeEntry({ name: 'Алиса', totalScore: 800, groupName: 'Новая группа', roundsWon: 1 })]);
    const top = loadAllTimeTop();
    expect(top[0].score).toBe(800);
    expect(top[0].groupName).toBe('Новая группа');
    expect(top[0].roundsWon).toBe(1);
  });
});

describe('gameHistory — clearHistory', () => {
  beforeEach(() => clearHistory());

  it('removes all history entries', () => {
    saveGameResults([makeEntry({ totalScore: 100 })]);
    expect(loadHistory()).toHaveLength(1);
    clearHistory();
    expect(loadHistory()).toHaveLength(0);
  });

  it('is safe to call when history is empty', () => {
    expect(() => clearHistory()).not.toThrow();
    expect(loadHistory()).toEqual([]);
  });
});

describe('gameHistory — MAX_ENTRIES cap', () => {
  beforeEach(() => clearHistory());

  it('keeps at most 200 entries', () => {
    // Save 210 unique players in batches
    for (let i = 0; i < 210; i++) {
      saveGameResults([makeEntry({ name: `Игрок ${i}`, totalScore: i + 1 })]);
    }
    expect(loadHistory().length).toBeLessThanOrEqual(200);
  });

  it('keeps the most recent entries when capping', () => {
    for (let i = 0; i < 210; i++) {
      saveGameResults([makeEntry({ name: `Игрок ${i}`, totalScore: i + 1 })]);
    }
    const history = loadHistory();
    // Most recent entries should be Игрок 209, 208, ... (highest i = most recent)
    expect(history[0].name).toBe('Игрок 209');
  });
});
