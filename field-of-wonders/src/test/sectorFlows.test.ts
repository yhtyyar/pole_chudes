/**
 * Extended sector flow tests — prize, bank, extra, double, forceRevealLetter,
 * submitWord, previousPlayer, markWinner, forceRevealLetter edge cases.
 *
 * Techniques:
 *   - Decision table: each sector type → expected phase + score behavior
 *   - Boundary: bank sector adds bankAmount correctly
 *   - State transition: spin → finishDrumSpin → submitLetter for each special sector
 *   - Equivalence partitioning: correct/wrong letter for each special sector
 *   - Error guessing: double with 0 roundScore, bank with 0 bankAmount
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, spinDrumWithSeed, DRUM_SECTORS } from '../stores/gameStore';
import type { SetupForm } from '../types';

const FORM: SetupForm = {
  groups: ['G1', 'G2', 'G3', 'G4', 'G5'],
  playerNames: [],
  playersPerGroup: [5, 5, 5, 5, 5],
  rounds: [
    { word: 'БАРАБАН', question: 'Q1' },
    { word: 'СЛОВО',   question: 'Q2' },
    { word: 'ЗВЕЗДА',  question: 'Q3' },
    { word: 'РАДОСТЬ', question: 'Q4' },
    { word: 'ПОБЕДА',  question: 'Q5' },
    { word: 'ФИНАЛ',   question: 'Qf' },
  ],
};

function freshGame() {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame(FORM);
}

/** Mid-point seed for a sector by type */
function seedFor(type: string, value?: number): number {
  const total = DRUM_SECTORS.reduce((s, d) => s + d.weight, 0);
  let cum = 0;
  for (const { sector, weight } of DRUM_SECTORS) {
    if (sector.type === type && (value === undefined || (sector as { value?: number }).value === value)) {
      return (cum + weight / 2) / total;
    }
    cum += weight;
  }
  throw new Error(`Sector not found: type=${type} value=${value}`);
}

function spinWithSeed(seed: number) {
  const expected = spinDrumWithSeed(seed);
  vi.spyOn(Math, 'random').mockReturnValue(seed);
  useGameStore.getState().spinDrumAction();
  useGameStore.getState().finishDrumSpin(expected);
  vi.restoreAllMocks();
  return expected;
}

// ─── prize sector ─────────────────────────────────────────────────────────────

describe('prize sector', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('sets phase to input after landing on prize', () => {
    spinWithSeed(seedFor('prize'));
    expect(useGameStore.getState().turn.phase).toBe('input');
    expect(useGameStore.getState().turn.sector?.type).toBe('prize');
  });

  it('starts timer after landing on prize', () => {
    spinWithSeed(seedFor('prize'));
    expect(useGameStore.getState().turn.timerRunning).toBe(true);
    expect(useGameStore.getState().turn.timer).toBe(15);
  });

  it('correct letter on prize adds 100 per occurrence to score', () => {
    spinWithSeed(seedFor('prize'));
    // БАРАБАН — Б appears 2 times
    useGameStore.getState().setPendingLetter('Б');
    useGameStore.getState().submitLetter();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    expect(p.roundScore).toBe(200); // 2 × 100
  });

  it('wrong letter on prize advances player', () => {
    spinWithSeed(seedFor('prize'));
    useGameStore.getState().setPendingLetter('Щ');
    useGameStore.getState().submitLetter();
    vi.advanceTimersByTime(2000);
    const idx = useGameStore.getState().turn.currentPlayerIndex;
    expect(idx).toBe(1);
  });
});

// ─── extra sector ─────────────────────────────────────────────────────────────

describe('extra sector', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('sets phase to input', () => {
    spinWithSeed(seedFor('extra'));
    expect(useGameStore.getState().turn.phase).toBe('input');
    expect(useGameStore.getState().turn.sector?.type).toBe('extra');
  });

  it('correct letter on extra adds 100 per occurrence', () => {
    spinWithSeed(seedFor('extra'));
    useGameStore.getState().setPendingLetter('А'); // БАРАБАН — А appears 3 times
    useGameStore.getState().submitLetter();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    expect(p.roundScore).toBe(300); // 3 × 100
  });
});

