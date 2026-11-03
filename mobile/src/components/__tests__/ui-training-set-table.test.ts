// Satztabelle und Trainings-Animationen: reine Regeln (Vorgabe/Eingabe, Zeilenstatus, Puls, Partikel, Scanner-Rahmen).
import { describe, expect, test } from '@jest/globals';

import { burstParticles, mergeSetInput, nextOpenRow, restPulseSecond, scanTargetRect, setRowState } from '../set-table-logic';

describe('mergeSetInput', () => {
  const suggestion = { weight: '60', reps: '8' };
  test('ohne Eingabe gilt die graue Vorgabe', () => {
    expect(mergeSetInput(undefined, suggestion)).toEqual(suggestion);
  });
  test('Getipptes je Feld vor der Vorgabe', () => {
    expect(mergeSetInput({ weight: '62,5', reps: '' }, suggestion)).toEqual({ weight: '62,5', reps: '8' });
    expect(mergeSetInput({ weight: ' ', reps: '10' }, suggestion)).toEqual({ weight: '60', reps: '10' });
  });
  test('ohne Vorgabe bleibt ein leeres Feld leer (Prüfung meldet es dann)', () => {
    expect(mergeSetInput(undefined, { weight: '', reps: '' })).toEqual({ weight: '', reps: '' });
  });
});

describe('setRowState und nextOpenRow', () => {
  const rows = [
    { id: 'a', completedAt: '2026-11-03T10:00:00Z' },
    { id: 'b', completedAt: null },
    { id: 'c', completedAt: null },
  ];
  test('Zustände', () => {
    expect(setRowState(rows[0], true, 'b')).toBe('done');
    expect(setRowState(rows[1], true, 'b')).toBe('current');
    expect(setRowState(rows[2], true, 'b')).toBe('open');
    expect(setRowState(rows[2], false, null)).toBe('missed');
    expect(setRowState(rows[0], false, null)).toBe('done');
  });
  test('nächste offene Zeile nach dem Abhaken', () => {
    expect(nextOpenRow(rows, 'b')).toBe('c');
    expect(nextOpenRow(rows, 'c')).toBe('b');
    expect(nextOpenRow([rows[0], rows[1]], 'b')).toBeNull();
  });
});

describe('restPulseSecond', () => {
  test('nur in den letzten 3 Sekunden', () => {
    expect(restPulseSecond(3001, 3)).toBeNull();
    expect(restPulseSecond(3000, 3)).toBe(3);
    expect(restPulseSecond(2400, 3)).toBe(3);
    expect(restPulseSecond(1, 3)).toBe(1);
    expect(restPulseSecond(0, 3)).toBeNull();
    expect(restPulseSecond(Number.NaN, 3)).toBeNull();
  });
});

describe('burstParticles', () => {
  test('feste Anzahl, im Umkreis, gleich bei jedem Aufruf', () => {
    const a = burstParticles(14, 56);
    expect(a).toHaveLength(14);
    expect(burstParticles(14, 56)).toEqual(a);
    for (const p of a) {
      const r = Math.hypot(p.dx, p.dy);
      expect(r).toBeGreaterThanOrEqual(56 * 0.7 - 0.2);
      expect(r).toBeLessThanOrEqual(56 + 0.2);
    }
    expect(a.some((p) => !p.lime)).toBe(true);
    expect(burstParticles(-1, 10)).toEqual([]);
  });
});

describe('scanTargetRect', () => {
  const box = { width: 300, height: 320 };
  test('umschließt den Code mit Rand', () => {
    expect(scanTargetRect({ x: 100, y: 140, width: 100, height: 40 }, box)).toEqual({ x: 90, y: 130, width: 120, height: 60 });
  });
  test('bleibt im Kamerafeld und hat eine Mindestgröße', () => {
    const r = scanTargetRect({ x: 280, y: 0, width: 10, height: 10 }, box);
    expect(r.width).toBe(56);
    expect(r.x + r.width).toBeLessThanOrEqual(300);
    expect(r.y).toBeGreaterThanOrEqual(0);
  });
  test('ohne brauchbare Lage: Mitte', () => {
    const mid = scanTargetRect(null, box);
    expect(mid.x + mid.width / 2).toBe(150);
    expect(mid.y + mid.height / 2).toBe(160);
    expect(scanTargetRect({ x: 0, y: 0, width: 0, height: 0 }, box)).toEqual(mid);
    expect(scanTargetRect({ x: 900, y: 900, width: 50, height: 50 }, box)).toEqual(mid);
  });
});
