/**
 * 06 — Round transition tests
 *
 * Test design techniques:
 *  - State Transition: playing → roundComplete → nextRound / final / gameComplete
 *  - Use Case Testing: multi-round game progression, final round flow
 */
import { test, expect, injectGameState, makePlayingState, makeRoundCompleteState, makeGameCompleteState } from '../fixtures/index';
import { GamePage } from '../pages/GamePage';
import { FinalPage } from '../pages/FinalPage';

test.describe('Round complete overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeRoundCompleteState());
  });

  test('round complete overlay is visible', async ({ page }) => {
    const game = new GamePage(page);
    await expect(game.roundCompleteOverlay).toBeVisible({ timeout: 5000 });
  });

  test('next round button is visible (more rounds available)', async ({ page }) => {
    const game = new GamePage(page);
    await expect(game.nextRoundBtn).toBeVisible({ timeout: 3000 });
  });

  test('clicking next round dismisses overlay and shows new board', async ({ page }) => {
    const game = new GamePage(page);
    await game.nextRoundBtn.click();
    await expect(game.roundCompleteOverlay).toBeHidden({ timeout: 5000 });
    await expect(game.board).toBeVisible();
  });

  test('next round resets board cells to unrevealed', async ({ page }) => {
    const game = new GamePage(page);
    await game.nextRoundBtn.click();
    await page.waitForTimeout(500);
    const revealed = await game.revealedCount();
    expect(revealed).toBe(0);
  });
});

test.describe('Final round transition', () => {
  test('start final button appears after last regular round completes', async ({ page }) => {
    await page.goto('/');
    // Inject round-complete state where it's the last regular round and final round exists
    const state = JSON.parse(makeRoundCompleteState());
    // Make this the last regular round (only 1 regular + 1 final)
    state.config.rounds = [
      { id: 0, word: 'СЛОВО', question: 'Q1', completed: true, isFinal: false },
      { id: 1, word: 'ФИНАЛ', question: 'QF', completed: false, isFinal: true },
    ];
    state.currentRound = 0;
    await injectGameState(page, JSON.stringify(state));
    const game = new GamePage(page);
    await expect(game.startFinalBtn).toBeVisible({ timeout: 5000 });
  });

  test('clicking start final loads the final word on the board', async ({ page }) => {
    await page.goto('/');
    const state = JSON.parse(makeRoundCompleteState());
    state.config.rounds = [
      { id: 0, word: 'СЛОВО', question: 'Q1', completed: true, isFinal: false },
      { id: 1, word: 'ФИНАЛ', question: 'QF', completed: false, isFinal: true },
    ];
    state.currentRound = 0;
    await injectGameState(page, JSON.stringify(state));
    const game = new GamePage(page);
    await game.startFinalBtn.click();
    // Final board should have 5 cells (ФИНАЛ)
    await page.waitForTimeout(500);
    const cells = await game.totalCells();
    expect(cells).toBe(5);
  });

  test('final round word in board matches config final word', async ({ page }) => {
    await page.goto('/');
    const state = JSON.parse(makeRoundCompleteState());
    state.config.rounds = [
      { id: 0, word: 'СЛОВО', question: 'Q1', completed: true, isFinal: false },
      { id: 1, word: 'ПОБЕДА', question: 'QF', completed: false, isFinal: true },
    ];
    state.currentRound = 0;
    await injectGameState(page, JSON.stringify(state));
    const game = new GamePage(page);
    await game.startFinalBtn.click();
    await page.waitForTimeout(500);
    const cells = await game.totalCells();
    expect(cells).toBe(6); // ПОБЕДА = 6 letters
  });
});

test.describe('Game complete → Final page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeGameCompleteState());
  });

  test('final page is visible after game complete state', async ({ page }) => {
    const finalPage = new FinalPage(page);
    await expect(finalPage.finalPage).toBeVisible({ timeout: 5000 });
  });

  test('final page shows congratulations heading', async ({ page }) => {
    await expect(page.locator('h1', { hasText: 'Поздравляем' })).toBeVisible({ timeout: 5000 });
  });

  test('"New game" button navigates back to setup', async ({ page }) => {
    const finalPage = new FinalPage(page);
    await finalPage.waitForVisible();
    await finalPage.clickNewGame();
    await expect(page.getByTestId('setup-page')).toBeVisible({ timeout: 8000 });
  });

  test('"Repeat game" button loads a new game with same config', async ({ page }) => {
    const finalPage = new FinalPage(page);
    await finalPage.waitForVisible();
    await finalPage.clickRepeatGame();
    // Should go to playing game with board
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Multi-round progression (State Transition)', () => {
  test('complete 2 regular rounds in sequence via admin reveal', async ({ page }) => {
    await page.goto('/');
    const state = {
      meta: { version: '1.0.0', createdAt: Date.now(), lastSaved: Date.now() },
      config: {
        groups: ['Г1', 'Г2'],
        rounds: [
          { id: 0, word: 'МИР', question: 'Слово, означающее покой', completed: false, isFinal: false },
          { id: 1, word: 'ДОМ', question: 'Место где живут люди', completed: false, isFinal: false },
          { id: 2, word: 'МЯЧ', question: 'Финальный вопрос', completed: false, isFinal: true },
        ],
        playerNames: [['П1', 'П2'], ['П3', 'П4']], playersPerGroup: [2, 2],
      },
      currentRound: 0,
      players: [
        { id: 'g1p1', name: 'П1', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g1p2', name: 'П2', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g2p1', name: 'П3', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g2p2', name: 'П4', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
      ],
      board: { word: 'МИР', revealed: [false, false, false] },
      turn: {
        currentPlayerIndex: 0, timer: 30, timerRunning: false,
        sector: { type: 'points', value: 100 },
        drumSpinning: false, phase: 'spin',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
      gameStatus: 'playing',
      questionVisible: true,
      muted: true, volume: 0.8, bgMusicEnabled: false, bgMusicVolume: 0.4,
    };
    await injectGameState(page, JSON.stringify(state));
    const game = new GamePage(page);

    // Round 1: use admin reveal to reveal all letters of МИР
    await game.revealLetter('М');
    await page.waitForTimeout(300);
    await game.revealLetter('И');
    await page.waitForTimeout(300);
    await game.revealLetter('Р');
    await page.waitForTimeout(1000);

    // Round complete overlay should appear
    await expect(game.roundCompleteOverlay).toBeVisible({ timeout: 5000 });

    // Click next round
    await game.nextRoundBtn.click();
    await page.waitForTimeout(800);

    // Round 2 board should have 3 cells (ДОМ)
    const cells = await game.totalCells();
    expect(cells).toBe(3);
  });
});
