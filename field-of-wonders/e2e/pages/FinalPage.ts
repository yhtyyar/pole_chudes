import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the Final (results) page.
 */
export class FinalPage {
  readonly page: Page;

  readonly finalPage: Locator;
  readonly winnerCard: Locator;
  readonly newGameBtn: Locator;
  readonly repeatGameBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.finalPage    = page.getByTestId('final-page');
    this.winnerCard   = page.getByTestId('final-winner-card');
    this.newGameBtn   = page.getByTestId('new-game-btn');
    this.repeatGameBtn = page.getByTestId('repeat-game-btn');
  }

  async waitForVisible() {
    await this.finalPage.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async winnerName(): Promise<string> {
    return (await this.winnerCard.locator('p.text-3xl').textContent()) ?? '';
  }

  async winnerScore(): Promise<number> {
    const text = await this.winnerCard.locator('p.text-gold').textContent() ?? '0';
    return parseInt(text.replace(/\D/g, ''), 10);
  }

  async clickNewGame() {
    await this.newGameBtn.click();
  }

  async clickRepeatGame() {
    await this.repeatGameBtn.click();
  }
}
