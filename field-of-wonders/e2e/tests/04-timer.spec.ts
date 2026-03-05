/**
 * 04 — Timer tests
 *
 * Test design techniques:
 *  - State Transition: timerRunning=false → running → paused → 0 → auto-advance
 *  - Boundary Value Analysis: timer at 1 (triggers expiry), timer at 20 (max/reset)
 */
import { test, expect, injectGameState, makePlayingState } from '../fixtures/index';
import { GamePage } from '../pages/GamePage';

/** State with timer running in input phase */
function makeTimerRunningState(timer = 20): string {
  return makePlayingState({
    turn: {
      currentPlayerIndex: 0,
      timer,
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

/** State with timer paused (running=false) in input phase */
function makeTimerPausedState(timer = 10): string {
  return makePlayingState({
    turn: {
      currentPlayerIndex: 0,
      timer,
      timerRunning: false,
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

test.describe('Timer — display', () => {
  test('timer shows 20 in spin phase', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    const game = new GamePage(page);
    const value = await game.timerValue();
    expect(value).toBe(20);
  });

  test('timer display is visible in input phase', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerRunningState(12));
    const game = new GamePage(page);
    await expect(game.timerDisplay).toBeVisible();
    const value = await game.timerValue();
    expect(value).toBe(12);
  });

  test('BVA: timer at 1 second is displayed correctly', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerRunningState(1));
    const game = new GamePage(page);
    const value = await game.timerValue();
    expect(value).toBeLessThanOrEqual(1);
  });
});

test.describe('Timer — admin controls (AdminControls panel)', () => {
  test('Pause button stops the timer', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerRunningState(14));
    // Admin controls → Пауза button (timer is running)
    const pauseBtn = page.getByRole('button', { name: /Пауза/i }).first();
    await expect(pauseBtn).toBeVisible({ timeout: 5000 });
    const before = await new GamePage(page).timerValue();
    await pauseBtn.click();
    // After pause, timer should not decrease
    await page.waitForTimeout(1500);
    const after = await new GamePage(page).timerValue();
    // Allow 1 tick difference
    expect(after).toBeGreaterThanOrEqual(before - 1);
  });

  test('Resume button in admin panel re-starts timer from current value', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerPausedState(8));
    // Timer is paused at 8 — resume button visible
    const resumeBtn = page.getByRole('button', { name: /Продолжить/i }).first();
    await expect(resumeBtn).toBeVisible({ timeout: 5000 });
    await resumeBtn.click();
    // Timer should now be counting down from 8
    await page.waitForTimeout(2000);
    const value = await new GamePage(page).timerValue();
    expect(value).toBeLessThan(8);
  });

  test('Reset timer button (↺) resets to 20', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerPausedState(5));
    // Reset button in admin panel
    const resetBtn = page.getByTitle('Сбросить таймер до 20 секунд');
    await expect(resetBtn).toBeVisible({ timeout: 5000 });
    await resetBtn.click();
    const value = await new GamePage(page).timerValue();
    expect(value).toBe(20);
  });

  test('+10 seconds button extends timer by 10', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerPausedState(5));
    const extendBtn = page.getByTitle('Добавить 10 секунд к таймеру');
    await expect(extendBtn).toBeVisible({ timeout: 5000 });
    await extendBtn.click();
    const value = await new GamePage(page).timerValue();
    expect(value).toBe(15); // 5 + 10 = 15
  });

  test('Start timer button runs from 20', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerPausedState(20));
    const startBtn = page.getByTitle('Запустить таймер с 20 секунд');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();
    await page.waitForTimeout(2000);
    const value = await new GamePage(page).timerValue();
    expect(value).toBeLessThan(20);
  });
});

test.describe('Timer — inline controls (Timer component, input phase)', () => {
  test('Pause button in Timer component pauses countdown', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerRunningState(14));
    // Timer component shows ⏸ Пауза when running
    const pauseBtn = page.locator('button', { hasText: 'Пауза' }).first();
    await expect(pauseBtn).toBeVisible({ timeout: 5000 });
    const before = await new GamePage(page).timerValue();
    await pauseBtn.click();
    await page.waitForTimeout(1500);
    const after = await new GamePage(page).timerValue();
    expect(after).toBeGreaterThanOrEqual(before - 1);
  });

  test('Escape key pauses timer', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makeTimerRunningState(14));
    const game = new GamePage(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    const value = await game.timerValue();
    // Should have paused (not gone below 12 with 1.5s elapsed)
    expect(value).toBeGreaterThan(12);
  });
});

test.describe('Timer — expiry behavior', () => {
  test('BVA: timer expires at 0 → spin button becomes enabled again', async ({ page }) => {
    await page.goto('/');
    // Set timer to 1 so it expires quickly
    await injectGameState(page, makeTimerRunningState(1));
    const game = new GamePage(page);
    // Wait for timer to expire (1s tick + 2s auto-advance)
    await page.waitForTimeout(4000);
    // After auto-advance, turn resets to spin phase
    await expect(game.spinDrumBtn).toBeEnabled({ timeout: 5000 });
  });
});
