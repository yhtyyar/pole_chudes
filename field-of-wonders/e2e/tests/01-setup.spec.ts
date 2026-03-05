/**
 * 01 — Setup page tests
 *
 * Test design techniques:
 *  - Equivalence Partitioning (EP): valid/invalid word classes
 *  - Boundary Value Analysis (BVA): word length 2/3/15/16, group count 1/8
 *  - Use Case Testing: happy-path start, saved-state restore
 *  - Error Guessing: non-Cyrillic input, empty required fields
 */
import { test, expect } from '../fixtures/index';
import { SetupPage } from '../pages/SetupPage';
import { resetToSetup } from '../helpers/gameHelpers';

test.describe('Setup page — initial state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
  });

  test('shows the setup page on first visit', async ({ page }) => {
    await expect(page.getByTestId('setup-page')).toBeVisible();
  });

  test('title contains "Поле Чудес"', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Поле Чудес');
  });

  test('start button is visible', async ({ page }) => {
    await expect(page.getByTestId('start-game-btn')).toBeVisible();
  });

  test('3 group name inputs visible in normal mode (after filling a round word)', async ({ page }) => {
    const setup = new SetupPage(page);
    // Default is "final-only" mode (all regular rounds empty + final toggle ON).
    // Fill one round word to enter normal mode and reveal group inputs.
    await setup.roundWordInput(0).fill('СЛОВО');
    const count = await setup.groupCount();
    expect(count).toBe(3);
  });

  test('3 round word inputs exist by default', async ({ page }) => {
    const setup = new SetupPage(page);
    const count = await setup.roundCount();
    expect(count).toBe(3);
  });

  test('"Continue game" button NOT visible when no saved state', async ({ page }) => {
    await expect(page.getByTestId('continue-game-btn')).toHaveCount(0);
  });
});

test.describe('Setup — form validation (Equivalence Partitioning)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
  });

  test('EP: valid word (БАРАБАН) + valid question → game starts', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.fillMinimalForm('БАРАБАН', 'Что крутится в этой игре?');
    await setup.startGame();
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
  });

  test('EP: empty form → does not navigate to game (no board visible)', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.startGameBtn.click();
    // Still on setup page
    await expect(page.getByTestId('setup-page')).toBeVisible();
    await expect(page.getByTestId('board')).toHaveCount(0);
  });

  test('EP: question too short (<5 chars) → validation error shown', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.roundWordInput(0).fill('СЛОВО');
    await setup.roundQuestionInput(0).fill('Hi');
    await setup.startGame();
    // Still on setup (validation failed)
    await expect(page.getByTestId('setup-page')).toBeVisible();
    await expect(page.locator('.text-error').first()).toBeVisible();
  });
});

test.describe('Setup — word input Boundary Value Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
  });

  test('BVA: word with exactly 3 letters (min valid) → game starts', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.fillMinimalForm('МИР', 'Что означает покой и согласие?');
    await setup.startGame();
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
  });

  test('BVA: word with 2 letters (below min) → validation error', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.roundWordInput(0).fill('МИ');
    await setup.roundQuestionInput(0).fill('Нотная шкала — третья нота');
    await setup.startGameBtn.click();
    await expect(page.getByTestId('setup-page')).toBeVisible();
    await expect(page.locator('.text-error').first()).toBeVisible();
  });

  test('BVA: word with exactly 15 letters (max valid) → game starts', async ({ page }) => {
    const setup = new SetupPage(page);
    // 15-letter Cyrillic word
    await setup.roundWordInput(0).fill('ЭЛЕКТРИФИКАЦИЯ');
    await setup.roundQuestionInput(0).fill('Процесс снабжения электроэнергией');
    await setup.startGame();
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
  });

  test('BVA: maxLength attribute prevents >15 chars', async ({ page }) => {
    const setup = new SetupPage(page);
    const input = setup.roundWordInput(0);
    // Try to type 16 letters — input has maxLength=15
    await input.fill('АБВГДЕЁЖЗИЙКЛМНО');
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(15);
  });

  test('BVA: non-Cyrillic word → does not appear (input converts to uppercase only Cyrillic)', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.roundWordInput(0).fill('HELLO');
    await setup.roundQuestionInput(0).fill('Английское слово приветствия');
    await setup.startGameBtn.click();
    // Validation error expected for non-Cyrillic
    await expect(page.locator('.text-error').first()).toBeVisible();
  });
});

