// Verbindet Timer und Einstellungen mit den lokalen Mitteilungen (Register HEALTH-012, UX-006/007, TIME-011).

import type { Db } from '@/data/db';
import { currentFast, loadFastingSettings } from '@/data/fasting';
import {
  cancelAlerts,
  cancelEverything,
  notificationPermission,
  NOTIFICATIONS_SUPPORTED,
  replaceAlerts,
  replaceReminders,
  type Repeating,
} from '@/data/notifications';
import { loggedMeals } from '@/data/nutrition';
import { loadProfile } from '@/data/profile';
import { loadSleepGoal, loadWakeTime, statusToday } from '@/data/readiness';
import { loadReminders } from '@/data/reminders';
import { supplementReminders } from '@/data/supplements';
import { shiftDay } from '@/domain/dates';
import { fastingStatus, fastingVisible } from '@/domain/fasting';
import { effectiveModules } from '@/domain/modules';
import { bedtimeFor } from '@/domain/readiness';
import {
  BEDTIME_LEAD_MINUTES,
  drinkTimes,
  MEAL_REMINDER_MAX_DAYS,
  mealReminderPlan,
  parseTime,
  timerAlertBudget,
  toExpoWeekday,
  upcomingAlerts,
  type ReminderSettings,
} from '@/domain/reminders';
import { todayDay } from '@/domain/time';
import { runElapsedMs, type TimedRun } from '@/domain/timeline';
import type { IntervalConfig, RestTimer } from '@/domain/training';
import { t } from '@/i18n';

import { diaryToday } from './nutrition-format';

const REST = 'timer-pause-';
const RUN = 'timer-ablauf-';
const MEALS_PREFIX = 'mahlzeit-';
const FASTING_PREFIX = 'fasten-';
/** Ein Platz bleibt immer für das Ende des Fasten-Fensters reserviert. */
const FASTING_SLOT = 1;
// Zuletzt geplante Mahlzeit-Erinnerungen: unverändert = nichts neu planen (das Tagebuch ruft das oft auf).
// null = unbekannt (App-Start, nach applyReminders oder nach dem Löschen aller Mitteilungen) – dann immer neu planen.
let lastMealPlan: string | null = null;

