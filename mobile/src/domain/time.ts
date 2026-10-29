// Tagebuchdatum und Timer (Register TIME-001, TIME-003, HEALTH-011; Referenztests T-018 bis T-023).

/** Lokales Kalenderdatum (YYYY-MM-DD) eines Zeitpunkts in einer IANA-Zeitzone. */
export function localDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Verbleibende Timerzeit aus gespeicherter Endzeit; abgelaufen ergibt 0, nie negativ. */
export function remainingMs(endAtMs: number, nowMs: number): number {
  return Math.max(0, endAtMs - nowMs);
}

/** Ein Alarm gilt nur, wenn er zur aktuellen Timer-Generation gehört (verhindert Altalarme). */
export function isCurrentAlarm(alarmGeneration: number, timerGeneration: number): boolean {
  return alarmGeneration === timerGeneration;
}
