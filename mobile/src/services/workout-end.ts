// Training beenden (normal, abgebrochen oder vergessen): laufenden Zeit-Satz eintragen, Ende speichern, Pause beenden.

import type { Db } from '@/data/db';
import { completeTimedSet, finishSession, getSession, loadRestTimer, saveRestTimer } from '@/data/training';
import { stopRest } from '@/domain/training';

import { syncRestAlert } from './alerts';

export type WorkoutEnd = {
  status: 'abgeschlossen' | 'abgebrochen';
  reason?: string;
  /** Vergessenes Training: Ende = Zeitpunkt des letzten erledigten Satzes (ohne Satz: der Start). */
  stale?: boolean;
  /** Lief beim Beenden ein Zeit-Satz-Countdown: diese Sekunden werden vor dem Ende eingetragen – ohne neue Pause. */
  held?: { setId: string; seconds: number } | null;
};

/**
 * Reihenfolge zählt: Erst der laufende Zeit-Satz (sonst fehlt er in der Zusammenfassung), dann das Ende samt laufender
 * Cardio-Stoppuhren (finishSession), zuletzt Pause und Mitteilung „Pause vorbei“ aus – nach dem Training startet nichts mehr.
 */
export async function endWorkout(db: Db, sessionId: string, end: WorkoutEnd) {
  if (end.held) await completeTimedSet(db, end.held.setId, end.held.seconds);
  let finishedAt: string | undefined;
  if (end.stale) {
    const last = await db.getFirstAsync<{ at: string | null }>('SELECT MAX(completed_at_utc) AS at FROM set_log WHERE session_id = ?', sessionId);
    finishedAt = last?.at ?? (await getSession(db, sessionId))?.startedAt;
  }
  await finishSession(db, sessionId, end.status, end.reason, finishedAt);
  const stopped = stopRest(await loadRestTimer(db));
  await saveRestTimer(db, stopped);
  // Ein Fehler bei der Mitteilung darf das Beenden nicht aufhalten.
  await syncRestAlert(db, stopped).catch(() => undefined);
  return stopped;
}
