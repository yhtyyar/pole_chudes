import { create } from 'zustand';
import type { GameState, Player, DrumSector, SetupForm, TurnState } from '../types';
import { saveState, loadState, clearState, exportState, importState } from '../utils/storage';
import { sounds, resumeAudio, startBgMusic, stopBgMusic, setBgMusicVolume as setBgMusicVolumeUtil } from '../utils/sounds';
import { logEvent } from '../utils/gameLogger';
import { saveKnownPlayers } from '../utils/knownPlayers';
import { saveGameResults } from '../utils/gameHistory';

// Drum sectors with weights — exported for testing
export const DRUM_SECTORS: Array<{ sector: DrumSector; weight: number }> = [
  { sector: { type: 'points', value: 100 }, weight: 10 },
  { sector: { type: 'points', value: 150 }, weight: 10 },
  { sector: { type: 'points', value: 200 }, weight: 8 },
  { sector: { type: 'points', value: 250 }, weight: 7 },
  { sector: { type: 'points', value: 300 }, weight: 6 },
  { sector: { type: 'points', value: 350 }, weight: 5 },
  { sector: { type: 'points', value: 400 }, weight: 4 },
  { sector: { type: 'points', value: 500 }, weight: 3 },
  { sector: { type: 'points', value: 600 }, weight: 3 },
  { sector: { type: 'points', value: 1000 }, weight: 1 },
  { sector: { type: 'double' }, weight: 4 },
  { sector: { type: 'extra' }, weight: 4 },
  { sector: { type: 'bankrupt' }, weight: 5 },
  { sector: { type: 'prize' }, weight: 2 },
];

// Exported for testing
export function spinDrum(): DrumSector {
  const total = DRUM_SECTORS.reduce((s, d) => s + d.weight, 0);
  let rand = Math.random() * total;
  for (const { sector, weight } of DRUM_SECTORS) {
    rand -= weight;
    if (rand <= 0) return sector;
  }
  return DRUM_SECTORS[0].sector;
}

// Exported for testing
export function spinDrumWithSeed(rand: number): DrumSector {
  const total = DRUM_SECTORS.reduce((s, d) => s + d.weight, 0);
  let r = rand * total;
  for (const { sector, weight } of DRUM_SECTORS) {
    r -= weight;
    if (r <= 0) return sector;
  }
  return DRUM_SECTORS[0].sector;
}


export const DEFAULT_TIMER = 20;

function makeInitialTurn(): GameState['turn'] {
  return {
    currentPlayerIndex: 0,
    timer: DEFAULT_TIMER,
    timerRunning: false,
    sector: null,
    drumSpinning: false,
    phase: 'spin',
    pendingLetter: '',
    extraTurn: false,
    lastWrongLetter: '',
  };
}

const DEFAULT_PLAYERS_PER_GROUP = 5;

function buildInitialPlayers(groups: string[], playerNames: string[][], playersPerGroup: number[]): Player[] {
  const players: Player[] = [];
  groups.forEach((_group, gi) => {
    const count = playersPerGroup[gi] ?? DEFAULT_PLAYERS_PER_GROUP;
    for (let p = 0; p < count; p++) {
      players.push({
        id: `g${gi + 1}p${p + 1}`,
        name: playerNames[gi]?.[p]?.trim() || `Игрок ${p + 1}`,
        group: gi + 1,
        score: 0,
        roundScore: 0,
        isWinner: false,
        isBankrupt: false,
      });
    }
  });
  return players;
}

function buildFinalPlayers(winners: Player[]): Player[] {
  return winners.map((w, i) => ({
    ...w,
    id: `final_${w.id}`,
    score: 0,
    roundScore: 0,
    isWinner: false,
    isBankrupt: false,
    group: i + 1,
  }));
}

/** Build final_ prefixed players directly for final-only mode (no regular rounds). */
function buildFinalOnlyPlayers(names: string[], count: number): Player[] {
  const total = names.length > 0 ? names.length : count;
  return Array.from({ length: total }, (_, i) => ({
    id: `final_p${i + 1}`,
    name: names[i]?.trim() || `Финалист ${i + 1}`,
    group: i + 1,
    score: 0,
    roundScore: 0,
    isWinner: false,
    isBankrupt: false,
  }));
}

