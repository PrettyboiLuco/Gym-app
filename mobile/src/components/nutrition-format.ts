// Gemeinsame Anzeige- und Navigationshilfen für den Ernährungsbereich.

import { cachedDayEnd, cachedMealTimes, type EventUnit, type Target, type When } from '@/data/nutrition';
import { MICRO_KEYS, MICRO_UNITS, type Micros } from '@/domain/basis-foods';
import { shiftDay } from '@/domain/dates';
import { suggestMealAt } from '@/domain/diet';
import { DRINK_TYPES, MEALS, NUTRIENT_KEYS, type DrinkType, type Meal, type NutrientTotals, type Nutrients } from '@/domain/nutrition';
import { localDay, timeZone, todayDay } from '@/domain/time';
import { formatDay, formatNumber, t } from '@/i18n';

/**
 * Heutiger Ernährungstag (A3): Endet der Tag laut Einstellung z. B. um 4 Uhr, zählt ein Eintrag um 1 Uhr noch zum
 * Vortag. Ohne Einstellung ist das der Kalendertag.
 */
export function diaryToday(nowMs = Date.now()) {
  const end = cachedDayEnd();
  const now = new Date(nowMs);
  const today = localDay(now, timeZone);
  return end > 0 && now.getHours() < end ? shiftDay(today, -1) : today;
}

/** Jetzt erfasst, aber auf den gewählten Tag gebucht (Nachtrag, TIME-001). */
export function whenFor(diaryDate: string): When {
  return { diaryDate, at: new Date(), timeZone };
}

export function formatKcal(value: number | null) {
  return value === null ? t('nutrition.kcalUnknown') : t('nutrition.kcal', { value: formatNumber(value, 0) });
}

export function formatAmount(amount: number, unit: EventUnit) {
  return t(`nutrition.units.${unit}`, { value: formatNumber(amount) });
}

function formatGram(value: number | null) {
  return value === null ? t('nutrition.unknown') : t('nutrition.gram', { value: formatNumber(value) });
}

/** z. B. „Eiweiß 12 g · Kohlenhydrate 30 g · Fett unbekannt“. */
export function macroLine(n: Nutrients) {
  return [
    `${t('nutrition.protein')} ${formatGram(n.protein)}`,
    `${t('nutrition.carbs')} ${formatGram(n.carbs)}`,
    `${t('nutrition.fat')} ${formatGram(n.fat)}`,
    // Ballaststoffe nur, wenn bekannt – ältere Einträge haben dafür keinen Wert.
    ...(n.fiber !== null ? [`${t('nutrition.fiber')} ${formatGram(n.fiber)}`] : []),
  ].join(' · ');
}

/** Zucker, gesättigte Fettsäuren, Salz (A3) – nur die bekannten; null, wenn keiner bekannt ist. */
export function extraLine(n: Nutrients) {
  const parts = (['sugar', 'satFat', 'salt'] as const).filter((key) => n[key] != null).map((key) => `${t(`nutrition.${key}`)} ${formatGram(n[key] ?? null)}`);
  return parts.length ? parts.join(' · ') : null;
}

/** Vitamine und Mineralstoffe (A4), z. B. „Calcium 120 mg · Eisen 2,1 mg“ – nur bekannte Werte. */
export function microLine(m: Micros | null) {
  if (!m) return null;
  const parts = MICRO_KEYS.filter((k) => m[k] != null && m[k]! > 0).map(
    (k) => `${t(`micros.${k}`)} ${formatNumber(m[k]!, m[k]! < 10 ? 1 : 0)} ${MICRO_UNITS[k]}`
  );
  return parts.length ? parts.join(' · ') : null;
}

/** Tagessumme der Zusatzwerte; „≥“, wenn bei manchen Einträgen der Wert fehlt. Null, wenn nichts bekannt ist. */
export function extraSumLine(totals: NutrientTotals) {
  const parts = (['sugar', 'satFat', 'salt'] as const)
    .filter((key) => totals.values[key] > 0)
    .map((key) => `${t(`nutrition.${key}`)} ${totals.unknown[key] > 0 ? '≥ ' : ''}${formatGram(totals.values[key])}`);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Summe mit Unbekannten (TRACK-002): „≥ 300 kcal“, wenn etwas fehlt; nur Unbekanntes ergibt „?“.
 * Nie wird ein unbekannter Wert als 0 angezeigt.
 */
export function formatKcalSum(totals: NutrientTotals) {
  const { values, unknown } = totals;
  if (unknown.kcal > 0 && values.kcal === 0) return t('nutrition.kcalUnknown');
  return `${unknown.kcal > 0 ? '≥ ' : ''}${formatKcal(values.kcal)}`;
}

export function macroSumLine(totals: NutrientTotals) {
  const shown = { ...totals.values } as Nutrients;
  const prefix: Record<string, string> = {};
  for (const key of NUTRIENT_KEYS) {
    if (totals.unknown[key] > 0) {
      if (totals.values[key] === 0) shown[key] = null;
      else prefix[key] = '≥ ';
    }
  }
  return [
    `${t('nutrition.protein')} ${prefix.protein ?? ''}${formatGram(shown.protein)}`,
    `${t('nutrition.carbs')} ${prefix.carbs ?? ''}${formatGram(shown.carbs)}`,
    `${t('nutrition.fat')} ${prefix.fat ?? ''}${formatGram(shown.fat)}`,
    `${t('nutrition.fiber')} ${prefix.fiber ?? ''}${formatGram(shown.fiber)}`,
  ].join(' · ');
}

export function dayLabel(day: string) {
  const today = todayDay();
  if (day === today) return t('nutrition.today');
  if (day === shiftDay(today, -1)) return t('nutrition.yesterday');
  return formatDay(day);
}

// ---------------------------------------------------------------------- Routen-Parameter

/** Ziel einer Buchung als Suchparameter: ?day=…&meal=… oder ?day=…&drink=… */
export type TargetParams = { day?: string; meal?: string; drink?: string };

export function readTarget(params: TargetParams): { day: string; target: Target } {
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : diaryToday();
  if (params.drink !== undefined) {
    const drinkType = (DRINK_TYPES as readonly string[]).includes(params.drink) ? (params.drink as DrinkType) : 'sonstiges';
    return { day, target: { kind: 'getraenk', drinkType } };
  }
  const meal = (MEALS as readonly string[]).includes(params.meal ?? '') ? (params.meal as Meal) : suggestMealAt(new Date().getHours(), cachedMealTimes());
  return { day, target: { kind: 'essen', meal } };
}

export function targetParams(day: string, target: Target): Record<string, string> {
  return target.kind === 'essen' ? { day, meal: target.meal } : { day, drink: target.drinkType };
}
