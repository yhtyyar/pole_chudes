import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, RotateCcw, Skull, Trophy, Clock, Zap, Gift, Star } from 'lucide-react';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTORS = [
  { icon: <Star className="w-4 h-4" />, color: '#3b82f6', label: '100–1000 очков', desc: 'Угадайте букву — получите указанное количество очков за каждое вхождение буквы в слово.' },
  { icon: <Zap className="w-4 h-4" />, color: '#14b8a6', label: '×2 Удвоение', desc: 'Очки текущего раунда удваиваются! Плюс начисляются очки за угаданную букву.' },
  { icon: <Star className="w-4 h-4" />, color: '#06b6d4', label: '+1 Доп. буква', desc: 'Называете одну букву и получаете 100 очков за каждое вхождение. Дополнительный ход не предусмотрен.' },
  { icon: <Gift className="w-4 h-4" />, color: '#f5c542', label: 'ПРИЗ', desc: 'Специальный приз! Назовите букву — 100 очков за каждое вхождение плюс символический приз от ведущего.' },
  { icon: <Skull className="w-4 h-4" />, color: '#ef4444', label: 'БАНКРОТ', desc: 'Все очки текущего раунда сгорают. Ход переходит к следующему игроку.' },
];

export function RulesModal({ open, onClose }: RulesModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="rules-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="rules-panel"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  Правила игры «Поле чудес»
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Закрыть правила"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6" style={{ color: 'var(--color-text)' }}>

              {/* Intro */}
              <section>
                <h3 className="text-lg font-bold mb-2 text-accent">🎡 Цель игры</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Угадать загаданное слово, называя буквы по одной после каждого вращения барабана.
                  Побеждает игрок, набравший наибольшее количество очков по итогам раунда.
                </p>
              </section>

              {/* Structure */}
              <section>
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>📋 Структура игры</h3>
                <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <div className="flex gap-2">
                    <span className="font-bold text-accent shrink-0">Группы:</span>
                    <span>3–8 команд соревнуются в каждом раунде. В раунде участвуют игроки одной группы.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-accent shrink-0">Раунды:</span>
                    <span>Каждый раунд — новое слово и новая группа. Ведущий вводит слово и подсказку заранее.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-accent shrink-0">Финал:</span>
                    <span>Необязательный финальный раунд — победители каждой группы встречаются в финале.</span>
                  </div>
                </div>
              </section>

              {/* Turn flow */}
              <section>
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>🔄 Ход игры</h3>
                <ol className="space-y-2 text-sm list-none" style={{ color: 'var(--color-text-muted)' }}>
                  {[
                    { num: '1', text: 'Ведущий зачитывает тему и подсказку.' },
                    { num: '2', text: 'Текущий игрок крутит барабан (кнопка «Крутить барабан» или клавиша Space).' },
                    { num: '3', text: 'Барабан останавливается на секторе — игрок называет одну букву.' },
                    { num: '4', text: 'Если буква есть в слове — она открывается, игрок получает очки и снова крутит барабан. Если буквы нет — ход переходит к следующему.' },
                    { num: '5', text: 'Игрок может угадать всё слово целиком (поле ввода + кнопка «Слово»). Правильно — победа в раунде, неправильно — ход теряется.' },
                    { num: '6', text: 'Раунд завершается, когда слово полностью открыто или ведущий объявляет победителя.' },
                  ].map(({ num, text }) => (
                    <li key={num} className="flex gap-3">
                      <span
                        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'var(--color-accent, #e94560)' }}
                      >{num}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Timer */}
              <section>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Clock className="w-4 h-4 text-gold" /> Таймер
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  У игрока есть <strong>20 секунд</strong>, чтобы назвать букву после остановки барабана.
                  Если время истекает — ход переходит к следующему игроку.
                  Ведущий может поставить таймер на паузу, добавить время (+10с) или сбросить его.
                </p>
              </section>

              {/* Drum sectors */}
              <section>
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>🎰 Секторы барабана</h3>
                <div className="space-y-2">
                  {SECTORS.map(({ icon, color, label, desc }) => (
                    <div
                      key={label}
                      className="flex gap-3 p-3 rounded-xl text-sm"
                      style={{ background: `${color}14`, border: `1px solid ${color}40` }}
                    >
                      <div
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                        style={{ background: `${color}25`, color }}
                      >
                        {icon}
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color }}>{label}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Scoring */}
              <section>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>💰 Очки</h3>
                <div className="text-sm space-y-1" style={{ color: 'var(--color-text-muted)' }}>
                  <p>Очки начисляются за каждое вхождение буквы в слово, умноженное на значение сектора.</p>
                  <p><strong style={{ color: 'var(--color-text)' }}>Очки раунда</strong> — накапливаются в течение раунда (сгорают при БАНКРОТЕ).</p>
                  <p><strong style={{ color: 'var(--color-text)' }}>Общий счёт</strong> — суммируется за все раунды. Победитель раунда получает +1500 бонусных очков.</p>
                </div>
              </section>

              {/* Admin */}
              <section>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <RotateCcw className="w-4 h-4" /> Панель ведущего
                </h3>
                <div className="text-sm space-y-1" style={{ color: 'var(--color-text-muted)' }}>
                  <p>Ведущий может использовать панель управления для:</p>
                  <ul className="mt-1 space-y-1 ml-4">
                    <li>• <strong style={{ color: 'var(--color-text)' }}>Смена игрока</strong> — передать ход вперёд или вернуть назад</li>
                    <li>• <strong style={{ color: 'var(--color-text)' }}>Банкрот</strong> — засчитать банкрот вручную</li>
                    <li>• <strong style={{ color: 'var(--color-text)' }}>Победитель</strong> — объявить текущего игрока победителем раунда</li>
                    <li>• <strong style={{ color: 'var(--color-text)' }}>Открыть букву</strong> — исправить ошибку ведущего без начисления очков</li>
                    <li>• <strong style={{ color: 'var(--color-text)' }}>Управление таймером</strong> — пауза, продолжить, +10с, сброс</li>
                  </ul>
                </div>
              </section>

              {/* Hotkeys */}
              <section>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>⌨️ Горячие клавиши</h3>
                <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {[
                    ['Space', 'Крутить барабан'],
                    ['Enter', 'Подтвердить букву'],
                    ['Escape', 'Пауза / продолжить'],
                    ['?', 'Правила игры'],
                  ].map(([key, action]) => (
                    <div key={key} className="flex items-center gap-2">
                      <kbd
                        className="px-2 py-1 rounded-lg text-xs font-mono font-bold"
                        style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                      >{key}</kbd>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Final */}
              <section
                className="rounded-xl p-4 text-sm"
                style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-2 font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  <Trophy className="w-4 h-4 text-gold" /> Финальный раунд
                </div>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Финал является необязательным. Если он настроен — в него выходят победители каждой группы (по одному от каждой).
                  Финальное слово, как правило, длиннее или сложнее. Победитель финала получает главный приз!
                </p>
              </section>

            </div>

            {/* Footer */}
            <div
              className="sticky bottom-0 px-6 py-3 border-t flex justify-end"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
            >
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--color-accent, #e94560)' }}
              >
                Понятно!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Floating rules button — can be placed anywhere */
export function RulesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      data-testid="rules-btn"
      onClick={onClick}
      title="Правила игры (клавиша ?)"
      className="flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm transition-all hover:opacity-80 active:scale-95"
      style={{
        background: 'var(--color-panel)',
        border: '1.5px solid var(--color-border)',
        color: 'var(--color-text-muted)',
      }}
      aria-label="Открыть правила игры"
    >
      <BookOpen className="w-4 h-4" />
    </button>
  );
}
