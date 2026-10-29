import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

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

/** Zahl im Format der aktuellen Sprache, z. B. 80,5. */
export function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits }).format(value);
}

/** Datum (YYYY-MM-DD) im Format der aktuellen Sprache, z. B. 29.10.2026. */
export function formatDay(day: string): string {
  return new Intl.DateTimeFormat(i18n.locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));
}

/** Langes Datum für Überschriften, z. B. Donnerstag, 29. Oktober. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat(i18n.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}
