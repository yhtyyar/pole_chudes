import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the Game page.
 * Covers board, drum, timer, letter input, admin controls, and modals.
 */
export class GamePage {
  readonly page: Page;

  // Board
  readonly board: Locator;

  // Drum
  readonly spinDrumBtn: Locator;
  readonly drumResult: Locator;

  // Letter input
  readonly letterInput: Locator;
  readonly submitLetterBtn: Locator;
  readonly wordInput: Locator;
  readonly submitWordBtn: Locator;

  // Timer
  readonly timerDisplay: Locator;

  // Admin controls
  readonly nextPlayerBtn: Locator;
  readonly prevPlayerBtn: Locator;
  readonly forceBankruptBtn: Locator;
  readonly markWinnerBtn: Locator;
  readonly revealLetterInput: Locator;
  readonly revealLetterBtn: Locator;

  // Header buttons
  readonly resetGameBtn: Locator;

  // Modals
  readonly confirmResetBtn: Locator;
  readonly confirmRestartBtn: Locator;
  readonly roundCompleteOverlay: Locator;
  readonly nextRoundBtn: Locator;
  readonly startFinalBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.board         = page.getByTestId('board');
    this.spinDrumBtn   = page.getByTestId('spin-drum-btn');
    this.drumResult    = page.getByTestId('drum-result');

    this.letterInput     = page.getByTestId('letter-input');
    this.submitLetterBtn = page.getByTestId('submit-letter-btn');
    this.wordInput       = page.getByTestId('word-input');
    this.submitWordBtn   = page.getByTestId('submit-word-btn');

    this.timerDisplay = page.getByTestId('timer-display');

    this.nextPlayerBtn    = page.getByTestId('next-player-btn');
    this.prevPlayerBtn    = page.getByTestId('prev-player-btn');
    this.forceBankruptBtn = page.getByTestId('force-bankrupt-btn');
    this.markWinnerBtn    = page.getByTestId('mark-winner-btn');
    this.revealLetterInput = page.getByTestId('reveal-letter-input');
    this.revealLetterBtn   = page.getByTestId('reveal-letter-btn');

    this.resetGameBtn   = page.getByTestId('reset-game-btn');

    this.confirmResetBtn   = page.getByTestId('confirm-reset-btn');
    this.confirmRestartBtn = page.getByTestId('confirm-restart-btn');
    this.roundCompleteOverlay = page.getByTestId('round-complete-overlay');
    this.nextRoundBtn  = page.getByTestId('next-round-btn');
    this.startFinalBtn = page.getByTestId('start-final-btn');
  }

  /** Board cell at position i (0-indexed) */
  boardCell(i: number): Locator {
    return this.page.getByTestId(`board-cell-${i}`);
  }

  /** Returns true when cell at index i is revealed */
  async isCellRevealed(i: number): Promise<boolean> {
    const revealed = await this.boardCell(i).getAttribute('data-revealed');
    return revealed === 'true';
  }

  /** Count of revealed cells on the board */
  async revealedCount(): Promise<number> {
    const cells = await this.board.locator('[data-testid^="board-cell-"]').all();
    let count = 0;
    for (const cell of cells) {
      if ((await cell.getAttribute('data-revealed')) === 'true') count++;
    }
    return count;
  }

  /** Total cell count = word length */
  async totalCells(): Promise<number> {
    return this.board.locator('[data-testid^="board-cell-"]').count();
  }

  /**
   * Spin the drum and wait for it to stop.
   * Returns 'input' when a points/extra/bank/double/prize sector was landed,
   * or 'spin' when bankrupt auto-advance has completed.
   */
  async spinAndWait(timeoutMs = 12000): Promise<'input' | 'spin'> {
    await this.spinDrumBtn.click();
    // Step 1: wait for spin to START (React re-renders → button disabled)
    // Without this, the next waitForFunction might poll before React updates the DOM
    await this.page.waitForFunction(
      () => {
        const spinBtn = document.querySelector('[data-testid="spin-drum-btn"]') as HTMLButtonElement | null;
        return spinBtn !== null && spinBtn.disabled;
      },
      { timeout: 3000 }
    );
    // Step 2: wait for spin to END (letter input appears OR spin button re-enables)
    // Drum animation: ~3.2s spin + ~1.8s fullscreen close + optional ~2s bankrupt delay
    await this.page.waitForFunction(
      () => {
        const spinBtn = document.querySelector('[data-testid="spin-drum-btn"]') as HTMLButtonElement | null;
        const letterInput = document.querySelector('[data-testid="letter-input"]');
        return letterInput !== null || (spinBtn !== null && !spinBtn.disabled);
      },
      { timeout: timeoutMs }
    );
    const letterVisible = await this.letterInput.count() > 0;
    return letterVisible ? 'input' : 'spin';
  }

  /** Type a letter and click submit */
  async submitLetter(letter: string) {
    await this.letterInput.fill(letter);
    await this.submitLetterBtn.click();
  }

  /** Switch to word mode and submit a full word */
  async submitWord(word: string) {
    await this.page.getByText('Всё слово').click();
    await this.wordInput.fill(word);
    await this.submitWordBtn.click();
  }

  /** Reveal a letter via admin panel */
  async revealLetter(letter: string) {
    await this.revealLetterInput.fill(letter);
    await this.revealLetterBtn.click();
  }

  /** Force bankrupt via admin panel and wait for player rotation */
  async forceBankrupt() {
    await this.forceBankruptBtn.click();
  }

  /** Click next player in admin panel */
  async nextPlayer() {
    await this.nextPlayerBtn.click();
  }

  /** Click mark winner in admin panel */
  async markWinner() {
    await this.markWinnerBtn.click();
  }

  /** Read timer value from display */
  async timerValue(): Promise<number> {
    const text = await this.timerDisplay.textContent();
    return parseInt(text ?? '0', 10);
  }

  /** Click reset game → confirm */
  async resetGame() {
    await this.resetGameBtn.click();
    await this.confirmResetBtn.waitFor({ state: 'visible' });
    await this.confirmResetBtn.click();
  }

  /**
   * Fast path: sets the game state via localStorage to the given partial state
   * and reloads. Useful to skip setup for specific game-state tests.
   */
  async loadStateFromLocalStorage(stateJson: string) {
    await this.page.evaluate((json) => {
      localStorage.setItem('pole_chudes_state', json);
    }, stateJson);
    await this.page.reload();
  }
}
