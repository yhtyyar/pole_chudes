import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from '../stores/gameStore';
import type { SetupForm } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const FORM: SetupForm = {
  groups: ['Группа 1', 'Группа 2', 'Группа 3', 'Группа 4', 'Группа 5'],
  rounds: [
    { word: 'СЛОВО',    question: 'Первый вопрос'   },
    { word: 'БАРАБАН',  question: 'Второй вопрос'   },
    { word: 'ЗВЕЗДА',   question: 'Третий вопрос'   },
    { word: 'РАДОСТЬ',  question: 'Четвертый вопрос' },
    { word: 'ПОБЕДА',   question: 'Пятый вопрос'    },
    { word: 'ФИНАЛ',    question: 'Финальный вопрос' },
  ],
};

function freshStore() {
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame(FORM);
  return useGameStore.getState();
}

// ─── startGame ───────────────────────────────────────────────────────────────

describe('startGame', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetGame();
  });

  it('sets gameStatus to playing', () => {
    useGameStore.getState().startGame(FORM);
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });

  it('sets the first word correctly', () => {
    useGameStore.getState().startGame(FORM);
    expect(useGameStore.getState().board.word).toBe('СЛОВО');
  });

  it('board revealed is all false initially', () => {
    useGameStore.getState().startGame(FORM);
    const { revealed } = useGameStore.getState().board;
    expect(revealed.every((v) => v === false)).toBe(true);
    expect(revealed.length).toBe(5); // 'СЛОВО' has 5 letters
  });

  it('creates 25 players (5 groups × 5)', () => {
    useGameStore.getState().startGame(FORM);
    const { players } = useGameStore.getState();
    // Only non-final players at start
    const regular = players.filter((p) => !p.id.startsWith('final_'));
    expect(regular.length).toBe(25);
  });

  it('all players start with 0 score', () => {
    useGameStore.getState().startGame(FORM);
    useGameStore.getState().players.forEach((p) => {
      expect(p.score).toBe(0);
      expect(p.roundScore).toBe(0);
    });
  });

  it('groups players correctly (5 per group)', () => {
    useGameStore.getState().startGame(FORM);
    for (let g = 1; g <= 5; g++) {
      const groupPlayers = useGameStore.getState().players.filter((p) => p.group === g);
      expect(groupPlayers.length).toBe(5);
    }
  });

  it('turn starts in spin phase', () => {
    useGameStore.getState().startGame(FORM);
    expect(useGameStore.getState().turn.phase).toBe('spin');
    expect(useGameStore.getState().turn.drumSpinning).toBe(false);
  });

  it('currentRound is 0', () => {
    useGameStore.getState().startGame(FORM);
    expect(useGameStore.getState().currentRound).toBe(0);
  });
});

// ─── spinDrumAction ──────────────────────────────────────────────────────────

describe('spinDrumAction', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    freshStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets drumSpinning to true', () => {
    useGameStore.getState().spinDrumAction();
    expect(useGameStore.getState().turn.drumSpinning).toBe(true);
  });

  it('clears sector while spinning', () => {
    useGameStore.getState().spinDrumAction();
    expect(useGameStore.getState().turn.sector).toBeNull();
  });

  it('cannot spin when already spinning', () => {
    useGameStore.getState().spinDrumAction();
    // Try to spin again — should be ignored
    useGameStore.getState().spinDrumAction();
    // still spinning from first call
    expect(useGameStore.getState().turn.drumSpinning).toBe(true);
  });

  it('cannot spin when phase is not spin', () => {
    // Manually set phase to input
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'input' } }));
    useGameStore.getState().spinDrumAction();
    expect(useGameStore.getState().turn.drumSpinning).toBe(false);
  });

  it('resolves after 3200ms with a sector', () => {
    useGameStore.getState().spinDrumAction();
    vi.advanceTimersByTime(3200);
    const { turn } = useGameStore.getState();
    expect(turn.drumSpinning).toBe(false);
    expect(turn.sector).not.toBeNull();
  });
});

// ─── finishDrumSpin — bankrupt ────────────────────────────────────────────────

describe('finishDrumSpin — bankrupt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    freshStore();
    // Give the first player some score first
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) => i === 0 ? { ...p, roundScore: 500, score: 500 } : p),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets roundScore of current player on bankrupt', () => {
    // DRUM_SECTORS weight layout (cumulative out of 72):
    // 100(10), 150(10), 200(8), 250(7), 300(6), 350(5), 400(4), 500(3), 1000(1) = 54
    // double(4)=58, extra(4)=62, bankrupt(5)=67, prize(2)=69, bank(3)=72
    // spinDrum uses: rand -= weight; if (rand <= 0) return sector
    // bankrupt hits when rand * 72 lands in (62, 67] → use midpoint 64.5/72
    const bankruptSeed = 64.5 / 72;
    vi.spyOn(Math, 'random').mockReturnValue(bankruptSeed);

    useGameStore.getState().spinDrumAction();
    vi.advanceTimersByTime(3200);

    const { players, turn } = useGameStore.getState();
    const currentPlayer = players[0]; // currentPlayerIndex = 0, group 1
    expect(turn.sector?.type).toBe('bankrupt');
    expect(currentPlayer.roundScore).toBe(0);
    expect(currentPlayer.isBankrupt).toBe(true);

    vi.restoreAllMocks();
  });
});

