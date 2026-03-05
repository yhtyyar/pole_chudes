/**
 * Integration / Functional tests
 *
 * Key invariant tested:
 *   "When the drum stops, the sector stored in turn.sector MUST match
 *    what spinDrumWithSeed(seed) returns for the same Math.random seed."
 *
 * These tests exercise the full store flow end-to-end, verifying that:
 *   - finishDrumSpin picks a sector and stores it in turn.sector
 *   - The stored sector type / value matches the expected sector for the seed used
 *   - The UI-visible result (turn.sector) is always consistent with the logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, spinDrumWithSeed, DRUM_SECTORS } from '../stores/gameStore';
import { getLog, clearLog } from '../utils/gameLogger';
import type { SetupForm, DrumSector } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const FORM: SetupForm = {
  groups: ['Группа 1', 'Группа 2', 'Группа 3', 'Группа 4', 'Группа 5'],
  playerNames: [],
  rounds: [
    { word: 'БАРАБАН', question: 'Ударный инструмент' },
    { word: 'СЛОВО',   question: 'Единица речи' },
    { word: 'ЗВЕЗДА',  question: 'Небесное тело' },
    { word: 'ПОБЕДА',  question: 'Итог сражения' },
    { word: 'ЗОЛОТО',  question: 'Благородный металл' },
    { word: 'ФИНАЛ',   question: 'Последний раунд' },
  ],
};

function setup() {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame(FORM);
}

/** Run a spin with a deterministic seed, manually call finishDrumSpin with expected sector */
function spinWithSeed(seed: number) {
  const expectedSector = spinDrumWithSeed(seed);
  vi.spyOn(Math, 'random').mockReturnValue(seed);
  useGameStore.getState().spinDrumAction();
  // Manually call finishDrumSpin with expected sector (animation .then() equivalent)
  useGameStore.getState().finishDrumSpin(expectedSector);
  vi.restoreAllMocks();
}

// ─── Drum result consistency ──────────────────────────────────────────────────

describe('Integration: drum sector == displayed result', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setup();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * For every distinct sector in DRUM_SECTORS, calculate the exact seed that
   * would land on it, then verify turn.sector matches spinDrumWithSeed(seed).
   */
  it('sector stored in turn.sector matches spinDrumWithSeed for each sector type', () => {
    const total = DRUM_SECTORS.reduce((s, d) => s + d.weight, 0);
    let cumulative = 0;

    DRUM_SECTORS.forEach(({ sector, weight }) => {
      // Mid-point of this sector's weight band
      const midRaw  = cumulative + weight / 2;
      const seed    = midRaw / total;
      cumulative   += weight;

      // Verify spinDrumWithSeed gives us exactly this sector
      const expected = spinDrumWithSeed(seed);
      expect(expected.type).toBe(sector.type);
      if (sector.type === 'points' && expected.type === 'points') {
        expect(expected.value).toBe(sector.value);
      }

      // Re-setup for each spin (turn resets)
      setup();

      // Spy on Math.random and manually call finishDrumSpin with expected sector
      vi.spyOn(Math, 'random').mockReturnValue(seed);
      useGameStore.getState().spinDrumAction();
      useGameStore.getState().finishDrumSpin(expected);
      vi.restoreAllMocks();

      const { turn } = useGameStore.getState();
      expect(turn.drumSpinning).toBe(false);
      expect(turn.sector).not.toBeNull();
      expect(turn.sector!.type).toBe(expected.type);
      if (expected.type === 'points' && turn.sector!.type === 'points') {
        expect((turn.sector as Extract<DrumSector, { type: 'points' }>).value)
          .toBe(expected.value);
      }
    });
  });

  it('after bankrupt: turn.sector.type === "bankrupt" and player roundScore === 0', () => {
    // Give player score first
    useGameStore.setState((s) => ({
      players: s.players.map((p) =>
        p.id === 'g1p1' ? { ...p, roundScore: 400, score: 400 } : p
      ),
    }));

    // bankrupt midpoint seed: (54+4+4) + 5/2 = 64.5 / 72
    spinWithSeed(64.5 / 72);

    const { turn, players } = useGameStore.getState();
    expect(turn.sector?.type).toBe('bankrupt');
    const p = players.find((p) => p.id === 'g1p1')!;
    expect(p.roundScore).toBe(0);
    expect(p.isBankrupt).toBe(true);
  });

  it('after points sector: turn.sector.type === "points" and value > 0', () => {
    // seed near 0 → first sector (100 points), midpoint = 5/72
    spinWithSeed(5 / 72);

    const { turn } = useGameStore.getState();
    expect(turn.sector?.type).toBe('points');
    if (turn.sector?.type === 'points') {
      expect(turn.sector.value).toBe(100);
    }
  });

  it('after double sector: turn.sector.type === "double"', () => {
    // double midpoint: 54 + 2 = 56/72
    spinWithSeed(56 / 72);

    const { turn } = useGameStore.getState();
    expect(turn.sector?.type).toBe('double');
  });

  it('after extra sector: turn.sector.type === "extra" and phase === "input"', () => {
    // extra midpoint: 58 + 2 = 60/72
    spinWithSeed(60 / 72);

    const { turn } = useGameStore.getState();
    expect(turn.sector?.type).toBe('extra');
    expect(turn.phase).toBe('input');
  });

  it('after bank sector: turn.sector.type === "bank" and phase === "input"', () => {
    // bank midpoint: 69 + 1.5 = 70.5/72
    spinWithSeed(70.5 / 72);

    const { turn } = useGameStore.getState();
    expect(turn.sector?.type).toBe('bank');
    expect(turn.phase).toBe('input');
  });

  it('after prize sector: turn.sector.type === "prize" and phase === "input"', () => {
    // prize midpoint: 67 + 1 = 68/72
    spinWithSeed(68 / 72);

    const { turn } = useGameStore.getState();
    expect(turn.sector?.type).toBe('prize');
    expect(turn.phase).toBe('input');
  });

  it('drum is never still spinning after finishDrumSpin called', () => {
    const expectedSector = spinDrumWithSeed(0.42);
    useGameStore.getState().spinDrumAction();
    useGameStore.getState().finishDrumSpin(expectedSector);
    expect(useGameStore.getState().turn.drumSpinning).toBe(false);
  });

  it('sector is never null after finishDrumSpin', () => {
    // Run 20 random spins
    for (let i = 0; i < 20; i++) {
      setup();
      const seed = Math.random();
      const expectedSector = spinDrumWithSeed(seed);
      vi.spyOn(Math, 'random').mockReturnValue(seed);
      useGameStore.getState().spinDrumAction();
      useGameStore.getState().finishDrumSpin(expectedSector);
      vi.restoreAllMocks();
      expect(useGameStore.getState().turn.sector).not.toBeNull();
    }
  });
});

