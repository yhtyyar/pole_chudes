import { describe, it, expect, vi } from 'vitest';
import { spinDrum, spinDrumWithSeed, DRUM_SECTORS } from '../stores/gameStore';
import type { DrumSector } from '../types';

// ─── spinDrumWithSeed determinism ───────────────────────────────────────────

describe('spinDrumWithSeed — deterministic', () => {
  it('returns a valid DrumSector for every seed from 0 to 0.999', () => {
    const validTypes = new Set(['points', 'double', 'extra', 'bankrupt', 'prize', 'bank']);
    for (let i = 0; i <= 100; i++) {
      const result = spinDrumWithSeed(i / 100);
      expect(validTypes.has(result.type)).toBe(true);
    }
  });

  it('seed 0 always returns the first sector (100 points)', () => {
    const result = spinDrumWithSeed(0);
    expect(result.type).toBe('points');
    if (result.type === 'points') expect(result.value).toBe(100);
  });

  it('seed 0.999 always returns bank (last sector)', () => {
    const result = spinDrumWithSeed(0.9999);
    expect(result.type).toBe('bank');
  });

  it('is deterministic — same seed returns same result', () => {
    const a = spinDrumWithSeed(0.42);
    const b = spinDrumWithSeed(0.42);
    expect(a).toEqual(b);
  });

  it('different seeds can return different sectors', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const s = spinDrumWithSeed(i / 100);
      results.add(s.type);
    }
    // Over 100 seeds, we should see at least 3 different sector types
    expect(results.size).toBeGreaterThanOrEqual(3);
  });
});

// ─── DRUM_SECTORS weights ───────────────────────────────────────────────────

describe('DRUM_SECTORS configuration', () => {
  it('has 14 sectors', () => {
    expect(DRUM_SECTORS.length).toBe(14);
  });

  it('all sectors have positive weight', () => {
    DRUM_SECTORS.forEach(({ weight }) => {
      expect(weight).toBeGreaterThan(0);
    });
  });

  it('total weight is exactly 72', () => {
    const total = DRUM_SECTORS.reduce((sum, d) => sum + d.weight, 0);
    expect(total).toBe(72);
  });

  it('contains exactly one bankrupt sector', () => {
    const bankrupts = DRUM_SECTORS.filter((d) => d.sector.type === 'bankrupt');
    expect(bankrupts).toHaveLength(1);
  });

  it('bankrupt weight is 5', () => {
    const bankrupt = DRUM_SECTORS.find((d) => d.sector.type === 'bankrupt');
    expect(bankrupt?.weight).toBe(5);
  });

  it('contains prize and bank sectors', () => {
    expect(DRUM_SECTORS.some((d) => d.sector.type === 'prize')).toBe(true);
    expect(DRUM_SECTORS.some((d) => d.sector.type === 'bank')).toBe(true);
  });

  it('contains double and extra sectors', () => {
    expect(DRUM_SECTORS.some((d) => d.sector.type === 'double')).toBe(true);
    expect(DRUM_SECTORS.some((d) => d.sector.type === 'extra')).toBe(true);
  });

  it('all points sectors have positive values', () => {
    DRUM_SECTORS
      .filter((d): d is { sector: Extract<DrumSector, { type: 'points' }>; weight: number } =>
        d.sector.type === 'points'
      )
      .forEach(({ sector }) => {
        expect(sector.value).toBeGreaterThan(0);
      });
  });

  it('points values are 100, 150, 200, 250, 300, 350, 400, 500, 1000', () => {
    const pointValues = DRUM_SECTORS
      .filter((d) => d.sector.type === 'points')
      .map((d) => (d.sector as Extract<DrumSector, { type: 'points' }>).value)
      .sort((a, b) => a - b);
    expect(pointValues).toEqual([100, 150, 200, 250, 300, 350, 400, 500, 1000]);
  });
});

// ─── spinDrum probability distribution ─────────────────────────────────────

describe('spinDrum probability distribution', () => {
  it('never returns an undefined or null result', () => {
    for (let i = 0; i < 500; i++) {
      const result = spinDrum();
      expect(result).toBeTruthy();
      expect(result.type).toBeDefined();
    }
  });

  it('produces bankrupt roughly ~7% of the time (5/72)', () => {
    // Mock Math.random to step through uniform distribution
    let call = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => (call++ % 1000) / 1000);

    const counts: Record<string, number> = {};
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const s = spinDrum();
      counts[s.type] = (counts[s.type] ?? 0) + 1;
    }

    // bankrupt weight = 5, total = 72 → ~6.9%
    const bankruptRatio = (counts['bankrupt'] ?? 0) / N;
    expect(bankruptRatio).toBeGreaterThan(0.04);
    expect(bankruptRatio).toBeLessThan(0.12);

    vi.restoreAllMocks();
  });

  it('produces all sector types over 2000 random spins', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      seen.add(spinDrum().type);
    }
    expect(seen.has('points')).toBe(true);
    expect(seen.has('bankrupt')).toBe(true);
    expect(seen.has('prize')).toBe(true);
    expect(seen.has('bank')).toBe(true);
    expect(seen.has('double')).toBe(true);
    expect(seen.has('extra')).toBe(true);
  });
});
