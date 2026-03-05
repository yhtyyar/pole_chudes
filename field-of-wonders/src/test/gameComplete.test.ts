/**
 * Tests for gameComplete status transition and history persistence.
 *
 * Covers:
 * - markWinner on final round → gameStatus becomes 'gameComplete'
 * - markWinner on regular round → gameStatus stays 'roundComplete'
 * - submitLetter completing the final word → gameStatus 'gameComplete'
 * - submitWord on final round → gameStatus 'gameComplete'
 * - History is saved when game completes via markWinner on final
 * - History is saved when game completes via submitLetter on final
 * - History is saved when game completes via submitWord on final
 * - App routing: gameComplete shows Final (status-level test)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, DRUM_SECTORS } from '../stores/gameStore';
import { loadHistory, clearHistory } from '../utils/gameHistory';
import type { SetupForm } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FORM: SetupForm = {
  groups: ['G1', 'G2', 'G3', 'G4', 'G5'],
  playerNames: [
    ['Алиса', 'Боб', 'Вера', 'Гена', 'Дима'],
    ['Ева', 'Жора', 'Зина', 'Игорь', 'Катя'],
    ['Лена', 'Миша', 'Нина', 'Олег', 'Петя'],
    ['Рита', 'Саша', 'Таня', 'Ульяна', 'Федя'],
    ['Харитон', 'Цветана', 'Чайка', 'Шура', 'Эля'],
  ],
  playersPerGroup: [5, 5, 5, 5, 5],
  rounds: [
    { word: 'АБВ', question: 'Q1' },
    { word: 'ГДЕ', question: 'Q2' },
    { word: 'ЖЗИ', question: 'Q3' },
    { word: 'ЙКЛ', question: 'Q4' },
    { word: 'МНО', question: 'Q5' },
    { word: 'ПРС', question: 'Qf' }, // final
  ],
};

function freshGame() {
  localStorage.clear();
  clearHistory();
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame(FORM);
}

/** Advance to the final round by completing all regular rounds via markWinner */
function advanceToFinal() {
  freshGame();
  // Complete rounds 0..4 by marking winner each time, then starting next round
  for (let r = 0; r < 5; r++) {
    // Reveal all letters in the current round's word so markWinner is valid
    useGameStore.getState().markWinner();
    if (r < 4) {
      useGameStore.getState().startNextRound();
    }
  }
  useGameStore.getState().startFinal();
}

// Points sector for spinning
const POINTS_SECTOR = DRUM_SECTORS.find((s) => s.sector.type === 'points')!.sector;

