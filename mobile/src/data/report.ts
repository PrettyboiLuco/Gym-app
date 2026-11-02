// Bericht für Trainer oder Arzt (A5.5) und „Zusammenfassung für deine KI“ (A5.6): Zahlen eines Zeitraums, ohne
// Bewertung. Gleiche Grundlage für PDF und Text, damit beide dasselbe sagen.

import { daysBetween } from '@/domain/dates';
import { estimateOneRepMax, loadModeOf, setVolume } from '@/domain/logger';
import { mean } from '@/domain/math';
import { localDay, timeZone } from '@/domain/time';
import { exerciseName } from '@/format/exercise-name';
import { formatDay, formatNumber, t } from '@/i18n';

import type { Db } from './db';
import { calorieGoalOn, listActiveGoals } from './goals';
import { listExercises } from './training';

export const REPORT_WEEKS = ['4', '8', '12', '26'] as const;
export type ReportWeeks = (typeof REPORT_WEEKS)[number];

export type Report = {
  from: string;
  to: string;
  weight: { first: number; last: number; min: number; max: number; count: number } | null;
  measurements: { site: string; first: number; last: number }[];
  training: {
    sessions: number;
    perWeek: number;
    workSets: number;
    volumeKg: number;
    cardioMinutes: number;
    cardioCount: number;
    top: { name: string; sessions: number; bestKg: number; bestReps: number; e1rm: number | null }[];
  };
  nutrition: { days: number; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null; goalKcal: number | null } | null;
  sleep: { count: number; hours: number; quality: number | null } | null;
  goals: string[];
};

export function periodFor(weeks: number, today: string): { from: string; to: string } {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - weeks * 7 + 1);
  return { from: d.toISOString().slice(0, 10), to: today };
}

