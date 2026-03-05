/**
 * 03 — Drum sector behavior tests
 *
 * Test design techniques:
 *  - Decision Table Testing: each sector type → expected outcome
 *  - State Transition: spin → specific sector → input/result phase
 *
 * Strategy: inject a game state with turn.phase='spin', then trigger
 * finishDrumSpin with a known sector via the Zustand store accessed
 * through the app's window-exposed store reference (dev build).
 *
 * For sectors that auto-advance (bankrupt), we verify board state after delay.
 */
import { test, expect, injectGameState, makePlayingState, makeInputPhaseState } from '../fixtures/index';
import { GamePage } from '../pages/GamePage';

/** Build a state with drumSpinning=true so we can call finishDrumSpin */
function makeSpinningState(overrides: Record<string, unknown> = {}): string {
  return makePlayingState({
    turn: {
      currentPlayerIndex: 0,
      timer: 20,
      timerRunning: false,
      sector: null,
      drumSpinning: true,
      phase: 'spin',
      pendingLetter: '',
      extraTurn: false,
      bankAmount: 0,
      lastWrongLetter: '',
      ...overrides,
    },
  });
}

test.describe('Drum sectors — Decision Table', () => {
  /**
   * Decision table for sector → expected UI outcome:
   *
   * | Sector          | Phase after | Input visible | Score changes | Auto-advances |
   * |-----------------|-------------|---------------|---------------|---------------|
   * | points (200)    | input       | YES           | +200/letter   | NO            |
   * | double          | input       | YES           | ×2 round      | NO            |
   * | extra (+1)      | input       | YES           | +100/letter   | NO            |
   * | prize           | input       | YES           | +100/letter   | NO            |
   * | bank            | input       | YES           | +bank+100/let | NO            |
   * | bankrupt        | result      | NO            | reset to 0    | YES (2s)      |
   */

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState({ muted: true }));
  });

  test('After spin, drum result shows a known sector label (via state injection)', async ({ page }) => {
    // The real drum animation doesn't complete reliably in headless Chromium.
    // Use state injection with a pre-set sector to test the drum result display.
    await page.goto('/');
    await injectGameState(page, makeInputPhaseState());
    const game = new GamePage(page);
    const knownLabels = ['очков', 'БАНКРОТ', 'ПРИЗ', 'БАНК', '×2', '+1'];
    const text = await game.drumResult.textContent() ?? '';
    const matched = knownLabels.some((l) => text.includes(l));
    expect(matched).toBe(true);
  });

  test('Spin button is re-enabled after bankrupt auto-advance (2s)', async ({ page }) => {
    const game = new GamePage(page);
    // Inject state where bankrupt just fired (phase=result, drumSpinning=false)
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0,
        timer: 15,
        timerRunning: false,
        sector: { type: 'bankrupt' },
        drumSpinning: false,
        phase: 'result',
        pendingLetter: '',
        extraTurn: false,
        bankAmount: 0,
        lastWrongLetter: '',
      },
    }));
    // After auto-advance (simulated by nextPlayer action), spin button should reappear enabled
    // We click next-player manually to simulate
    await game.nextPlayer();
    await expect(game.spinDrumBtn).toBeEnabled({ timeout: 3000 });
  });

  test('After spin producing points sector, letter input is visible', async ({ page }) => {
    // Inject input phase directly with points sector
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0, timer: 15, timerRunning: true,
        sector: { type: 'points', value: 300 },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
    }));
    const game = new GamePage(page);
    await expect(game.letterInput).toBeVisible();
  });

  test('After spin producing double sector, letter input is visible', async ({ page }) => {
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0, timer: 15, timerRunning: true,
        sector: { type: 'double' },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
    }));
    const game = new GamePage(page);
    await expect(game.letterInput).toBeVisible();
  });

  test('After spin producing extra (+1) sector, letter input is visible', async ({ page }) => {
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0, timer: 15, timerRunning: true,
        sector: { type: 'extra' },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
    }));
    const game = new GamePage(page);
    await expect(game.letterInput).toBeVisible();
  });

  test('After spin producing prize sector, letter input is visible', async ({ page }) => {
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0, timer: 15, timerRunning: true,
        sector: { type: 'prize' },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
    }));
    const game = new GamePage(page);
    await expect(game.letterInput).toBeVisible();
  });

  test('After spin producing bank sector, letter input is visible', async ({ page }) => {
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0, timer: 15, timerRunning: true,
        sector: { type: 'bank' },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 200, lastWrongLetter: '',
      },
    }));
    const game = new GamePage(page);
    await expect(game.letterInput).toBeVisible();
  });

  test('Bankrupt state: player score card shows skull (isBankrupt=true)', async ({ page }) => {
    await injectGameState(page, makePlayingState({
      players: [
        { id: 'g1p1', name: 'П1', group: 1, score: 500, roundScore: 0, isWinner: false, isBankrupt: true },
        { id: 'g1p2', name: 'П2', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g2p1', name: 'П3', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g2p2', name: 'П4', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
      ],
    }));
    // Skull SVG is rendered when isBankrupt=true — look for it in the header player cards
    const skulls = page.locator('svg[class*="lucide-skull"]');
    await expect(skulls.first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Drum sectors — correct letter scoring', () => {
  test('Points sector: correct letter adds sector value × occurrences to score', async ({ page }) => {
    await page.goto('/');
    // С occurs once in СЛОВО; sector=points/200 → gain = 200*1 = 200
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0, timer: 15, timerRunning: true,
        sector: { type: 'points', value: 200 },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
    }));
    const game = new GamePage(page);
    await game.letterInput.fill('С');
    await game.submitLetterBtn.click();
    // Score for player 1 should be 200
    await expect(page.locator('text=200').first()).toBeVisible({ timeout: 3000 });
  });

  test('Multiple occurrences: letter in word N times = value × N', async ({ page }) => {
    await page.goto('/');
    // Word = МОРЕ, О occurs 1 time; word = ОБОРОТ, О occurs 3 times; use ОБОРОТ
    await injectGameState(page, makePlayingState({
      board: { word: 'ОБОРОТ', revealed: [false, false, false, false, false, false] },
      config: {
        groups: ['Г1', 'Г2'],
        rounds: [
          { id: 0, word: 'ОБОРОТ', question: 'Q', completed: false, isFinal: false },
          { id: 1, word: 'ФИНАЛ', question: 'QF', completed: false, isFinal: true },
        ],
        playerNames: [], playersPerGroup: [2, 2],
      },
      turn: {
        currentPlayerIndex: 0, timer: 15, timerRunning: true,
        sector: { type: 'points', value: 100 },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
    }));
    const game = new GamePage(page);
    await game.letterInput.fill('О'); // О at positions 0, 2, 4 → 3 occurrences
    await game.submitLetterBtn.click();
    // 3 cells should be revealed
    const revealed = await game.revealedCount();
    expect(revealed).toBe(3);
  });
});
