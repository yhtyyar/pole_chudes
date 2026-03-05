import { type Page } from '@playwright/test';

/**
 * Pre-built game state snapshots for injecting directly into localStorage.
 * This avoids clicking through Setup for every test that needs a running game.
 */

/** Minimal valid game state — single round, word = СЛОВО (5 letters), spin phase */
export function makePlayingState(overrides: Record<string, unknown> = {}): string {
  const base = {
    meta: { version: '1.0.0', createdAt: Date.now(), lastSaved: Date.now() },
    config: {
      groups: ['Группа 1', 'Группа 2'],
      rounds: [
        { id: 0, word: 'СЛОВО', question: 'Тестовый вопрос номер один', completed: false, isFinal: false },
        { id: 1, word: 'ФИНАЛ', question: 'Финальный тестовый вопрос', completed: false, isFinal: true },
      ],
      playerNames: [['Игрок 1', 'Игрок 2'], ['Игрок 3', 'Игрок 4']],
      playersPerGroup: [2, 2],
    },
    currentRound: 0,
    players: [
      { id: 'g1p1', name: 'Игрок 1', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
      { id: 'g1p2', name: 'Игрок 2', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
      { id: 'g2p1', name: 'Игрок 3', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
      { id: 'g2p2', name: 'Игрок 4', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
    ],
    board: { word: 'СЛОВО', revealed: [false, false, false, false, false] },
    turn: {
      currentPlayerIndex: 0,
      timer: 20,
      timerRunning: false,
      sector: null,
      drumSpinning: false,
      phase: 'spin',
      pendingLetter: '',
      extraTurn: false,
      bankAmount: 0,
      lastWrongLetter: '',
    },
    gameStatus: 'playing',
    questionVisible: true,
    muted: true,
    volume: 0.8,
    bgMusicEnabled: false,
    bgMusicVolume: 0.4,
    ...overrides,
  };
  return JSON.stringify(base);
}

/** State where turn.phase = 'input' and a points sector is active */
export function makeInputPhaseState(word = 'СЛОВО', sectorValue = 200): string {
  return makePlayingState({
    board: { word, revealed: new Array(word.length).fill(false) },
    turn: {
      currentPlayerIndex: 0,
      timer: 20,
      timerRunning: true,
      sector: { type: 'points', value: sectorValue },
      drumSpinning: false,
      phase: 'input',
      pendingLetter: '',
      extraTurn: false,
      bankAmount: 0,
      lastWrongLetter: '',
    },
  });
}

/** State where only the last letter of СЛОВО is hidden (О at index 4) */
export function makeAlmostWonState(): string {
  return makePlayingState({
    turn: {
      currentPlayerIndex: 0,
      timer: 20,
      timerRunning: true,
      sector: { type: 'points', value: 100 },
      drumSpinning: false,
      phase: 'input',
      pendingLetter: '',
      extraTurn: false,
      bankAmount: 0,
      lastWrongLetter: '',
    },
    board: { word: 'СЛОВО', revealed: [true, true, true, true, false] },
  });
}

/** State in roundComplete status — 2 regular rounds so next-round-btn is shown */
export function makeRoundCompleteState(): string {
  return makePlayingState({
    gameStatus: 'roundComplete',
    config: {
      groups: ['\u0413\u0440\u0443\u043f\u043f\u0430 1', '\u0413\u0440\u0443\u043f\u043f\u0430 2'],
      rounds: [
        { id: 0, word: '\u0421\u041b\u041e\u0412\u041e', question: '\u0422\u0435\u0441\u0442\u043e\u0432\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441 \u043d\u043e\u043c\u0435\u0440 \u043e\u0434\u0438\u043d', completed: true, isFinal: false },
        { id: 1, word: '\u041c\u0418\u0420', question: '\u0427\u0442\u043e \u043e\u0437\u043d\u0430\u0447\u0430\u0435\u0442 \u043f\u043e\u043a\u043e\u0439', completed: false, isFinal: false },
        { id: 2, word: '\u0424\u0418\u041d\u0410\u041b', question: '\u0424\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441', completed: false, isFinal: true },
      ],
      playerNames: [['\u0418\u0433\u0440\u043e\u043a 1', '\u0418\u0433\u0440\u043e\u043a 2'], ['\u0418\u0433\u0440\u043e\u043a 3', '\u0418\u0433\u0440\u043e\u043a 4']],
      playersPerGroup: [2, 2],
    },
    board: { word: '\u0421\u041b\u041e\u0412\u041e', revealed: [true, true, true, true, true] },
    turn: {
      currentPlayerIndex: 0, timer: 20, timerRunning: false,
      sector: { type: 'points', value: 100 },
      drumSpinning: false, phase: 'result',
      pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
    },
  });
}

/** State in gameComplete status (final round done) */
export function makeGameCompleteState(): string {
  const base = JSON.parse(makePlayingState());
  base.gameStatus = 'gameComplete';
  base.currentRound = 1;
  base.board = { word: 'ФИНАЛ', revealed: [true, true, true, true, true] };
  base.players.push(
    { id: 'final_g1p1', name: 'Игрок 1', group: 1, score: 1500, roundScore: 1500, isWinner: true, isBankrupt: false },
    { id: 'final_g2p1', name: 'Игрок 3', group: 2, score: 400,  roundScore: 400,  isWinner: false, isBankrupt: false },
  );
  return JSON.stringify(base);
}

/**
 * Inject a game state into localStorage and reload the page.
 * The app picks it up via loadSavedState() on mount.
 */
export async function injectGameState(page: Page, stateJson: string) {
  await page.evaluate((json) => {
    localStorage.setItem('pole_chudes_state', json);
  }, stateJson);
  await page.reload();
  // Wait for the app to render (either game or setup page)
  await page.waitForSelector('[data-testid="setup-page"],[data-testid="board"],[data-testid="final-page"]', { timeout: 10_000 });
}

/** Clear all localStorage and reload to a clean Setup screen */
export async function resetToSetup(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-testid="setup-page"]', { timeout: 10_000 });
}

/** Navigate to the app and inject a playing state in one step */
export async function gotoPlayingGame(page: Page, stateJson?: string) {
  await page.goto('/');
  await injectGameState(page, stateJson ?? makePlayingState());
}

/** Navigate and inject input-phase state */
export async function gotoInputPhase(page: Page, word = 'СЛОВО', sectorValue = 200) {
  await page.goto('/');
  await injectGameState(page, makeInputPhaseState(word, sectorValue));
}