export async function buildReport(db: Db, from: string, to: string): Promise<Report> {
  const weights = await db.getAllAsync<{ day: string; kg: number }>(
    'SELECT day, kg FROM weight_entry WHERE day BETWEEN ? AND ? ORDER BY day, recorded_at_utc',
    from,
    to
  );
  const kgs = weights.map((w) => w.kg);
  const weight = weights.length ? { first: kgs[0], last: kgs[kgs.length - 1], min: Math.min(...kgs), max: Math.max(...kgs), count: weights.length } : null;

  const ms = await db.getAllAsync<{ site: string; cm: number }>('SELECT site, cm FROM body_measurement WHERE day BETWEEN ? AND ? ORDER BY day', from, to);
  const sites = new Map<string, { first: number; last: number }>();
  for (const m of ms) sites.set(m.site, { first: sites.get(m.site)?.first ?? m.cm, last: m.cm });
  const measurements = [...sites.entries()].map(([site, v]) => ({ site, ...v }));

  // Training: abgeschlossene Einheiten, deren Start (Ortszeit) im Zeitraum liegt
  const sets = await db.getAllAsync<{ sessionId: string; at: string; exerciseId: string; setType: string; kg: number | null; reps: number | null }>(
    `SELECT s.id AS sessionId, s.started_at_utc AS at, l.exercise_id AS exerciseId, l.set_type AS setType, l.weight_kg AS kg, l.reps
     FROM workout_session s LEFT JOIN set_log l ON l.session_id = s.id AND l.completed_at_utc IS NOT NULL
     WHERE s.status = 'abgeschlossen'`
  );
  const inRange = sets.filter((r) => {
    const day = localDay(new Date(r.at), timeZone);
    return day >= from && day <= to;
  });
  const sessions = new Set(inRange.map((r) => r.sessionId));
  const work = inRange.filter((r) => r.exerciseId && r.setType !== 'aufwaermen');
  const exercises = await listExercises(db);
  const names = new Map(exercises.map((e) => [e.id, exerciseName(e)]));
  // Gewichtsart je Übung: Gegengewicht zählt nicht als Last, einseitige Sätze doppelt (wie in der Statistik, Phase 1 Scan).
  const modes = new Map(exercises.map((e) => [e.id, loadModeOf(e)]));
  const modeOf = (id: string) => modes.get(id) ?? 'normal';
  const byExercise = new Map<string, { sessions: Set<string>; bestKg: number; bestReps: number; e1rm: number | null }>();
  for (const r of work) {
    const e = byExercise.get(r.exerciseId) ?? { sessions: new Set<string>(), bestKg: 0, bestReps: 0, e1rm: null };
    e.sessions.add(r.sessionId);
    if ((r.kg ?? 0) > e.bestKg || ((r.kg ?? 0) === e.bestKg && (r.reps ?? 0) > e.bestReps)) {
      e.bestKg = r.kg ?? 0;
      e.bestReps = r.reps ?? 0;
    }
    const est = r.kg && r.reps && modeOf(r.exerciseId) !== 'unterstuetzt' ? estimateOneRepMax(r.kg, r.reps) : null;
    if (est !== null && (e.e1rm === null || est > e.e1rm)) e.e1rm = est;
    byExercise.set(r.exerciseId, e);
  }
  const top = [...byExercise.entries()]
    .sort((a, b) => b[1].sessions.size - a[1].sessions.size || (b[1].e1rm ?? 0) - (a[1].e1rm ?? 0))
    .slice(0, 6)
    .map(([id, e]) => ({ name: names.get(id) ?? id, sessions: e.sessions.size, bestKg: e.bestKg, bestReps: e.bestReps, e1rm: e.e1rm }));
  const cardio = await db.getAllAsync<{ minutes: number | null }>(
    'SELECT minutes FROM cardio_log WHERE completed_at_utc IS NOT NULL AND day BETWEEN ? AND ?',
    from,
    to
  );
  const days = daysBetween(from, to) + 1;
  const training = {
    sessions: sessions.size,
    perWeek: Math.round((sessions.size / days) * 7 * 10) / 10,
    workSets: work.length,
    volumeKg: Math.round(work.reduce((sum, r) => sum + setVolume(r.kg, r.reps, modeOf(r.exerciseId)), 0)),
    cardioMinutes: Math.round(cardio.reduce((s, c) => s + (c.minutes ?? 0), 0)),
    cardioCount: cardio.length,
    top,
  };

  // Ernährung: nur vollständig erfasste Tage (alle kcal bekannt, nicht als unvollständig markiert); leere Tage zählen nicht.
  const food = await db.getAllAsync<{ day: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null }>(
    `SELECT e.diary_date AS day, SUM(e.kcal) AS kcal, SUM(e.protein) AS protein, SUM(e.carbs) AS carbs, SUM(e.fat) AS fat
     FROM consumption_event e LEFT JOIN diary_day d ON d.day = e.diary_date
     WHERE e.diary_date BETWEEN ? AND ? GROUP BY e.diary_date
     HAVING SUM(CASE WHEN e.kcal IS NULL THEN 1 ELSE 0 END) = 0 AND COALESCE(MAX(d.incomplete), 0) = 0`,
    from,
    to
  );
  const goal = await calorieGoalOn(db, to);
  const nutrition = food.length
    ? {
        days: food.length,
        kcal: mean(food.map((f) => f.kcal ?? 0)),
        protein: mean(food.map((f) => f.protein ?? 0)),
        carbs: mean(food.map((f) => f.carbs ?? 0)),
        fat: mean(food.map((f) => f.fat ?? 0)),
        goalKcal: goal?.baseKcal ?? null,
      }
    : null;

  const sleepRows = await db.getAllAsync<{ hours: number; quality: number | null }>(
    'SELECT sleep_hours AS hours, sleep_quality AS quality FROM daily_check WHERE sleep_hours IS NOT NULL AND day BETWEEN ? AND ?',
    from,
    to
  );
  const qualities = sleepRows.map((s) => s.quality).filter((q): q is number => q !== null);
  const sleep = sleepRows.length ? { count: sleepRows.length, hours: mean(sleepRows.map((s) => s.hours))!, quality: mean(qualities) } : null;

  const goals = (await listActiveGoals(db)).map((g) => {
    const kind = t(`goals.kindOption.${g.kind}`);
    if (g.targetKg) return `${kind}: ${formatNumber(g.targetKg, 1)} kg`;
    if (g.exerciseId && g.targetReps) return `${kind}: ${names.get(g.exerciseId) ?? ''} ${g.targetReps}×`;
    if (g.targetCm) return `${kind}: ${formatNumber(g.targetCm, 1)} cm`;
    if (g.habit) return `${kind}: ${t(`goals.habit.${g.habit}`)}${g.perWeek ? ` ${g.perWeek}×/Woche` : ''}`;
    return kind;
  });

  return { from, to, weight, measurements, training, nutrition, sleep, goals };
}

