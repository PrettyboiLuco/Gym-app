// Tagebuchdatum und Timer (Register TIME-001, TIME-003, HEALTH-011; Referenztests T-018 bis T-023).

/**
 * Zeitzone des Geräts (IANA, z. B. „Europe/Berlin“). Wird beim Zurückkehren in die App neu gelesen (refreshTimeZone),
 * damit nach einer Reise „heute“ und Erinnerungen in der neuen Zone gelten.
 */
export let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Zeitzone neu lesen (App wieder im Vordergrund). Gibt true zurück, wenn sie sich geändert hat. */
export function refreshTimeZone(): boolean {
  const next = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (next === timeZone) return false;
  timeZone = next;
  return true;
}

/** Ein Formatierer je Zeitzone: ihn bei jedem Aufruf neu anzulegen kostete bei Tausenden Sätzen (Statistik) Sekunden. */
const dayFormats = new Map<string, Intl.DateTimeFormat>();

/** Lokales Kalenderdatum (YYYY-MM-DD) eines Zeitpunkts in einer IANA-Zeitzone. */
export function localDay(at: Date, timeZone: string): string {
  let format = dayFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayFormats.set(timeZone, format);
  }
  return format.format(at);
}

/**
 * Lokaler Tag eines Trainings: in der Zone, in der es begann (seit Version 28 gespeichert), sonst in der des Geräts.
 * So rutscht ein Training nach einer Reise nicht auf einen anderen Tag.
 */
export function zoneDay(atUtc: string, tz: string | null | undefined): string {
  return localDay(new Date(atUtc), tz ?? timeZone);
}

/** Heutiges Kalenderdatum in der Zeitzone des Geräts. */
export function todayDay(): string {
  return localDay(new Date(), timeZone);
}

/** Verbleibende Timerzeit aus gespeicherter Endzeit; abgelaufen ergibt 0, nie negativ. */
export function remainingMs(endAtMs: number, nowMs: number): number {
  return Math.max(0, endAtMs - nowMs);
}

/** Jetzt in Millisekunden – nur in Event-Handlern aufrufen, nicht beim Rendern (Timer, Startzeiten). */
export const nowMs = () => Date.now();

/** Ein Formatierer je Zeitzone für Datum und Uhrzeit (Rückrechnung Ortszeit → UTC). */
const partFormats = new Map<string, Intl.DateTimeFormat>();

/** Versatz der Zeitzone zu UTC in Minuten zu einem Zeitpunkt (Berlin im Winter: 60). */
function offsetMinutes(atMs: number, timeZone: string): number {
  let format = partFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    partFormats.set(timeZone, format);
  }
  const p = Object.fromEntries(format.formatToParts(new Date(atMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute));
  return Math.round((asUtc - Math.floor(atMs / 60_000) * 60_000) / 60_000);
}

/**
 * Ortszeit (Kalendertag + Minuten seit Mitternacht) in einer Zeitzone als UTC-Zeitpunkt, z. B. für ein nachgetragenes
 * Training. Bei der Zeitumstellung gilt: Eine übersprungene Uhrzeit (2:30 im März) rückt eine Stunde vor, eine doppelte
 * (2:30 im Oktober) ist die zweite (nach der Umstellung).
 */
export function zonedTime(day: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const naive = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const first = naive - offsetMinutes(naive, timeZone) * 60_000;
  return new Date(naive - offsetMinutes(first, timeZone) * 60_000);
}

/** Minuten seit Mitternacht eines Zeitpunkts in einer Zeitzone (Gegenstück zu `zonedTime`). */
export function localMinutes(at: Date, timeZone: string): number {
  const ms = at.getTime();
  const local = ms + offsetMinutes(ms, timeZone) * 60_000;
  return Math.floor((((local / 60_000) % 1440) + 1440) % 1440);
}
