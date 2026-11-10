import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { cardioName, cardioSummary } from '@/components/cardio-row';
import { EmptyState } from '@/components/empty-state';
import { ListRow } from '@/components/fields';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { useDataColor } from '@/components/insight-tile';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { YearGrid } from '@/components/year-grid';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import { listCardio, type CardioEntry } from '@/data/cardio';
import { listDayMarks, setRestDay, type DayMark } from '@/data/day-marks';
import type { Db } from '@/data/db';
import { clearStatusDay, listStatus, setStatusDay, type StatusPeriod } from '@/data/readiness';
import { listTimedSessions, type TimedSession } from '@/data/routines';
import { listSessions, oldestActivityDay } from '@/data/training';
import { loadYear } from '@/data/training-week';
import { daysBetween, isoWeekday, shiftDay, weekStart } from '@/domain/dates';
import { statusOn } from '@/domain/readiness';
import { localDay, timeZone, todayDay } from '@/domain/time';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';

type Row =
  | { type: 'kraft'; at: string; day: string; session: Awaited<ReturnType<typeof listSessions>>[number]; cardioMinutes: number }
  | { type: 'zeit'; at: string; day: string; session: TimedSession }
  | { type: 'cardio'; at: string; day: string; entry: CardioEntry };

/** Monate je Seite: zuerst die letzten 3, mit „Ältere laden“ jeweils 6 weitere (vorher: nur die letzten 50 Trainings). */
const FIRST_MONTHS = 3;
const MORE_MONTHS = 6;