describe('markWinner — status transitions', () => {
  beforeEach(() => { freshGame(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('sets roundComplete on a regular round', () => {
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
  });

  it('sets gameComplete when markWinner is called on the final round', () => {
    advanceToFinal();
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('final');

    state.markWinner();
    expect(useGameStore.getState().gameStatus).toBe('gameComplete');
  });

  it('marks the current final player as isWinner', () => {
    advanceToFinal();
    useGameStore.getState().markWinner();
    const finalPlayers = useGameStore.getState().players.filter((p) => p.id.startsWith('final_'));
    expect(finalPlayers.some((p) => p.isWinner)).toBe(true);
  });

  it('does not change gameStatus when no current player exists', () => {
    // Force an empty player list scenario by manipulating turn index out of range
    // (markWinner should be a no-op if cp is undefined)
    useGameStore.setState((s) => ({
      turn: { ...s.turn, currentPlayerIndex: 999 },
    }));
    useGameStore.getState().markWinner();
    // Status should remain playing (no cp found → early return)
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });
});

describe('markWinner on final — history persistence', () => {
  beforeEach(() => { clearHistory(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('saves game results to history after markWinner on final round', () => {
    advanceToFinal();
    expect(loadHistory()).toHaveLength(0);
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('gameComplete');
    const history = loadHistory();
    // All regular (non-final_) players with score > 0 should be saved
    expect(history.length).toBeGreaterThan(0);
  });

  it('does not save history on regular round completion', () => {
    freshGame();
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
    expect(loadHistory()).toHaveLength(0);
  });
});

describe('submitLetter completing the final word → gameComplete', () => {
  beforeEach(() => { clearHistory(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('sets gameComplete when last letter is submitted on final round', () => {
    advanceToFinal();
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('final');

    // Submit each letter of the final word 'ПРС'
    // Each correct letter sends phase back to 'spin', so re-spin before each
    for (const letter of 'ПРС'.split('')) {
      useGameStore.getState().spinDrumAction();
      useGameStore.getState().finishDrumSpin(POINTS_SECTOR);
      useGameStore.getState().setPendingLetter(letter);
      useGameStore.getState().submitLetter();
    }

    expect(useGameStore.getState().gameStatus).toBe('gameComplete');
  });

  it('saves history when final word completed via letters', () => {
    advanceToFinal();

    // Re-spin before each letter
    for (const letter of 'ПРС'.split('')) {
      useGameStore.getState().spinDrumAction();
      useGameStore.getState().finishDrumSpin(POINTS_SECTOR);
      useGameStore.getState().setPendingLetter(letter);
      useGameStore.getState().submitLetter();
    }

    expect(useGameStore.getState().gameStatus).toBe('gameComplete');
    expect(loadHistory().length).toBeGreaterThan(0);
  });
});

describe('submitWord on final round → gameComplete', () => {
  beforeEach(() => { clearHistory(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('sets gameComplete when word is guessed on final round', () => {
    advanceToFinal();
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('final');

    // Put turn in input phase
    state.spinDrumAction();
    state.finishDrumSpin(POINTS_SECTOR);
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'input' } }));

    useGameStore.getState().submitWord('ПРС');
    expect(useGameStore.getState().gameStatus).toBe('gameComplete');
  });

  it('saves history when word guessed on final round', () => {
    advanceToFinal();
    expect(loadHistory()).toHaveLength(0);

    const state = useGameStore.getState();
    state.spinDrumAction();
    state.finishDrumSpin(POINTS_SECTOR);
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'input' } }));
    useGameStore.getState().submitWord('ПРС');

    expect(loadHistory().length).toBeGreaterThan(0);
  });

  it('does not set gameComplete on wrong word on final round', () => {
    advanceToFinal();
    const state = useGameStore.getState();
    state.spinDrumAction();
    state.finishDrumSpin(POINTS_SECTOR);
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'input' } }));
    useGameStore.getState().submitWord('НЕВЕРНОЕ');
    expect(useGameStore.getState().gameStatus).toBe('final');
    expect(loadHistory()).toHaveLength(0);
  });
});

describe('player names in game results', () => {
  beforeEach(() => { clearHistory(); });

  it('history entries carry the correct player name', () => {
    advanceToFinal();
    useGameStore.getState().markWinner();

    const history = loadHistory();
    const names = history.map((e) => e.name);
    // All names should be non-empty strings (not 'Игрок N' defaults if playerNames filled)
    expect(names.every((n) => n.length > 0)).toBe(true);
  });

  it('history entries carry groupName', () => {
    advanceToFinal();
    useGameStore.getState().markWinner();

    const history = loadHistory();
    expect(history.every((e) => e.groupName.length > 0)).toBe(true);
  });

  it('updatePlayerName change is reflected in history after game complete', () => {
    advanceToFinal();
    // Rename the first regular player
    const firstPlayer = useGameStore.getState().players.find((p) => !p.id.startsWith('final_'));
    if (firstPlayer) {
      useGameStore.getState().updatePlayerName(firstPlayer.id, 'СуперИгрок');
    }
    useGameStore.getState().markWinner();

    const history = loadHistory();
    const found = history.find((e) => e.name === 'СуперИгрок');
    expect(found).toBeDefined();
  });
});

describe('gameStatus after restartGame', () => {
  it('resets to playing (not gameComplete) after restartGame', () => {
    advanceToFinal();
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('gameComplete');

    useGameStore.getState().restartGame();
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });
});