const n = (v: number | null | undefined, digits = 0) => (v == null ? '–' : formatNumber(v, digits));
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${formatNumber(Math.abs(v), 1)}`;

/** Abschnitte als Zeilen – Grundlage für PDF und Text. */
export function reportSections(r: Report): { title: string; lines: string[] }[] {
  const s: { title: string; lines: string[] }[] = [];
  s.push({
    title: t('report.weight'),
    lines: r.weight
      ? [
          t('report.weightLine', { first: n(r.weight.first, 1), last: n(r.weight.last, 1), change: signed(r.weight.last - r.weight.first) }),
          t('report.weightRange', { min: n(r.weight.min, 1), max: n(r.weight.max, 1), count: r.weight.count }),
        ]
      : [t('report.none')],
  });
  s.push({
    title: t('report.measurements'),
    lines: r.measurements.length
      ? r.measurements.map((m) => `${t(`measure.sites.${m.site}`)}: ${n(m.first, 1)} → ${n(m.last, 1)} cm (${signed(m.last - m.first)})`)
      : [t('report.none')],
  });
  s.push({
    title: t('report.training'),
    lines: [
      t('report.sessions', { count: r.training.sessions, perWeek: n(r.training.perWeek, 1) }),
      t('report.sets', { sets: r.training.workSets, volume: n(r.training.volumeKg) }),
      ...(r.training.cardioCount ? [t('report.cardio', { count: r.training.cardioCount, minutes: r.training.cardioMinutes })] : []),
      ...r.training.top.map((e) =>
        t('report.lift', {
          name: e.name,
          sessions: e.sessions,
          best: e.bestKg > 0 ? `${n(e.bestKg, 1)} kg × ${e.bestReps}` : `${e.bestReps} Wdh.`,
          e1rm: e.e1rm ? t('report.e1rm', { kg: n(e.e1rm, 1) }) : '',
        }).trim()
      ),
    ],
  });
  s.push({
    title: t('report.nutrition'),
    lines: r.nutrition
      ? [
          t('report.nutritionLine', {
            days: r.nutrition.days,
            kcal: n(r.nutrition.kcal),
            protein: n(r.nutrition.protein),
            carbs: n(r.nutrition.carbs),
            fat: n(r.nutrition.fat),
          }),
          ...(r.nutrition.goalKcal ? [t('report.goal', { kcal: n(r.nutrition.goalKcal) })] : []),
        ]
      : [t('report.none')],
  });
  s.push({
    title: t('report.sleep'),
    lines: r.sleep ? [t('report.sleepLine', { count: r.sleep.count, hours: n(r.sleep.hours, 1), quality: n(r.sleep.quality, 1) })] : [t('report.none')],
  });
  if (r.goals.length) s.push({ title: t('report.goals'), lines: r.goals });
  return s;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** HTML für expo-print (PDF). Schlicht, schwarz auf weiß, A4. */
export function reportHtml(r: Report, created: string): string {
  const sections = reportSections(r)
    .map((sec) => `<h2>${esc(sec.title)}</h2><ul>${sec.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`)
    .join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 18mm; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.45; }
    h1 { font-size: 18pt; margin: 0 0 2mm; } .sub { color: #555; margin: 0 0 6mm; }
    h2 { font-size: 12.5pt; margin: 6mm 0 1.5mm; border-bottom: 0.4pt solid #bbb; padding-bottom: 1mm; }
    ul { margin: 0; padding-left: 5mm; } li { margin: 0.8mm 0; }
    .foot { margin-top: 10mm; color: #666; font-size: 9pt; }
  </style></head><body>
  <h1>${esc(t('report.title'))}</h1>
  <p class="sub">${esc(t('report.period', { from: formatDay(r.from), to: formatDay(r.to) }))}</p>
  ${sections}
  <p class="foot">${esc(t('report.footer', { date: formatDay(created) }))}</p>
  </body></html>`;
}

/** Text für die Zwischenablage (KI-Assistent, Nachricht an den Trainer). */
export function reportText(r: Report): string {
  const head = `${t('report.aiIntro', { from: formatDay(r.from), to: formatDay(r.to) })}\n`;
  return (
    head +
    reportSections(r)
      .map((sec) => `\n## ${sec.title}\n${sec.lines.map((l) => `- ${l}`).join('\n')}`)
      .join('\n') +
    '\n'
  );
}
