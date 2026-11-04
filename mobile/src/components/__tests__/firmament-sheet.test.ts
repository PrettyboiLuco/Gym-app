// Lichtschein der Tagesübersicht (Firmament-Stopps) und Zeitplan der Fenster (Zeilen-Leiter, Wischen).

import { describe, expect, test } from '@jest/globals';

import { breathPeriodMs, FIRMAMENT_DARK, FIRMAMENT_LIGHT, firmamentStops, GLOW_DISTANCES, glowCenter, ramp4 } from '@/components/firmament';
import { remainingDelay, rowDelay, shouldDismiss } from '@/components/sheet-motion';

describe('Firmament-Verlauf', () => {
  test('Rampe: ganz dunkel = Farbe A, ganz hell = Farbe D', () => {
    expect(ramp4(FIRMAMENT_DARK, 0)).toBe('#0b2b12');
    expect(ramp4(FIRMAMENT_DARK, 1)).toBe('#eaffd6');
  });

  test('Stopps an den festen Abständen, Kern mit glow-Deckkraft, Rand unsichtbar', () => {
    const stops = firmamentStops(FIRMAMENT_DARK);
    expect(stops.map((s) => s.offset)).toEqual([...GLOW_DISTANCES]);
    expect(stops[0]).toEqual({ offset: 0, color: '#eaffd6', opacity: 0.55 });
    expect(stops[stops.length - 1].opacity).toBe(0);
    expect(stops[stops.length - 1].color).toBe('#0b2b12');
  });

  test('Helligkeit fällt mit (1 - d)^curve und nie wieder an', () => {
    const stops = firmamentStops(FIRMAMENT_DARK);
    for (let i = 1; i < stops.length; i++) expect(stops[i].opacity).toBeLessThan(stops[i - 1].opacity);
    // d = 0.4 → t = 0.6^2.2 ≈ 0.325 → Deckkraft ≈ 0.179
    expect(stops[3].opacity).toBeCloseTo(0.55 * Math.pow(0.6, 2.2), 3);
  });

  test('Hellmodus: Kern höchstens 0.35, keine Vignette', () => {
    const stops = firmamentStops(FIRMAMENT_LIGHT);
    expect(Math.max(...stops.map((s) => s.opacity))).toBeLessThanOrEqual(0.35);
    expect(FIRMAMENT_LIGHT.vignette).toBe(0);
  });

  test('Lichtpunkt leicht unter der Unterkante, Atmen ≈ 19 s', () => {
    expect(glowCenter(FIRMAMENT_DARK)).toEqual({ cx: 0.5, cy: 1.08 });
    expect(breathPeriodMs(FIRMAMENT_DARK)).toBe(19040);
  });
});

describe('Fenster-Zeilen', () => {
  test('Leiter der Vorlage, danach +100 ms je Zeile bis höchstens 1200 ms', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(rowDelay)).toEqual([150, 200, 250, 300, 400, 550, 650, 750, 900]);
    expect(rowDelay(9)).toBe(1000);
    expect(rowDelay(11)).toBe(1200);
    expect(rowDelay(40)).toBe(1200);
    expect(rowDelay(-3)).toBe(150);
  });

  test('später eingehängte Zeilen warten nicht noch einmal', () => {
    expect(remainingDelay(2, 1000, 1000)).toBe(250);
    expect(remainingDelay(2, 1000, 1100)).toBe(150);
    expect(remainingDelay(2, 1000, 5000)).toBe(0);
  });

  test('Wischen schließt ab 120 px oder mit Schwung, sonst nicht', () => {
    expect(shouldDismiss(121, 0)).toBe(true);
    expect(shouldDismiss(30, 900)).toBe(true);
    expect(shouldDismiss(80, 300)).toBe(false);
  });
});