/** Weitere geplante Mitteilungen neben den Erinnerungs-Einstellungen: Supplements und Fasten-Ende. */
async function otherReminders(db: Db) {
  return (await supplementReminders(db)).length + FASTING_SLOT;
}

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
  const budget = timerAlertBudget(settings, await otherReminders(db));
  const alerts = upcomingAlerts(run.steps, runElapsedMs(run, now), now, budget).map((a, i) => ({
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
  const budget = timerAlertBudget(settings, await otherReminders(db));
  let at = startedAtMs;
  for (let round = 1; round <= config.rounds && alerts.length < budget; round++) {
    at += config.workSeconds * 1000;
    const last = round === config.rounds;
    alerts.push({ id: `${round}-a`, atMs: at, title: t('interval.title'), body: last ? t('interval.phase.fertig') : t('interval.phase.pause') });
    // Zwei Hinweise je Runde: vor dem zweiten erneut das Limit prüfen (Phase 1 Scan).
    if (last || alerts.length >= budget) break;
    at += config.restSeconds * 1000;
    alerts.push({ id: `${round}-p`, atMs: at, title: t('interval.title'), body: t('interval.phase.arbeit') });
  }
  await replaceAlerts(RUN, alerts);
}

export async function cancelRunAlerts() {
  await cancelAlerts(RUN);
}

/** Alle geplanten Mitteilungen löschen (Sicherung einspielen, alles löschen); der Plan-Zwischenspeicher gilt dann nicht mehr. */
export async function cancelAllAlerts() {
  lastMealPlan = null;
  await cancelEverything();
}

/**
 * Wiederkehrende Erinnerungen neu planen (Training an Wochentagen, Trinken im Zeitfenster, Morgen-Check, Bettzeit,
 * Supplements). Bei Status krank/verletzt/Pause (A6.7) entfallen die Trainingserinnerungen, bis der Status endet.
 */
export async function applyReminders(db: Db, settings: ReminderSettings) {
  const list: Repeating[] = [];
  const trainingAt = parseTime(settings.training.time);
  const paused = (await statusToday(db, todayDay())) !== null;
  if (settings.training.enabled && trainingAt !== null && !paused) {
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
  const modules = effectiveModules((await loadProfile(db)).modules);
  if (settings.drink.enabled && modules.ernaehrung) {
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
  const morningAt = parseTime(settings.morning.time);
  if (settings.morning.enabled && morningAt !== null && modules.bereitschaft) {
    list.push({
      id: 'morgen-check',
      kind: 'daily',
      hour: Math.floor(morningAt / 60),
      minute: morningAt % 60,
      title: t('alerts.morningTitle'),
      body: t('alerts.morningBody'),
    });
  }
  const wake = await loadWakeTime(db);
  // Bettzeit gehört zur Bereitschaft, Supplements zur Ernährung: ausgeschaltete Bereiche erinnern nicht (Phase 1 Scan).
  const bed = settings.bedtime.enabled && wake && modules.bereitschaft ? bedtimeFor(wake, await loadSleepGoal(db)) : null;
  if (bed !== null) {
    const at = (bed - BEDTIME_LEAD_MINUTES + 1440) % 1440;
    list.push({ id: 'bettzeit', kind: 'daily', hour: Math.floor(at / 60), minute: at % 60, title: t('alerts.bedtimeTitle'), body: t('alerts.bedtimeBody') });
  }
  for (const s of modules.ernaehrung ? await supplementReminders(db) : []) {
    const at = parseTime(s.reminderTime ?? '');
    if (at === null) continue;
    list.push({
      id: `supplement-${s.id}`,
      kind: 'daily',
      hour: Math.floor(at / 60),
      minute: at % 60,
      title: t('supplements.reminderTitle'),
      body: t('supplements.reminderBody', { name: s.name }),
    });
  }
  await replaceReminders(list);
  // Mahlzeit-Erinnerungen und Fasten-Ende hängen an denselben Einstellungen, Modulen und der Sicherung.
  lastMealPlan = null;
  await syncMealReminders(db, diaryToday());
  await syncFastingAlert(db);
}

/**
 * Mahlzeit-Erinnerungen (B1, W4) für die nächsten Tage neu planen: nur, wenn für die Mahlzeit an dem Tag noch nichts
 * eingetragen ist. Läuft beim Öffnen des Tagebuchs, nach jedem Eintragen (der Bildschirm lädt neu) und beim
 * Speichern der Einstellungen – so fällt die heutige Mitteilung einer Mahlzeit weg, sobald etwas eingetragen ist.
 * Ohne Erlaubnis für Mitteilungen passiert nichts.
 */
export async function syncMealReminders(db: Db, today: string, nowMs = Date.now()) {
  if (!NOTIFICATIONS_SUPPORTED) return;
  if ((await notificationPermission(false)) !== 'granted') {
    // Erlaubnis entzogen: nichts mehr geplant lassen und beim nächsten Mal sicher neu planen.
    lastMealPlan = null;
    return cancelAlerts(MEALS_PREFIX);
  }
  const [settings, profile] = await Promise.all([loadReminders(db), loadProfile(db)]);
  const on = effectiveModules(profile.modules).ernaehrung;
  const logged = await loggedMeals(db, today, shiftDay(today, MEAL_REMINDER_MAX_DAYS));
  const plan = on ? mealReminderPlan(settings, today, nowMs, logged, await otherReminders(db)) : [];
  const key = plan.map((a) => `${a.id}@${a.atMs}`).join(',');
  // Ein leerer Plan (alles aus, Ernährung aus) löscht immer – sonst kämen schon geplante Mitteilungen noch Tage weiter.
  if (plan.length > 0 && key === lastMealPlan) return;
  lastMealPlan = key;
  await replaceAlerts(
    MEALS_PREFIX,
    plan.map((a) => ({
      id: a.id,
      atMs: a.atMs,
      title: t('alerts.mealTitle', { meal: t(`nutrition.meals.${a.meal}`) }),
      body: t('alerts.mealBody', { meal: t(`nutrition.meals.${a.meal}`) }),
    }))
  );
}

/**
 * Ende des Fasten-Fensters als Mitteilung (B1, W8): nur wenn der Fasten-Timer eingeschaltet, keine „sensible Situation“
 * angegeben, die Mitteilung gewünscht und erlaubt ist und ein Fenster läuft. Sonst wird sie gelöscht.
 */
export async function syncFastingAlert(db: Db) {
  if (!NOTIFICATIONS_SUPPORTED) return;
  const [settings, profile, fast] = await Promise.all([loadFastingSettings(db), loadProfile(db), currentFast(db)]);
  const wanted = fastingVisible(settings, profile.sensitive) && settings.notify && fast !== null;
  if (!wanted || (await notificationPermission(false)) !== 'granted') return cancelAlerts(FASTING_PREFIX);
  const status = fastingStatus(fast, Date.now());
  await replaceAlerts(FASTING_PREFIX, [{ id: 'ende', atMs: status.endAtMs, title: t('fasting.alertTitle'), body: t('fasting.alertBody') }]);
}
