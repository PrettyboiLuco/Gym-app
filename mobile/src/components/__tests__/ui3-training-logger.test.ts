// Satz-Logger (Runde 3): Pause ±15 s, Platzhalter-Kontrast, Vorgabe beim Abhaken, Tab-Leiste im Training, Einzahl/Mehrzahl.
import { describe, expect, test } from '@jest/globals';

import { Colors } from '@/constants/theme';
import { t } from '@/i18n';

import { hidesTabBar } from '../mini-player';
import { mergeSetInput, nudgeRest } from '../set-table-logic';

describe('nudgeRest (−15 / +15 in der Pausenleiste)', () => {
  const now = 1_000_000;
  const running = { endAtMs: now + 60_000, durationMs: 90_000, generation: 3 };

  test('+15 verlängert wie bisher', () => {
    expect(nudgeRest(running, 15, now)).toEqual({ endAtMs: now + 75_000, durationMs: 105_000, generation: 4 });
  });

  test('−15 kürzt Restzeit und Gesamtdauer gleich', () => {
    expect(nudgeRest(running, -15, now)).toEqual({ endAtMs: now + 45_000, durationMs: 75_000, generation: 4 });
  });

  test('−15 bei weniger als 15 s übrig endet genau jetzt, nie in der Vergangenheit', () => {
    const short = { endAtMs: now + 5_000, durationMs: 90_000, generation: 1 };
    const next = nudgeRest(short, -15, now);
    expect(next?.endAtMs).toBe(now);
    expect(next?.durationMs).toBe(85_000);
  });

  test('vorbei oder gestoppt: Kürzen ändert nichts', () => {
    const over = { endAtMs: now - 1_000, durationMs: 90_000, generation: 2 };
    expect(nudgeRest(over, -15, now)).toBe(over);
    const stopped = { ...running, stopped: true };
    expect(nudgeRest(stopped, -15, now)).toBe(stopped);
    expect(nudgeRest(null, -15, now)).toBeNull();
  });
});

/** Kontrast nach WCAG 2.1 zwischen zwei Hex-Farben. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('Platzhalter in der Satztabelle', () => {
  test.each(['light', 'dark'] as const)('Vorgabe (grau) auf dem Feldgrund hat mindestens 4,5:1 (%s)', (scheme) => {
    const c = Colors[scheme];
    expect(contrast(c.textSecondary, c.backgroundSelected)).toBeGreaterThanOrEqual(4.5);
  });

  test('ohne Vorgabe nur ein Strich – die Einheit („kg/Seite“) steht im Spaltenkopf', () => {
    expect(t('session.empty')).toBe('–');
    expect(t('logger.placeholder.einseitig', { unit: 'kg' })).toBe('kg/Seite');
  });
});

describe('✓ in einer leeren Zeile übernimmt die Vorgabe', () => {
  test('Gewicht und Wiederholungen', () => {
    expect(mergeSetInput({ weight: '', reps: '' }, { weight: '40', reps: '11' })).toEqual({ weight: '40', reps: '11' });
  });
  test('Zeit-Satz: die Sekunden stehen im zweiten Feld', () => {
    expect(mergeSetInput(undefined, { weight: '0', reps: '45' })).toEqual({ weight: '0', reps: '45' });
    expect(mergeSetInput({ weight: '0', reps: '50' }, { weight: '0', reps: '45' })).toEqual({ weight: '0', reps: '50' });
  });
});

describe('Tab-Leiste', () => {
  test('nur im Satz-Logger ausgeblendet', () => {
    expect(hidesTabBar('/training/session/abc')).toBe(true);
    expect(hidesTabBar('/training')).toBe(false);
    expect(hidesTabBar('/training/summary/abc')).toBe(false);
    expect(hidesTabBar('/')).toBe(false);
  });
});

describe('Einzahl und Mehrzahl im Training', () => {
  test('Fortschritt, Tage, Sätze, Runden', () => {
    expect(t('session.progress', { done: 0, count: 1 })).toBe('0 von 1 Satz');
    expect(t('session.progress', { done: 3, count: 17 })).toBe('3 von 17 Sätzen');
    expect(t('training.dayCount', { count: 1 })).toBe('1 Tag');
    expect(t('training.dayCount', { count: 4 })).toBe('4 Tage');
    expect(t('history.sets', { count: 1 })).toBe('1 Satz');
    expect(t('history.rounds', { count: 1 })).toBe('1 Runde');
    expect(t('training.muscleScale', { count: 10 })).toBe('Voller Balken: 10 Sätze pro Woche');
    expect(t('session.finishOpen', { count: 1 })).toContain('1 Satz offen');
    expect(t('stretch.summary', { count: 1, minutes: 3 })).toBe('1 Übung · ca. 3 min');
  });
});
