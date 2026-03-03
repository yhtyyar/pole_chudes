import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';

export function Final() {
  const players = useGameStore((s) => s.players);
  const config = useGameStore((s) => s.config);
  const resetGame = useGameStore((s) => s.resetGame);
  const exportState = useGameStore((s) => s.exportState);

  const finalPlayers = players.filter((p) => p.id.startsWith('final_'));
  const winner = finalPlayers.length > 0
    ? finalPlayers.reduce((best, p) => (p.score > best.score ? p : best), finalPlayers[0])
    : null;

  // Group winners (from qualifying rounds)
  const groupWinners: Array<{ group: number; name: string; groupName: string; score: number }> = [];
  for (let g = 1; g <= 5; g++) {
    const gPlayers = players.filter(
      (p) => p.group === g && !p.id.startsWith('final_')
    );
    if (gPlayers.length > 0) {
      const best = gPlayers.reduce((b, p) => (p.score > b.score ? p : b), gPlayers[0]);
      groupWinners.push({
        group: g,
        name: best.name,
        groupName: config.groups[g - 1] || `Группа ${g}`,
        score: best.score,
      });
    }
  }

  useEffect(() => {
    // Fire confetti
    const duration = 4000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f5c542', '#e94560', '#00d26a', '#ffffff'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f5c542', '#e94560', '#00d26a', '#ffffff'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="relative z-10 text-center max-w-2xl w-full"
      >
        {/* Trophy animation */}
        <motion.div
          animate={{ rotate: [-5, 5, -5], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-6"
        >
          🏆
        </motion.div>

        <h1 className="text-5xl font-bold text-gold mb-2 tracking-wide">
          Поздравляем!
        </h1>
        <p className="text-xl mb-8" style={{ color: 'var(--color-text-muted)' }}>Игра «Поле Чудес» завершена</p>

        {/* Grand winner card */}
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border-2 border-gold rounded-2xl p-8 mb-8 shadow-[0_0_40px_rgba(245,197,66,0.3)]"
            style={{ background: 'rgba(245,197,66,0.1)' }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(245,197,66,0.7)' }}>
              Победитель финала
            </p>
            <p className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>{winner.name}</p>
            <p className="text-gold text-3xl font-bold">{winner.score} очков</p>
          </motion.div>
        )}

        {/* Final word reveal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl p-5 mb-8 border"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Финальное слово</p>
          <p className="text-3xl font-bold text-gold tracking-widest">
            {config.rounds[5]?.word || '—'}
          </p>
        </motion.div>

        {/* Group winners table */}
        {groupWinners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl p-5 mb-8 border"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Победители отборочных туров
            </h3>
            <div className="space-y-2">
              {groupWinners.map((gw, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl border"
                  style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-6" style={{ color: 'var(--color-text-muted)' }}>{gw.group}.</span>
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{gw.groupName}</span>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{gw.name}</span>
                  </div>
                  <span className="text-gold font-bold">{gw.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <button
            onClick={exportState}
            className="px-6 py-3 rounded-xl border font-medium transition-colors hover:opacity-80"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            💾 Сохранить результаты
          </button>
          <button
            onClick={resetGame}
            className="px-8 py-3 rounded-xl bg-accent hover:bg-accent/80 text-white font-bold text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(233,69,96,0.4)] transition-all active:scale-95"
          >
            🔄 Новая игра
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