export interface GameActions {
  // Setup
  startGame: (form: SetupForm) => void;
  loadSavedState: () => boolean;
  resetGame: () => void;
  restartGame: () => void;

  // Drum
  spinDrumAction: () => void;
  finishDrumSpin: (sector: DrumSector) => void;

  // Letter input
  setPendingLetter: (letter: string) => void;
  submitLetter: () => void;
  submitWord: (word: string) => void;

  // Admin controls
  forceRevealLetter: (letter: string) => void;
  forceBankrupt: () => void;
  nextPlayer: () => void;
  previousPlayer: () => void;
  skipTurn: () => void;
  markWinner: () => void;
  setQuestionVisible: (v: boolean) => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  updatePlayerName: (playerId: string, name: string) => void;
  toggleBgMusic: () => void;
  setBgMusicVolume: (v: number) => void;

  // Timer
  tickTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  startTimer: () => void;
  extendTimer: (secs: number) => void;

  // Round/game flow
  startNextRound: () => void;
  startFinal: () => void;

  // Persistence
  exportState: () => void;
  importStateFromFile: (file: File) => Promise<void>;
}

const DEFAULT_STATE: GameState = {
  meta: { version: '1.0.0', createdAt: 0, lastSaved: 0 },
  config: { groups: [], rounds: [], playerNames: [], playersPerGroup: [] },
  currentRound: 0,
  players: [],
  board: { word: '', revealed: [] },
  turn: makeInitialTurn(),
  gameStatus: 'setup',
  questionVisible: true,
  muted: false,
  volume: 0.8,
  bgMusicEnabled: false,
  bgMusicVolume: 0.4,
};

type StoreState = GameState & GameActions;