// ─── double sector ────────────────────────────────────────────────────────────

describe('double sector', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('sets phase to input', () => {
    spinWithSeed(seedFor('double'));
    expect(useGameStore.getState().turn.phase).toBe('input');
    expect(useGameStore.getState().turn.sector?.type).toBe('double');
  });

  it('doubles roundScore when correct letter is submitted', () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p) => p.id === 'g1p1' ? { ...p, roundScore: 400, score: 400 } : p),
      turn: { ...s.turn, phase: 'input', sector: { type: 'double' } },
    }));
    useGameStore.getState().setPendingLetter('Б');
    useGameStore.getState().submitLetter();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    expect(p.roundScore).toBe(800);
  });

  it('double with 0 roundScore gives 0 after doubling', () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p) => p.id === 'g1p1' ? { ...p, roundScore: 0, score: 0 } : p),
      turn: { ...s.turn, phase: 'input', sector: { type: 'double' } },
    }));
    useGameStore.getState().setPendingLetter('Б');
    useGameStore.getState().submitLetter();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    expect(p.roundScore).toBe(0);
  });

  it('wrong letter on double still advances player', () => {
    spinWithSeed(seedFor('double'));
    useGameStore.getState().setPendingLetter('Щ');
    useGameStore.getState().submitLetter();
    vi.advanceTimersByTime(2000);
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(1);
  });
});

// ─── bank sector ──────────────────────────────────────────────────────────────

describe('bank sector', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('sets phase to input', () => {
    spinWithSeed(seedFor('bank'));
    expect(useGameStore.getState().turn.phase).toBe('input');
    expect(useGameStore.getState().turn.sector?.type).toBe('bank');
  });

  it('correct letter on bank adds (bankAmount + 100*count)', () => {
    useGameStore.setState((s) => ({
      turn: { ...s.turn, phase: 'input', sector: { type: 'bank' }, bankAmount: 500 },
    }));
    // БАРАБАН — Б appears 2 times → gain = 500 + 100*2 = 700
    useGameStore.getState().setPendingLetter('Б');
    useGameStore.getState().submitLetter();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    expect(p.roundScore).toBe(700);
  });

  it('correct letter on bank with bankAmount=0 adds 100*count', () => {
    useGameStore.setState((s) => ({
      turn: { ...s.turn, phase: 'input', sector: { type: 'bank' }, bankAmount: 0 },
    }));
    useGameStore.getState().setPendingLetter('Б');
    useGameStore.getState().submitLetter();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    expect(p.roundScore).toBe(200);
  });

  it('clears bankAmount after correct bank letter', () => {
    useGameStore.setState((s) => ({
      turn: { ...s.turn, phase: 'input', sector: { type: 'bank' }, bankAmount: 300 },
    }));
    useGameStore.getState().setPendingLetter('Б');
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.bankAmount).toBe(0);
  });
});

// ─── forceRevealLetter ────────────────────────────────────────────────────────

describe('forceRevealLetter', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('reveals all occurrences of a letter', () => {
    // БАРАБАН — А appears at indices 1, 3, 5
    useGameStore.getState().forceRevealLetter('А');
    const { revealed, word } = useGameStore.getState().board;
    word.split('').forEach((l, i) => {
      if (l === 'А') expect(revealed[i]).toBe(true);
    });
  });

  it('does not reveal other letters', () => {
    useGameStore.getState().forceRevealLetter('А');
    const { revealed, word } = useGameStore.getState().board;
    word.split('').forEach((l, i) => {
      if (l !== 'А') expect(revealed[i]).toBe(false);
    });
  });

  it('sets gameStatus to roundComplete when all letters revealed', () => {
    // Force-reveal all unique letters of БАРАБАН
    const word = useGameStore.getState().board.word; // БАРАБАН
    const unique = [...new Set(word.split(''))];
    for (const l of unique) {
      useGameStore.getState().forceRevealLetter(l);
    }
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
  });

  it('normalises Ё → Е', () => {
    useGameStore.setState({
      board: { word: 'ЗЕЛЕНЬ', revealed: [false, false, false, false, false, false] },
    });
    useGameStore.getState().forceRevealLetter('Ё');
    const { revealed } = useGameStore.getState().board;
    // ЗЕЛЕНЬ: Е at index 1 and 3
    expect(revealed[1]).toBe(true);
    expect(revealed[3]).toBe(true);
  });

  it('does not throw for a letter not in word', () => {
    expect(() => useGameStore.getState().forceRevealLetter('Щ')).not.toThrow();
    expect(useGameStore.getState().board.revealed.every((v) => !v)).toBe(true);
  });
});

