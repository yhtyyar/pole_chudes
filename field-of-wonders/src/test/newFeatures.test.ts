/**
 * Tests for new features:
 *
 * 1. Wrong-letter feedback: turn.lastWrongLetter is set when a letter is not in the word,
 *    cleared when the player advances.
 *
 * 2. markWinner gives 1500-point bonus to the current player (word guesser),
 *    regardless of who has the highest score.
 *
 * 3. TOP scoreboard excludes players with default names ("Игрок N").
 *
 * 4. gameComplete transition on final round markWinner.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, DRUM_SECTORS } from '../stores/gameStore';
import { clearHistory } from '../utils/gameHistory';
import type { SetupForm } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const POINTS_SECTOR = DRUM_SECTORS.find((s) => s.sector.type === 'points')!.sector;

const FORM_NAMED: SetupForm = {
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
    { word: 'ПРС', question: 'Qf' },
  ],
};

/** Same form but player names left as defaults (empty → Игрок N) */
const FORM_DEFAULT_NAMES: SetupForm = {
  groups: ['G1', 'G2'],
  playerNames: [[], []],
  playersPerGroup: [3, 3],
  rounds: [
    { word: 'АБВ', question: 'Q1' },
    { word: 'ГДЕ', question: 'Qf' },
  ],
};

function freshGame(form = FORM_NAMED) {
  localStorage.clear();
  clearHistory();
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame(form);
}

