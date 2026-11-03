// Fasten-Timer (Ausbauplan B1, Entscheidung E2: abschaltbare Kann-Funktion, standardmäßig aus, bei „sensibler
// Situation“ ausgeblendet). Nur Zeitmessung nach eigener Wahl – keine Bewertung, keine Aussagen über Wirkungen.

import { DAY_MS } from './dates';

/** Vorlagen als Stunden Fasten : Stunden Essen. */
export const FASTING_TEMPLATES = [
  { id: '12:12', fastHours: 12 },
  { id: '14:10', fastHours: 14 },
  { id: '16:8', fastHours: 16 },
  { id: '18:6', fastHours: 18 },
] as const;
export type FastingTemplateId = (typeof FASTING_TEMPLATES)[number]['id'];

/** Grenzen für eigene Dauer (Stunden) – wie die CHECK-Bedingung der Tabelle fasting_period. */
export const FASTING_HOURS_RANGE = { min: 1, max: 48 } as const;

export type FastingSettings = {
  /** Kann-Funktion: standardmäßig aus (E2). */
  enabled: boolean;
  /** Geplante Fastendauer in Stunden (Vorlage oder eigene). */
  hours: number;
  /** Mitteilung am Ende des Fensters (nur mit Erlaubnis für Mitteilungen). */
  notify: boolean;
};

export const DEFAULT_FASTING: FastingSettings = { enabled: false, hours: 16, notify: true };

export type FastingPeriod = { id: string; startedAt: string; plannedHours: number; endedAt: string | null };

/** Ist der Fasten-Timer sichtbar? Nur eingeschaltet und nie bei „sensibler Situation“. */
export function fastingVisible(settings: Pick<FastingSettings, 'enabled'>, sensitive: boolean): boolean {
  return settings.enabled && !sensitive;
}

export function validFastingHours(hours: number): boolean {
  return Number.isFinite(hours) && hours >= FASTING_HOURS_RANGE.min && hours <= FASTING_HOURS_RANGE.max;
}

/** Vorlage zu einer Dauer, sonst null (eigene Dauer). */
export function templateFor(hours: number): FastingTemplateId | null {
  return FASTING_TEMPLATES.find((tpl) => tpl.fastHours === hours)?.id ?? null;
}

export type FastingPhase = 'laeuft' | 'erreicht';

export type FastingStatus = {
  phase: FastingPhase;
  elapsedMs: number;
  /** Bis zum geplanten Ende; 0, sobald erreicht. */
  remainingMs: number;
  /** 0…1 für den Ring; über dem Ziel 1. */
  progress: number;
  endAtMs: number;
};

/** Stand eines laufenden Fensters zum Zeitpunkt `nowMs` (Zeit vor dem Start zählt als 0). */
export function fastingStatus(period: Pick<FastingPeriod, 'startedAt' | 'plannedHours'>, nowMs: number): FastingStatus {
  const start = Date.parse(period.startedAt);
  const planned = period.plannedHours * 3_600_000;
  const elapsedMs = Math.max(0, nowMs - start);
  const remainingMs = Math.max(0, planned - elapsedMs);
  return {
    phase: remainingMs === 0 ? 'erreicht' : 'laeuft',
    elapsedMs,
    remainingMs,
    progress: planned > 0 ? Math.min(1, elapsedMs / planned) : 0,
    endAtMs: start + planned,
  };
}

/** Dauer eines beendeten Fensters in ms (0 bei unplausiblen Zeiten). */
export function fastingDurationMs(period: Pick<FastingPeriod, 'startedAt' | 'endedAt'>): number {
  if (!period.endedAt) return 0;
  return Math.max(0, Date.parse(period.endedAt) - Date.parse(period.startedAt));
}

/** Stunden und Minuten, z. B. 15 h 42 min → { hours: 15, minutes: 42 } (abgerundet auf ganze Minuten). */
export function splitDuration(ms: number): { hours: number; minutes: number } {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

export type FastingSummary = { count: number; reached: number; averageMs: number | null };

/**
 * Verlauf der letzten `days` Tage bis `nowMs`: Anzahl beendeter Fenster, davon mit erreichter geplanter Dauer, und
 * durchschnittliche Dauer. Reine Zählung – keine Wertung und keine Serie.
 */
export function fastingSummary(periods: FastingPeriod[], nowMs: number, days = 7): FastingSummary {
  const from = nowMs - days * DAY_MS;
  const done = periods.filter((p) => p.endedAt && Date.parse(p.endedAt) >= from && Date.parse(p.endedAt) <= nowMs);
  if (done.length === 0) return { count: 0, reached: 0, averageMs: null };
  const durations = done.map(fastingDurationMs);
  return {
    count: done.length,
    reached: done.filter((p, i) => durations[i] >= p.plannedHours * 3_600_000).length,
    averageMs: durations.reduce((s, d) => s + d, 0) / done.length,
  };
}