// ─── submitLetter ─────────────────────────────────────────────────────────────

describe('submitLetter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    freshStore();
    // Force phase to input with a points sector
    useGameStore.setState((s) => ({
      turn: {
        ...s.turn,
        phase: 'input',
        sector: { type: 'points', value: 200 },
        timerRunning: true,
      },
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when letter is empty', () => {
    useGameStore.getState().setPendingLetter('');
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.phase).toBe('input');
  });

  it('does nothing when phase is not input', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'spin' } }));
    useGameStore.getState().setPendingLetter('С');
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().board.revealed.every((v) => !v)).toBe(true);
  });

  it('reveals correct letter in the board', () => {
    useGameStore.getState().setPendingLetter('С');
    useGameStore.getState().submitLetter();
    const { revealed, word } = useGameStore.getState().board;
    // 'СЛОВО' — С is at index 0
    const sIdx = word.split('').findIndex((c) => c === 'С');
    expect(revealed[sIdx]).toBe(true);
  });

  it('adds score to current player for correct letter (200 × count)', () => {
    useGameStore.getState().setPendingLetter('С'); // 1 occurrence in СЛОВО
    useGameStore.getState().submitLetter();
    const group1Player0 = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(group1Player0?.roundScore).toBe(200);
    expect(group1Player0?.score).toBe(200);
  });

  it('wrong letter sets phase to result and advances player', () => {
    useGameStore.getState().setPendingLetter('Ж'); // not in СЛОВО
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.phase).toBe('result');
  });

  it('clears pendingLetter after submit', () => {
    useGameStore.getState().setPendingLetter('С');
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().turn.pendingLetter).toBe('');
  });

  it('Ё is treated as Е (normalization)', () => {
    // Change word to contain Е
    useGameStore.setState({
      board: { word: 'ЗЕЛЕНЬ', revealed: [false, false, false, false, false, false] },
    });
    useGameStore.getState().setPendingLetter('Ё'); // should match Е
    useGameStore.getState().submitLetter();
    const { revealed } = useGameStore.getState().board;
    // ЗЕЛЕНЬ: З=0,Е=1,Л=2,Е=3,Н=4,Ь=5 → positions 1 and 3 should be revealed
    expect(revealed[1]).toBe(true);
    expect(revealed[3]).toBe(true);
  });

  it('all letters revealed sets gameStatus to roundComplete', () => {
    // Force a near-complete board — only one letter hidden
    useGameStore.setState((s) => ({
      board: { word: 'СЛОВО', revealed: [true, true, true, true, false] },
      turn: { ...s.turn, phase: 'input', sector: { type: 'points', value: 100 } },
    }));
    useGameStore.getState().setPendingLetter('О'); // last letter O is at index 4
    useGameStore.getState().submitLetter();
    expect(useGameStore.getState().gameStatus).toBe('roundComplete');
  });

  it('double sector doubles roundScore', () => {
    // Give player 200 points first
    useGameStore.setState((s) => ({
      players: s.players.map((p) => p.id === 'g1p1' ? { ...p, roundScore: 200, score: 200 } : p),
      turn: { ...s.turn, phase: 'input', sector: { type: 'double' } },
    }));
    useGameStore.getState().setPendingLetter('С');
    useGameStore.getState().submitLetter();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(p?.roundScore).toBe(400);
  });
});

// ─── Timer ───────────────────────────────────────────────────────────────────

describe('timer actions', () => {
  beforeEach(() => {
    localStorage.clear();
    freshStore();
    // Set timer running
    useGameStore.setState((s) => ({
      turn: { ...s.turn, timerRunning: true, timer: 15 },
    }));
  });

  it('tickTimer decrements timer by 1', () => {
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().turn.timer).toBe(14);
  });

  it('tickTimer does nothing when timerRunning is false', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, timerRunning: false } }));
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().turn.timer).toBe(15);
  });

  it('timer stops and sets phase to result at 0', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, timer: 1, timerRunning: true } }));
    vi.useFakeTimers();
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().turn.timer).toBe(0);
    expect(useGameStore.getState().turn.timerRunning).toBe(false);
    expect(useGameStore.getState().turn.phase).toBe('result');
    vi.useRealTimers();
  });

  it('pauseTimer sets timerRunning to false', () => {
    useGameStore.getState().pauseTimer();
    expect(useGameStore.getState().turn.timerRunning).toBe(false);
  });

  it('resumeTimer sets timerRunning to true', () => {
    useGameStore.getState().pauseTimer();
    useGameStore.getState().resumeTimer();
    expect(useGameStore.getState().turn.timerRunning).toBe(true);
  });

  it('resetTimer resets to 15 and stops', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, timer: 5, timerRunning: true } }));
    useGameStore.getState().resetTimer();
    expect(useGameStore.getState().turn.timer).toBe(15);
    expect(useGameStore.getState().turn.timerRunning).toBe(false);
  });

  it('extendTimer adds seconds', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, timer: 5 } }));
    useGameStore.getState().extendTimer(10);
    expect(useGameStore.getState().turn.timer).toBe(15);
  });
});

