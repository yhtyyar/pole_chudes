import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { resumeAudio } from '../utils/sounds';

export function useHotkeys() {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const turn = useGameStore((s) => s.turn);
  const spinDrumAction = useGameStore((s) => s.spinDrumAction);
  const submitLetter = useGameStore((s) => s.submitLetter);
  const pauseTimer = useGameStore((s) => s.pauseTimer);
  const resumeTimer = useGameStore((s) => s.resumeTimer);
  const nextPlayer = useGameStore((s) => s.nextPlayer);

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      resumeAudio();

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (turn.phase === 'spin' && !turn.drumSpinning) {
            // Dispatch custom event — Drum component listens and runs its full handleSpin
            window.dispatchEvent(new CustomEvent('drum:spin'));
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (turn.phase === 'input' && turn.pendingLetter) submitLetter();
          break;
        case 'Escape':
          e.preventDefault();
          if (turn.timerRunning) pauseTimer();
          else if (!turn.timerRunning && turn.timer < 15) resumeTimer();
          break;
        case 'KeyN':
          e.preventDefault();
          nextPlayer();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameStatus, turn, spinDrumAction, submitLetter, pauseTimer, resumeTimer, nextPlayer]);
}
