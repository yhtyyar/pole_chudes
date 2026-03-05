/**
 * Tests for final-only mode player management:
 * 1. startGame with finalPlayerNames creates final_ prefixed players
 * 2. roundPlayers in final-only mode are the final_ players
 * 3. markWinner in final-only mode sets gameComplete correctly
 * 4. isFinalOnly detection logic (all active rounds are isFinal)
 * 5. Player count and name assignment
 * 6. add/remove final players state management (logic only, no DOM)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../stores/gameStore';
import type { SetupForm } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFinalOnlyForm(
  finalPlayerNames: string[],
  finalWord = 'ФИНАЛ',
): SetupForm {
  return {
    groups: ['Группа 1'],
    playerNames: [['Игрок 1', 'Игрок 2', 'Игрок 3', 'Игрок 4', 'Игрок 5']],
    playersPerGroup: [5],
    rounds: [{ word: finalWord, question: 'Финальный вопрос', isFinal: true }],
    finalPlayerNames,
    finalPlayersCount: finalPlayerNames.length,
  };
}

function makeNormalForm(regularCount: number, withFinal: boolean): SetupForm {
  const words = ['СЛОВО', 'ЗАМОК', 'ЛИМОН', 'БЕРЕГ', 'ПЛАЩ'];
  const regs = Array.from({ length: regularCount }, (_, i) => ({
    word: words[i % words.length],
    question: `Q${i + 1}`,
    isFinal: false as const,
  }));
  const finalRound = withFinal
    ? { word: 'ФИНАЛ', question: 'Финальный вопрос', isFinal: true as const }
    : null;
  return {
    groups: ['G1', 'G2'],
    playerNames: [
      ['Алиса', 'Боб', 'Вера', 'Гена', 'Дима'],
      ['Ева', 'Жора', 'Зина', 'Игорь', 'Катя'],
    ],
    playersPerGroup: [5, 5],
    rounds: finalRound ? [...regs, finalRound] : [...regs],
  };
}

function freshGame(form: SetupForm) {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame(form);
}

// ── 1. final-only player creation ─────────────────────────────────────────────

describe('Final-only mode — player creation', () => {
  beforeEach(() => localStorage.clear());

  it('creates final_ prefixed players from finalPlayerNames', () => {
    const names = ['Иван', 'Мария', 'Пётр'];
    freshGame(makeFinalOnlyForm(names));
    const players = useGameStore.getState().players;
    expect(players.every((p) => p.id.startsWith('final_'))).toBe(true);
  });

  it('player count matches finalPlayerNames length', () => {
    const names = ['Иван', 'Мария', 'Пётр', 'Анна', 'Серёжа'];
    freshGame(makeFinalOnlyForm(names));
    const players = useGameStore.getState().players;
    expect(players.length).toBe(5);
  });

  it('player names are assigned correctly', () => {
    const names = ['Иван', 'Мария', 'Пётр'];
    freshGame(makeFinalOnlyForm(names));
    const players = useGameStore.getState().players;
    expect(players[0].name).toBe('Иван');
    expect(players[1].name).toBe('Мария');
    expect(players[2].name).toBe('Пётр');
  });

  it('falls back to default names when finalPlayerNames are empty strings', () => {
    const names = ['', '', ''];
    freshGame(makeFinalOnlyForm(names));
    const players = useGameStore.getState().players;
    expect(players[0].name).toBe('Финалист 1');
    expect(players[1].name).toBe('Финалист 2');
    expect(players[2].name).toBe('Финалист 3');
  });

  it('uses finalPlayersCount as fallback when finalPlayerNames is empty array', () => {
    const form: SetupForm = {
      groups: ['G1'],
      playerNames: [['Игрок 1']],
      playersPerGroup: [1],
      rounds: [{ word: 'ФИНАЛ', question: 'Q', isFinal: true }],
      finalPlayerNames: [],
      finalPlayersCount: 4,
    };
    freshGame(form);
    const players = useGameStore.getState().players;
    expect(players.length).toBe(4);
    expect(players.every((p) => p.id.startsWith('final_'))).toBe(true);
  });

  it('all final-only players start with score=0 and isBankrupt=false', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария', 'Пётр']));
    const players = useGameStore.getState().players;
    players.forEach((p) => {
      expect(p.score).toBe(0);
      expect(p.isBankrupt).toBe(false);
      expect(p.isWinner).toBe(false);
    });
  });

  it('each final player has unique group number (1, 2, 3...)', () => {
    freshGame(makeFinalOnlyForm(['А', 'Б', 'В']));
    const players = useGameStore.getState().players;
    const groups = players.map((p) => p.group);
    expect(groups).toEqual([1, 2, 3]);
  });
});

// ── 2. isFinal detection and round config ─────────────────────────────────────

describe('Final-only mode — round config', () => {
  beforeEach(() => localStorage.clear());

  it('single final round has isFinal=true in config.rounds', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария']));
    const rounds = useGameStore.getState().config.rounds;
    expect(rounds.length).toBe(1);
    expect(rounds[0].isFinal).toBe(true);
  });

  it('board word is set to the final round word', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария'], 'ТАЙНА'));
    const board = useGameStore.getState().board;
    expect(board.word).toBe('ТАЙНА');
    expect(board.revealed.length).toBe(5);
  });

  it('gameStatus starts as playing, not final', () => {
    // final-only mode starts directly at playing (skips startFinal flow)
    freshGame(makeFinalOnlyForm(['Иван', 'Мария']));
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });

  it('normal multi-round game does NOT use final_ players initially', () => {
    freshGame(makeNormalForm(3, false));
    const players = useGameStore.getState().players;
    expect(players.every((p) => !p.id.startsWith('final_'))).toBe(true);
  });

  it('normal game with final round still uses group players initially', () => {
    freshGame(makeNormalForm(2, true));
    const players = useGameStore.getState().players;
    const nonFinal = players.filter((p) => !p.id.startsWith('final_'));
    expect(nonFinal.length).toBe(10); // 2 groups × 5 players
  });
});

// ── 3. Game flow in final-only mode ───────────────────────────────────────────

describe('Final-only mode — game flow', () => {
  beforeEach(() => localStorage.clear());

  it('roundPlayers for final-only are the final_ players (isFinal=true round)', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария', 'Пётр']));
    const state = useGameStore.getState();
    const isFinalRound = !!state.config.rounds[state.currentRound]?.isFinal;
    expect(isFinalRound).toBe(true);
    const finalPlayers = state.players.filter((p) => p.id.startsWith('final_'));
    expect(finalPlayers.length).toBe(3);
  });

  it('markWinner sets gameStatus to gameComplete in final-only mode', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария', 'Пётр']));
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('gameComplete');
  });

  it('winning player gets isWinner=true after markWinner', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария', 'Пётр']));
    useGameStore.getState().markWinner();
    const winner = useGameStore.getState().players.find((p) => p.isWinner);
    expect(winner).toBeDefined();
    expect(winner!.id.startsWith('final_')).toBe(true);
  });

  it('only one player is marked as winner', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария', 'Пётр']));
    useGameStore.getState().markWinner();
    const winners = useGameStore.getState().players.filter((p) => p.isWinner);
    expect(winners.length).toBe(1);
  });

  it('nextPlayer cycles through final_ players', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария', 'Пётр']));
    const initial = useGameStore.getState().turn.currentPlayerIndex;
    useGameStore.getState().nextPlayer();
    const after = useGameStore.getState().turn.currentPlayerIndex;
    // index should advance (mod 3)
    expect(after).toBe((initial + 1) % 3);
  });

  it('forceBankrupt marks current final_ player as bankrupt', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария', 'Пётр']));
    const s = useGameStore.getState();
    const currentIdx = s.turn.currentPlayerIndex;
    const currentPlayer = s.players.filter((p) => p.id.startsWith('final_'))[currentIdx];
    s.forceBankrupt();
    const updated = useGameStore.getState().players.find((p) => p.id === currentPlayer.id);
    expect(updated?.isBankrupt).toBe(true);
  });
});

// ── 4. isFinalOnly logic (no-DOM) ─────────────────────────────────────────────

describe('isFinalOnly detection logic', () => {
  beforeEach(() => localStorage.clear());

  it('isFinalOnly is true when only round has isFinal=true', () => {
    const form = makeFinalOnlyForm(['А', 'Б']);
    freshGame(form);
    const rounds = useGameStore.getState().config.rounds;
    const activeRounds = rounds.filter((r) => r.word.length > 0);
    const isFinalOnly = activeRounds.length > 0 && activeRounds.every((r) => r.isFinal);
    expect(isFinalOnly).toBe(true);
  });

  it('isFinalOnly is false when there are regular rounds', () => {
    const form = makeNormalForm(3, true);
    freshGame(form);
    const rounds = useGameStore.getState().config.rounds;
    const activeRounds = rounds.filter((r) => r.word.length > 0);
    const isFinalOnly = activeRounds.length > 0 && activeRounds.every((r) => r.isFinal);
    expect(isFinalOnly).toBe(false);
  });

  it('isFinalOnly is false when all rounds are regular (no final)', () => {
    const form = makeNormalForm(3, false);
    freshGame(form);
    const rounds = useGameStore.getState().config.rounds;
    const activeRounds = rounds.filter((r) => r.word.length > 0);
    const isFinalOnly = activeRounds.length > 0 && activeRounds.every((r) => r.isFinal);
    expect(isFinalOnly).toBe(false);
  });

  it('final-only mode: no non-final_ players exist', () => {
    freshGame(makeFinalOnlyForm(['Иван', 'Мария']));
    const players = useGameStore.getState().players;
    const regularPlayers = players.filter((p) => !p.id.startsWith('final_'));
    expect(regularPlayers.length).toBe(0);
  });

  it('normal mode with final: regular players exist alongside potential final_ players', () => {
    freshGame(makeNormalForm(2, true));
    const players = useGameStore.getState().players;
    // At start, only regular group players — no final_ yet
    expect(players.filter((p) => !p.id.startsWith('final_')).length).toBe(10);
    expect(players.filter((p) => p.id.startsWith('final_')).length).toBe(0);
  });
});

// ── 5. Final player name management logic ─────────────────────────────────────

describe('Final player names — add/remove logic', () => {
  it('can add up to MAX_FINAL_PLAYERS (10) players', () => {
    const names = Array.from({ length: 10 }, (_, i) => `Финалист ${i + 1}`);
    const form = makeFinalOnlyForm(names);
    freshGame(form);
    expect(useGameStore.getState().players.length).toBe(10);
  });

  it('minimum 1 final player: single player game works', () => {
    freshGame(makeFinalOnlyForm(['Единственный']));
    expect(useGameStore.getState().players.length).toBe(1);
    expect(useGameStore.getState().players[0].name).toBe('Единственный');
  });

  it('trimmed empty names use fallback "Финалист N"', () => {
    freshGame(makeFinalOnlyForm(['  ', 'Мария']));
    const players = useGameStore.getState().players;
    expect(players[0].name).toBe('Финалист 1');
    expect(players[1].name).toBe('Мария');
  });

  it('player IDs are final_p1, final_p2, ... in final-only mode', () => {
    freshGame(makeFinalOnlyForm(['А', 'Б', 'В']));
    const players = useGameStore.getState().players;
    expect(players[0].id).toBe('final_p1');
    expect(players[1].id).toBe('final_p2');
    expect(players[2].id).toBe('final_p3');
  });
});
