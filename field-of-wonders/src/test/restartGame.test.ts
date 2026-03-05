/**
 * Tests for restartGame, toggleBgMusic, setBgMusicVolume, updatePlayerName
 *
 * Techniques:
 *   - State transition testing: setup → play → restart → verify initial conditions
 *   - Invariant checking: config preserved exactly after restart
 *   - Boundary: restart with no config (no rounds) is a no-op
 *   - Equivalence partitioning: bgMusic on/off before restart
 *   - Decision table for toggleBgMusic: enabled→disabled, disabled→enabled
 *   - updatePlayerName: valid name, empty name (keeps original), trim
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from '../stores/gameStore';
import type { SetupForm } from '../types';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const FORM: SetupForm = {
  groups: ['Группа 1', 'Группа 2', 'Группа 3', 'Группа 4', 'Группа 5'],
  playersPerGroup: [5, 5, 5, 5, 5],
  playerNames: [
    ['Алиса', 'Боб', 'Вера', 'Гена', 'Дима'],
    ['Ева', 'Жора', 'Зина', 'Игорь', 'Катя'],
    [], [], [],
  ],
  rounds: [
    { word: 'СЛОВО',   question: 'Q1' },
    { word: 'БАРАБАН', question: 'Q2' },
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

// ─── restartGame ──────────────────────────────────────────────────────────────

describe('restartGame — basic state reset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    freshGame();
  });
  afterEach(() => vi.useRealTimers());

  it('resets gameStatus to playing', () => {
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });

  it('resets currentRound to 0', () => {
    useGameStore.setState({ currentRound: 3 });
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().currentRound).toBe(0);
  });

  it('resets board to first word', () => {
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().board.word).toBe('СЛОВО');
  });

  it('resets board.revealed to all false', () => {
    // Reveal some letters first
    useGameStore.setState((s) => ({
      board: { ...s.board, revealed: [true, true, true, true, true] },
    }));
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().board.revealed.every((v) => !v)).toBe(true);
  });

  it('revealed array length matches first word length', () => {
    useGameStore.getState().restartGame();
    const { word, revealed } = useGameStore.getState().board;
    expect(revealed.length).toBe(word.length);
  });

  it('resets turn to initial state', () => {
    useGameStore.setState((s) => ({
      turn: { ...s.turn, phase: 'input', timer: 3, drumSpinning: true, currentPlayerIndex: 4 },
    }));
    useGameStore.getState().restartGame();
    const { turn } = useGameStore.getState();
    expect(turn.phase).toBe('spin');
    expect(turn.timer).toBe(15);
    expect(turn.drumSpinning).toBe(false);
    expect(turn.currentPlayerIndex).toBe(0);
    expect(turn.sector).toBeNull();
    expect(turn.pendingLetter).toBe('');
  });

  it('resets all player scores to 0', () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p) => ({ ...p, score: 500, roundScore: 300 })),
    }));
    useGameStore.getState().restartGame();
    useGameStore.getState().players.forEach((p) => {
      expect(p.score).toBe(0);
      expect(p.roundScore).toBe(0);
    });
  });

  it('clears isBankrupt flag for all players', () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p) => ({ ...p, isBankrupt: true })),
    }));
    useGameStore.getState().restartGame();
    useGameStore.getState().players.forEach((p) => {
      expect(p.isBankrupt).toBe(false);
    });
  });

  it('clears isWinner flag for all players', () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p) => ({ ...p, isWinner: true })),
    }));
    useGameStore.getState().restartGame();
    useGameStore.getState().players.forEach((p) => {
      expect(p.isWinner).toBe(false);
    });
  });

  it('restores 25 players (5 groups × 5 players)', () => {
    // After startFinal, final players are added — restart should rebuild cleanly
    useGameStore.getState().restartGame();
    const regular = useGameStore.getState().players.filter((p) => !p.id.startsWith('final_'));
    expect(regular.length).toBe(25);
  });

  it('sets questionVisible to true', () => {
    useGameStore.setState({ questionVisible: false });
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().questionVisible).toBe(true);
  });
});

// ─── restartGame — config preservation ───────────────────────────────────────

describe('restartGame — config is preserved', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    freshGame();
  });
  afterEach(() => vi.useRealTimers());

  it('preserves config.groups exactly', () => {
    const beforeGroups = [...useGameStore.getState().config.groups];
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().config.groups).toEqual(beforeGroups);
  });

  it('preserves all round words', () => {
    const beforeWords = useGameStore.getState().config.rounds.map((r) => r.word);
    useGameStore.getState().restartGame();
    const afterWords = useGameStore.getState().config.rounds.map((r) => r.word);
    expect(afterWords).toEqual(beforeWords);
  });

  it('preserves all round questions', () => {
    const beforeQs = useGameStore.getState().config.rounds.map((r) => r.question);
    useGameStore.getState().restartGame();
    const afterQs = useGameStore.getState().config.rounds.map((r) => r.question);
    expect(afterQs).toEqual(beforeQs);
  });

  it('preserves config.playerNames', () => {
    const beforeNames = useGameStore.getState().config.playerNames;
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().config.playerNames).toEqual(beforeNames);
  });

  it('uses playerNames from config when rebuilding players', () => {
    useGameStore.getState().restartGame();
    const g1 = useGameStore.getState().players.filter((p) => p.group === 1);
    expect(g1[0].name).toBe('Алиса');
    expect(g1[1].name).toBe('Боб');
  });
});

// ─── restartGame — edge cases ─────────────────────────────────────────────────

describe('restartGame — edge cases', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetGame();
  });

  it('is a no-op when there are no rounds configured', () => {
    // gameStatus stays setup — no config
    const before = useGameStore.getState().gameStatus;
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().gameStatus).toBe(before);
  });

  it('can restart mid-round-complete state', () => {
    freshGame();
    useGameStore.setState({ gameStatus: 'roundComplete', currentRound: 2 });
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().gameStatus).toBe('playing');
    expect(useGameStore.getState().currentRound).toBe(0);
  });

  it('can restart from final state', () => {
    freshGame();
    useGameStore.setState({ gameStatus: 'final', currentRound: 5 });
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().gameStatus).toBe('playing');
    expect(useGameStore.getState().currentRound).toBe(0);
  });

  it('restartGame saves state to localStorage', () => {
    freshGame();
    useGameStore.getState().restartGame();
    const saved = localStorage.getItem('pole_chudes_state');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.currentRound).toBe(0);
    expect(parsed.gameStatus).toBe('playing');
  });

  it('multiple consecutive restarts work correctly', () => {
    freshGame();
    for (let i = 0; i < 5; i++) {
      useGameStore.getState().restartGame();
    }
    expect(useGameStore.getState().currentRound).toBe(0);
    expect(useGameStore.getState().gameStatus).toBe('playing');
    expect(useGameStore.getState().players.length).toBe(25);
  });
});

// ─── restartGame — bgMusic state after restart ────────────────────────────────

describe('restartGame — bgMusic settings preserved', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    freshGame();
  });
  afterEach(() => vi.useRealTimers());

  it('preserves bgMusicEnabled=false after restart', () => {
    useGameStore.setState({ bgMusicEnabled: false });
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().bgMusicEnabled).toBe(false);
  });

  it('preserves bgMusicEnabled=true after restart', () => {
    useGameStore.setState({ bgMusicEnabled: true });
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().bgMusicEnabled).toBe(true);
  });

  it('preserves bgMusicVolume after restart', () => {
    useGameStore.setState({ bgMusicVolume: 0.7 });
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().bgMusicVolume).toBe(0.7);
  });
});

// ─── toggleBgMusic ────────────────────────────────────────────────────────────

describe('toggleBgMusic', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetGame();
    useGameStore.setState({ bgMusicEnabled: false });
  });

  it('toggles from false to true', () => {
    useGameStore.getState().toggleBgMusic();
    expect(useGameStore.getState().bgMusicEnabled).toBe(true);
  });

  it('toggles from true to false', () => {
    useGameStore.setState({ bgMusicEnabled: true });
    useGameStore.getState().toggleBgMusic();
    expect(useGameStore.getState().bgMusicEnabled).toBe(false);
  });

  it('double toggle returns to original state', () => {
    const original = useGameStore.getState().bgMusicEnabled;
    useGameStore.getState().toggleBgMusic();
    useGameStore.getState().toggleBgMusic();
    expect(useGameStore.getState().bgMusicEnabled).toBe(original);
  });

  it('saves state to localStorage after toggle', () => {
    useGameStore.getState().toggleBgMusic();
    const saved = localStorage.getItem('pole_chudes_state');
    expect(saved).not.toBeNull();
  });

  it('does not throw', () => {
    expect(() => useGameStore.getState().toggleBgMusic()).not.toThrow();
  });
});

// ─── setBgMusicVolume (store action) ─────────────────────────────────────────

describe('setBgMusicVolume (store action)', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetGame();
  });

  it('sets bgMusicVolume in state', () => {
    useGameStore.getState().setBgMusicVolume(0.6);
    expect(useGameStore.getState().bgMusicVolume).toBe(0.6);
  });

  it('boundary: volume 0 is accepted', () => {
    useGameStore.getState().setBgMusicVolume(0);
    expect(useGameStore.getState().bgMusicVolume).toBe(0);
  });

  it('boundary: volume 1 is accepted', () => {
    useGameStore.getState().setBgMusicVolume(1);
    expect(useGameStore.getState().bgMusicVolume).toBe(1);
  });

  it('saves state after changing volume', () => {
    useGameStore.getState().setBgMusicVolume(0.3);
    const saved = JSON.parse(localStorage.getItem('pole_chudes_state')!);
    expect(saved.bgMusicVolume).toBe(0.3);
  });

  it('does not throw', () => {
    expect(() => useGameStore.getState().setBgMusicVolume(0.5)).not.toThrow();
  });
});

// ─── updatePlayerName ─────────────────────────────────────────────────────────

describe('updatePlayerName', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    freshGame();
  });
  afterEach(() => vi.useRealTimers());

  it('updates the name of the target player', () => {
    useGameStore.getState().updatePlayerName('g1p1', 'Новое Имя');
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(p?.name).toBe('Новое Имя');
  });

  it('trims whitespace from name', () => {
    useGameStore.getState().updatePlayerName('g1p1', '  Обрезать  ');
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(p?.name).toBe('Обрезать');
  });

  it('keeps original name when empty string is passed', () => {
    const original = useGameStore.getState().players.find((p) => p.id === 'g1p1')?.name;
    useGameStore.getState().updatePlayerName('g1p1', '');
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(p?.name).toBe(original);
  });

  it('keeps original name when whitespace-only string is passed', () => {
    const original = useGameStore.getState().players.find((p) => p.id === 'g2p3')?.name;
    useGameStore.getState().updatePlayerName('g2p3', '   ');
    const p = useGameStore.getState().players.find((p) => p.id === 'g2p3');
    expect(p?.name).toBe(original);
  });

  it('does not affect other players when updating one', () => {
    const beforeOthers = useGameStore.getState().players
      .filter((p) => p.id !== 'g1p1')
      .map((p) => ({ id: p.id, name: p.name }));
    useGameStore.getState().updatePlayerName('g1p1', 'Изменён');
    const afterOthers = useGameStore.getState().players
      .filter((p) => p.id !== 'g1p1')
      .map((p) => ({ id: p.id, name: p.name }));
    expect(afterOthers).toEqual(beforeOthers);
  });

  it('silently ignores unknown playerId', () => {
    const before = useGameStore.getState().players.map((p) => p.name);
    expect(() => useGameStore.getState().updatePlayerName('nonexistent', 'Тест')).not.toThrow();
    const after = useGameStore.getState().players.map((p) => p.name);
    expect(after).toEqual(before);
  });

  it('persists updated name to localStorage', () => {
    useGameStore.getState().updatePlayerName('g1p1', 'Сохранено');
    const saved = JSON.parse(localStorage.getItem('pole_chudes_state')!);
    const p = saved.players.find((p: { id: string }) => p.id === 'g1p1');
    expect(p?.name).toBe('Сохранено');
  });
});
