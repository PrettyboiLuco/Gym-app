// Trainingswoche Mo–So für „Heute“ und den Abschluss-Bildschirm: eine Quelle für Punkte und Zusammenfassung.

import { timeZone } from '@/components/nutrition-format';
import { weekStart } from '@/domain/goals';
import { trainedDays } from '@/domain/summary';
import { localDay } from '@/domain/time';

import { loadCoachSetup } from './coach';
import type { Db } from './db';
import { listSessions } from './training';

export type TrainingWeek = { done: boolean[]; planned: boolean[]; goal: number | null; todayIndex: number };

export async function loadTrainingWeek(db: Db, today: string): Promise<TrainingWeek> {
  const [sessions, setup] = await Promise.all([listSessions(db, 30), loadCoachSetup(db)]);
  const monday = weekStart(today);
  const days = sessions.filter((s) => s.status === 'abgeschlossen').map((s) => localDay(new Date(s.startedAt), timeZone));
  return {
    done: trainedDays(days, monday),
    // Geplante Trainingstage aus dem Coach (ISO: 1 = Montag … 7 = Sonntag).
    planned: Array.from({ length: 7 }, (_, i) => (setup?.trainingWeekdays ?? []).includes(i + 1)),
    goal: setup?.gymDays ?? null,
    todayIndex: trainedDays([today], monday).indexOf(true),
  };
}
