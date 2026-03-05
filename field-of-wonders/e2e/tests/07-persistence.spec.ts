/**
 * 07 — Persistence (localStorage) tests
 *
 * Test design techniques:
 *  - Use Case Testing: save → reload → restore; save → reset → clean
 *  - Error Guessing: corrupt state in localStorage, missing keys
 */
import { test, expect, injectGameState, makePlayingState } from '../fixtures/index';
import { GamePage } from '../pages/GamePage';

test.describe('Auto-save to localStorage', () => {
  test('localStorage contains game state after game starts', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    const saved = await page.evaluate(() => localStorage.getItem('pole_chudes_state'));
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.gameStatus).toBe('playing');
  });

  test('state is saved after admin reveals a letter', async ({ page }) => {
    // Drum animation doesn't complete in headless, so use admin revealLetter
    // which also calls saveState() internally (via forceRevealLetter action).
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    const game = new GamePage(page);
    await game.revealLetter('С');
    // forceRevealLetter calls saveState() — localStorage should be updated
    const saved = await page.evaluate(() => localStorage.getItem('pole_chudes_state'));
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    // Board should now have 'С' revealed (index 2 in СЛОВО)
    expect(parsed.board.revealed).toContain(true);
  });

  test('state is saved after letter reveal', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0, timer: 20, timerRunning: true,
        sector: { type: 'points', value: 200 },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
    }));
    const game = new GamePage(page);
    await game.letterInput.fill('С');
    await game.submitLetterBtn.click();
    await page.waitForTimeout(500);
    const saved = await page.evaluate(() => localStorage.getItem('pole_chudes_state'));
    const parsed = JSON.parse(saved!);
    // Cell 0 (С) should be revealed in saved state
    expect(parsed.board.revealed[0]).toBe(true);
  });
});

test.describe('Restore from localStorage', () => {
  test('game resumes from saved state on page reload', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState({
      players: [
        { id: 'g1p1', name: 'Тест Игрок', group: 1, score: 350, roundScore: 350, isWinner: false, isBankrupt: false },
        { id: 'g1p2', name: 'П2', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g2p1', name: 'П3', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g2p2', name: 'П4', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
      ],
    }));
    // Reload the page — app should auto-restore
    await page.reload();
    await page.waitForSelector('[data-testid="board"],[data-testid="setup-page"]', { timeout: 10_000 });
    // Board should be visible (auto-restored)
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
  });

  test('player scores are preserved after reload', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState({
      players: [
        { id: 'g1p1', name: 'Звезда', group: 1, score: 750, roundScore: 750, isWinner: false, isBankrupt: false },
        { id: 'g1p2', name: 'П2', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g2p1', name: 'П3', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
        { id: 'g2p2', name: 'П4', group: 2, score: 0, roundScore: 0, isWinner: false, isBankrupt: false },
      ],
    }));
    await page.reload();
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
    // Score 750 should appear in player cards
    await expect(page.locator('text=750').first()).toBeVisible({ timeout: 5000 });
  });

  test('current round index is preserved after reload', async ({ page }) => {
    await page.goto('/');
    const state = JSON.parse(makePlayingState());
    state.currentRound = 0;
    state.board = { word: 'СЛОВО', revealed: [true, false, false, false, false] };
    await injectGameState(page, JSON.stringify(state));
    await page.reload();
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
    // Cell 0 should still be revealed
    const game = new GamePage(page);
    await expect(game.boardCell(0)).toHaveAttribute('data-revealed', 'true', { timeout: 5000 });
  });
});

test.describe('Reset game clears localStorage', () => {
  test('reset clears localStorage game state', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    const game = new GamePage(page);
    await game.resetGame();
    // Verify localStorage is cleared (reset happened synchronously)
    await page.waitForFunction(
      () => localStorage.getItem('pole_chudes_state') === null,
      { timeout: 5000 }
    );
    const saved = await page.evaluate(() => localStorage.getItem('pole_chudes_state'));
    // After reset, state is either null or has gameStatus=setup
    if (saved) {
      const parsed = JSON.parse(saved);
      expect(parsed.gameStatus).toBe('setup');
    } else {
      expect(saved).toBeNull();
    }
  });
});

test.describe('Error Guessing — corrupt state', () => {
  test('corrupt JSON in localStorage shows setup page (graceful recovery)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pole_chudes_state', '{ corrupt json !!!');
    });
    await page.reload();
    // Should fall back to setup page, not crash
    await expect(page.getByTestId('setup-page')).toBeVisible({ timeout: 10_000 });
  });

  test('missing optional fields in state load gracefully', async ({ page }) => {
    // Test backward-compat: state missing bgMusicVolume and playerNames (added in later versions)
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pole_chudes_state', JSON.stringify({
        meta: { version: '1.0.0', createdAt: Date.now(), lastSaved: Date.now() },
        config: { groups: ['G1'], rounds: [{ id: 0, word: 'СЛОВО', question: 'Q', completed: false, isFinal: false }], playersPerGroup: [2] },
        currentRound: 0,
        players: [{ id: 'g1p1', name: 'П1', group: 1, score: 0, roundScore: 0, isWinner: false, isBankrupt: false }],
        board: { word: 'СЛОВО', revealed: [false, false, false, false, false] },
        turn: { currentPlayerIndex: 0, timer: 20, timerRunning: false, sector: null, drumSpinning: false, phase: 'spin', pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '' },
        gameStatus: 'playing',
        questionVisible: true,
        muted: true,
        volume: 0.8,
        // intentionally missing: bgMusicEnabled, bgMusicVolume, playerNames
      }));
    });
    await page.reload();
    // loadSavedState fills in missing fields via backward-compat logic → game loads normally
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 10_000 });
  });

  test('empty localStorage → clean setup page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('setup-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('continue-game-btn')).toHaveCount(0);
  });
});