async function loadHistory(db: Db, fromDay: string, today: string) {
  // Einen Tag Puffer: Startzeit ist UTC, der Tag lokal.
  const sinceUtc = `${shiftDay(fromDay, -1)}T00:00:00.000Z`;
  const [workouts, timed, cardio, oldest, marks, status, year] = await Promise.all([
    listSessions(db, 0, sinceUtc),
    listTimedSessions(db, 0, sinceUtc),
    listCardio(db, shiftDay(fromDay, -1), '9999-12-31'),
    oldestActivityDay(db),
    listDayMarks(db, shiftDay(today, -400), shiftDay(today, 14)),
    listStatus(db),
    loadYear(db, today),
  ]);
  const cardioBySession = new Map<string, number>();
  for (const c of cardio) if (c.sessionId) cardioBySession.set(c.sessionId, (cardioBySession.get(c.sessionId) ?? 0) + (c.minutes ?? 0));
  const rows: Row[] = [
    ...workouts.map((s) => ({
      type: 'kraft' as const,
      at: s.startedAt,
      day: localDay(new Date(s.startedAt), s.timeZone ?? timeZone),
      session: s,
      cardioMinutes: cardioBySession.get(s.id) ?? 0,
    })),
    // Cardio ohne Training (A2) als eigene Zeile; Tag als Zeitpunkt (mittags), damit die Reihenfolge passt.
    ...cardio.filter((c) => !c.sessionId).map((c) => ({ type: 'cardio' as const, at: c.completedAt ?? `${c.day}T12:00:00Z`, day: c.day, entry: c })),
    // Laufende Einheiten stehen oben in „Training“, nicht im Verlauf.
    ...timed
      .filter((s) => s.status !== 'aktiv')
      .map((s) => ({ type: 'zeit' as const, at: s.startedAt, day: localDay(new Date(s.startedAt), timeZone), session: s })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  return { rows, hasOlder: oldest !== null && oldest < fromDay, marks, status, year };
}

/**
 * Verlauf (Idee aus fin, 10.11.2026): oben die Woche zum Durchblättern, darunter der gewählte Tag – mit seinen Einträgen
 * oder „Nichts eingetragen“ und den Knöpfen Training nachtragen · Ruhetag · Krank. Dann „Dein Jahr“ und die Liste.
 */
export default function HistoryScreen() {
  const theme = useTheme();
  const data = useDataColor();
  const today = todayDay();
  const [selected, setSelected] = useState(today);
  const [months, setMonths] = useState(FIRST_MONTHS);
  // Ältere Woche gewählt: Zeitraum der Liste so weit ausdehnen, dass der Tag darin liegt.
  const needed = Math.ceil(daysBetween(selected, today) / 31) + 1;
  const span = Math.max(months, needed);
  const fromDay = shiftDay(today, -span * 31);
  const { data: h, reload, db } = useLoad((d) => loadHistory(d, fromDay, today), {
    rows: [] as Row[],
    hasOlder: false,
    marks: [] as DayMark[],
    status: [] as StatusPeriod[],
    year: { days: [] as string[], minutes: 0 },
  }, fromDay);

  const monday = weekStart(selected);
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
  // Wie „Dein Jahr“: zählt nur, was wirklich trainiert wurde (Training ohne Sätze nicht).
  const trainedDays = new Set(
    h.rows.filter((r) => (r.type === 'kraft' ? (r.session.doneSets ?? 0) > 0 : r.type === 'zeit' ? r.session.status === 'abgeschlossen' : true)).map((r) => r.day)
  );
  const restDays = new Set(h.marks.filter((m) => m.kind === 'ruhetag').map((m) => m.day));
  const dayRows = h.rows.filter((r) => r.day === selected);
  const status = statusOn(h.status, selected);
  const rest = restDays.has(selected);
  const singleSick = h.status.some((p) => p.fromDay === selected && p.toDay === selected);
  const past = selected <= today;
  // Krank/verletzt/Pause im Jahres-Raster als Umriss (höchstens ein Jahr zurück).
  const yearStart = shiftDay(today, -371);
  const sickDays: string[] = [];
  for (const p of h.status)
    for (let d = p.fromDay < yearStart ? yearStart : p.fromDay; d <= (p.toDay ?? today) && d <= today; d = shiftDay(d, 1)) sickDays.push(d);
  const marked = [...restDays, ...sickDays];

  async function toggleRest() {
    haptic.tap();
    await setRestDay(db, selected, !rest);
    await reload();
  }
  async function toggleSick() {
    haptic.tap();
    if (singleSick) await clearStatusDay(db, selected);
    else await setStatusDay(db, 'krank', selected);
    await reload();
  }

  const renderRow = (row: Row) =>
    row.type === 'cardio' ? (
      <ListRow
        key={row.entry.id}
        title={t('cardio.historyTitle', { name: cardioName(row.entry) })}
        subtitle={`${formatDay(row.day)} · ${cardioSummary(row.entry) ?? ''}`}
        accessory="›"
        onPress={() => router.push({ pathname: '/training/cardio', params: { id: row.entry.id } })}
      />
    ) : row.type === 'kraft' ? (
      <ListRow
        key={row.session.id}
        title={row.session.dayName ? `${row.session.planName} – ${row.session.dayName}` : t('session.free')}
        subtitle={`${formatDay(row.day)} · ${t(`history.status.${row.session.status}`)} · ${t('history.sets', {
          count: row.session.doneSets ?? 0,
        })}${row.cardioMinutes ? ` · ${t('cardio.inSession', { minutes: formatNumber(row.cardioMinutes, 0) })}` : ''}${
          row.session.note ? `\n${row.session.note}` : ''
        }`}
        accessory="›"
        onPress={() => router.push(`/training/session/${row.session.id}`)}
      />
    ) : (
      <ListRow
        key={row.session.id}
        title={row.session.name}
        subtitle={`${formatDay(row.day)} · ${t('history.timed', {
          kind: t(`history.kind.${row.session.kind}`),
          minutes: Math.max(1, Math.round((row.session.doneSeconds ?? 0) / 60)),
        })} · ${row.session.abortReason === 'schmerz' ? t('history.abortPain') : t(`history.status.${row.session.status}`)}`}
        accessory="›"
        onPress={() => router.push({ pathname: '/training/timed/[id]', params: { id: row.session.id } })}
      />
    );

  return (
    <Screen withHeader>
      {/* Woche zum Durchblättern */}
      <View style={styles.weekHead}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('history.prevWeek')} hitSlop={8} onPress={() => setSelected(shiftDay(selected, -7))} style={styles.arrow}>
          <View style={styles.flip}>
            <Icon name="chevron" color={theme.text} size={18} strokeWidth={2.2} />
          </View>
        </Pressable>
        <ThemedText type="smallBold" style={styles.month}>
          {new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${monday}T12:00:00Z`))}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.nextWeek')}
          accessibilityState={{ disabled: shiftDay(monday, 7) > today }}
          disabled={shiftDay(monday, 7) > today}
          hitSlop={8}
          onPress={() => setSelected(shiftDay(selected, 7) > today ? today : shiftDay(selected, 7))}
          style={[styles.arrow, shiftDay(monday, 7) > today && { opacity: 0.3 }]}>
          <Icon name="chevron" color={theme.text} size={18} strokeWidth={2.2} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {week.map((day) => {
          const isSel = day === selected;
          const future = day > today;
          const trained = trainedDays.has(day);
          const marker = trained ? 'done' : restDays.has(day) ? 'rest' : statusOn(h.status, day) ? 'sick' : null;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel, disabled: future }}
              accessibilityLabel={`${formatDay(day)}${trained ? `, ${t('history.markTrained')}` : marker === 'rest' ? `, ${t('history.rest')}` : marker === 'sick' ? `, ${t('history.sick')}` : ''}`}
              disabled={future}
              onPress={() => {
                haptic.tap();
                setSelected(day);
              }}
              style={[styles.day, isSel && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor={day === today ? 'text' : 'textSecondary'} style={day === today && styles.bold}>
                {t(`reminders.dayShort.${isoWeekday(day)}`)}
              </ThemedText>
              <ThemedText style={[styles.dayNum, { color: future ? theme.textSecondary : theme.text }, future && { opacity: 0.4 }]}>
                {Number(day.slice(8))}
              </ThemedText>
              <View
                style={[
                  styles.dot,
                  marker === 'done' && { backgroundColor: data },
                  marker === 'rest' && { borderWidth: 1.5, borderColor: theme.textSecondary },
                  marker === 'sick' && { borderWidth: 1.5, borderColor: theme.danger },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Der gewählte Tag */}
      <Card
        title={selected === today ? t('history.today', { date: formatDay(selected) }) : formatDay(selected)}>
        {dayRows.length > 0 ? dayRows.map(renderRow) : null}
        {dayRows.length === 0 && !rest && !status ? <ThemedText themeColor="textSecondary">{t('history.nothing')}</ThemedText> : null}
        {rest ? <ThemedText>{t('history.restSet')}</ThemedText> : null}
        {status ? <ThemedText>{t(`history.statusSet.${status}`)}</ThemedText> : null}
        {past ? (
          <View style={styles.actions}>
            <Button
              label={t('history.backfillShort')}
              size="compact"
              onPress={() => router.push({ pathname: '/training/edit/[id]', params: { id: 'neu', day: selected } })}
            />
            {dayRows.length === 0 ? (
              <Button label={rest ? t('history.restUndo') : t('history.rest')} variant="secondary" size="compact" onPress={toggleRest} />
            ) : null}
            {!status || singleSick ? (
              <Button label={singleSick ? t('history.sickUndo') : t('history.sick')} variant="secondary" size="compact" onPress={toggleSick} />
            ) : null}
          </View>
        ) : null}
        {status && !singleSick ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('history.statusPeriodHint')}
          </ThemedText>
        ) : null}
      </Card>

      {/* Dein Jahr */}
      <Card title={t('year.title')}>
        <YearGrid today={today} trained={h.year.days} marked={marked} minutes={h.year.minutes} />
      </Card>

      <Card title={t('history.allTitle')}>
        {h.rows.length === 0 ? <EmptyState icon="clock" title={t('history.empty')} /> : null}
        {h.rows.map(renderRow)}
      </Card>
      {h.hasOlder ? <Button label={t('history.loadOlder')} variant="quiet" onPress={() => setMonths(span + MORE_MONTHS)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  month: { fontFamily: DisplayFont.bold, fontSize: 18, lineHeight: 24 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: Spacing.two, borderRadius: Radius.field },
  dayNum: { fontFamily: DisplayFont.bold, fontSize: 20, lineHeight: 26, fontVariant: ['tabular-nums'] },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  bold: { fontWeight: 700 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
