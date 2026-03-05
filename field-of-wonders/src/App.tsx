import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './stores/gameStore';
import { Setup } from './pages/Setup';
import { Game } from './pages/Game';
import { Final } from './pages/Final';
import { RulesModal, RulesButton } from './components/Rules/RulesModal';

function App() {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const loadSavedState = useGameStore((s) => s.loadSavedState);
  const [rulesOpen, setRulesOpen] = useState(false);
  const closeRules = useCallback(() => setRulesOpen(false), []);

  // On mount, try to restore saved state
  useEffect(() => {
    loadSavedState();
  }, [loadSavedState]);

  // Global '?' hotkey to open rules
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '?' || e.key === '/') setRulesOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Floating rules button — always visible */}
      <div className="fixed bottom-4 right-4 z-[9000]">
        <RulesButton onClick={() => setRulesOpen(true)} />
      </div>

      {/* Global rules modal */}
      <RulesModal open={rulesOpen} onClose={closeRules} />

      {/* Page transitions — mode='sync' prevents blank flash between pages */}
      <AnimatePresence mode="sync">
        {gameStatus === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
            transition={{ duration: 0.2 }}
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
            transition={{ duration: 0.2 }}
          >
            <Final />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
