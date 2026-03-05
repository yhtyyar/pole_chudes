import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the Setup (configuration) page.
 * Encapsulates all selectors and interactions for the game setup screen.
 */
export class SetupPage {
  readonly page: Page;

  // Header
  readonly continueGameBtn: Locator;
  readonly themeToggle: Locator;

  // Groups
  readonly addGroupBtn: Locator;

  // Rounds
  readonly addRoundBtn: Locator;
  readonly finalToggle: Locator;

  // Footer
  readonly startGameBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.continueGameBtn = page.getByTestId('continue-game-btn');
    this.themeToggle     = page.locator('button[title*="тема"], button[title*="тём"], button[title*="свет"]').first();

    this.addGroupBtn = page.getByTestId('add-group-btn');
    this.addRoundBtn = page.getByTestId('add-round-btn');
    this.finalToggle = page.getByTestId('final-toggle');

    this.startGameBtn = page.getByTestId('start-game-btn');
  }

  async goto() {
    await this.page.goto('/');
  }

  /** Clear localStorage and navigate fresh */
  async gotoFresh() {
    await this.page.goto('/');
    await this.page.evaluate(() => localStorage.clear());
    await this.page.reload();
  }

  /** Group name input at position i (0-indexed) */
  groupNameInput(i: number): Locator {
    return this.page.getByTestId(`group-name-input-${i}`);
  }

  /** Remove group button at position i */
  removeGroupBtn(i: number): Locator {
    return this.page.getByTestId(`remove-group-btn-${i}`);
  }

  /** Round word input at position i */
  roundWordInput(i: number): Locator {
    return this.page.getByTestId(`round-word-input-${i}`);
  }

  /** Round question textarea at position i */
  roundQuestionInput(i: number): Locator {
    return this.page.getByTestId(`round-question-input-${i}`);
  }

  /** Remove round button at position i */
  removeRoundBtn(i: number): Locator {
    return this.page.getByTestId(`remove-round-btn-${i}`);
  }

  /** Final round word input */
  get finalWordInput(): Locator {
    return this.page.getByTestId('final-word-input');
  }

  /** Final round question input */
  get finalQuestionInput(): Locator {
    return this.page.getByTestId('final-question-input');
  }

  /**
   * Fill the minimal setup form needed to start a single-round game.
   * @param word       Cyrillic word (3-15 letters)
   * @param question   Question text (min 5 chars)
   */
  async fillMinimalForm(word: string, question: string) {
    await this.roundWordInput(0).fill(word);
    await this.roundQuestionInput(0).fill(question);
  }

  /**
   * Fill a multi-round form. Rounds array items with empty word are left blank (skipped).
   */
  async fillRounds(rounds: Array<{ word: string; question: string }>) {
    for (let i = 0; i < rounds.length; i++) {
      if (rounds[i].word) {
        await this.roundWordInput(i).fill(rounds[i].word);
        await this.roundQuestionInput(i).fill(rounds[i].question);
      }
    }
  }

  /** Enable and fill the final round */
  async fillFinalRound(word: string, question: string) {
    // Toggle ON if not yet active (aria-pressed = false)
    const pressed = await this.finalToggle.getAttribute('aria-pressed');
    if (pressed === 'false') {
      await this.finalToggle.click();
    }
    await this.finalWordInput.fill(word);
    await this.finalQuestionInput.fill(question);
  }

  /** Click Start and wait for game page */
  async startGame() {
    await this.startGameBtn.click();
  }

  /** Validation error message for a round word */
  roundWordError(i: number): Locator {
    return this.page.locator(`[data-testid="round-word-input-${i}"] ~ p.text-error`);
  }

  /** Count of visible group name inputs */
  async groupCount(): Promise<number> {
    return this.page.locator('[data-testid^="group-name-input-"]').count();
  }

  /** Count of visible round word inputs */
  async roundCount(): Promise<number> {
    return this.page.locator('[data-testid^="round-word-input-"]').count();
  }
}