// ─── nextPlayer ──────────────────────────────────────────────────────────────

describe('nextPlayer', () => {
  beforeEach(() => {
    localStorage.clear();
    freshStore();
  });

  it('increments currentPlayerIndex', () => {
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(0);
    useGameStore.getState().nextPlayer();
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(1);
  });

  it('wraps around at end of player list (5 players → back to 0)', () => {
    for (let i = 0; i < 5; i++) {
      useGameStore.getState().nextPlayer();
    }
    expect(useGameStore.getState().turn.currentPlayerIndex).toBe(0);
  });

  it('resets turn phase to spin', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, phase: 'input' } }));
    useGameStore.getState().nextPlayer();
    expect(useGameStore.getState().turn.phase).toBe('spin');
  });

  it('resets drumSpinning to false', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, drumSpinning: true } }));
    useGameStore.getState().nextPlayer();
    expect(useGameStore.getState().turn.drumSpinning).toBe(false);
  });

  it('resets timer to 15', () => {
    useGameStore.setState((s) => ({ turn: { ...s.turn, timer: 3 } }));
    useGameStore.getState().nextPlayer();
    expect(useGameStore.getState().turn.timer).toBe(15);
  });
});

// ─── forceBankrupt ────────────────────────────────────────────────────────────

describe('forceBankrupt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    freshStore();
    // Give current player some score
    useGameStore.setState((s) => ({
      players: s.players.map((p) =>
        p.id === 'g1p1' ? { ...p, roundScore: 400, score: 400 } : p
      ),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets current player isBankrupt to true', () => {
    useGameStore.getState().forceBankrupt();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(p?.isBankrupt).toBe(true);
  });

  it('resets current player roundScore to 0', () => {
    useGameStore.getState().forceBankrupt();
    const p = useGameStore.getState().players.find((p) => p.id === 'g1p1');
    expect(p?.roundScore).toBe(0);
  });

  it('does not affect other players scores', () => {
    useGameStore.getState().forceBankrupt();
    const others = useGameStore.getState().players.filter((p) => p.id !== 'g1p1');
    others.forEach((p) => expect(p.isBankrupt).toBe(false));
  });

  it('sets phase to result', () => {
    useGameStore.getState().forceBankrupt();
    expect(useGameStore.getState().turn.phase).toBe('result');
  });
});

// ─── startNextRound ──────────────────────────────────────────────────────────

describe('startNextRound', () => {
  beforeEach(() => {
    localStorage.clear();
    freshStore();
  });

  it('increments currentRound', () => {
    useGameStore.getState().startNextRound();
    expect(useGameStore.getState().currentRound).toBe(1);
  });

  it('loads the next word', () => {
    useGameStore.getState().startNextRound();
    expect(useGameStore.getState().board.word).toBe('БАРАБАН');
  });

  it('revealed array length matches new word length', () => {
    useGameStore.getState().startNextRound();
    const { word, revealed } = useGameStore.getState().board;
    expect(revealed.length).toBe(word.length);
    expect(revealed.every((v) => !v)).toBe(true);
  });

  it('resets turn to initial state', () => {
    useGameStore.getState().startNextRound();
    const { turn } = useGameStore.getState();
    expect(turn.phase).toBe('spin');
    expect(turn.drumSpinning).toBe(false);
    expect(turn.sector).toBeNull();
    expect(turn.timer).toBe(15);
  });

  it('sets gameStatus back to playing', () => {
    useGameStore.setState({ gameStatus: 'roundComplete' });
    useGameStore.getState().startNextRound();
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });

  it('moves to final after 5 rounds', () => {
    // Advance to round 4 (index 4), then call startNextRound
    useGameStore.setState({ currentRound: 4 });
    useGameStore.getState().startNextRound();
    // Should call startFinal → sets currentRound to 5, gameStatus to 'final'
    expect(useGameStore.getState().currentRound).toBe(5);
    expect(useGameStore.getState().gameStatus).toBe('final');
  });
});
