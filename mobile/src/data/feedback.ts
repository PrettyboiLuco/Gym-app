// Nutzungsübersicht (nur Anzahlen) und Feedback-Entwurf für den Pilot (BUS-016).

import { EMPTY_FEEDBACK, type FeedbackAnswers, type UsageSummary } from '@/domain/feedback';

import { readState, writeState } from './app-state';
import type { Db } from './db';

export async function usageSummary(db: Db): Promise<UsageSummary> {
  const one = async (sql: string) => (await db.getFirstAsync<{ n: number }>(sql))?.n ?? 0;
  const first = await db.getFirstAsync<{ day: string | null }>(
    `SELECT MIN(day) AS day FROM (
       SELECT substr(started_at_utc, 1, 10) AS day FROM workout_session
       UNION ALL SELECT diary_date FROM consumption_event
       UNION ALL SELECT day FROM weight_entry
       UNION ALL SELECT substr(started_at_utc, 1, 10) FROM timed_session)`
  );
  return {
    workouts: await one("SELECT COUNT(*) AS n FROM workout_session WHERE status <> 'aktiv'"),
    sets: await one('SELECT COUNT(*) AS n FROM set_log WHERE completed_at_utc IS NOT NULL'),
    diaryDays: await one('SELECT COUNT(DISTINCT diary_date) AS n FROM consumption_event'),
    stretchSessions: await one("SELECT COUNT(*) AS n FROM timed_session WHERE kind IN ('dehnen', 'cooldown', 'aufwaermen') AND status = 'abgeschlossen'"),
    hiitSessions: await one("SELECT COUNT(*) AS n FROM timed_session WHERE kind = 'hiit' AND status = 'abgeschlossen'"),
    activeGoals: await one(
      `SELECT COUNT(*) AS n FROM goal_version v WHERE v.status = 'aktiv'
       AND v.version = (SELECT MAX(version) FROM goal_version WHERE goal_id = v.goal_id)`
    ),
    weightEntries: await one('SELECT COUNT(*) AS n FROM weight_entry'),
    firstUseDay: first?.day ?? null,
  };
}

export async function loadFeedbackDraft(db: Db): Promise<FeedbackAnswers> {
  return { ...EMPTY_FEEDBACK, ...(await readState<Partial<FeedbackAnswers>>(db, 'feedback_draft', {})) };
}

export const saveFeedbackDraft = (db: Db, a: FeedbackAnswers) => writeState(db, 'feedback_draft', a);
