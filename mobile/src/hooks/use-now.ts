import { useEffect, useState } from 'react';

/**
 * Aktuelle Zeit in ms, aktualisiert im Takt, solange `active` wahr ist. Mit `untilMs` endet der Takt, sobald diese
 * Zeit erreicht ist (Pause oder Intervall vorbei) – sonst tickt die Uhr bis zum „OK“ weiter und kostet Akku.
 */
export function useNow(active: boolean, intervalMs = 250, untilMs: number | null = null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (untilMs !== null && t >= untilMs && id !== undefined) clearInterval(id);
    };
    const first = setTimeout(tick, 0); // sofort aktualisieren, nicht erst nach dem ersten Takt
    id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, intervalMs, untilMs]);
  return now;
}
