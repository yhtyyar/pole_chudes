import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useGameStore, DRUM_SECTORS } from '../../stores/gameStore';
import type { DrumSector } from '../../types';

// Visual sectors — shown on the wheel (must match DRUM_SECTORS order exactly)
const SECTORS: Array<{ label: string; color: string; sector: DrumSector }> = [
  { label: '100',    color: '#3b82f6', sector: { type: 'points', value: 100 } },
  { label: '150',    color: '#84cc16', sector: { type: 'points', value: 150 } },
  { label: '200',    color: '#8b5cf6', sector: { type: 'points', value: 200 } },
  { label: '250',    color: '#a855f7', sector: { type: 'points', value: 250 } },
  { label: '300',    color: '#f59e0b', sector: { type: 'points', value: 300 } },
  { label: '350',    color: '#f97316', sector: { type: 'points', value: 350 } },
  { label: '400',    color: '#6366f1', sector: { type: 'points', value: 400 } },
  { label: '500',    color: '#ec4899', sector: { type: 'points', value: 500 } },
  { label: '1000',   color: '#fbbf24', sector: { type: 'points', value: 1000 } },
  { label: '×2',     color: '#14b8a6', sector: { type: 'double' } },
  { label: '+1',     color: '#06b6d4', sector: { type: 'extra' } },
  { label: 'БАНКРОТ',color: '#ef4444', sector: { type: 'bankrupt' } },
  { label: 'ПРИЗ',   color: '#f5c542', sector: { type: 'prize' } },
  { label: 'БАНК',   color: '#10b981', sector: { type: 'bank' } },
];

const NUM_SECTORS = SECTORS.length;
const SECTOR_ANGLE = 360 / NUM_SECTORS;
const SECTOR_HALF_ANGLE = SECTOR_ANGLE / 2;

function sectorColor(sector: DrumSector | null): string {
  if (!sector) return '#475569';
  if (sector.type === 'bankrupt') return '#ef4444';
  if (sector.type === 'prize')    return '#f5c542';
  if (sector.type === 'bank')     return '#10b981';
  if (sector.type === 'double')   return '#14b8a6';
  if (sector.type === 'extra')    return '#06b6d4';
  if (sector.type === 'points')   return '#3b82f6';
  return '#475569';
}

function sectorName(sector: DrumSector | null): string {
  if (!sector) return '—';
  if (sector.type === 'points')   return `${sector.value} очков`;
  if (sector.type === 'double')   return '×2 Удвоение';
  if (sector.type === 'extra')    return '+1 Доп. буква';
  if (sector.type === 'bankrupt') return 'БАНКРОТ';
  if (sector.type === 'prize')    return '🎁 ПРИЗ';
  if (sector.type === 'bank')     return '🏦 БАНК';
  return '';
}

/** Find sector index by comparing sector data */
function findSectorIndex(target: DrumSector): number {
  for (let i = 0; i < SECTORS.length; i++) {
    const s = SECTORS[i].sector;
    if (s.type !== target.type) continue;
    if (s.type === 'points' && target.type === 'points') {
      if (s.value === target.value) return i;
    } else {
      return i;
    }
  }
  return 0;
}

/** Calculate rotation angle to land on specific sector index */
function calculateTargetAngle(sectorIndex: number, currentRotation: number): number {
  // Sector centers are at: -90 + i * SECTOR_ANGLE + SECTOR_HALF_ANGLE
  // We want: sectorCenter + targetRotation ≡ -90 (mod 360)
  // So: targetRotation ≡ -90 - sectorCenter (mod 360)
  const sectorCenter = -90 + sectorIndex * SECTOR_ANGLE + SECTOR_HALF_ANGLE;
  
  // Calculate base rotation to align this sector with pointer
  let targetRotation = -90 - sectorCenter;
  
  // Normalize to positive angle
  targetRotation = ((targetRotation % 360) + 360) % 360;
  
  // Add extra spins (5-8 full rotations) for visual effect
  const extraSpins = 5 + Math.floor(Math.random() * 4);
  const fullRotation = extraSpins * 360;
  
  // Calculate final angle relative to current rotation
  const currentBase = ((currentRotation % 360) + 360) % 360;
  let delta = targetRotation - currentBase;
  
  // Ensure we rotate forward (clockwise)
  if (delta < 0) delta += 360;
  
  return currentRotation + fullRotation + delta;
}

