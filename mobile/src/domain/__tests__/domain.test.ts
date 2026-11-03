// Übernahme der isolierten Referenztests (reference/Referenztests*.py) als App-Tests.
// Entfallen (03.11.2026): die Fälle zu daySummary (Kalorientracker), energyEstimate (Schätzung mit Aktivitätstabelle)
// und isCurrentAlarm (Timer-Generation). Diese Funktionen wurden in der App nicht genutzt und sind entfernt; die
// Tagesübersicht rechnet nutrition.ts (Tagessummen mit unbekannten Werten), der Rechner Ruheenergie × Faktor direkt.

import { describe, expect, test } from '@jest/globals';

import { calorieTarget, restingEnergy } from '../energy';
import { nutrientForAmount, recipePortion } from '../nutrition';
import { localDay, remainingMs } from '../time';
import { weightTrend } from '../weight';

describe('Nährwerte', () => {
  test('250 kcal/100 g × 60 g = 150', () => expect(nutrientForAmount(250, 60)).toBe(150));
  test('40 kcal/100 ml × 250 ml = 100', () => expect(nutrientForAmount(40, 250, 'ml', 'ml')).toBe(100));
  test('fehlender Nährwert bleibt unbekannt', () => expect(nutrientForAmount(null, 60)).toBeNull());
  test('bekannte Null bleibt Null', () => expect(nutrientForAmount(0, 60)).toBe(0));
  test('negative Menge abgelehnt', () => expect(() => nutrientForAmount(40, -1)).toThrow());
  test('g und ml brauchen Dichte', () => expect(() => nutrientForAmount(40, 250, 'g', 'ml')).toThrow());
  test('Rezept 1200/800 × 200 = 300', () => expect(recipePortion(1200, 800, 200)).toBe(300));
  test('fehlendes Endgewicht abgelehnt', () => expect(() => recipePortion(1200, null, 200)).toThrow());
  test('Endgewicht 0 abgelehnt', () => expect(() => recipePortion(1200, 0, 200)).toThrow());
});

describe('Kalorienrechner', () => {
  test('Mifflin 80 kg/180 cm/30 J/+5 = 1780', () => expect(restingEnergy(80, 180, 30, '+5')).toBe(1780));
  test('Mifflin 60 kg/165 cm/25 J/-161 = 1345,25', () => expect(restingEnergy(60, 165, 25, '-161')).toBeCloseTo(1345.25));
  test('Alter 17 außerhalb Population', () => expect(() => restingEnergy(70, 175, 17, '+5')).toThrow());
  test('Alter 80 außerhalb Population', () => expect(() => restingEnergy(70, 175, 80, '+5')).toThrow());
  test('Gewicht 0 abgelehnt', () => expect(() => restingEnergy(0, 175, 30, '+5')).toThrow());

  test('abnehmen −500 ergibt 2259', () => expect(calorieTarget(2759, 'abnehmen', -500, 1200)).toEqual({ status: 'vorschlag', kcal: 2259 }));
  test('unter Untergrenze keine Zahl', () => expect(calorieTarget(1600, 'abnehmen', -500, 1200)).toEqual({ status: 'fachpruefung' }));
  test('abnehmen mit Überschuss abgelehnt', () => expect(() => calorieTarget(2000, 'abnehmen', 300, 1200)).toThrow());
  test('halten mit Delta abgelehnt', () => expect(() => calorieTarget(2000, 'halten', -100, 1200)).toThrow());
});

describe('Gewicht', () => {
  const week = [80.0, 80.4, 79.8, 80.2, 80.6, 79.6, 80.1].map((kg, i) => ({
    day: `2026-10-${String(28 - i).padStart(2, '0')}`,
    kg,
  }));
  test('7-Tage-Mittel aus 7 Messungen', () => expect(weightTrend(week, '2026-10-28')).toBeCloseTo(80.1));
  test('zu wenige Messungen ergeben keinen Trend', () => expect(weightTrend(week.slice(0, 3), '2026-10-28')).toBeNull());
  test('mehrere Messungen an einem Tag zählen als ein Tag', () => {
    const sameDay = [80, 80, 80, 80].map((kg) => ({ day: '2026-10-28', kg }));
    expect(weightTrend(sameDay, '2026-10-28')).toBeNull();
    // Drei Tage je 80 kg, ein Tag mit drei Messungen à 84 kg: Tagesmittel zählen gleich → 81 kg, nicht 82,3 kg.
    const mixed = [
      { day: '2026-10-25', kg: 80 },
      { day: '2026-10-26', kg: 80 },
      { day: '2026-10-27', kg: 80 },
      ...[84, 84, 84].map((kg) => ({ day: '2026-10-28', kg })),
    ];
    expect(weightTrend(mixed, '2026-10-28')).toBeCloseTo(81);
  });
  test('Messungen außerhalb des Fensters ignoriert', () => expect(weightTrend([...week, { day: '2026-09-28', kg: 95 }], '2026-10-28')).toBeCloseTo(80.1));
});

describe('Zeit und Timer', () => {
  test('Erfassung um 00:05 liegt am neuen Kalendertag, Tagebuchdatum wird separat gewählt', () =>
    expect(localDay(new Date('2026-10-27T23:05:00Z'), 'Europe/Berlin')).toBe('2026-10-28'));
  test('Frühjahrstag hat 23 Stunden', () => {
    const start = Date.parse('2026-03-28T23:00:00Z'); // 29.03. 00:00 Berlin (MEZ)
    const end = Date.parse('2026-03-29T22:00:00Z'); // 30.03. 00:00 Berlin (MESZ)
    expect(localDay(new Date(start), 'Europe/Berlin')).toBe('2026-03-29');
    expect(localDay(new Date(end), 'Europe/Berlin')).toBe('2026-03-30');
    expect((end - start) / 3_600_000).toBe(23);
  });
  test('Herbsttag hat 25 Stunden', () => {
    const start = Date.parse('2026-10-24T22:00:00Z'); // 25.10. 00:00 Berlin (MESZ)
    const end = Date.parse('2026-10-25T23:00:00Z'); // 26.10. 00:00 Berlin (MEZ)
    expect(localDay(new Date(start), 'Europe/Berlin')).toBe('2026-10-25');
    expect(localDay(new Date(end), 'Europe/Berlin')).toBe('2026-10-26');
    expect((end - start) / 3_600_000).toBe(25);
  });
  test('Restzeit aus Endzeit', () => expect(remainingMs(1000, 970)).toBe(30));
  test('abgelaufener Timer bleibt bei 0', () => expect(remainingMs(1000, 1100)).toBe(0));
});
