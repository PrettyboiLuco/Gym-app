import { describe, expect, test } from '@jest/globals';

import { niceTicks } from '../chart-ticks';
import { projectWeight } from '../weight';

describe('Rasterwerte für Diagramme', () => {
  test('runde Schritte, oberster Wert über dem Maximum', () => {
    const t = niceTicks(81.9, 84.3);
    expect(t[0]).toBeLessThanOrEqual(81.9);
    expect(t[t.length - 1]).toBeGreaterThan(84.3);
    expect(t.length).toBeGreaterThanOrEqual(3);
    expect(t.length).toBeLessThanOrEqual(6);
    const steps = t.slice(1).map((v, i) => Math.round((v - t[i]) * 1000) / 1000);
    expect(new Set(steps).size).toBe(1);
  });
  test('ein einziger Wert bekommt trotzdem eine Skala', () => {
    expect(niceTicks(60, 60).length).toBeGreaterThanOrEqual(3);
  });
});


describe('Hochrechnung Gewicht', () => {
  test('in Richtung Ziel, höchstens 4 Wochen', () => {
    expect(projectWeight(84, -0.5, 80, '2026-10-31')).toEqual({ day: '2026-11-28', kg: 82 });
    expect(projectWeight(84, -0.5, 83.5, '2026-10-31')).toEqual({ day: '2026-11-07', kg: 83.5 });
  });
  test('keine Linie bei falscher Richtung, Stillstand oder fehlenden Werten', () => {
    expect(projectWeight(84, 0.3, 80, '2026-10-31')).toBeNull();
    expect(projectWeight(84, 0.01, 80, '2026-10-31')).toBeNull();
    expect(projectWeight(null, -0.5, 80, '2026-10-31')).toBeNull();
    expect(projectWeight(84, -0.5, null, '2026-10-31')).toBeNull();
  });
});