/** Shared SVG wheel — accepts a size prop so it can be rendered at any scale */
function WheelSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      <defs>
        <filter id="wheel-glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {SECTORS.map((sec, i) => {
        const startAngle = i * SECTOR_ANGLE - 90;
        const endAngle   = startAngle + SECTOR_ANGLE;
        const startRad   = (startAngle * Math.PI) / 180;
        const endRad     = (endAngle   * Math.PI) / 180;
        const x1 = 100 + 90 * Math.cos(startRad);
        const y1 = 100 + 90 * Math.sin(startRad);
        const x2 = 100 + 90 * Math.cos(endRad);
        const y2 = 100 + 90 * Math.sin(endRad);
        const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
        const tx = 100 + 63 * Math.cos(midAngle);
        const ty = 100 + 63 * Math.sin(midAngle);
        const largeArc = SECTOR_ANGLE > 180 ? 1 : 0;

        // font size based on label length
        const fs = sec.label.length > 6 ? 6 : sec.label.length > 4 ? 7 : 8;

        return (
          <g key={i}>
            <path
              d={`M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={sec.color}
              stroke="#1a1a2e"
              strokeWidth="0.8"
            />
            <text
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={fs}
              fontWeight="bold"
              transform={`rotate(${startAngle + SECTOR_ANGLE / 2}, ${tx}, ${ty})`}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {sec.label}
            </text>
          </g>
        );
      })}
      {/* Rim */}
      <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Centre hub */}
      <circle cx="100" cy="100" r="12" fill="#0f172a" stroke="#f5c542" strokeWidth="2" />
      <circle cx="100" cy="100" r="5"  fill="#f5c542" />
    </svg>
  );
}

/** Arrow pointer pointing downward at top-centre of the wheel */
function Pointer({ size }: { size: number }) {
  const w = Math.max(8, size * 0.045);
  const h = Math.max(14, size * 0.075);
  return (
    <div
      className="absolute left-1/2 z-20"
      style={{
        top: -2,
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft:  `${w}px solid transparent`,
        borderRight: `${w}px solid transparent`,
        borderTop:   `${h}px solid #f5c542`,
        filter: 'drop-shadow(0 0 6px rgba(245,197,66,0.9))',
      }}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function Drum() {
  const drumSpinning  = useGameStore((s) => s.turn.drumSpinning);
  const sector        = useGameStore((s) => s.turn.sector);
  const phase         = useGameStore((s) => s.turn.phase);
  const spinDrumAction = useGameStore((s) => s.spinDrumAction);

  const controls     = useAnimation();
  const rotationRef  = useRef(0);

  // Fullscreen overlay state
  const [fullscreen, setFullscreen] = useState(false);
  // Track whether we already launched the spin animation
  const spinStartedRef = useRef(false);
  // Ref for fullscreen wheel to sync rotation
  const fullscreenRotationRef = useRef(0);
  // Store the pending sector for animation
  const pendingSectorRef = useRef<DrumSector | null>(null);

  const canSpin = phase === 'spin' && !drumSpinning;

  // Handle spin: open fullscreen, select sector, then trigger store action
  function handleSpin() {
    if (!canSpin) return;
    
    // Select sector now so we can calculate exact rotation
    const total = DRUM_SECTORS.reduce((s, d) => s + d.weight, 0);
    let rand = Math.random() * total;
    let selectedSector: DrumSector = DRUM_SECTORS[0].sector;
    for (const { sector, weight } of DRUM_SECTORS) {
      rand -= weight;
      if (rand <= 0) {
        selectedSector = sector;
        break;
      }
    }
    
    // Store for animation
    pendingSectorRef.current = selectedSector;
    
    // Sync fullscreen rotation with current small wheel rotation before opening
    fullscreenRotationRef.current = rotationRef.current;
    setFullscreen(true);
    spinDrumAction();
  }

  // Drive the Framer Motion animation whenever drumSpinning flips to true
  useEffect(() => {
    if (drumSpinning && !spinStartedRef.current && pendingSectorRef.current) {
      spinStartedRef.current = true;
      
      // Find index of selected sector
      const sectorIndex = findSectorIndex(pendingSectorRef.current);
      
      // Calculate exact angle to land on this sector
      const targetAngle = calculateTargetAngle(sectorIndex, rotationRef.current);
      
      rotationRef.current = targetAngle;
      fullscreenRotationRef.current = targetAngle;

      controls.start({
        rotate: targetAngle,
        transition: { duration: 3.2, ease: [0.17, 0.67, 0.35, 1.0] },
      });
    }

    if (!drumSpinning) {
      spinStartedRef.current = false;
      pendingSectorRef.current = null;
    }
  }, [drumSpinning, controls]);

  // Auto-close fullscreen 1.8s after result appears
  useEffect(() => {
    if (!drumSpinning && sector && fullscreen) {
      const t = setTimeout(() => setFullscreen(false), 1800);
      return () => clearTimeout(t);
    }
  }, [drumSpinning, sector, fullscreen]);

  const accentColor = sectorColor(sector);

  // ── Shared animated wheel node (small, in sidebar) ──
  const smallWheel = (
    <div className="relative flex-shrink-0" style={{ width: 320, height: 320 }}>
      <Pointer size={320} />
      <motion.div
        animate={controls}
        initial={{ rotate: 0 }}
        style={{ width: 320, height: 320 }}
      >
        <WheelSvg size={320} />
      </motion.div>
    </div>
  );

  return (
    <>
      {/* ── Sidebar drum ── */}
      <div className="flex flex-col items-center gap-4">
        {smallWheel}

        {/* Result badge */}
        <motion.div
          key={sector ? `sector-${sector.type}` : 'empty'}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-xs rounded-xl px-4 py-3 text-center font-bold text-lg transition-colors duration-300"
          style={{
            backgroundColor: accentColor + '33',
            borderWidth: 2,
            borderColor: accentColor,
            color: accentColor,
            minHeight: 54,
            boxShadow: sector ? `0 0 14px ${accentColor}44` : undefined,
          }}
        >
          {drumSpinning ? (
            <span className="animate-pulse font-semibold text-base" style={{ color: 'var(--color-text)' }}>
              Крутится…
            </span>
          ) : sector ? (
            <span>{sectorName(sector)}</span>
          ) : (
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Нажмите «Крутить» или <kbd className="font-black" style={{ background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: 4 }}>Space</kbd>
            </span>
          )}
        </motion.div>

        {/* Spin button */}
        <button
          onClick={handleSpin}
          disabled={!canSpin}
          className={[
            'w-full max-w-xs py-3 rounded-xl font-bold text-lg uppercase tracking-widest',
            'transition-all duration-200 active:scale-95',
            canSpin
              ? 'bg-accent hover:bg-accent/80 text-white shadow-[0_0_20px_rgba(233,69,96,0.4)] cursor-pointer'
              : 'cursor-not-allowed',
          ].join(' ')}
          style={!canSpin ? { background: 'var(--color-card)', color: 'var(--color-text-muted)', border: '2px solid var(--color-border)' } : undefined}
        >
          {drumSpinning ? '⏳ Вращается…' : '🎰 Крутить барабан'}
        </button>

        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Space — крутить барабан</p>
      </div>

      {/* ── Fullscreen overlay portal ── */}
      {createPortal(
        <AnimatePresence>
          {fullscreen && (
            <motion.div
              key="drum-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
              style={{ backgroundColor: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(6px)' }}
            >
              {/* Close button */}
              {!drumSpinning && (
                <button
                  onClick={() => setFullscreen(false)}
                  className="absolute top-6 right-8 text-white/40 hover:text-white text-3xl leading-none transition-colors"
                >
                  ✕
                </button>
              )}

              {/* Big wheel - uses same rotation angle as small wheel */}
              <motion.div
                initial={{ scale: 0.4, opacity: 0, rotate: fullscreenRotationRef.current }}
                animate={{ scale: 1, opacity: 1, rotate: rotationRef.current }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="relative flex-shrink-0"
                style={{ width: 520, height: 520 }}
              >
                <Pointer size={520} />
                {/* Re-use the same controls so big + small rotate in sync */}
                <motion.div
                  animate={controls}
                  initial={{ rotate: fullscreenRotationRef.current }}
                  style={{ width: 520, height: 520 }}
                >
                  <WheelSvg size={520} />
                </motion.div>
              </motion.div>

              {/* Result display under the big wheel */}
              <AnimatePresence mode="wait">
                {drumSpinning ? (
                  <motion.p
                    key="spinning"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-8 text-white/50 text-2xl font-medium animate-pulse"
                  >
                    Барабан крутится…
                  </motion.p>
                ) : sector ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.6, y: 20 }}
                    animate={{ opacity: 1, scale: 1,   y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
                    className="mt-8 px-12 py-5 rounded-2xl font-bold text-4xl text-center"
                    style={{
                      backgroundColor: accentColor + '30',
                      border: `3px solid ${accentColor}`,
                      color: accentColor,
                      minWidth: 340,
                      boxShadow: `0 0 40px ${accentColor}55`,
                    }}
                  >
                    {sectorName(sector)}
                    <p className="text-white/40 text-sm font-normal mt-2 uppercase tracking-widest">
                      Закрывается автоматически…
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