// ─── submitWord ───────────────────────────────────────────────────────────────

describe('submitWord', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    freshGame();
    useGameStore.setState((s) => ({
      turn: { ...s.turn, phase: 'input', sector: { type: 'points', value: 200 } },
    }));
  });
  afterEach(() => vi.useRealTimers());

  it('sets gameStatus to roundComplete on correct word', () => {
    useGameStore.getState().submitWord('БАРАБАН');
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
  });

  it('reveals all letters on correct word', () => {
    useGameStore.getState().submitWord('БАРАБАН');
    expect(useGameStore.getState().board.revealed.every(Boolean)).toBe(true);
  });

  it('wrong word sets phase to result and advances player', () => {
    useGameStore.getState().submitWord('САМОЛЁТ');
    expect(useGameStore.getState().turn.phase).toBe('result');
    vi.advanceTimersByTime(2000);
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(1);
  });

  it('case-insensitive correct word is accepted', () => {
    useGameStore.getState().submitWord('барабан');
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
  });

  it('whitespace trimmed before checking', () => {
    useGameStore.getState().submitWord('  БАРАБАН  ');
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
  });

  it('does nothing when phase is not input', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'spin' } }));
    useGameStore.getState().submitWord('БАРАБАН');
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });

  it('awards score for unrevealed letters × sector value on correct word', () => {
    // 7 letters in БАРАБАН, all hidden → gain = 7 × 200 = 1400
    useGameStore.getState().submitWord('БАРАБАН');
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    expect(p.score).toBe(1400);
  });

  it('empty string does nothing', () => {
    useGameStore.getState().submitWord('');
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });
});

// ─── previousPlayer ───────────────────────────────────────────────────────────

describe('previousPlayer', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('decrements currentPlayerIndex by 1', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, currentPlayerIndex: 3 } }));
    useGameStore.getState().previousPlayer();
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(2);
  });

  it('wraps around from 0 to last player (index 4)', () => {
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(0);
    useGameStore.getState().previousPlayer();
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(4);
  });

  it('resets turn phase to spin', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'input' } }));
    useGameStore.getState().previousPlayer();
    expect(useGameStore.getState().turn.phase).toBe('spin');
  });
});

// ─── markWinner ───────────────────────────────────────────────────────────────

describe('markWinner', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('sets isWinner to true for current player', () => {
    useGameStore.getState().markWinner();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(p?.isWinner).toBe(true);
  });

  it('sets gameStatus to roundComplete', () => {
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
  });

  it('stops the timer', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, timerRunning: true } }));
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().turn.timerRunning).toBe(false);
  });

  it('does not affect other players isWinner flag', () => {
    useGameStore.getState().markWinner();
    const others = useGameStore.getState().players.filter((p) => p.id !== 'g1p1');
    others.forEach((p) => expect(p.isWinner).toBe(false));
  });
});

// ─── skipTurn ─────────────────────────────────────────────────────────────────

describe('skipTurn', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('advances player index by 1 (alias for nextPlayer)', () => {
    useGameStore.getState().skipTurn();
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(1);
  });

  it('resets phase to spin', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'input' } }));
    useGameStore.getState().skipTurn();
    expect(useGameStore.getState().turn.phase).toBe('spin');
  });
});

// ─── startFinal ───────────────────────────────────────────────────────────────

