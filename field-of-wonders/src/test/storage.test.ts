import { describe, it, expect, beforeEach } from 'vitest';
import { saveState, loadState, clearState } from '../utils/storage';
import type { GameState } from '../types';

const MINIMAL_STATE: GameState = {
  meta: { version: '1.0.0', createdAt: 1000, lastSaved: 1000 },
  config: {
    groups: ['Группа 1', 'Группа 2'],
    playerNames: [],
    rounds: [
      { id: 0, word: 'СЛОВО', question: 'Вопрос 1', completed: false, isFinal: false },
    ],
  },
  currentRound: 0,
  players: [
    { id: 'g1p1', name: 'Игрок 1', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
  ],
  board: { word: 'СЛОВО', revealed: [false, false, false, false, false] },
  turn: {
    currentPlayerIndex: 0,
    timer: 15,
    timerRunning: false,
    sector: null,
    drumSpinning: false,
    phase: 'spin',
    pendingLetter: '',
    extraTurn: false,
    bankAmount: 0,
  },
  gameStatus: 'playing',
  questionVisible: true,
  muted: false,
  volume: 0.8,
  bgMusicEnabled: false,
  bgMusicVolume: 0.4,
};

describe('storage — saveState / loadState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState returns null when nothing saved', () => {
    expect(loadState()).toBeNull();
  });

  it('saves and loads state correctly', () => {
    saveState(MINIMAL_STATE);
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.gameStatus).toBe('playing');
    expect(loaded?.board.word).toBe('СЛОВО');
    expect(loaded?.players).toHaveLength(1);
  });

  it('preserves nested objects', () => {
    saveState(MINIMAL_STATE);
    const loaded = loadState();
    expect(loaded?.config.groups).toEqual(['Группа 1', 'Группа 2']);
    expect(loaded?.board.revealed).toEqual([false, false, false, false, false]);
  });

  it('updates lastSaved on save', () => {
    const before = Date.now();
    saveState(MINIMAL_STATE);
    const loaded = loadState();
    expect(loaded?.meta.lastSaved).toBeGreaterThanOrEqual(before);
  });

  it('overwrites previous state on second save', () => {
    saveState(MINIMAL_STATE);
    const modified: GameState = {
      ...MINIMAL_STATE,
      gameStatus: 'roundComplete',
      currentRound: 1,
    };
    saveState(modified);
    const loaded = loadState();
    expect(loaded?.gameStatus).toBe('roundComplete');
    expect(loaded?.currentRound).toBe(1);
  });

  it('preserves player scores', () => {
    const withScores: GameState = {
      ...MINIMAL_STATE,
      players: [
        { id: 'g1p1', name: 'Игрок 1', group: 1, score: 350, roundScore: 200, isWinner: false, isBankrupt: false },
      ],
    };
    saveState(withScores);
    const loaded = loadState();
    expect(loaded?.players[0].score).toBe(350);
    expect(loaded?.players[0].roundScore).toBe(200);
  });

  it('preserves null sector in turn', () => {
    saveState(MINIMAL_STATE);
    const loaded = loadState();
    expect(loaded?.turn.sector).toBeNull();
  });

  it('preserves non-null sector in turn', () => {
    const withSector: GameState = {
      ...MINIMAL_STATE,
      turn: { ...MINIMAL_STATE.turn, sector: { type: 'points', value: 300 } },
    };
    saveState(withSector);
    const loaded = loadState();
    expect(loaded?.turn.sector).toEqual({ type: 'points', value: 300 });
  });
});

describe('storage — clearState', () => {
  it('clearState removes saved data', () => {
    saveState(MINIMAL_STATE);
    clearState();
    expect(loadState()).toBeNull();
  });

  it('clearState is idempotent — calling twice does not throw', () => {
    expect(() => {
      clearState();
      clearState();
    }).not.toThrow();
  });
});
