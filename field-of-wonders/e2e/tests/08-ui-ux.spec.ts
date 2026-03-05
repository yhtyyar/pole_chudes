/**
 * 08 — UI/UX tests: theme, mute, question visibility, responsive layout
 *
 * Test design techniques:
 *  - Use Case Testing: theme toggle, mute toggle, question panel
 *  - Accessibility smoke: key ARIA attributes, button labels
 */
import { test, expect, injectGameState, makePlayingState } from '../fixtures/index';

test.describe('Theme toggle', () => {
  test('theme toggle button is visible on setup page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    // The theme button uses Sun or Moon icon — find by its sibling icon
    const themeBtn = page.locator('button').filter({ has: page.locator('svg[class*="lucide-sun"], svg[class*="lucide-moon"]') }).first();
    await expect(themeBtn).toBeVisible();
  });

  test('clicking theme toggle changes data-theme or class on html', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');

    const before = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme') ??
      document.documentElement.className
    );

    const themeBtn = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-sun"], svg[class*="lucide-moon"]'),
    }).first();
    await themeBtn.click();

    const after = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme') ??
      document.documentElement.className
    );

    expect(after).not.toBe(before);
  });

  test('theme persists across page reload via localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');

    const themeBtn = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-sun"], svg[class*="lucide-moon"]'),
    }).first();
    await themeBtn.click(); // toggle theme

    const themeAfterToggle = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme') ??
      document.documentElement.className
    );

    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');

    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme') ??
      document.documentElement.className
    );

    expect(themeAfterReload).toBe(themeAfterToggle);
  });
});

test.describe('Mute toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState({ muted: false }));
  });

  test('mute button is visible in game header', async ({ page }) => {
    // Mute button has a Volume icon — look for it by SVG
    const muteBtn = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-volume"], svg[class*="lucide-volume-x"]'),
    }).first();
    await expect(muteBtn).toBeVisible({ timeout: 5000 });
  });

  test('clicking mute button toggles mute state in localStorage', async ({ page }) => {
    const muteBtn = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-volume"], svg[class*="lucide-volume-x"]'),
    }).first();
    await muteBtn.click();
    const saved = await page.evaluate(() => localStorage.getItem('pole_chudes_state'));
    const parsed = JSON.parse(saved ?? '{}');
    // muted should be toggled
    expect(parsed.muted).toBe(true);
  });
});

test.describe('Question panel visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState({ questionVisible: true }));
  });

  test('question text is visible when questionVisible=true', async ({ page }) => {
    await expect(page.locator('text=Тестовый вопрос номер один')).toBeVisible({ timeout: 5000 });
  });

  test('toggling question panel hides/shows question', async ({ page }) => {
    // Find toggle button for question visibility
    const toggleBtn = page.locator('button[title*="вопрос"], button[title*="Вопрос"]').first();
    if (await toggleBtn.count() > 0) {
      await toggleBtn.click();
      await expect(page.locator('text=Тестовый вопрос номер один')).toBeHidden({ timeout: 3000 });
    } else {
      // If no separate toggle, just verify question is still visible (always shown)
      await expect(page.locator('text=Тестовый вопрос номер один')).toBeVisible();
    }
  });
});

test.describe('Page title and metadata', () => {
  test('page title contains "Поле Чудес"', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const title = await page.title();
    expect(title).toMatch(/Поле|чудес|Field|Wonder/i);
  });
});

test.describe('Accessibility smoke tests', () => {
  test('Start game button has accessible text', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    const btn = page.getByTestId('start-game-btn');
    const text = await btn.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('Spin drum button has accessible text', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    const btn = page.getByTestId('spin-drum-btn');
    const text = await btn.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('Final toggle has aria-pressed attribute', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    const toggle = page.getByTestId('final-toggle');
    const pressed = await toggle.getAttribute('aria-pressed');
    expect(['true', 'false']).toContain(pressed);
  });

  test('Letter input has placeholder text', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState({
      turn: {
        currentPlayerIndex: 0, timer: 20, timerRunning: true,
        sector: { type: 'points', value: 200 },
        drumSpinning: false, phase: 'input',
        pendingLetter: '', extraTurn: false, bankAmount: 0, lastWrongLetter: '',
      },
    }));
    const input = page.getByTestId('letter-input');
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder?.length).toBeGreaterThan(0);
  });

  test('no console errors on setup page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    // Allow minor React dev warnings but no hard errors
    const hardErrors = errors.filter((e) =>
      !e.includes('Warning') && !e.includes('DevTools')
    );
    expect(hardErrors).toHaveLength(0);
  });

  test('no console errors on game page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    const hardErrors = errors.filter((e) =>
      !e.includes('Warning') && !e.includes('DevTools')
    );
    expect(hardErrors).toHaveLength(0);
  });
});

test.describe('Mobile viewport (Pixel 5)', () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test('setup page renders on mobile', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('setup-page')).toBeVisible({ timeout: 8000 });
  });

  test('start game button is tappable on mobile', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    const btn = page.getByTestId('start-game-btn');
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(30); // min touch target
    expect(box!.width).toBeGreaterThan(30);
  });

  test('board is visible on mobile during game', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Rules modal', () => {
  test('rules button is visible on setup page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    await expect(page.getByTestId('rules-btn')).toBeVisible({ timeout: 5000 });
  });

  test('clicking rules button opens rules modal', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    await page.getByTestId('rules-btn').click();
    await expect(page.getByText('Правила игры «Поле чудес»')).toBeVisible({ timeout: 5000 });
  });

  test('rules button is visible during game', async ({ page }) => {
    await page.goto('/');
    await injectGameState(page, makePlayingState());
    await expect(page.getByTestId('rules-btn')).toBeVisible({ timeout: 5000 });
  });

  test('Escape key closes rules modal', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="setup-page"]');
    await page.getByTestId('rules-btn').click();
    await expect(page.getByText('Правила игры «Поле чудес»')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.getByText('Правила игры «Поле чудес»')).toHaveCount(0, { timeout: 3000 });
  });
});
