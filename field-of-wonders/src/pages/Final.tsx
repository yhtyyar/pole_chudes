import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Trophy, Medal, RefreshCw, RotateCcw, Download, Star } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { loadAllTimeTop, saveGameResults } from '../utils/gameHistory';
import type { GameTopEntry } from '../types';
import type { HistoryEntry } from '../utils/gameHistory';

const MEDAL_COLORS = ['#f5c542', '#b0b8c4', '#cd7f32'];
const PLACE_LABELS = ['🥇', '🥈', '🥉'];

export function Final() {
  const players      = useGameStore((s) => s.players);
  const config       = useGameStore((s) => s.config);
  const resetGame    = useGameStore((s) => s.resetGame);
  const restartGame  = useGameStore((s) => s.restartGame);
  const exportState  = useGameStore((s) => s.exportState);

  const [allTimeTop, setAllTimeTop] = useState<HistoryEntry[]>([]);

  // ── Build full TOP across all non-final players (sorted by total score) ──
  // Only include players whose name was actually set (not the default 'Игрок N' pattern)
  const DEFAULT_NAME_RE = /^Игрок\s+\d+$/i;
  const allRegularPlayers = players.filter(
    (p) => !p.id.startsWith('final_') && !DEFAULT_NAME_RE.test(p.name.trim())
  );
  const topEntries: GameTopEntry[] = allRegularPlayers
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      totalScore: p.score,
      groupName: config.groups[p.group - 1] || `Группа ${p.group}`,
      roundsWon: p.isWinner ? 1 : 0,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  // ── Final round players ──
  const finalPlayers = players.filter((p) => p.id.startsWith('final_'));
  // Prefer the player explicitly marked isWinner; fall back to highest scorer
  const finalWinner = finalPlayers.length > 0
    ? (finalPlayers.find((p) => p.isWinner) ?? finalPlayers.reduce((best, p) => (p.score > best.score ? p : best), finalPlayers[0]))
    : null;

  // Resolve final winner's original group name
  const finalWinnerGroupName = (() => {
    if (!finalWinner) return '';
    // final_ players have id = `final_<original_id>` e.g. final_g2p3
    const originalId = finalWinner.id.replace(/^final_/, '');
    const original = players.find((p) => p.id === originalId);
    if (original) return config.groups[original.group - 1] || `Группа ${original.group}`;
    return '';
  })();

  // ── Find final round word dynamically (not hardcoded index 5) ──
  const finalRoundWord = config.rounds.find((r) => r.isFinal)?.word
    ?? config.rounds[config.rounds.length - 1]?.word
    ?? '—';

  useEffect(() => {
    // Persist results to history on mount (handles cases where game ended via
    // forceRevealLetter or other paths that didn't call saveGameResults yet)
    if (topEntries.length > 0) {
      saveGameResults(topEntries);
    }
    // Refresh all-time top after saving
    setAllTimeTop(loadAllTimeTop(20));

    // Confetti
    const duration = 5000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#f5c542', '#e94560', '#00d26a', '#fff'] });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#f5c542', '#e94560', '#00d26a', '#fff'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="final-page"
      className="min-h-screen flex flex-col items-center p-6 lg:p-10 relative overflow-hidden"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gold/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-accent/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative z-10 w-full max-w-3xl"
      >
        {/* ── Header ── */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [-5, 5, -5], scale: [1, 1.06, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-7xl mb-4 inline-block"
          >
            🏆
          </motion.div>
          <h1 className="text-4xl font-bold text-gold mb-1 tracking-wide">Поздравляем!</h1>
          <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>Игра «Поле Чудес» завершена</p>
        </div>

        {/* ── Grand winner card ── */}
        {finalWinner && (
          <motion.div
            data-testid="final-winner-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border-2 border-gold rounded-2xl p-6 mb-6 text-center shadow-[0_0_40px_rgba(245,197,66,0.25)]"
            style={{ background: 'rgba(245,197,66,0.08)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(245,197,66,0.7)' }}>
              Победитель финала
            </p>
            <p className="text-3xl font-bold mb-1">{finalWinner.name}</p>
            <p className="text-gold text-2xl font-bold">{finalWinner.score} очков</p>
            {finalWinnerGroupName && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {finalWinnerGroupName}
              </p>
            )}
          </motion.div>
        )}

        {/* ── Final word ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl px-5 py-3 mb-6 border flex items-center justify-between"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Финальное слово</span>
          <span className="text-xl font-bold text-gold tracking-widest">{finalRoundWord}</span>
        </motion.div>

        {/* ── Full TOP scoreboard ── */}
        {topEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border mb-6 overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2 border-b"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <Trophy className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--color-text)' }}>
                Итоговый рейтинг — все участники
              </h3>
            </div>
            <div style={{ background: 'var(--color-panel)' }}>
              {topEntries.map((entry, i) => {
                const isTop3 = i < 3;
                const medalColor = MEDAL_COLORS[i] ?? 'var(--color-text-muted)';
                return (
                  <motion.div
                    key={entry.playerId}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.04 }}
                    className="flex items-center justify-between px-5 py-3 border-b last:border-b-0"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: isTop3 ? `${medalColor}0d` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg w-7 flex-shrink-0 text-center">
                        {i < 3 ? PLACE_LABELS[i] : (
                          <span className="text-sm font-bold" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p
                          className="font-semibold truncate"
                          style={{ color: isTop3 ? medalColor : 'var(--color-text)' }}
                        >
                          {entry.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {entry.groupName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {entry.roundsWon > 0 && (
                        <span className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-gold/15 text-gold">
                          <Medal className="w-3 h-3" /> победитель
                        </span>
                      )}
                      <span
                        className="text-base font-black tabular-nums"
                        style={{ color: isTop3 ? medalColor : 'var(--color-text)' }}
                      >
                        {entry.totalScore}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── All-time TOP leaderboard ── */}
        {allTimeTop.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="rounded-2xl border mb-6 overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2 border-b"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <Star className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--color-text)' }}>
                Зал Славы — лучшие за все игры
              </h3>
            </div>
            <div style={{ background: 'var(--color-panel)' }}>
              {allTimeTop.map((entry, i) => {
                const isTop3 = i < 3;
                const medalColor = MEDAL_COLORS[i] ?? 'var(--color-text-muted)';
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.03 }}
                    className="flex items-center justify-between px-5 py-2.5 border-b last:border-b-0"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: isTop3 ? `${medalColor}0d` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg w-7 flex-shrink-0 text-center">
                        {i < 3 ? PLACE_LABELS[i] : (
                          <span className="text-sm font-bold" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p
                          className="font-semibold truncate text-sm"
                          style={{ color: isTop3 ? medalColor : 'var(--color-text)' }}
                        >
                          {entry.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {entry.groupName}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-base font-black tabular-nums flex-shrink-0"
                      style={{ color: isTop3 ? medalColor : 'var(--color-text)' }}
                    >
                      {entry.score}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex gap-3 justify-center flex-wrap"
        >
          <button
            onClick={exportState}
            className="px-5 py-2.5 rounded-xl border font-medium text-sm transition-all hover:opacity-80 flex items-center gap-2"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            <Download className="w-4 h-4" /> Сохранить результаты
          </button>
          <button
            data-testid="repeat-game-btn"
            onClick={restartGame}
            className="px-6 py-2.5 rounded-xl border-2 border-gold/50 bg-gold/10 text-gold font-bold text-sm transition-all hover:bg-gold/20 active:scale-95 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Повторить игру
          </button>
          <button
            data-testid="new-game-btn"
            onClick={resetGame}
            className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent/80 text-white font-bold text-sm uppercase tracking-wider shadow-[0_0_16px_rgba(233,69,96,0.35)] transition-all active:scale-95 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Новая игра
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
