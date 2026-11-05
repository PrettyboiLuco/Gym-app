// Tagebuchdatum und Timer (Register TIME-001, TIME-003, HEALTH-011; Referenztests T-018 bis T-023).

/** Zeitzone des Geräts (IANA, z. B. „Europe/Berlin“). */
export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
