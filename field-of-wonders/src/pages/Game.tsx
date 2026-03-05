import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Volume2, VolumeX, Download, FileText, X, Trophy, RotateCcw, Play, PartyPopper, Skull, Pencil, Check, RefreshCw, Music, AlertCircle } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { Board } from '../components/Board/Board';
import { Drum } from '../components/Drum/Drum';
import { Timer } from '../components/Timer/Timer';
import { Question } from '../components/Question/Question';
import { LetterInput } from '../components/Controls/LetterInput';
import { AdminControls } from '../components/Controls/AdminControls';
import { useTimer } from '../hooks/useTimer';
import { useHotkeys } from '../hooks/useHotkeys';
import { resumeAudio } from '../utils/sounds';
import { useTheme } from '../context/ThemeContext';
import { downloadLog, saveLogToFile } from '../utils/gameLogger';

export function Game() {
  useTimer();
  useHotkeys();

  const { theme, toggle: toggleTheme } = useTheme();

  const gameStatus    = useGameStore((s) => s.gameStatus);
  const currentRound  = useGameStore((s) => s.currentRound);
  const config        = useGameStore((s) => s.config);
  const players       = useGameStore((s) => s.players);
  const turn          = useGameStore((s) => s.turn);
  const muted         = useGameStore((s) => s.muted);
  const volume        = useGameStore((s) => s.volume);
  const toggleMute    = useGameStore((s) => s.toggleMute);
  const setVolume     = useGameStore((s) => s.setVolume);
  const startNextRound   = useGameStore((s) => s.startNextRound);
  const startFinal       = useGameStore((s) => s.startFinal);
  const exportState      = useGameStore((s) => s.exportState);
  const resetGame        = useGameStore((s) => s.resetGame);
  const restartGame      = useGameStore((s) => s.restartGame);
  const updatePlayerName = useGameStore((s) => s.updatePlayerName);
  const bgMusicEnabled   = useGameStore((s) => s.bgMusicEnabled);
  const bgMusicVolume    = useGameStore((s) => s.bgMusicVolume);
  const toggleBgMusic    = useGameStore((s) => s.toggleBgMusic);
  const setBgMusicVol    = useGameStore((s) => s.setBgMusicVolume);

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const isFinal        = gameStatus === 'final' || config.rounds[currentRound]?.isFinal;
  const isRoundComplete = gameStatus === 'roundComplete';

  // Dynamic round counts (exclude final round)
  const finalRoundIndex = config.rounds.reduce((fi, r, i) => (r.isFinal ? i : fi), config.rounds.length - 1);
  const isLastRegularRound = !isFinal && currentRound === finalRoundIndex - 1;
  const hasFinalRound = config.rounds.some((r) => r.isFinal);

  const lastWrongLetter = turn.lastWrongLetter;

  const roundPlayers = isFinal
    ? players.filter((p) => p.id.startsWith('final_'))
    : players.filter((p) => p.group === currentRound + 1 && !p.id.startsWith('final_'));

  const currentPlayer = roundPlayers[turn.currentPlayerIndex];

  const isLight = theme === 'light';

  useEffect(() => {
    const handler = () => resumeAudio();
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col select-none"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <header
        className="border-b px-4 py-2 flex flex-col gap-0"
        style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
      >
        {/* Top row: title + controls */}
        <div className="flex items-center justify-between">
          {/* Left: title + round badge */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-extrabold text-gold whitespace-nowrap flex items-center gap-1.5">
              <RotateCcw className="w-5 h-5" />
              Поле Чудес
            </h1>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                isFinal
                  ? 'bg-gold/20 text-gold border-gold/40'
                  : 'bg-accent/20 text-accent border-accent/40'
              }`}
            >
              {isFinal ? (
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3" /> ФИНАЛ
              </span>
            ) : (`Раунд ${currentRound + 1}/5`)}
            </span>
            {!isFinal && (
              <span className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                {config.groups[currentRound] || `Группа ${currentRound + 1}`}
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isLight ? 'Переключить в тёмную тему' : 'Переключить в светлую тему'}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                background: isLight ? '#f5c542' : '#1e293b',
                border: '2px solid',
                borderColor: isLight ? '#d97706' : '#334155',
                boxShadow: isLight
                  ? '0 0 12px rgba(245,197,66,0.5)'
                  : '0 0 12px rgba(99,102,241,0.4)',
              }}
            >
              <span className="w-5 h-5">{isLight ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</span>
            </button>

            {/* Mute + volume */}
            <button
              onClick={toggleMute}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-80 text-lg"
              style={{ background: 'var(--color-card)' }}
              title={muted ? 'Включить звук' : 'Выключить звук'}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05" value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-accent"
            />

            <button
              onClick={exportState}
              title="Бэкап состояния игры"
              className="text-sm px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)' }}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => { saveLogToFile(); downloadLog(); }}
              title="Скачать лог игры (game.log)"
              className="text-sm px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)' }}
            >
              <FileText className="w-4 h-4" />
            </button>
            {/* Bg music */}
            <button
              onClick={toggleBgMusic}
              title={bgMusicEnabled ? 'Выключить фоновую музыку' : 'Включить фоновую музыку'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                bgMusicEnabled ? 'text-gold' : 'hover:opacity-80'
              }`}
              style={{ background: bgMusicEnabled ? 'rgba(245,197,66,0.15)' : 'var(--color-card)', color: bgMusicEnabled ? '#f5c542' : 'var(--color-text-muted)' }}
            >
              <Music className="w-4 h-4" />
            </button>
            {bgMusicEnabled && (
              <input
                type="range" min="0.05" max="0.8" step="0.05"
                value={bgMusicVolume}
                onChange={(e) => setBgMusicVol(parseFloat(e.target.value))}
                className="w-16 accent-gold"
                title="Громкость музыки"
              />
            )}

            {/* Restart (keep config) */}
            <button
              onClick={() => setShowRestartModal(true)}
              title="Перезапустить игру (сохранить слова)"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:text-gold"
              style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)' }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Full reset */}
            <button
              onClick={() => setShowResetModal(true)}
              title="Сбросить игру"
              className="text-sm px-2.5 py-1.5 rounded-lg transition-colors hover:text-error"
              style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Player score cards ── */}
        <div className="flex items-stretch gap-2 pt-2 pb-1 overflow-x-auto min-h-[76px]">
          {roundPlayers.map((player, idx) => {
            const isActive = idx === turn.currentPlayerIndex && gameStatus === 'playing';
            const isBankrupt = player.isBankrupt;
            const isEditing = editingPlayerId === player.id;

            return (
              <motion.div
                key={player.id}
                layout
                className="relative flex flex-col justify-between px-3 py-2 rounded-xl border flex-shrink-0 transition-all duration-300 overflow-hidden"
                style={{
                  minWidth: Math.max(110, player.name.length * 9 + 56),
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(233,69,96,0.28) 0%, rgba(233,69,96,0.18) 100%)'
                    : isBankrupt
                    ? 'rgba(239,68,68,0.15)'
                    : 'var(--color-card)',
                  borderColor: isActive
                    ? '#e94560'
                    : isBankrupt
                    ? 'rgba(239,68,68,0.5)'
                    : 'var(--color-border)',
                  boxShadow: isActive
                    ? '0 0 16px rgba(233,69,96,0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : undefined,
                }}
              >
                {/* Top: number badge + name (editable) */}
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: isActive ? '#e94560' : isBankrupt ? '#ef4444' : 'rgba(255,255,255,0.12)',
                      color: '#fff',
                    }}
                  >
                    {idx + 1}
                  </div>
                  {isEditing ? (
                    <input
                      autoFocus
                      className="text-xs font-bold rounded px-1 py-0.5 outline-none border w-full"
                      style={{ background: 'var(--color-panel)', borderColor: '#e94560', color: 'var(--color-text)', minWidth: 60, maxWidth: 120 }}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { updatePlayerName(player.id, editingName); setEditingPlayerId(null); }
                        if (e.key === 'Escape') setEditingPlayerId(null);
                      }}
                      onBlur={() => { updatePlayerName(player.id, editingName); setEditingPlayerId(null); }}
                      maxLength={20}
                    />
                  ) : (
                    <span
                      className="text-xs font-bold leading-tight whitespace-nowrap cursor-pointer hover:underline"
                      style={{ color: 'var(--color-text)' }}
                      title="Нажмите для редактирования имени"
                      onClick={() => { setEditingPlayerId(player.id); setEditingName(player.name); }}
                    >
                      {player.name}
                    </span>
                  )}
                  {!isEditing && (
                    <button
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { setEditingPlayerId(player.id); setEditingName(player.name); }}
                      title="Редактировать имя"
                    >
                      <Pencil className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                  )}
                  {isEditing && (
                    <button
                      className="flex-shrink-0"
                      onClick={() => { updatePlayerName(player.id, editingName); setEditingPlayerId(null); }}
                    >
                      <Check className="w-3 h-3 text-success" />
                    </button>
                  )}
                </div>

                {/* Bottom: score */}
                <div className="flex items-end justify-between gap-1">
                  <span
                    className="text-base font-black tabular-nums leading-none"
                    style={{ color: isBankrupt ? '#ef4444' : '#f5c542' }}
                  >
                    {isBankrupt ? <Skull className="w-5 h-5" /> : player.score}
                  </span>
                  {!isBankrupt && (
                    <span
                      className="text-xs font-semibold leading-none"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      оч.
                    </span>
                  )}
                  {player.roundScore > 0 && (
                    <span
                      className="text-xs font-bold text-success leading-none flex-shrink-0 cursor-help"
                      title={`+${player.roundScore} очков за текущий раунд`}
                    >
                      +{player.roundScore}
                    </span>
                  )}
                </div>

                {/* Active indicator bar */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl"
                    style={{ background: '#e94560' }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left panel: Letter input + Admin */}
        <aside
          className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r flex flex-col gap-3 p-4 overflow-y-auto flex-shrink-0"
          style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
        >
          {/* Current player indicator */}
          {currentPlayer && gameStatus === 'playing' && (
            <motion.div
              key={currentPlayer.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl px-4 py-3 border"
              style={{
                background: 'linear-gradient(135deg, rgba(233,69,96,0.22) 0%, rgba(233,69,96,0.12) 100%)',
                borderColor: '#e94560',
                boxShadow: '0 0 16px rgba(233,69,96,0.2)',
              }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                style={{ color: 'rgba(233,69,96,0.85)' }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Ходит
              </div>
              <div className="font-extrabold text-lg leading-tight" style={{ color: 'var(--color-text)' }}>
                {currentPlayer.name}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: '#f5c542' }}>
                  {currentPlayer.score} очков
                </span>
                {currentPlayer.roundScore > 0 && (
                  <span className="text-xs font-semibold text-success">
                    +{currentPlayer.roundScore} за раунд
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Wrong letter feedback */}
          <AnimatePresence>
            {lastWrongLetter && gameStatus === 'playing' && (
              <motion.div
                key={lastWrongLetter + turn.currentPlayerIndex}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  borderColor: 'rgba(239,68,68,0.45)',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
                <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                  Буквы <span className="font-black text-base">«{lastWrongLetter}»</span> нет в слове
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <LetterInput />
          </div>
          <AdminControls />
        </aside>

        {/* Center: Board + Question */}
        <main className="flex-1 min-w-0 flex flex-col items-center justify-start p-4 lg:p-6 gap-4 lg:gap-5 overflow-y-auto order-first lg:order-none">
          <div className="w-full max-w-4xl">
            <Board />
          </div>
          <div className="w-full max-w-4xl">
            <Question />
          </div>
        </main>

        {/* Right panel: Drum + Timer */}
        <aside
          className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l flex flex-col items-center gap-4 p-4 overflow-y-auto flex-shrink-0"
          style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
        >
          <Drum />
          <div
            className="w-full border-t pt-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Timer />
          </div>
        </aside>
      </div>

      {/* ══ RESTART MODAL ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showRestartModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowRestartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-8 text-center max-w-sm w-full mx-4 border"
              style={{ background: 'var(--color-panel)', borderColor: 'rgba(245,197,66,0.3)', color: 'var(--color-text)' }}
            >
              <RefreshCw className="w-12 h-12 mx-auto text-gold mb-4" />
              <h2 className="text-xl font-bold mb-2">Перезапустить игру?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Слова и группы сохранятся. Все очки и прогресс будут сброшены.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRestartModal(false)}
                  className="flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  Отмена
                </button>
                <button
                  onClick={() => { restartGame(); setShowRestartModal(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-gold hover:bg-gold/80 text-bg font-bold text-sm transition-all active:scale-95"
                >
                  Перезапустить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ FULL RESET MODAL ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowResetModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-8 text-center max-w-sm w-full mx-4 border"
              style={{ background: 'var(--color-panel)', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--color-text)' }}
            >
              <X className="w-12 h-12 mx-auto text-error mb-4" />
              <h2 className="text-xl font-bold mb-2">Сбросить всё?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Игра и конфигурация будут полностью удалены. Вы вернётесь на экран настройки.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  Отмена
                </button>
                <button
                  onClick={() => { resetGame(); setShowResetModal(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-error hover:bg-error/80 text-white font-bold text-sm transition-all active:scale-95"
                >
                  Сбросить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ ROUND COMPLETE OVERLAY ══════════════════════════════════════ */}
      <AnimatePresence>
        {isRoundComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="rounded-3xl p-10 text-center max-w-md w-full mx-4 border shadow-[0_0_60px_rgba(245,197,66,0.2)]"
              style={{
                background: 'var(--color-panel)',
                borderColor: 'rgba(245,197,66,0.3)',
                color: 'var(--color-text)',
              }}
            >
              <div className="mb-4">
                <Trophy className="w-16 h-16 mx-auto text-gold" />
              </div>
              <h2 className="text-3xl font-bold text-gold mb-2">
                {isFinal ? 'Игра завершена!' : 'Раунд завершён!'}
              </h2>

              {(() => {
                const winner = roundPlayers.find((p) => p.isWinner)
                  ?? roundPlayers.reduce((best, p) => (p.score > best.score ? p : best), roundPlayers[0]);
                return winner ? (
                  <div className="my-6">
                    <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Победитель</p>
                    <p className="text-2xl font-bold">{winner.name}</p>
                    <p className="text-gold text-3xl font-bold mt-1">{winner.score} очков</p>
                  </div>
                ) : null;
              })()}

              <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Загаданное слово</p>
                <p className="text-2xl font-bold text-gold tracking-widest">
                  {config.rounds[currentRound]?.word}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {!isFinal && !isLastRegularRound && (
                  <button
                    onClick={startNextRound}
                    className="w-full py-4 rounded-xl bg-accent hover:bg-accent/80 text-white font-bold text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(233,69,96,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" /> Следующий раунд
                  </button>
                )}
                {!isFinal && isLastRegularRound && hasFinalRound && (
                  <button
                    onClick={startFinal}
                    className="w-full py-4 rounded-xl bg-gold hover:bg-gold/80 text-bg font-bold text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(245,197,66,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-5 h-5" /> Начать финал!
                  </button>
                )}
                {!isFinal && isLastRegularRound && !hasFinalRound && (
                  <button
                    onClick={() => useGameStore.getState().resetGame()}
                    className="w-full py-4 rounded-xl bg-success hover:bg-success/80 text-white font-bold text-lg uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <PartyPopper className="w-5 h-5" /> Завершить игру
                  </button>
                )}
                {isFinal && (
                  <button
                    onClick={() => useGameStore.getState().resetGame()}
                    className="w-full py-4 rounded-xl bg-success hover:bg-success/80 text-white font-bold text-lg uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <PartyPopper className="w-5 h-5" /> Завершить игру
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
