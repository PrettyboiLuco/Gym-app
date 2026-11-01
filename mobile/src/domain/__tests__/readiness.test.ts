// A6: Ampel, Trainingslast, Schlafschuld, Regelmäßigkeit, Journal, Atemtakt.

import { describe, expect, test } from '@jest/globals';

import { breathPhaseAt, cycleSeconds } from '../breathing';
import { shiftDay } from '../dates';
import {
  autoFactors,
  bedtimeFor,
  hoursBetween,
  journalFindings,
  lighterSets,
  loadRatio,
  offersFor,
  readiness,
  sessionLoad,
  sleepStats,
  statusOn,
  type DailyCheck,
  type Factor,
} from '../readiness';

const TODAY = '2026-11-01';
const check = (day: string, v: Partial<DailyCheck> = {}): DailyCheck => ({
  day,
  bedTime: null,
  wakeTime: null,
  sleepHours: 7.5,
  sleepQuality: 4,
  energy: 4,
  soreness: 2,
  factors: [],
  note: null,
  ...v,
});
const history = (n: number, v: Partial<DailyCheck> = {}) => Array.from({ length: n }, (_, i) => check(shiftDay(TODAY, -(i + 1)), v));

describe('Ampel', () => {
  test('ohne Check offen, mit Status kein Ampel-Urteil', () => {
    expect(readiness(null, history(10), null, null)).toEqual({ kind: 'offen' });
    expect(readiness(check(TODAY), history(10), null, 'krank')).toEqual({ kind: 'status', status: 'krank' });
  });

  test('unter 7 Checks noch am Lernen, Gründe trotzdem sichtbar', () => {
    const r = readiness(check(TODAY, { sleepHours: 5 }), history(3), null, null);
    expect(r).toMatchObject({ kind: 'lernen', checks: 3, needed: 7 });
    expect(r.kind === 'lernen' && r.reasons[0]).toMatchObject({ key: 'schlaf', points: 2 });
  });

  test('übliche Werte → grün; deutlich schlechter → gelb bzw. rot; Begründung mit Rohwert und Schnitt', () => {
    expect(readiness(check(TODAY), history(10), 1, null)).toMatchObject({ kind: 'ampel', level: 'gruen', reasons: [] });
    const gelb = readiness(check(TODAY, { sleepHours: 6.4, energy: 3 }), history(10), null, null);
    expect(gelb).toMatchObject({ kind: 'ampel', level: 'gelb', points: 2 });
    const rot = readiness(check(TODAY, { sleepHours: 5, energy: 2, soreness: 4 }), history(10), 1.6, null);
    expect(rot).toMatchObject({ kind: 'ampel', level: 'rot' });
    expect(rot.kind === 'ampel' && rot.reasons.map((r) => r.key)).toEqual(['schlaf', 'energie', 'muskelkater', 'last']);
    expect(rot.kind === 'ampel' && rot.reasons[0]).toMatchObject({ value: 5, baseline: 7.5 });
  });

  test('Schnitt nur aus den 28 Tagen davor', () => {
    const old = Array.from({ length: 10 }, (_, i) => check(shiftDay(TODAY, -40 - i)));
    expect(readiness(check(TODAY), old, null, null)).toMatchObject({ kind: 'lernen', checks: 0 });
  });

  test('Angebote: gelb weniger Sätze, rot leicht oder dehnen, sonst keins', () => {
    expect(offersFor({ kind: 'ampel', level: 'gelb', points: 2, reasons: [], baselineChecks: 9 })).toEqual(['wenigerSaetze']);
    expect(offersFor({ kind: 'ampel', level: 'rot', points: 5, reasons: [], baselineChecks: 9 })).toEqual(['leicht', 'dehnen']);
    expect(offersFor({ kind: 'lernen', checks: 2, needed: 7, reasons: [] })).toEqual([]);
    expect([lighterSets(3, 'wenigerSaetze'), lighterSets(1, 'wenigerSaetze'), lighterSets(5, 'leicht'), lighterSets(1, 'leicht')]).toEqual([2, 1, 3, 1]);
  });
});

