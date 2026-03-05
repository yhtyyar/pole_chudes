import { test as base } from '@playwright/test';
import { SetupPage } from '../pages/SetupPage';
import { GamePage }  from '../pages/GamePage';
import { FinalPage } from '../pages/FinalPage';
import {
  gotoPlayingGame,
  gotoInputPhase,
  makePlayingState,
  makeInputPhaseState,
  makeAlmostWonState,
  makeRoundCompleteState,
  makeGameCompleteState,
  injectGameState,
  resetToSetup,
} from '../helpers/gameHelpers';

/**
 * Extended fixture type that exposes page-object models and
 * convenience state-injection helpers.
 */
type GameFixtures = {
  setupPage: SetupPage;
  gamePage:  GamePage;
  finalPage: FinalPage;

  /** Navigate to / with clean localStorage, load setup page */
  freshSetup: SetupPage;
  /** Navigate and inject a running game (spin phase) */
  playingGame: GamePage;
  /** Navigate and inject input-phase state (letter guessing) */
  inputPhase: GamePage;
};

export const test = base.extend<GameFixtures>({
  setupPage: async ({ page }, use) => {
    await use(new SetupPage(page));
  },

  gamePage: async ({ page }, use) => {
    await use(new GamePage(page));
  },

  finalPage: async ({ page }, use) => {
    await use(new FinalPage(page));
  },

  freshSetup: async ({ page }, use) => {
    await resetToSetup(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await use(new SetupPage(page));
  },

  playingGame: async ({ page }, use) => {
    await page.goto('/');
    await gotoPlayingGame(page);
    await use(new GamePage(page));
  },

  inputPhase: async ({ page }, use) => {
    await page.goto('/');
    await gotoInputPhase(page, 'СЛОВО', 200);
    await use(new GamePage(page));
  },
});

export { expect } from '@playwright/test';

export {
  makePlayingState,
  makeInputPhaseState,
  makeAlmostWonState,
  makeRoundCompleteState,
  makeGameCompleteState,
  injectGameState,
  resetToSetup,
  gotoPlayingGame,
  gotoInputPhase,
};
