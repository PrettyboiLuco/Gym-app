// „Schultern zuletzt vor 9 Tagen“ (Idee aus dem fin-Vergleich, 10.11.2026): ein ruhiger Hinweis auf die Muskelgruppe
// aus dem eigenen Plan, die am längsten nicht trainiert wurde. Keine Warnfarbe, keine Mitteilung, keine Serie.

import { daysBetween } from './dates';
import type { MuscleGroup } from './exercises';
import type { Status } from './readiness';

/** Ab so vielen Tagen ohne Training erscheint der Hinweis (gut eine Woche: ein Plan mit 2 Einheiten pro Muskel/Woche bleibt still). */
export const NEGLECT_DAYS = 8;

export type NeglectInput = {
  /** Muskelgruppen, die im aktiven Plan vorkommen (Hauptmuskel der Kraftübungen). */
  planned: readonly MuscleGroup[];
  /** Letzter Tag mit erledigtem Arbeitssatz je Muskelgruppe (lokal, YYYY-MM-DD). */
  lastTrained: Partial<Record<MuscleGroup, string>>;
  today: string;
  /** Laufender Status (krank, verletzt, Pause): dann kein Hinweis. */
  status?: Status | null;
  /** Bei „verletzt“ geschonte Bereiche: nie als Hinweis. */
  spared?: readonly string[];
  minDays?: number;
};

/**
 * Die Muskelgruppe aus dem Plan, die am längsten nicht dran war – aber nur, wenn es mindestens `minDays` Tage sind.
 * Ohne Trainingshistorie, bei Status oder für Gruppen, die noch nie trainiert wurden (neuer Plan), kein Hinweis.
 * Ganzkörper zählt nicht als eigene Gruppe.
 */
export function neglectedMuscle(input: NeglectInput): { group: MuscleGroup; days: number; lastDay: string } | null {
  if (input.status) return null;
  const min = input.minDays ?? NEGLECT_DAYS;
  const spared = new Set(input.spared ?? []);
  let worst: { group: MuscleGroup; days: number; lastDay: string } | null = null;
  for (const group of new Set(input.planned)) {
    if (group === 'ganzkoerper' || spared.has(group)) continue;
    const last = input.lastTrained[group];
    if (!last) continue;
    const days = daysBetween(last, input.today);
    if (days < min) continue;
    if (!worst || days > worst.days || (days === worst.days && group < worst.group)) worst = { group, days, lastDay: last };
  }
  return worst;
}
