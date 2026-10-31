// Verbindet Timer und Einstellungen mit den lokalen Mitteilungen (Register HEALTH-012, UX-006/007, TIME-011).

import type { Db } from '@/data/db';
import { cancelAlerts, replaceAlerts, replaceReminders, type Repeating } from '@/data/notifications';
import { loadReminders } from '@/data/reminders';
import { drinkTimes, parseTime, timerAlertBudget, toExpoWeekday, upcomingAlerts, type ReminderSettings } from '@/domain/reminders';
import { runElapsedMs, type TimedRun } from '@/domain/timeline';
import type { IntervalConfig, RestTimer } from '@/domain/training';
import { t } from '@/i18n';

const REST = 'timer-pause-';
const RUN = 'timer-ablauf-';

/** Pausenende als Mitteilung, damit es auch bei gesperrtem Handy ankommt. */
export async function syncRestAlert(db: Db, timer: RestTimer) {
  const settings = await loadReminders(db);
  if (!settings.timerAlerts || !timer || timer.stopped) return cancelAlerts(REST);
  await replaceAlerts(REST, [{ id: String(timer.generation), atMs: timer.endAtMs, title: t('alerts.restTitle'), body: t('alerts.restBody') }]);
}

/** Kommende Wechsel eines Dehn-/HIIT-Ablaufs; bei Pause oder Ende werden sie gelöscht. */
export async function syncRunAlerts(db: Db, run: TimedRun | null, nameOf: (id: string) => string) {
  const settings = await loadReminders(db);
  if (!settings.timerAlerts || !run || run.pausedAtMs !== null) return cancelAlerts(RUN);
  const now = Date.now();
  const alerts = upcomingAlerts(run.steps, runElapsedMs(run, now), now, timerAlertBudget(settings)).map((a, i) => ({
    id: String(i),
    atMs: a.atMs,
    title: run.title,
    body:
      a.kind === 'ende'
        ? t('run.speak.done')
        : a.kind === 'seitenwechsel'
          ? t('run.speak.switch')
          : a.kind === 'pause' || a.kind === 'rundenpause' || a.kind === 'wechsel'
            ? t('run.speak.pause', { name: nameOf(a.exerciseId ?? '') })
            : t('run.speak.exercise', { name: nameOf(a.exerciseId ?? '') }),
  }));
  await replaceAlerts(RUN, alerts);
}

/** Intervall-Timer: Hinweis bei jedem Wechsel zwischen Belastung und Pause. */
export async function syncIntervalAlerts(db: Db, config: IntervalConfig | null, startedAtMs: number | null) {
  const settings = await loadReminders(db);
  if (!settings.timerAlerts || !config || startedAtMs === null) return cancelAlerts(RUN);
  const alerts = [];
  const budget = timerAlertBudget(settings);
  let at = startedAtMs;
  for (let round = 1; round <= config.rounds && alerts.length < budget; round++) {
    at += config.workSeconds * 1000;
    const last = round === config.rounds;
    alerts.push({ id: `${round}-a`, atMs: at, title: t('interval.title'), body: last ? t('interval.phase.fertig') : t('interval.phase.pause') });
    if (last) break;
    at += config.restSeconds * 1000;
    alerts.push({ id: `${round}-p`, atMs: at, title: t('interval.title'), body: t('interval.phase.arbeit') });
  }
  await replaceAlerts(RUN, alerts);
}

export async function cancelRunAlerts() {
  await cancelAlerts(RUN);
}

/** Wiederkehrende Erinnerungen neu planen (Training an Wochentagen, Trinken im Zeitfenster). */
export async function applyReminders(settings: ReminderSettings) {
  const list: Repeating[] = [];
  const trainingAt = parseTime(settings.training.time);
  if (settings.training.enabled && trainingAt !== null) {
    for (const weekday of settings.training.weekdays) {
      list.push({
        id: `training-${weekday}`,
        kind: 'weekly',
        weekday: toExpoWeekday(weekday),
        hour: Math.floor(trainingAt / 60),
        minute: trainingAt % 60,
        title: t('alerts.trainingTitle'),
        body: t('alerts.trainingBody'),
      });
    }
  }
  if (settings.drink.enabled) {
    for (const at of drinkTimes(settings.drink.from, settings.drink.to, settings.drink.everyHours)) {
      list.push({
        id: `trinken-${at}`,
        kind: 'daily',
        hour: Math.floor(at / 60),
        minute: at % 60,
        title: t('alerts.drinkTitle'),
        body: t('alerts.drinkBody'),
      });
    }
  }
  await replaceReminders(list);
}