test.describe('Setup — group management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    // Fill a round word to exit "final-only" mode and render group inputs
    await page.getByTestId('round-word-input-0').fill('СЛОВО');
  });

  test('add group button increases group count', async ({ page }) => {
    const setup = new SetupPage(page);
    const before = await setup.groupCount();
    await setup.addGroupBtn.click();
    const after = await setup.groupCount();
    expect(after).toBe(before + 1);
  });

  test('remove group button decreases group count', async ({ page }) => {
    const setup = new SetupPage(page);
    const before = await setup.groupCount();
    await setup.removeGroupBtn(0).click();
    const after = await setup.groupCount();
    expect(after).toBe(before - 1);
  });

  test('BVA: add groups up to max (8) — add button disappears', async ({ page }) => {
    const setup = new SetupPage(page);
    // Start with 3, add 5 more → 8
    for (let i = 0; i < 5; i++) {
      await setup.addGroupBtn.click();
    }
    // At max, add-group button should no longer be in the DOM
    await expect(page.getByTestId('add-group-btn')).toHaveCount(0);
  });

  test('BVA: remove groups down to 1 — remove button disappears', async ({ page }) => {
    const setup = new SetupPage(page);
    // Remove all but one
    while ((await setup.groupCount()) > 1) {
      await setup.removeGroupBtn(0).click();
    }
    await expect(page.getByTestId('remove-group-btn-0')).toHaveCount(0);
  });

  test('group name is editable', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.groupNameInput(0).fill('Команда Альфа');
    await expect(setup.groupNameInput(0)).toHaveValue('Команда Альфа');
  });

  test('empty group name → validation error on start', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.groupNameInput(0).fill('');
    await setup.roundQuestionInput(0).fill('Вопрос тестовый длинный');
    await setup.startGameBtn.click();
    await expect(page.locator('.text-error').first()).toBeVisible();
  });
});

test.describe('Setup — round management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
  });

  test('add round button increases round count', async ({ page }) => {
    const setup = new SetupPage(page);
    const before = await setup.roundCount();
    await setup.addRoundBtn.click();
    const after = await setup.roundCount();
    expect(after).toBe(before + 1);
  });

  test('remove round button decreases round count', async ({ page }) => {
    const setup = new SetupPage(page);
    // Need >1 round to see remove button
    await setup.addRoundBtn.click();
    const before = await setup.roundCount();
    await setup.removeRoundBtn(0).click();
    const after = await setup.roundCount();
    expect(after).toBe(before - 1);
  });

  test('rounds with empty word are skipped (no error for blank rounds)', async ({ page }) => {
    const setup = new SetupPage(page);
    // Fill only first round
    await setup.fillMinimalForm('СЛОВО', 'Тестовый вопрос достаточной длины');
    // Leave other rounds empty
    await setup.startGame();
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Setup — final round toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
  });

  test('final round toggle is ON by default (aria-pressed=true)', async ({ page }) => {
    const toggle = page.getByTestId('final-toggle');
    const pressed = await toggle.getAttribute('aria-pressed');
    expect(pressed).toBe('true');
  });

  test('clicking toggle hides the final word input', async ({ page }) => {
    const setup = new SetupPage(page);
    // Toggle OFF
    await setup.finalToggle.click();
    await expect(page.getByTestId('final-word-input')).toHaveCount(0);
  });

  test('clicking toggle twice restores final word input', async ({ page }) => {
    const setup = new SetupPage(page);
    await setup.finalToggle.click(); // OFF
    await setup.finalToggle.click(); // ON
    await expect(page.getByTestId('final-word-input')).toBeVisible();
  });
});

test.describe('Setup — saved state restore', () => {
  const PLAYING_STATE = JSON.stringify({
    meta: { version: '1.0.0', createdAt: Date.now(), lastSaved: Date.now() },
    config: { groups: ['G1', 'G2'], rounds: [{ id: 0, word: 'СЛОВО', question: 'Q', completed: false, isFinal: false }], playerNames: [], playersPerGroup: [2, 2] },
    currentRound: 0,
    players: [
      { id: 'g1p1', name: 'П1', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
      { id: 'g2p1', name: 'П3', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
    ],
    board: { word: 'СЛОВО', revealed: [false, false, false, false, false] },
    turn: { currentPlayerIndex: 0, timer: 15, timerRunning: false, sector: null, drumSpinning: false, phase: 'spin', pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '' },
    gameStatus: 'playing',
    questionVisible: true,
    muted: true,
    volume: 0.8,
    bgMusicEnabled: false,
    bgMusicVolume: 0.4,
  });

  test('App auto-loads playing state from localStorage → shows game board directly', async ({ page }) => {
    // App.tsx calls loadSavedState() on mount, so a playing state causes direct navigation to Game
    await page.goto('/');
    await page.evaluate((state) => localStorage.setItem('pole_chudes_state', state), PLAYING_STATE);
    await page.reload();
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 10_000 });
  });

  test('After auto-load, board has correct cell count (СЛОВО = 5 cells)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((state) => localStorage.setItem('pole_chudes_state', state), PLAYING_STATE);
    await page.reload();
    await page.getByTestId('board').waitFor({ state: 'visible', timeout: 10_000 });
    const cells = await page.locator('[data-testid^="board-cell-"]').count();
    expect(cells).toBe(5);
  });
});
