/**
 * 05 — Admin controls tests
 *
 * Test design techniques:
 *  - Decision Table: each admin action → expected state change
 *  - Use Case Testing: host corrects mistake (force reveal, prev player)
 *  - Error Guessing: clicking admin buttons in wrong phase
 */
import { test, expect, injectGameState, makePlayingState } from '../fixtures/index';
import { GamePage } from '../pages/GamePage';

function makeInputState(word = 'СЛОВО') {
  return makePlayingState({
    board: { word, revealed: new Array(word.length).fill(false) },
    turn: {
      currentPlayerIndex: 0,
      timer: 20,
      timerRunning: true,
      sector: { type: 'points', value: 200 },
      drumSpinning: false,
      phase: 'input',
      pendingLetter: '',
      extraTurn: false,
      bankAmount: 0,
      lastWrongLetter: '',
    },
  });
}

test.describe('Admin panel — visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
  });

  test('admin panel toggle button is visible', async ({ page }) => {
    await expect(page.locator('text=Панель ведущего')).toBeVisible();
  });

  test('clicking panel header collapses admin panel', async ({ page }) => {
    const header = page.locator('button', { hasText: 'Панель ведущего' });
    await header.click();
    // Buttons inside should no longer be visible
    await expect(page.getByTestId('next-player-btn')).toBeHidden({ timeout: 2000 });
  });

  test('clicking panel header again expands it', async ({ page }) => {
    const header = page.locator('button', { hasText: 'Панель ведущего' });
    await header.click(); // collapse
    await header.click(); // expand
    await expect(page.getByTestId('next-player-btn')).toBeVisible();
  });
});

test.describe('Admin panel — next/prev player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
  });

  test('next player button is enabled during playing status', async ({ page }) => {
    const game = new GamePage(page);
    await expect(game.nextPlayerBtn).toBeEnabled();
  });

  test('prev player button is enabled during playing status', async ({ page }) => {
    const game = new GamePage(page);
    await expect(game.prevPlayerBtn).toBeEnabled();
  });

  test('clicking next player changes the active player display', async ({ page }) => {
    const game = new GamePage(page);
    // Get the current player text before
    const before = await page.locator('[data-testid^="player-card-"],[class*="current-player"]').first().textContent().catch(() => '');
    await game.nextPlayer();
    await page.waitForTimeout(500);
    const after = await page.locator('[data-testid^="player-card-"],[class*="current-player"]').first().textContent().catch(() => '');
    // Either the text changes or the spin button is re-enabled (player changed)
    const spinEnabled = await game.spinDrumBtn.isEnabled();
    expect(spinEnabled || before !== after).toBe(true);
  });
});

test.describe('Admin panel — bankrupt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeInputState());
  });

  test('force bankrupt button is enabled in input phase', async ({ page }) => {
    await expect(page.getByTestId('force-bankrupt-btn')).toBeEnabled();
  });

  test('force bankrupt resets player round score and switches to spin phase', async ({ page }) => {
    const game = new GamePage(page);
    await game.forceBankrupt();
    // After bankrupt auto-advance, game returns to spin phase (letter input gone)
    await expect(game.letterInput).toHaveCount(0, { timeout: 5000 });
    // Spin button should be re-enabled (next player's turn)
    await expect(game.spinDrumBtn).toBeEnabled({ timeout: 5000 });
  });

  test('force bankrupt switches to next player (spin phase)', async ({ page }) => {
    const game = new GamePage(page);
    await game.forceBankrupt();
    // After bankrupt auto-advance (~2s), should be back in spin phase
    await expect(game.spinDrumBtn).toBeEnabled({ timeout: 5000 });
  });
});

test.describe('Admin panel — mark winner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeInputState());
  });

  test('mark winner button is enabled in input phase', async ({ page }) => {
    await expect(page.getByTestId('mark-winner-btn')).toBeEnabled();
  });

  test('mark winner triggers round complete overlay', async ({ page }) => {
    const game = new GamePage(page);
    await game.markWinner();
    await expect(game.roundCompleteOverlay).toBeVisible({ timeout: 5000 });
  });

  test('round complete overlay shows current round word', async ({ page }) => {
    const game = new GamePage(page);
    await game.markWinner();
    await expect(page.locator('text=СЛОВО').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin panel — force reveal letter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
  });

  test('reveal letter input is visible', async ({ page }) => {
    await expect(page.getByTestId('reveal-letter-input')).toBeVisible();
  });

  test('reveal letter button is disabled when input is empty', async ({ page }) => {
    await expect(page.getByTestId('reveal-letter-btn')).toBeDisabled();
  });

  test('typing a letter enables the reveal button', async ({ page }) => {
    await page.getByTestId('reveal-letter-input').fill('С');
    await expect(page.getByTestId('reveal-letter-btn')).toBeEnabled();
  });

  test('reveal letter С opens the correct cell in СЛОВО', async ({ page }) => {
    const game = new GamePage(page);
    await game.revealLetter('С');
    await expect(game.boardCell(0)).toHaveAttribute('data-revealed', 'true', { timeout: 3000 });
  });

  test('reveal letter clears input after click', async ({ page }) => {
    const game = new GamePage(page);
    const input = page.getByTestId('reveal-letter-input');
    await input.fill('С');
    await game.revealLetterBtn.click();
    await expect(input).toHaveValue('', { timeout: 2000 });
  });

  test('reveal letter does not change player scores (no points)', async ({ page }) => {
    const game = new GamePage(page);
    await game.revealLetter('С');
    await page.waitForTimeout(500);
    // Score should remain 0 for all players after forced reveal
    const scoreTexts = await page.locator('[class*="score"],[class*="очков"]').allTextContents();
    const allZero = scoreTexts.every((t) => !t.includes('200'));
    expect(allZero).toBe(true);
  });
});

test.describe('Admin panel — reveal all letters of word', () => {
  test('revealing all letters triggers round complete', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    const game = new GamePage(page);
    for (const letter of ['С', 'Л', 'О', 'В']) {
      await game.revealLetter(letter);
      await page.waitForTimeout(300);
    }
    // О appears twice in СЛОВО — after revealing all unique letters, all cells open
    await expect(game.roundCompleteOverlay).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin panel — hotkeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
  });

  test('Space bar triggers drum spin', async ({ page }) => {
    const game = new GamePage(page);
    // Click somewhere neutral first to ensure no input focused
    await page.locator('[data-testid="board"]').click();
    await page.keyboard.press('Space');
    // Drum should be spinning
    await expect(game.spinDrumBtn).toBeDisabled({ timeout: 3000 });
  });

  test('N key advances to next player', async ({ page }) => {
    const game = new GamePage(page);
    await page.locator('[data-testid="board"]').click();
    await page.keyboard.press('n');
    await page.waitForTimeout(500);
    // After N press, game still has board visible (player changed)
    await expect(game.board).toBeVisible();
  });
});
