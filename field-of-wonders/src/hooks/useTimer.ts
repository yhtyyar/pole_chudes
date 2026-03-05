import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

export function useTimer() {
  const timerRunning = useGameStore((s) => s.turn.timerRunning);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const tickTimer = useGameStore((s) => s.tickTimer);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning && (gameStatus === 'playing' || gameStatus === 'final')) {
      intervalRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerRunning, gameStatus, tickTimer]);
}