export const useGameStore = create<StoreState>((set, get) => ({
  ...DEFAULT_STATE,

  // ── Setup ──────────────────────────────────────────────────────────────────

  startGame(form) {
    resumeAudio();
    const now = Date.now();

    // Build rounds. If any round has isFinal property defined (even false),
    // honour all isFinal values explicitly. Otherwise fall back to legacy
    // behaviour: last round is final when there are > 1 rounds.
    const totalFormRounds = form.rounds.length;
    const anyHasIsFinalDefined = form.rounds.some((r) => 'isFinal' in r && r.isFinal !== undefined);
    const allRounds = form.rounds.map((r, i) => ({
      id: i,
      word: r.word.trim().toUpperCase(),
      question: r.question.trim(),
      completed: false,
      isFinal: anyHasIsFinalDefined
        ? !!r.isFinal
        : i === totalFormRounds - 1 && totalFormRounds > 1,
    }));
    // First active (non-empty) round word for the initial board
    const firstActive = allRounds.find((r) => r.word.length > 0);
    const word = firstActive?.word ?? '';
    const firstActiveIndex = allRounds.findIndex((r) => r.word.length > 0);

    // Detect final-only mode: every active (non-empty) round is marked isFinal
    const activeRounds = allRounds.filter((r) => r.word.length > 0);
    const isFinalOnly = activeRounds.length > 0 && activeRounds.every((r) => r.isFinal);

    // Save all entered player names to the known-players book
    const allNames = isFinalOnly
      ? (form.finalPlayerNames ?? []).filter(Boolean)
      : (form.playerNames ?? []).flat().filter(Boolean);
    if (allNames.length) saveKnownPlayers(allNames);

    const playerNames = form.playerNames ?? [];
    const playersPerGroup = form.playersPerGroup ?? form.groups.map(() => DEFAULT_PLAYERS_PER_GROUP);

    // Build players: in final-only mode create final_ prefixed players directly
    const players = isFinalOnly
      ? buildFinalOnlyPlayers(form.finalPlayerNames ?? [], form.finalPlayersCount ?? DEFAULT_PLAYERS_PER_GROUP)
      : buildInitialPlayers(form.groups, playerNames, playersPerGroup);

    const state: GameState = {
      meta: { version: '1.0.0', createdAt: now, lastSaved: now },
      config: { groups: form.groups.map((g) => g.trim()), rounds: allRounds, playerNames, playersPerGroup },
      currentRound: Math.max(0, firstActiveIndex),
      players,
      board: { word, revealed: Array(word.length).fill(false) },
      turn: makeInitialTurn(),
      gameStatus: 'playing',
      questionVisible: true,
      muted: get().muted,
      volume: get().volume,
      bgMusicEnabled: get().bgMusicEnabled,
      bgMusicVolume: get().bgMusicVolume,
    };

    logEvent('GAME', 'Игра начата', { groups: form.groups, rounds: allRounds.map((r) => r.word) });
    saveState(state);
    set(state);

    // Start bg music if enabled
    if (get().bgMusicEnabled) startBgMusic(get().bgMusicVolume);
  },

  restartGame() {
    // Keep config (words/groups/playerNames/playersPerGroup) but reset all scores and round state
    const { config, bgMusicEnabled, bgMusicVolume } = get();
    if (!config.rounds.length) return;
    const firstActive = config.rounds.find((r) => r.word.length > 0);
    const firstActiveIndex = config.rounds.findIndex((r) => r.word.length > 0);
    const word = firstActive?.word ?? '';
    stopBgMusic();
    logEvent('GAME', 'Игра перезапущена');
    const playersPerGroup = config.playersPerGroup ?? config.groups.map(() => DEFAULT_PLAYERS_PER_GROUP);
    const state: GameState = {
      meta: { version: '1.0.0', createdAt: Date.now(), lastSaved: Date.now() },
      config: { ...config, playersPerGroup },
      currentRound: Math.max(0, firstActiveIndex),
      players: buildInitialPlayers(config.groups, config.playerNames ?? [], playersPerGroup),
      board: { word, revealed: Array(word.length).fill(false) },
      turn: makeInitialTurn(),
      gameStatus: 'playing',
      questionVisible: true,
      muted: get().muted,
      volume: get().volume,
      bgMusicEnabled,
      bgMusicVolume,
    };
    saveState(state);
    set(state);
    if (bgMusicEnabled) startBgMusic(bgMusicVolume);
  },

  loadSavedState() {
    const saved = loadState();
    if (!saved) return false;
    // Ensure new fields exist for backward-compat with old saves
    if (!saved.config.playerNames) saved.config.playerNames = [];
    if (!saved.config.playersPerGroup) {
      saved.config.playersPerGroup = saved.config.groups.map(() => DEFAULT_PLAYERS_PER_GROUP);
    }
    if (saved.bgMusicEnabled === undefined) saved.bgMusicEnabled = false;
    if (saved.bgMusicVolume === undefined) saved.bgMusicVolume = 0.4;
    set(saved);
    if (saved.bgMusicEnabled) startBgMusic(saved.bgMusicVolume);
    return true;
  },

  resetGame() {
    logEvent('GAME', 'Игра сброшена');
    stopBgMusic();
    clearState();
    set({ ...DEFAULT_STATE });
  },

  // ── Drum ──────────────────────────────────────────────────────────────────

  spinDrumAction() {
    const { turn, muted, volume } = get();
    if (turn.drumSpinning || turn.phase !== 'spin') return;
    resumeAudio();
    if (!muted) sounds.drum(volume);
    logEvent('DRUM', 'Барабан запущен', { playerIndex: turn.currentPlayerIndex });
    set((s) => ({ turn: { ...s.turn, drumSpinning: true, sector: null } }));
  },

  finishDrumSpin(sector: DrumSector) {
    const { muted, volume } = get();
    logEvent('DRUM', 'Барабан остановился', { sector });

    if (sector.type === 'bankrupt') {
      if (!muted) sounds.bankrupt(volume);
      set((s) => {
        const isFinal = !!s.config.rounds[s.currentRound]?.isFinal;
        const roundPlayers = s.players.filter((p) =>
          isFinal ? p.id.startsWith('final_') : p.group === s.currentRound + 1
        );
        const cp = roundPlayers[s.turn.currentPlayerIndex];
        return {
          turn: {
            ...s.turn,
            drumSpinning: false,
            sector,
            phase: 'result',
            timerRunning: false,
          },
          players: s.players.map((p) =>
            p.id === cp?.id ? { ...p, roundScore: 0, isBankrupt: true } : p
          ),
        };
      });
      // Auto-advance after 2s
      setTimeout(() => get().nextPlayer(), 2000);
    } else if (sector.type === 'prize') {
      if (!muted) sounds.prize(volume);
      set((s) => ({
        turn: {
          ...s.turn,
          drumSpinning: false,
          sector,
          phase: 'input',
          timerRunning: true,
          timer: DEFAULT_TIMER,
        },
      }));
    } else if (sector.type === 'double') {
      if (!muted) sounds.double(volume);
      set((s) => ({
        turn: { ...s.turn, drumSpinning: false, sector, phase: 'input', timerRunning: true, timer: DEFAULT_TIMER },
      }));
    } else if (sector.type === 'extra') {
      if (!muted) sounds.extra(volume);
      set((s) => ({
        turn: { ...s.turn, drumSpinning: false, sector, phase: 'input', timerRunning: true, timer: DEFAULT_TIMER },
      }));
    } else {
      // points → enter letter
      set((s) => ({
        turn: { ...s.turn, drumSpinning: false, sector, phase: 'input', timerRunning: true, timer: DEFAULT_TIMER },
      }));
    }

    saveState(get());
  },

  // ── Letter ──────────────────────────────────────────────────────────────

  setPendingLetter(letter) {
    set((s) => ({ turn: { ...s.turn, pendingLetter: letter.toUpperCase() } }));
  },

  submitLetter() {
    const { turn, board, currentRound, muted, volume, config } = get();
    const letter = turn.pendingLetter.trim().toUpperCase();
    if (!letter || turn.phase !== 'input') return;

    const isFinalRound = !!config.rounds[currentRound]?.isFinal;

    const wordLetters = board.word.replace(/Ё/g, 'Е').split('');
    const inputLetter = letter.replace('Ё', 'Е');

    // Find positions where letter appears and not yet revealed
    const positions: number[] = [];
    wordLetters.forEach((l, i) => {
      if (l === inputLetter && !board.revealed[i]) positions.push(i);
    });

    if (positions.length === 0) {
      // Wrong letter
      logEvent('LETTER', `Неверная буква: ${letter}`, { word: board.word }, 'WARN');
      if (!muted) sounds.wrong(volume);
      set((s) => ({
        turn: { ...s.turn, phase: 'result', timerRunning: false, pendingLetter: '', lastWrongLetter: letter },
      }));
      setTimeout(() => get().nextPlayer(), 1500);
      saveState(get());
      return;
    }

    // Correct letter — reveal positions
    logEvent('LETTER', `Верная буква: ${letter}`, { positions, count: positions.length });
    if (!muted) sounds.correct(volume);
    const newRevealed = [...board.revealed];
    positions.forEach((i) => (newRevealed[i] = true));
    const allRevealed = newRevealed.every(Boolean);

    const { sector } = turn;

    set((s) => {
      // Get the round's player list
      const roundPs = s.players.filter((p) =>
        isFinalRound ? p.id.startsWith('final_') : p.group === s.currentRound + 1
      );
      const cp = roundPs[s.turn.currentPlayerIndex];

      // Calculate score gain based on sector
      let gain = 0;
      if (sector) {
        if (sector.type === 'points') {
          gain = sector.value * positions.length;
        } else if (sector.type === 'double') {
          gain = cp?.roundScore ?? 0; // will double below
        } else {
          // 'extra' or 'prize' — fixed 100 per letter
          gain = 100 * positions.length;
        }
      }

      const updatedPlayers = s.players.map((p) => {
        if (p.id !== cp?.id) return p;
        const newRoundScore =
          sector?.type === 'double'
            ? p.roundScore * 2
            : p.roundScore + gain;
        const scoreDelta =
          sector?.type === 'double'
            ? p.roundScore // the additional amount (doubles existing)
            : gain;
        return {
          ...p,
          roundScore: newRoundScore,
          score: p.score + scoreDelta,
          isBankrupt: false,
        };
      });

      // After correct letter: stay with same player (go back to spin phase)
      // Only advance on wrong guess / bankrupt / timeout
      const newPhase: TurnState['phase'] = allRevealed ? 'result' : 'spin';

      const newTurn: typeof s.turn = {
        ...s.turn,
        timerRunning: false,
        pendingLetter: '',
        phase: newPhase,
        sector: allRevealed ? s.turn.sector : null,
        extraTurn: false,
      };

      return {
        board: { ...s.board, revealed: newRevealed },
        players: updatedPlayers,
        turn: newTurn,
        gameStatus: allRevealed
          ? (isFinalRound ? 'gameComplete' : 'roundComplete')
          : s.gameStatus,
      };
    });

    if (allRevealed) {
      if (!muted) sounds.win(volume);
      if (isFinalRound) {
        const finalState = get();
        const allRegular = finalState.players.filter((p) => !p.id.startsWith('final_'));
        const entries = allRegular.map((p) => ({
          playerId: p.id,
          name: p.name,
          totalScore: p.score,
          groupName: finalState.config.groups[p.group - 1] || `Группа ${p.group}`,
          roundsWon: p.isWinner ? 1 : 0,
        }));
        saveGameResults(entries);
      }
    }
    // No auto-advance — correct answer keeps the turn with the same player

    saveState(get());
  },

  // ── Admin controls ───────────────────────────────────────────────────────

  forceRevealLetter(letter) {
    const { board, currentRound, config } = get();
    const norm = letter.toUpperCase().replace('Ё', 'Е');
    const wordLetters = board.word.replace(/Ё/g, 'Е').split('');
    const newRevealed = [...board.revealed];
    wordLetters.forEach((l, i) => {
      if (l === norm) newRevealed[i] = true;
    });
    const allRevealed = newRevealed.every(Boolean);
    set((s) => ({
      board: { ...s.board, revealed: newRevealed },
      gameStatus: allRevealed ? 'roundComplete' : s.gameStatus,
    }));
    if (allRevealed && !get().muted) sounds.win(get().volume);
    saveState(get());
    void currentRound;
    void config;
  },

  forceBankrupt() {
    const { muted, volume } = get();
    if (!muted) sounds.bankrupt(volume);
    set((s) => {
      const isFinal = s.config.rounds[s.currentRound]?.isFinal;
      const roundPlayers = s.players.filter((p) =>
        isFinal ? p.id.startsWith('final_') : p.group === s.currentRound + 1
      );
      const cp = roundPlayers[s.turn.currentPlayerIndex];
      return {
        players: s.players.map((p) =>
          p.id === cp?.id ? { ...p, roundScore: 0, isBankrupt: true } : p
        ),
        turn: { ...s.turn, phase: 'result', timerRunning: false },
      };
    });
    setTimeout(() => get().nextPlayer(), 1500);
    saveState(get());
  },

  submitWord(word) {
    const { board, currentRound, muted, volume, config, turn } = get();
    const normalized = word.trim().toUpperCase().replace(/Ё/g, 'Е');
    if (!normalized || turn.phase !== 'input') return;

    const isFinalRound = !!config.rounds[currentRound]?.isFinal;
    const boardNorm = board.word.replace(/Ё/g, 'Е');

    if (normalized !== boardNorm) {
      logEvent('WORD', `Неверное слово: ${word}`, { word: board.word }, 'WARN');
      if (!muted) sounds.wrong(volume);
      set((s) => ({
        turn: { ...s.turn, phase: 'result', timerRunning: false, pendingLetter: '' },
      }));
      setTimeout(() => get().nextPlayer(), 1500);
      saveState(get());
      return;
    }

    logEvent('WORD', `Слово угадано: ${word}`);
    if (!muted) sounds.win(volume);

    const newRevealed = Array(board.word.length).fill(true);

    set((s) => {
      const roundPs = s.players.filter((p) =>
        isFinalRound ? p.id.startsWith('final_') : p.group === s.currentRound + 1
      );
      const cp = roundPs[s.turn.currentPlayerIndex];
      const { sector } = s.turn;

      let gain = 0;
      const unrevealedCount = s.board.revealed.filter((r) => !r).length;
      if (sector) {
        if (sector.type === 'points') gain = sector.value * unrevealedCount;
        else gain = 100 * unrevealedCount;
      }

      const updatedPlayers = s.players.map((p) => {
        if (p.id !== cp?.id) return p;
        return { ...p, roundScore: p.roundScore + gain, score: p.score + gain, isBankrupt: false };
      });

      return {
        board: { ...s.board, revealed: newRevealed },
        players: updatedPlayers,
        turn: { ...s.turn, timerRunning: false, pendingLetter: '', phase: 'result' },
        gameStatus: isFinalRound ? 'gameComplete' : 'roundComplete',
      };
    });

    if (isFinalRound) {
      const finalState = get();
      const allRegular = finalState.players.filter((p) => !p.id.startsWith('final_'));
      const entries = allRegular.map((p) => ({
        playerId: p.id,
        name: p.name,
        totalScore: p.score,
        groupName: finalState.config.groups[p.group - 1] || `Группа ${p.group}`,
        roundsWon: p.isWinner ? 1 : 0,
      }));
      saveGameResults(entries);
    }

    saveState(get());
  },

  nextPlayer() {
    const { currentRound, config } = get();
    const isFinal = config.rounds[currentRound]?.isFinal;
    set((s) => {
      const roundPlayers = s.players.filter((p) =>
        isFinal ? p.id.startsWith('final_') : p.group === s.currentRound + 1
      );
      const nextIdx = (s.turn.currentPlayerIndex + 1) % roundPlayers.length;
      return {
        turn: {
          ...makeInitialTurn(),
          currentPlayerIndex: nextIdx,
        },
      };
    });
    saveState(get());
  },

  previousPlayer() {
    const { currentRound, config } = get();
    const isFinal = config.rounds[currentRound]?.isFinal;
    set((s) => {
      const roundPlayers = s.players.filter((p) =>
        isFinal ? p.id.startsWith('final_') : p.group === s.currentRound + 1
      );
      const prevIdx = (s.turn.currentPlayerIndex - 1 + roundPlayers.length) % roundPlayers.length;
      return {
        turn: {
          ...makeInitialTurn(),
          currentPlayerIndex: prevIdx,
        },
      };
    });
    saveState(get());
  },

  skipTurn() {
    get().nextPlayer();
  },

  updatePlayerName(playerId, name) {
    const trimmed = name.trim();
    if (trimmed) saveKnownPlayers([trimmed]);
    set((s) => ({
      players: s.players.map((p) => p.id === playerId ? { ...p, name: trimmed || p.name } : p),
    }));
    saveState(get());
  },

  markWinner() {
    const { currentRound, config, players, muted, volume } = get();
    const isFinal = !!config.rounds[currentRound]?.isFinal;
    const finalPlayers = players.filter((p) => p.id.startsWith('final_'));
    // final_ players exist only when startFinal was called (multi-round game).
    // In final-only mode the round is isFinal but uses regular group players.
    const roundPlayers = isFinal && finalPlayers.length > 0
      ? finalPlayers
      : players.filter((p) => p.group === currentRound + 1);
    const cp = roundPlayers[get().turn.currentPlayerIndex];
    if (!cp) return;
    if (!muted) sounds.win(volume);

    const nextStatus: GameState['gameStatus'] = isFinal ? 'gameComplete' : 'roundComplete';
    const WINNER_BONUS = 1500;

    set((s) => ({
      players: s.players.map((p) =>
        p.id === cp.id
          ? { ...p, isWinner: true, score: p.score + WINNER_BONUS, roundScore: p.roundScore + WINNER_BONUS }
          : p
      ),
      gameStatus: nextStatus,
      turn: { ...s.turn, timerRunning: false, phase: 'result' },
    }));

    // Persist results to all-time history when game is complete
    if (isFinal) {
      const finalState = get();
      const allRegular = finalState.players.filter((p) => !p.id.startsWith('final_'));
      const entries = allRegular.map((p) => ({
        playerId: p.id,
        name: p.name,
        totalScore: p.score,
        groupName: finalState.config.groups[p.group - 1] || `Группа ${p.group}`,
        roundsWon: p.isWinner ? 1 : 0,
      }));
      saveGameResults(entries);
    }

    saveState(get());
  },

  setQuestionVisible(v) {
    set({ questionVisible: v });
  },

  toggleMute() {
    set((s) => ({ muted: !s.muted }));
    saveState(get());
  },

  setVolume(v) {
    set({ volume: v });
    saveState(get());
  },

  toggleBgMusic() {
    const next = !get().bgMusicEnabled;
    set({ bgMusicEnabled: next });
    if (next) {
      resumeAudio();
      startBgMusic(get().bgMusicVolume);
    } else {
      stopBgMusic();
    }
    saveState(get());
  },

  setBgMusicVolume(v) {
    set({ bgMusicVolume: v });
    setBgMusicVolumeUtil(v);
    saveState(get());
  },

  // ── Timer ────────────────────────────────────────────────────────────────

  tickTimer() {
    const { turn, muted, volume } = get();
    if (!turn.timerRunning) return;

    if (turn.timer <= 1) {
      if (!muted) sounds.alarm(volume);
      set((s) => ({
        turn: { ...s.turn, timer: 0, timerRunning: false, phase: 'result' },
      }));
      setTimeout(() => get().nextPlayer(), 2000);
      saveState(get());
      return;
    }

    if (turn.timer === 4 && !muted) sounds.tick(volume);

    set((s) => ({ turn: { ...s.turn, timer: s.turn.timer - 1 } }));
  },

  pauseTimer() {
    set((s) => ({ turn: { ...s.turn, timerRunning: false } }));
  },

  resumeTimer() {
    set((s) => ({ turn: { ...s.turn, timerRunning: true } }));
  },

  resetTimer() {
    set((s) => ({ turn: { ...s.turn, timer: DEFAULT_TIMER, timerRunning: false } }));
  },

  startTimer() {
    set((s) => ({ turn: { ...s.turn, timer: DEFAULT_TIMER, timerRunning: true } }));
  },

  extendTimer(secs) {
    set((s) => ({ turn: { ...s.turn, timer: s.turn.timer + secs } }));
  },

  // ── Round/game flow ──────────────────────────────────────────────────────

  startNextRound() {
    const { currentRound, config } = get();

    // Find the final round (last round with isFinal flag, or last round overall)
    const finalRoundIndex = config.rounds.reduce(
      (fi, r, i) => (r.isFinal ? i : fi),
      config.rounds.length - 1
    );

    // Find next non-empty round after current
    let nextRound = currentRound + 1;
    while (nextRound < finalRoundIndex && !config.rounds[nextRound]?.word) {
      nextRound++;
    }

    // If we've reached or passed the final round, start final
    if (nextRound >= finalRoundIndex) {
      get().startFinal();
      return;
    }

    const word = config.rounds[nextRound].word;
    set({
      currentRound: nextRound,
      board: { word, revealed: Array(word.length).fill(false) },
      turn: makeInitialTurn(),
      gameStatus: 'playing',
      questionVisible: true,
    });
    saveState(get());
  },

  startFinal() {
    const { config, players } = get();

    // Find final round index dynamically
    const finalRoundIndex = config.rounds.reduce(
      (fi, r, i) => (r.isFinal ? i : fi),
      config.rounds.length - 1
    );

    // Collect one winner per group (highest score per group)
    const groupCount = config.groups.length;
    const winners: Player[] = [];
    for (let g = 1; g <= groupCount; g++) {
      const gPlayers = players.filter((p) => p.group === g && !p.id.startsWith('final_'));
      if (gPlayers.length === 0) continue;
      const winner = gPlayers.reduce((best, p) => (p.score > best.score ? p : best), gPlayers[0]);
      winners.push(winner);
    }

    const finalPlayers = buildFinalPlayers(winners);
    const word = config.rounds[finalRoundIndex]?.word ?? '';

    set((s) => ({
      currentRound: finalRoundIndex,
      players: [...s.players, ...finalPlayers],
      board: { word, revealed: Array(word.length).fill(false) },
      turn: makeInitialTurn(),
      gameStatus: 'final',
      questionVisible: true,
    }));
    saveState(get());
  },

  // ── Persistence ───────────────────────────────────────────────────────────

  exportState() {
    const state = get();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exportState: _fn, importStateFromFile: _fn2, ...rest } = state as StoreState;
    void _fn; void _fn2;
    exportState(rest as GameState);
  },

  async importStateFromFile(file) {
    const loaded = await importState(file);
    set(loaded);
    saveState(loaded);
  },
}));
