import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import { cmToUnit, feetInches, kgToUnit, mlToUnit, type LengthUnit, type VolumeUnit, type WeightUnit } from '@/domain/units';

import { de } from './de';

const i18n = new I18n({ de });
i18n.defaultLocale = 'de';
i18n.enableFallback = true;

// Vorerst gibt es nur Deutsch. Sobald weitere Sprachen dazukommen, wird hier die
// Gerätesprache gewählt, sofern sie unterstützt wird.
const supported = ['de'];
const deviceLanguage = getLocales()[0]?.languageCode ?? 'de';
i18n.locale = supported.includes(deviceLanguage) ? deviceLanguage : 'de';

/** Text in der aktuellen Sprache, z. B. t('today.title'). */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

// Formatierer einmal je Sprache und Stellen anlegen: Export, Bericht und Statistik rufen das tausendfach auf.
const numberFormats = new Map<string, Intl.NumberFormat>();
const dayFormats = new Map<string, Intl.DateTimeFormat>();

/** Zahl im Format der aktuellen Sprache, z. B. 80,5. */
export function formatNumber(value: number, maximumFractionDigits = 1): string {
  const key = `${i18n.locale}|${maximumFractionDigits}`;
  let format = numberFormats.get(key);
  if (!format) {
    // Ohne Tausenderpunkt, damit angezeigte Zahlen wieder eingelesen werden können (z. B. 1000 kg).
    format = new Intl.NumberFormat(i18n.locale, { maximumFractionDigits, useGrouping: false });
    numberFormats.set(key, format);
  }
  return format.format(value);
}

/** Datumsformat (immer UTC, weil `day` ein Kalendertag ist) aus dem Zwischenspeicher. */
function dayFormat(kind: 'short' | 'full'): Intl.DateTimeFormat {
  const key = `${i18n.locale}|${kind}`;
  let format = dayFormats.get(key);
  if (!format) {
    format =
      kind === 'short'
        ? new Intl.DateTimeFormat(i18n.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
        : new Intl.DateTimeFormat(i18n.locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    dayFormats.set(key, format);
  }
  return format;
}

/** Datum (YYYY-MM-DD) im Format der aktuellen Sprache, z. B. 29.10.2026. */
/** Kurzes Datum für Diagramm-Achsen, z. B. „8. Okt.“. */
export function formatDayShort(day: string): string {
  return dayFormat('short').format(new Date(`${day}T00:00:00Z`));
}

export function formatDay(day: string): string {
  return dayFormat('full').format(new Date(`${day}T00:00:00Z`));
}

/** Langes Datum für Überschriften, z. B. Donnerstag, 29. Oktober. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat(i18n.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/** Gewicht aus kg in der gewählten Einheit, z. B. „80,5 kg“ oder „177,5 lb“. */
export function formatWeight(kg: number, unit: WeightUnit, digits = 1): string {
  return t(`units.${unit}`, { value: formatNumber(kgToUnit(kg, unit), digits) });
}

/** Länge aus cm in der gewählten Einheit, z. B. „82 cm“ oder „32,3 in“. */
export function formatLength(cm: number, unit: LengthUnit): string {
  return t(`units.${unit}`, { value: formatNumber(cmToUnit(cm, unit)) });
}

/** Menge aus ml, z. B. „250 ml“ oder „8,5 fl oz“; ab 1000 ml in Litern. */
export function formatVolume(ml: number, unit: VolumeUnit): string {
  if (unit === 'oz') return t('units.oz', { value: formatNumber(mlToUnit(ml, 'oz'), 1) });
  return ml >= 1000 ? t('units.l', { value: formatNumber(ml / 1000, 2) }) : t('units.ml', { value: formatNumber(ml, 0) });
}

/** Körpergröße: „180 cm“ bzw. „5′ 11″“. */
export function formatHeight(cm: number, unit: LengthUnit): string {
  if (unit === 'cm') return formatLength(cm, 'cm');
  const { feet, inches } = feetInches(cm);
  return t('units.feetInches', { feet, inches });
}

const MISSING = '\u0000fehlt';

/** Text, falls vorhanden, sonst null (z. B. Kurzanleitungen, die es nicht für jede Übung gibt). */
export function tOptional(key: string): string | null {
  const value = i18n.t(key, { defaultValue: MISSING });
  return value === MISSING ? null : value;
}