describe('startFinal', () => {
  beforeEach(() => { vi.useFakeTimers(); freshGame(); });
  afterEach(() => vi.useRealTimers());

  it('sets currentRound to 5', () => {
    useGameStore.getState().startFinal();
    expect(useGameStore.getState().currentRound).toBe(5);
  });

  it('sets gameStatus to final', () => {
    useGameStore.getState().startFinal();
    expect(useGameStore.getState().gameStatus).toBe('final');
  });

  it('adds final_ players', () => {
    useGameStore.getState().startFinal();
    const finalPs = useGameStore.getState().players.filter((p) => p.id.startsWith('final_'));
    expect(finalPs.length).toBeGreaterThan(0);
  });

  it('loads final word on board', () => {
    useGameStore.getState().startFinal();
    expect(useGameStore.getState().board.word).toBe('ФИНАЛ');
  });

  it('final players start with 0 score', () => {
    useGameStore.getState().startFinal();
    const finalPs = useGameStore.getState().players.filter((p) => p.id.startsWith('final_'));
    finalPs.forEach((p) => expect(p.score).toBe(0));
  });

  it('selects one winner per group (highest score) as final player', () => {
    // Give player g2p1 the highest score in group 2
    useGameStore.setState((s) => ({
      players: s.players.map((p) =>
        p.id === 'g2p1' ? { ...p, score: 1000 } : p
      ),
    }));
    useGameStore.getState().startFinal();
    const finalPs = useGameStore.getState().players.filter((p) => p.id.startsWith('final_'));
    const fromG2 = finalPs.find((p) => p.id === 'final_g2p1');
    expect(fromG2).toBeDefined();
  });
});

// ─── loadSavedState backward-compat ──────────────────────────────────────────

describe('loadSavedState — backward compatibility', () => {
  it('fills missing playerNames with empty array', () => {
    const state = {
      meta: { version: '1.0.0', createdAt: 0, lastSaved: 0 },
      config: { groups: ['G1'], rounds: [{ id: 0, word: 'ТЕСТ', question: 'Q', completed: false, isFinal: false }], playersPerGroup: [5] },
      currentRound: 0,
      players: [],
      board: { word: 'ТЕСТ', revealed: [false, false, false, false] },
      turn: { currentPlayerIndex: 0, timer: 15, timerRunning: false, sector: null, drumSpinning: false, phase: 'spin', pendingLetter: '', extraTurn: false, bankAmount: 0 },
      gameStatus: 'playing',
      questionVisible: true,
      muted: false,
      volume: 0.8,
    };
    localStorage.setItem('pole_chudes_state', JSON.stringify(state));
    useGameStore.getState().loadSavedState();
    expect(useGameStore.getState().config.playerNames).toEqual([]);
    expect(useGameStore.getState().bgMusicEnabled).toBe(false);
    expect(useGameStore.getState().bgMusicVolume).toBe(0.4);
  });

  it('returns false when nothing is saved', () => {
    localStorage.clear();
    expect(useGameStore.getState().loadSavedState()).toBe(false);
  });

  it('returns true and restores state when valid state saved', () => {
    freshGame();
    useGameStore.getState().resetGame();
    // State was saved by freshGame(), then cleared by resetGame
    // Save manually and reload
    const stateToSave = {
      meta: { version: '1.0.0', createdAt: 0, lastSaved: 0 },
      config: { groups: ['G1'], rounds: [{ id: 0, word: 'ТЕСТ', question: 'Q', completed: false, isFinal: false }], playerNames: [], playersPerGroup: [5] },
      currentRound: 0,
      players: [],
      board: { word: 'ТЕСТ', revealed: [false, false, false, false] },
      turn: { currentPlayerIndex: 0, timer: 15, timerRunning: false, sector: null, drumSpinning: false, phase: 'spin', pendingLetter: '', extraTurn: false, bankAmount: 0 },
      gameStatus: 'playing',
      questionVisible: true,
      muted: false,
      volume: 0.8,
      bgMusicEnabled: false,
      bgMusicVolume: 0.4,
    };
    localStorage.setItem('pole_chudes_state', JSON.stringify(stateToSave));
    const result = useGameStore.getState().loadSavedState();
    expect(result).toBe(true);
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });
});