describe('Trainingslast', () => {
  test('Dauer × Anstrengung, gedeckelt; ohne Anstrengung keine Last', () => {
    expect(sessionLoad(60, 7)).toBe(420);
    expect(sessionLoad(400, 5)).toBe(1200);
    expect(sessionLoad(60, null)).toBeNull();
  });
  test('7 Tage gegen Wochenschnitt der 28 Tage; zu kurze Geschichte → keine Zahl', () => {
    const steady = Array.from({ length: 28 }, (_, i) => ({ day: shiftDay(TODAY, -i), load: 300 }));
    expect(loadRatio(steady, TODAY).ratio).toBeCloseTo(1, 1);
    const spike = steady.map((l) => (shiftDay(TODAY, -6) <= l.day ? { ...l, load: l.load * 2 } : l));
    expect(loadRatio(spike, TODAY).ratio!).toBeGreaterThan(1.5);
    expect(loadRatio([{ day: TODAY, load: 500 }], TODAY).ratio).toBeNull();
  });
});

describe('Schlaf', () => {
  test('Dauer aus Uhrzeiten über Mitternacht', () => {
    expect(hoursBetween('23:15', '06:45')).toBe(7.5);
    expect(hoursBetween('01:00', '08:00')).toBe(7);
    expect(hoursBetween('x', '08:00')).toBeNull();
  });
  test('Schlafschuld zählt nur Stunden unter dem Ziel; Streuung der Zeiten', () => {
    const nights = [6, 8.5, 7, 6.5, 8].map((h, i) =>
      check(shiftDay(TODAY, -i), {
        sleepHours: h,
        wakeTime: ['06:30', '07:00', '06:45', '06:30', '07:15'][i],
        bedTime: ['23:30', '00:15', '23:45', '23:00', '23:15'][i],
      })
    );
    const s = sleepStats(nights, TODAY, 8);
    expect(s).toMatchObject({ nights: 5, debtHours: 4.5 });
    expect(s.wakeSpread).toBeGreaterThan(0);
    expect(s.bedSpread).toBeLessThan(60);
    expect(sleepStats(nights.slice(0, 3), TODAY, 8).wakeSpread).toBeNull();
  });
  test('Bettzeit aus Aufstehzeit und Ziel', () => {
    expect(bedtimeFor('06:30', 8)).toBe(22 * 60 + 30);
    expect(bedtimeFor('09:00', 7.5)).toBe(90);
  });
});

describe('Journal', () => {
  test('Faktoren aus dem Tagebuch', () => {
    expect(autoFactors({ alcohol: true, lateCaffeineMg: 80, lastMealMinutes: 22 * 60, kcal: 3200, goalKcal: 2500 })).toEqual([
      'alkohol',
      'koffeinSpaet',
      'spaetGegessen',
      'vielGegessen',
    ]);
    expect(autoFactors({ alcohol: false, lateCaffeineMg: 20, lastMealMinutes: 19 * 60, kcal: 2400, goalKcal: 2500 })).toEqual([]);
  });
  test('Unterschied erst ab je 5 Tagen und ab 0,5', () => {
    const day = (i: number, f: Factor[], energy: number) => ({ ...check(shiftDay(TODAY, -i), { energy }), allFactors: f });
    const days = [...Array.from({ length: 5 }, (_, i) => day(i, ['alkohol'], 3)), ...Array.from({ length: 6 }, (_, i) => day(10 + i, [], 4))];
    const found = journalFindings(days);
    expect(found[0]).toMatchObject({ factor: 'alkohol', metric: 'energy', withAvg: 3, withoutAvg: 4, withDays: 5, diff: -1 });
    expect(journalFindings(days.slice(1))).toEqual([]);
  });
});

describe('Status und Atemtakt', () => {
  test('Status gilt im Zeitraum, offenes Ende = bis auf Weiteres', () => {
    const p = [
      { status: 'krank' as const, fromDay: '2026-10-20', toDay: '2026-10-24' },
      { status: 'pause' as const, fromDay: '2026-10-30', toDay: null },
    ];
    expect(statusOn(p, '2026-10-22')).toBe('krank');
    expect(statusOn(p, '2026-10-26')).toBeNull();
    expect(statusOn(p, TODAY)).toBe('pause');
  });
  test('4-7-8 und ruhiges Atmen', () => {
    expect(cycleSeconds('478')).toBe(19);
    expect(breathPhaseAt('478', 5000)).toMatchObject({ kind: 'halten', remainingMs: 6000, cycle: 0 });
    expect(breathPhaseAt('ruhig', 11_000)).toMatchObject({ kind: 'ein', cycle: 1 });
  });
});
