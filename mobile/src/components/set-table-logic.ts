// Reine Regeln der Satztabelle und der Trainings-Animationen (ohne React): Eingabe/Vorgabe, Zeilenstatus, nächste Zeile,
// Puls der Pause, Pause verlängern/kürzen, Partikel der Bestleistung, Zielrahmen des Scanners. Getestet in
// __tests__/ui-training-set-table.test.ts und __tests__/ui3-training-logger.test.ts.
import { extendRest, type RestTimer } from '@/domain/training';

/** Eingabe einer Satzzeile, so wie sie in den Feldern steht (Text, noch nicht geprüft). */
export type SetInput = { weight: string; reps: string };

/**
 * Was beim Abhaken zählt: Getipptes vor der grauen Vorgabe – je Feld. Wer nur das Gewicht ändert, übernimmt die
 * Wiederholungen der Vorgabe (wie Hevy/Strong). Ein geleertes Feld fällt auf die Vorgabe zurück.
 */
export function mergeSetInput(typed: SetInput | undefined, suggestion: SetInput): SetInput {
  return {
    weight: typed && typed.weight.trim() !== '' ? typed.weight : suggestion.weight,
    reps: typed && typed.reps.trim() !== '' ? typed.reps : suggestion.reps,
  };
}

export type SetRowState = 'done' | 'current' | 'open' | 'missed';

/** Zustand einer Satzzeile: erledigt, gerade dran (erster offener Satz), offen, oder im beendeten Training nicht gemacht. */
export function setRowState(row: { id: string; completedAt: string | null }, active: boolean, currentId: string | null): SetRowState {
  if (row.completedAt) return 'done';
  if (!active) return 'missed';
  return row.id === currentId ? 'current' : 'open';
}

/** Nach dem Abhaken von `doneId`: die nächste offene Zeile in Trainingsreihenfolge (Supersätze stehen schon verschränkt). */
export function nextOpenRow(rows: { id: string; completedAt: string | null }[], doneId: string): string | null {
  return rows.find((r) => !r.completedAt && r.id !== doneId)?.id ?? null;
}

/** Pausen-Ring pulsiert in den letzten Sekunden (N5): Sekunde 3, 2, 1 – nicht bei 0 und nicht davor. */
export function restPulseSecond(remainingMs: number, lastSeconds: number): number | null {
  if (!(remainingMs > 0)) return null;
  const s = Math.ceil(remainingMs / 1000);
  return s <= lastSeconds ? s : null;
}

/**
 * Pause in der Leiste um ±15 s ändern. Verlängern wie bisher (extendRest); Kürzen nie unter „jetzt“ – wer mehr kürzt,
 * als übrig ist, beendet die Pause genau jetzt. Die Gesamtdauer schrumpft mit, damit der Fortschritt stimmt.
 */
export function nudgeRest(timer: RestTimer, seconds: number, nowMs: number): RestTimer {
  if (seconds >= 0) return extendRest(timer, seconds, nowMs);
  if (!timer || timer.stopped) return timer;
  const left = Math.max(0, timer.endAtMs - nowMs);
  if (left === 0) return timer;
  const cut = Math.min(left, -seconds * 1000);
  return { endAtMs: timer.endAtMs - cut, durationMs: Math.max(timer.durationMs - cut, left - cut), generation: timer.generation + 1 };
}

/** Bisher gehaltene Sekunden eines Zeit-Satz-Countdowns (vorzeitig gestoppt oder Training beendet): 1 bis Ziel. */
export function heldSeconds(hold: { seconds: number; endAtMs: number }, nowMs: number): number {
  const left = Math.max(0, hold.endAtMs - nowMs) / 1000;
  return Math.min(hold.seconds, Math.max(1, Math.round(hold.seconds - left)));
}

export type Particle = { dx: number; dy: number; size: number; delayMs: number; lime: boolean };

/**
 * Partikel für den Burst einer Bestleistung (N6): gleichmäßig im Kreis verteilt (goldener Winkel gegen Klumpen),
 * Weite und Größe leicht verschieden – fest berechnet, damit jeder Burst gleich aussieht und testbar ist.
 */
export function burstParticles(count: number, distance: number): Particle[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => {
    const angle = i * golden;
    const reach = distance * (0.7 + 0.3 * (((i * 7) % 5) / 4));
    return {
      dx: Math.round(Math.cos(angle) * reach * 10) / 10,
      dy: Math.round(Math.sin(angle) * reach * 10) / 10,
      size: 4 + (i % 3) * 2,
      delayMs: (i % 4) * 30,
      lime: i % 3 !== 2,
    };
  });
}

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Zielrahmen, auf den sich die Scanner-Ecken zusammenziehen (N9). Die Kamera meldet die Lage des Codes nicht immer
 * (leer oder außerhalb des Bilds, je nach Gerät) – dann zieht sich der Rahmen zur Mitte. Immer im Kamerafeld,
 * mit etwas Rand um den Code und nie kleiner als `min`.
 */
export function scanTargetRect(bounds: Rect | null | undefined, box: { width: number; height: number }, min = 56, pad = 10): Rect {
  const center = (w: number, h: number): Rect => ({ x: (box.width - w) / 2, y: (box.height - h) / 2, width: w, height: h });
  const fallback = center(Math.min(box.width * 0.5, 180), Math.min(box.height * 0.3, 96));
  if (!bounds || !(bounds.width > 0) || !(bounds.height > 0) || ![bounds.x, bounds.y].every(Number.isFinite)) return fallback;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  if (cx < 0 || cy < 0 || cx > box.width || cy > box.height) return fallback;
  const width = Math.min(box.width, Math.max(min, bounds.width + 2 * pad));
  const height = Math.min(box.height, Math.max(min, bounds.height + 2 * pad));
  const x = Math.min(Math.max(0, cx - width / 2), box.width - width);
  const y = Math.min(Math.max(0, cy - height / 2), box.height - height);
  return { x, y, width, height };
}