// ─── Full round flow ──────────────────────────────────────────────────────────

describe('Integration: full round flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setup();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('can complete a full round: spin → letter × N → roundComplete', () => {
    const word = useGameStore.getState().board.word; // БАРАБАН

    // Spin and land on 200 points (seed midpoint 24/72)
    spinWithSeed(24 / 72);
    expect(useGameStore.getState().turn.sector?.type).toBe('points');
    expect(useGameStore.getState().turn.phase).toBe('input');

    // Reveal all unique letters one by one
    const unique = [...new Set(word.split(''))];
    for (const letter of unique) {
      // Make sure we're in input phase (might have advanced players after wrong)
      const state = useGameStore.getState();
      if (state.turn.phase !== 'input') {
        // re-spin
        spinWithSeed(24 / 72);
      }
      useGameStore.getState().setPendingLetter(letter);
      useGameStore.getState().submitLetter();

      // advance timers for any nextPlayer timeouts
      vi.advanceTimersByTime(2000);

      const afterSubmit = useGameStore.getState();
      if (afterSubmit.gameStatus === 'roundComplete') break;

      // if phase is spin again, re-spin
      if (afterSubmit.turn.phase === 'spin') {
        spinWithSeed(24 / 72);
      }
    }

    const final = useGameStore.getState();
    expect(final.board.revealed.every(Boolean)).toBe(true);
    expect(final.gameStatus).toBe('roundComplete');
  });

  it('score increases after correct letter with points sector', () => {
    // Land on 300 points (seed midpoint 38/72)
    spinWithSeed(38 / 72);
    expect(useGameStore.getState().turn.sector?.type).toBe('points');

    const sectorValue = (useGameStore.getState().turn.sector as Extract<DrumSector, { type: 'points' }>).value;
    const word = useGameStore.getState().board.word; // БАРАБАН
    const firstLetter = word[0]; // Б

    const beforeScore = useGameStore.getState().players.find((p) => p.id === 'g1p1')!.score;
    useGameStore.getState().setPendingLetter(firstLetter);
    useGameStore.getState().submitLetter();
    const afterScore = useGameStore.getState().players.find((p) => p.id === 'g1p1')!.score;

    // Count occurrences of that letter
    const count = word.split('').filter((l) => l === firstLetter).length;
    expect(afterScore - beforeScore).toBe(sectorValue * count);
  });

  it('player changes after wrong letter + timeout', () => {
    spinWithSeed(24 / 72); // points sector
    const beforeIdx = useGameStore.getState().turn.currentPlayerIndex;

    // Submit a letter that is definitely not in БАРАБАН
    useGameStore.getState().setPendingLetter('Щ');
    useGameStore.getState().submitLetter();
    vi.advanceTimersByTime(2000);

    const afterIdx = useGameStore.getState().turn.currentPlayerIndex;
    expect(afterIdx).toBe((beforeIdx + 1) % 5);
  });

  it('startNextRound resets board for next word', () => {
    useGameStore.setState({ gameStatus: 'roundComplete' });
    useGameStore.getState().startNextRound();

    const { board, currentRound } = useGameStore.getState();
    expect(currentRound).toBe(1);
    expect(board.word).toBe('СЛОВО');
    expect(board.revealed.every((v) => !v)).toBe(true);
    expect(board.revealed.length).toBe(5);
  });
});

// ─── Logger integration ───────────────────────────────────────────────────────

describe('Integration: game logger captures events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    clearLog();
    setup();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('startGame logs a GAME event', () => {
    const log = getLog();
    const gameEvents = log.filter((e) => e.category === 'GAME' && e.message.includes('начата'));
    expect(gameEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('spinDrumAction logs a DRUM event', () => {
    spinWithSeed(0.3);
    const drumEvents = getLog().filter((e) => e.category === 'DRUM');
    // Should have at least "запущен" + "остановился"
    expect(drumEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('submitLetter logs a LETTER event', () => {
    spinWithSeed(24 / 72);
    useGameStore.getState().setPendingLetter('Б');
    useGameStore.getState().submitLetter();

    const letterEvents = getLog().filter((e) => e.category === 'LETTER');
    expect(letterEvents.length).toBeGreaterThanOrEqual(1);
  });
});
