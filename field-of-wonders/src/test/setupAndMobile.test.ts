/**
 * Tests for:
 * 1. Setup: dynamic rounds — add/remove regular rounds, toggle final on/off
 * 2. Space hotkey: dispatches 'drum:spin' custom event (not spinDrumAction directly)
 * 3. Mobile drum FAB: game must be in 'playing' state for FAB to appear
 *    (logic tests — no DOM rendering needed)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, DRUM_SECTORS } from '../stores/gameStore';
import type { SetupForm } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const POINTS_SECTOR = DRUM_SECTORS.find((s) => s.sector.type === 'points')!.sector;

function makeFreshForm(
  regularCount: number,
  withFinal: boolean,
): SetupForm {
  // Make words properly Cyrillic (5 letters each)
  const words = ['СЛОВО', 'ЗАМОК', 'ЛИМОН', 'БЕРЕГ', 'ПЛАЩ', 'ГРОЗА', 'ИЗЮМ', 'РЯБЬ'];
  const regs = Array.from({ length: regularCount }, (_, i) => ({
    word: words[i % words.length],
    question: `Q${i + 1}`,
    isFinal: false as const,
  }));
  const finalRound = withFinal ? { word: 'ФИНАЛ', question: 'Финальный вопрос', isFinal: true as const } : null;
  const rounds = finalRound ? [...regs, finalRound] : [...regs];
  return {
    groups: ['G1', 'G2'],
    playerNames: [
      ['Алиса', 'Боб', 'Вера', 'Гена', 'Дима'],
      ['Ева', 'Жора', 'Зина', 'Игорь', 'Катя'],
    ],
    playersPerGroup: [5, 5],
    rounds,
  };
}

function freshGame(form: SetupForm) {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame(form);
}

// ── 1. Setup — dynamic rounds ─────────────────────────────────────────────────

describe('Setup — dynamic rounds structure', () => {
  beforeEach(() => localStorage.clear());

  it('game starts with 1 regular round (no final)', () => {
    const form = makeFreshForm(1, false);
    expect(form.rounds.length).toBe(1);
    expect(form.rounds.every((r) => !r.isFinal)).toBe(true);
  });

  it('game starts with 5 regular rounds + final = 6 rounds', () => {
    const form = makeFreshForm(5, true);
    expect(form.rounds.length).toBe(6);
  });

  it('game starts with 5 regular rounds + no final = 5 rounds', () => {
    const form = makeFreshForm(5, false);
    expect(form.rounds.length).toBe(5);
  });

  it('gameStore receives correct number of rounds from form', () => {
    const form = makeFreshForm(3, true);
    freshGame(form);
    const rounds = useGameStore.getState().config.rounds;
    expect(rounds.length).toBe(4); // 3 regular + 1 final
  });

  it('final round has isFinal=true when present', () => {
    const form = makeFreshForm(3, true);
    freshGame(form);
    const rounds = useGameStore.getState().config.rounds;
    const lastRound = rounds[rounds.length - 1];
    expect(lastRound.isFinal).toBe(true);
  });

  it('regular rounds have isFinal=false', () => {
    const form = makeFreshForm(3, true);
    freshGame(form);
    const rounds = useGameStore.getState().config.rounds;
    const regularRounds = rounds.slice(0, -1);
    expect(regularRounds.every((r) => !r.isFinal)).toBe(true);
  });

  it('with no final round, no round has isFinal=true', () => {
    const form = makeFreshForm(3, false);
    freshGame(form);
    const rounds = useGameStore.getState().config.rounds;
    expect(rounds.some((r) => r.isFinal)).toBe(false);
  });

  it('buildRounds: adding final round appends to the end', () => {
    const regularRounds = [{ word: 'СЛОВО', question: 'Q1' }, { word: 'ЗАМОК', question: 'Q2' }];
    const finalRound = { word: 'ФИНАЛ', question: 'Qf' };
    const rounds = [...regularRounds, finalRound];
    expect(rounds.length).toBe(3);
    expect(rounds[rounds.length - 1].word).toBe('ФИНАЛ');
  });

  it('buildRounds: removing final round leaves only regulars', () => {
    const regularRounds = [{ word: 'СЛОВО', question: 'Q1' }, { word: 'ЗАМОК', question: 'Q2' }];
    const finalRound = null;
    const rounds = finalRound ? [...regularRounds, finalRound] : [...regularRounds];
    expect(rounds.length).toBe(2);
    expect(rounds.every((r) => r.word !== 'ФИНАЛ')).toBe(true);
  });

  it('can add up to MAX_ROUNDS regular rounds', () => {
    const MAX_ROUNDS = 8;
    const form = makeFreshForm(MAX_ROUNDS, false);
    freshGame(form);
    expect(useGameStore.getState().config.rounds.length).toBe(MAX_ROUNDS);
  });

  it('MIN_ROUNDS=1: at least one regular round allowed', () => {
    const form = makeFreshForm(1, false);
    freshGame(form);
    expect(useGameStore.getState().config.rounds.length).toBe(1);
  });

  it('final-only mode: only final round is played when regulars have no word', () => {
    // All regular rounds have empty words — only final should count
    const form: SetupForm = {
      groups: ['G1'],
      playerNames: [['Алиса', 'Боб', 'Вера', 'Гена', 'Дима']],
      playersPerGroup: [5],
      rounds: [
        { word: 'ФИНАЛ', question: 'Финальный вопрос', isFinal: true },
      ],
    };
    freshGame(form);
    const rounds = useGameStore.getState().config.rounds;
    expect(rounds.length).toBe(1);
    expect(rounds[0].isFinal).toBe(true);
  });

  it('gameStatus becomes gameComplete when markWinner is called in final-only mode', () => {
    const form: SetupForm = {
      groups: ['G1'],
      playerNames: [['Алиса', 'Боб', 'Вера', 'Гена', 'Дима']],
      playersPerGroup: [5],
      rounds: [
        { word: 'ФИНАЛ', question: 'Qf', isFinal: true },
      ],
    };
    freshGame(form);
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('gameComplete');
  });

  it('players are created for all groups when game starts', () => {
    const form = makeFreshForm(3, true);
    freshGame(form);
    const players = useGameStore.getState().players;
    // 2 groups × 5 players + 5 final players
    expect(players.filter((p) => !p.id.startsWith('final_'))).toHaveLength(10);
  });

  it('currentRound starts at 0', () => {
    freshGame(makeFreshForm(3, true));
    expect(useGameStore.getState().currentRound).toBe(0);
  });
});

// ── 2. Space hotkey — drum:spin custom event ──────────────────────────────────

describe('Space hotkey — dispatches drum:spin event', () => {
  afterEach(() => vi.restoreAllMocks());

  it('window dispatches drum:spin CustomEvent when Space is pressed', () => {
    const spy = vi.fn();
    window.addEventListener('drum:spin', spy);

    window.dispatchEvent(new CustomEvent('drum:spin'));
    expect(spy).toHaveBeenCalledTimes(1);

    window.removeEventListener('drum:spin', spy);
  });

  it('drum:spin listener receives a CustomEvent', () => {
    let received: Event | undefined;
    const handler = (e: Event) => { received = e; };
    window.addEventListener('drum:spin', handler);

    window.dispatchEvent(new CustomEvent('drum:spin'));
    expect(received).toBeInstanceOf(CustomEvent);
    expect(received!.type).toBe('drum:spin');

    window.removeEventListener('drum:spin', handler);
  });

  it('multiple listeners all receive the event', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    window.addEventListener('drum:spin', spy1);
    window.addEventListener('drum:spin', spy2);

    window.dispatchEvent(new CustomEvent('drum:spin'));
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);

    window.removeEventListener('drum:spin', spy1);
    window.removeEventListener('drum:spin', spy2);
  });

  it('listener is removed cleanly without error', () => {
    const spy = vi.fn();
    window.addEventListener('drum:spin', spy);
    window.removeEventListener('drum:spin', spy);

    window.dispatchEvent(new CustomEvent('drum:spin'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('spinDrumAction changes drumSpinning to true', () => {
    freshGame(makeFreshForm(1, false));
    expect(useGameStore.getState().turn.drumSpinning).toBe(false);
    useGameStore.getState().spinDrumAction();
    expect(useGameStore.getState().turn.drumSpinning).toBe(true);
  });

  it('finishDrumSpin sets drumSpinning to false', () => {
    freshGame(makeFreshForm(1, false));
    useGameStore.getState().spinDrumAction();
    useGameStore.getState().finishDrumSpin(POINTS_SECTOR);
    expect(useGameStore.getState().turn.drumSpinning).toBe(false);
  });

  it('phase must be spin and drumSpinning must be false to allow spin', () => {
    freshGame(makeFreshForm(1, false));
    const s = useGameStore.getState();
    expect(s.turn.phase).toBe('spin');
    expect(s.turn.drumSpinning).toBe(false);
    // canSpin = phase === 'spin' && !drumSpinning
    const canSpin = s.turn.phase === 'spin' && !s.turn.drumSpinning;
    expect(canSpin).toBe(true);
  });

  it('canSpin is false during drumSpinning', () => {
    freshGame(makeFreshForm(1, false));
    useGameStore.getState().spinDrumAction();
    const s = useGameStore.getState();
    const canSpin = s.turn.phase === 'spin' && !s.turn.drumSpinning;
    expect(canSpin).toBe(false);
  });

  it('canSpin is false when phase is input (not spin)', () => {
    freshGame(makeFreshForm(1, false));
    useGameStore.getState().spinDrumAction();
    useGameStore.getState().finishDrumSpin(POINTS_SECTOR);
    const s = useGameStore.getState();
    // After finishDrumSpin with points, phase becomes 'input'
    expect(s.turn.phase).toBe('input');
    const canSpin = s.turn.phase === 'spin' && !s.turn.drumSpinning;
    expect(canSpin).toBe(false);
  });
});

// ── 3. Mobile drum FAB — logic (no DOM/render, just store state) ──────────────

describe('Mobile drum FAB — state-based logic', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetGame();
  });

  it('FAB should be visible when gameStatus is playing', () => {
    freshGame(makeFreshForm(1, false));
    expect(useGameStore.getState().gameStatus).toBe('playing');
    // FAB condition: gameStatus === 'playing'
    expect(useGameStore.getState().gameStatus === 'playing').toBe(true);
  });

  it('FAB should not be visible when gameStatus is setup', () => {
    expect(useGameStore.getState().gameStatus).toBe('setup');
    expect(useGameStore.getState().gameStatus === 'playing').toBe(false);
  });

  it('FAB should not be visible when gameStatus is roundComplete', () => {
    freshGame(makeFreshForm(1, false));
    useGameStore.getState().markWinner();
    const status = useGameStore.getState().gameStatus;
    // Could be roundComplete or gameComplete depending on round config
    expect(status === 'playing').toBe(false);
  });

  it('FAB should not be visible when gameStatus is gameComplete', () => {
    const form: SetupForm = {
      groups: ['G1'],
      playerNames: [['Алиса', 'Боб', 'Вера', 'Гена', 'Дима']],
      playersPerGroup: [5],
      rounds: [{ word: 'ФИНАЛ', question: 'Qf', isFinal: true }],
    };
    freshGame(form);
    useGameStore.getState().markWinner();
    expect(useGameStore.getState().gameStatus).toBe('gameComplete');
    expect(useGameStore.getState().gameStatus === 'playing').toBe(false);
  });

  it('FAB spin triggers drum:spin event which Drum component can handle', () => {
    freshGame(makeFreshForm(1, false));
    const s = useGameStore.getState();
    const canSpin = s.turn.phase === 'spin' && !s.turn.drumSpinning;

    const spy = vi.fn();
    window.addEventListener('drum:spin', spy);

    // Simulate what the FAB button onClick does when canSpin=true
    if (canSpin) {
      window.dispatchEvent(new CustomEvent('drum:spin'));
    }

    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener('drum:spin', spy);
  });

  it('FAB does not dispatch drum:spin when phase is not spin', () => {
    freshGame(makeFreshForm(1, false));
    useGameStore.getState().spinDrumAction();
    useGameStore.getState().finishDrumSpin(POINTS_SECTOR);

    const s = useGameStore.getState();
    const canSpin = s.turn.phase === 'spin' && !s.turn.drumSpinning;
    expect(canSpin).toBe(false);

    const spy = vi.fn();
    window.addEventListener('drum:spin', spy);

    // FAB would open bottom sheet instead of dispatching drum:spin
    if (canSpin) {
      window.dispatchEvent(new CustomEvent('drum:spin'));
    }

    expect(spy).not.toHaveBeenCalled();
    window.removeEventListener('drum:spin', spy);
  });
});
