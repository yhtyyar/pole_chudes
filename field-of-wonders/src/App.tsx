import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './stores/gameStore';
import { Setup } from './pages/Setup';
import { Game } from './pages/Game';
import { Final } from './pages/Final';

function App() {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const loadSavedState = useGameStore((s) => s.loadSavedState);

  // On mount, try to restore saved state
  useEffect(() => {
    loadSavedState();
  }, [loadSavedState]);

  return (
    <AnimatePresence mode="wait">
      {gameStatus === 'setup' && (
        <motion.div
          key="setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Setup />
        </motion.div>
      )}
      {(gameStatus === 'playing' || gameStatus === 'roundComplete' || gameStatus === 'final') && (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Game />
        </motion.div>
      )}
      {gameStatus === 'gameComplete' && (
        <motion.div
          key="final"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Final />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