function spinAndInput() {
  useGameStore.getState().spinDrumAction();
  useGameStore.getState().finishDrumSpin(POINTS_SECTOR);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Wrong-letter feedback
// ─────────────────────────────────────────────────────────────────────────────

describe('wrong-letter feedback — turn.lastWrongLetter', () => {
  beforeEach(() => freshGame());
  afterEach(() => vi.restoreAllMocks());

  it('is empty string initially', () => {
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('');
  });

  it('is set to the wrong letter when a non-present letter is submitted', () => {
    spinAndInput();
    useGameStore.getState().setPendingLetter('Ю'); // not in АБВ
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('Ю');
  });

  it('is NOT set when the letter is correct', () => {
    spinAndInput();
    useGameStore.getState().setPendingLetter('А'); // in АБВ
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('');
  });

  it('is cleared when nextPlayer is called', () => {
    spinAndInput();
    useGameStore.getState().setPendingLetter('Ю');
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('Ю');
    // nextPlayer is called automatically after 1500ms; we call it directly
    useGameStore.getState().nextPlayer();
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('');
  });

  it('is cleared when startNextRound is called', () => {
    spinAndInput();
    useGameStore.getState().setPendingLetter('Ю');
    useGameStore.getState().submitLetter();
    // Advance to roundComplete then start next round
    useGameStore.setState({ gameStatus: 'roundComplete' });
    useGameStore.getState().startNextRound();
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('');
  });

  it('updates to the new wrong letter on a second wrong guess', () => {
    spinAndInput();
    useGameStore.getState().setPendingLetter('Ю');
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('Ю');

    // Next player's turn
    useGameStore.getState().nextPlayer();

    spinAndInput();
    useGameStore.getState().setPendingLetter('Щ'); // also not in АБВ
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('Щ');
  });

  it('stores the uppercased letter', () => {
    spinAndInput();
    useGameStore.getState().setPendingLetter('ю');
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.lastWrongLetter).toBe('Ю');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. markWinner — 1500-point bonus to the word guesser
// ─────────────────────────────────────────────────────────────────────────────

describe('markWinner — 1500-point bonus to current player', () => {
  beforeEach(() => freshGame());
  afterEach(() => vi.restoreAllMocks());

  it('adds exactly 1500 points to the current player', () => {
    const before = useGameStore.getState().players.find((p) => p.id === 'g1p1')!.score;
    useGameStore.getState().markWinner();
    const after = useGameStore.getState().players.find((p) => p.id === 'g1p1')!.score;
    expect(after - before).toBe(1500);
  });

  it('adds 1500 to current player even if another player has more points', () => {
    // Give player 2 a high score manually
    useGameStore.setState((s) => ({
      players: s.players.map((p) =>
        p.id === 'g1p2' ? { ...p, score: 9000 } : p
      ),
    }));
    // Player 1 (index 0) has low score but is current player
    const p1before = useGameStore.getState().players.find((p) => p.id === 'g1p1')!.score;
    useGameStore.getState().markWinner();
    const p1after = useGameStore.getState().players.find((p) => p.id === 'g1p1')!.score;
    expect(p1after - p1before).toBe(1500);
    // Player 2 should NOT get a bonus
    expect(useGameStore.getState().players.find((p) => p.id === 'g1p2')!.score).toBe(9000);
  });

  it('marks the current player as isWinner', () => {
    useGameStore.getState().markWinner();
    const winner = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(winner?.isWinner).toBe(true);
  });

  it('does not mark other players as isWinner', () => {
    useGameStore.getState().markWinner();
    const others = useGameStore.getState().players.filter((p) => p.id !== 'g1p1' && p.group === 1);
    expect(others.every((p) => !p.isWinner)).toBe(true);
  });

  it('also adds 1500 to roundScore', () => {
    const before = useGameStore.getState().players.find((p) => p.id === 'g1p1')!.roundScore;
    useGameStore.getState().markWinner();
    const after = useGameStore.getState().players.find((p) => p.id === 'g1p1')!.roundScore;
    expect(after - before).toBe(1500);
  });

  it('sets gameStatus to roundComplete on regular round', () => {
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
  });

  it('second player wins when manually set as current', () => {
    // Set current player index to 1 (Боб)
    useGameStore.setState((s) => ({ turn: { ...s.turn, currentPlayerIndex: 1 } }));
    useGameStore.getState().markWinner();
    const bob = useGameStore.getState().players.find((p) => p.id === 'g1p2');
    expect(bob?.isWinner).toBe(true);
    expect(bob?.score).toBe(1500);
    // Алиса (index 0) should not be winner
    const alice = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(alice?.isWinner).toBe(false);
  });

  it('adds 1500 on top of existing score', () => {
    // Give the current player some score first
    useGameStore.setState((s) => ({
      players: s.players.map((p) =>
        p.id === 'g1p1' ? { ...p, score: 700, roundScore: 700 } : p
      ),
    }));
    useGameStore.getState().markWinner();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    expect(p.score).toBe(2200); // 700 + 1500
    expect(p.roundScore).toBe(2200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TOP scoreboard — exclude default-named players
// ─────────────────────────────────────────────────────────────────────────────

describe('TOP scoreboard — default-name filtering', () => {
  afterEach(() => vi.restoreAllMocks());

  it('excludes players with name "Игрок N" from the active player list', () => {
    freshGame(FORM_DEFAULT_NAMES);
    const players = useGameStore.getState().players;
    const DEFAULT_NAME_RE = /^Игрок\s+\d+$/i;
    const namedPlayers = players.filter(
      (p) => !p.id.startsWith('final_') && !DEFAULT_NAME_RE.test(p.name.trim())
    );
    // All players have default names → none pass the filter
    expect(namedPlayers).toHaveLength(0);
  });

  it('includes players who have had their name set', () => {
    freshGame(FORM_NAMED);
    const players = useGameStore.getState().players;
    const DEFAULT_NAME_RE = /^Игрок\s+\d+$/i;
    const namedPlayers = players.filter(
      (p) => !p.id.startsWith('final_') && !DEFAULT_NAME_RE.test(p.name.trim())
    );
    expect(namedPlayers.length).toBe(25); // 5 groups × 5 named players
  });

  it('includes a player after their name is updated from default', () => {
    freshGame(FORM_DEFAULT_NAMES);
    const player = useGameStore.getState().players[0];
    expect(player.name).toBe('Игрок 1'); // default name
    useGameStore.getState().updatePlayerName(player.id, 'Александр');
    const updated = useGameStore.getState().players.find((p) => p.id === player.id)!;
    const DEFAULT_NAME_RE = /^Игрок\s+\d+$/i;
    expect(DEFAULT_NAME_RE.test(updated.name)).toBe(false);
  });

  it('regex is case-insensitive and handles "игрок 1", "ИГРОК 2"', () => {
    const DEFAULT_NAME_RE = /^Игрок\s+\d+$/i;
    expect(DEFAULT_NAME_RE.test('игрок 1')).toBe(true);
    expect(DEFAULT_NAME_RE.test('ИГРОК 2')).toBe(true);
    expect(DEFAULT_NAME_RE.test('Игрок 10')).toBe(true);
    expect(DEFAULT_NAME_RE.test('Алиса')).toBe(false);
    expect(DEFAULT_NAME_RE.test('Игрок')).toBe(false);         // no number
    expect(DEFAULT_NAME_RE.test('Игрок 1 Иванов')).toBe(false); // extra text
  });

  it('mixed: some named, some default — only named appear in filtered list', () => {
    freshGame(FORM_DEFAULT_NAMES);
    // Name only the first player
    const p1 = useGameStore.getState().players[0];
    useGameStore.getState().updatePlayerName(p1.id, 'Зоя');
    const DEFAULT_NAME_RE = /^Игрок\s+\d+$/i;
    const named = useGameStore.getState().players.filter(
      (p) => !p.id.startsWith('final_') && !DEFAULT_NAME_RE.test(p.name.trim())
    );
    expect(named).toHaveLength(1);
    expect(named[0].name).toBe('Зоя');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Round-complete overlay uses isWinner player not highest scorer
// ─────────────────────────────────────────────────────────────────────────────

describe('round complete — winner is the player who guessed (isWinner flag)', () => {
  beforeEach(() => freshGame());

  it('isWinner is set on the current player after markWinner', () => {
    expect(useGameStore.getState().players.some((p) => p.isWinner)).toBe(false);
    useGameStore.getState().markWinner();
    const winners = useGameStore.getState().players.filter((p) => p.isWinner && p.group === 1);
    expect(winners).toHaveLength(1);
    expect(winners[0].id).toBe('g1p1');
  });

  it('player with lower score can be winner via markWinner', () => {
    // Give player 2 more points
    useGameStore.setState((s) => ({
      players: s.players.map((p) =>
        p.id === 'g1p2' ? { ...p, score: 5000 } : p
      ),
    }));
    // Player 1 (index 0) calls markWinner
    useGameStore.getState().markWinner();
    const p1 = useGameStore.getState().players.find((p) => p.id === 'g1p1')!;
    const p2 = useGameStore.getState().players.find((p) => p.id === 'g1p2')!;
    expect(p1.isWinner).toBe(true);
    expect(p2.isWinner).toBe(false);
    // p1 now has 1500, p2 still has 5000 — but p1 is the winner
    expect(p1.score).toBe(1500);
    expect(p2.score).toBe(5000);
  });
});
