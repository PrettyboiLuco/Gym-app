// Tagebuchdatum und Timer (Register TIME-001, TIME-003, HEALTH-011; Referenztests T-018 bis T-023).

/** Zeitzone des Geräts (IANA, z. B. „Europe/Berlin“). */
export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Lokales Kalenderdatum (YYYY-MM-DD) eines Zeitpunkts in einer IANA-Zeitzone. */
export function localDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Heutiges Kalenderdatum in der Zeitzone des Geräts. */
export function todayDay(): string {
  return localDay(new Date(), timeZone);
}

/** Verbleibende Timerzeit aus gespeicherter Endzeit; abgelaufen ergibt 0, nie negativ. */
export function remainingMs(endAtMs: number, nowMs: number): number {
  return Math.max(0, endAtMs - nowMs);
}

/** Ein Alarm gilt nur, wenn er zur aktuellen Timer-Generation gehört (verhindert Altalarme). */
export function isCurrentAlarm(alarmGeneration: number, timerGeneration: number): boolean {
  return alarmGeneration === timerGeneration;
}

/** Jetzt in Millisekunden – nur in Event-Handlern aufrufen, nicht beim Rendern (Timer, Startzeiten). */
export const nowMs = () => Date.now();
