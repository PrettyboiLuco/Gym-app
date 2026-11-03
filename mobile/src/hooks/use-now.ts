import { useLayoutEffect, useState } from 'react';

/**
 * Aktuelle Zeit in ms, aktualisiert im Takt, solange `active` wahr ist. Mit `untilMs` endet der Takt, sobald diese
 * Zeit erreicht ist (Pause oder Intervall vorbei) – sonst tickt die Uhr bis zum „OK“ weiter und kostet Akku.
 * Beim Einschalten gilt sofort die aktuelle Zeit, nicht die vom ersten Anzeigen (sonst kurz falsche, auch negative Dauer).
 */
export function useNow(active: boolean, intervalMs = 250, untilMs: number | null = null): number {
  const [now, setNow] = useState(() => Date.now());
  // Layout-Effekt: Die erste Aktualisierung kommt vor dem Zeichnen, so ist schon die erste Anzeige richtig.
  useLayoutEffect(() => {
    if (!active) return;
    // Gibt zurück, ob `untilMs` erreicht ist und der Takt enden kann.
    const tick = () => {
      const t = Date.now();
      setNow(t);
      return untilMs !== null && t >= untilMs;
    };
    if (tick()) return; // sofort aktualisieren, nicht erst nach dem ersten Takt
    const id = setInterval(() => {
      if (tick()) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, untilMs]);
  return now;
}
