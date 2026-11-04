// Zeitplan der Fenster „Platte federt auf“ (getlayers loader-lumora): Verzögerung je Zeile und wann Wischen schließt.

import { SheetMotion } from '@/constants/motion';

/**
 * Verzögerung einer Zeile ab dem START der Öffnen-Bewegung: erst die Leiter der Vorlage (150 … 900 ms), danach je
 * Zeile 100 ms mehr, höchstens 1200 ms – lange Listen warten so nie ewig.
 */
export function rowDelay(index: number): number {
  const ladder = SheetMotion.rowLadderMs;
  const i = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  if (i < ladder.length) return ladder[i];
  return Math.min(ladder[ladder.length - 1] + (i - ladder.length + 1) * SheetMotion.rowStepMs, SheetMotion.rowMaxMs);
}

/** Wie lange eine Zeile jetzt noch warten muss; später eingehängte Zeilen (Inhalt ändert sich) kommen sofort. */
export function remainingDelay(index: number, gateAt: number, now: number): number {
  return Math.max(0, gateAt + rowDelay(index) - now);
}

/** Wischen nach unten schließt ab 120 px Weg oder mit Schwung (> 800 px/s); sonst federt die Platte zurück. */
export function shouldDismiss(translationY: number, velocityY: number): boolean {
  'worklet';
  return translationY > SheetMotion.dismissPx || velocityY > SheetMotion.dismissVelocity;
}
