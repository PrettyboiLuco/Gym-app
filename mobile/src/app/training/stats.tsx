import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Choice, EntryRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { InsightInfo } from '@/components/insight-info';
import { InsightSparkline, useDataColor } from '@/components/insight-tile';
import { MuscleMap, type MapView } from '@/components/muscle-map';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { FigureStrip } from '@/components/today-widgets';
import { Press } from '@/constants/motion';
import { DisplayFont, Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { loadSpared } from '@/data/readiness';
import { listExercises, type Exercise } from '@/data/training';
import { loadExerciseTrends, loadPeriodComparison } from '@/data/training-stats';
import { loadMapPrefs, loadWeekTally, saveMapPrefs, type MapPrefs } from '@/data/training-week';
import { daysBetween, shiftDay, weekStart } from '@/domain/dates';
import { EMPTY_TALLY, type MuscleTally } from '@/domain/muscle-map';
import { todayDay } from '@/domain/time';
import type { ExerciseTrend, PeriodRecord, PeriodStats, TrendMetric } from '@/domain/training-stats';
import { kgToUnit, type WeightUnit } from '@/domain/units';
import { exerciseName } from '@/format/exercise-name';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatDayShort, formatNumber, formatWeight, t } from '@/i18n';
import { useUnits } from '@/providers/profile-provider';

const KINDS = ['woche', 'monat', 'jahr'] as const;
type Kind = (typeof KINDS)[number];
type Span = { from: string; to: string };

/** Zeitraum `offset` Wochen, Monate bzw. Jahre vor dem aktuellen. */
function period(kind: Kind, offset: number, today: string): Span & { label: string } {
  const [y, m] = today.split('-').map(Number);
  if (kind === 'woche') {
    const monday = shiftDay(weekStart(today), -7 * offset);
    return { from: monday, to: shiftDay(monday, 6), label: offset === 0 ? t('stats.thisWeek') : t('stats.weekOf', { date: formatDayShort(monday) }) };
  }
  if (kind === 'jahr') {
    const year = y - offset;
    return { from: `${year}-01-01`, to: `${year}-12-31`, label: String(year) };
  }
  const d = new Date(Date.UTC(y, m - 1 - offset, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return {
    from: d.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: t('stats.monthLabel', { month: t(`stats.month.${d.getUTCMonth() + 1}`), year: d.getUTCFullYear() }),
  };
}

/** Vergleich mit dem Zeitraum davor; der laufende Zeitraum nur bis zum selben Tag (sonst hinkt er immer hinterher). */
function previousSpan(kind: Kind, offset: number, today: string): Span & { soFar: boolean } {
  const prev = period(kind, offset + 1, today);
  if (offset > 0) return { from: prev.from, to: prev.to, soFar: false };
  const elapsed = daysBetween(period(kind, 0, today).from, today);
  const to = shiftDay(prev.from, elapsed);
  return { from: prev.from, to: to < prev.to ? to : prev.to, soFar: true };
}

async function load(db: Db, kind: Kind, offset: number, weekOffset: number) {
  const today = todayDay();
  const p = period(kind, offset, today);
  const before = previousSpan(kind, offset, today);
  const weekDay = shiftDay(today, -7 * weekOffset);
  const [stats, exercises, tally, prefs, spared, trends] = await Promise.all([
    loadPeriodComparison(db, p, before),
    listExercises(db),
    loadWeekTally(db, weekDay),
    loadMapPrefs(db),
    loadSpared(db, today),
    loadExerciseTrends(db, today),
  ]);
  return { period: p, soFar: before.soFar, stats: stats.current, previous: stats.previous, exercises, tally, prefs, spared, trends };
}

/** Vorzeichen ohne Wertung: „+2“, „−3“, „±0“. */
const signed = (diff: number, text: (abs: number) => string) => `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${text(Math.abs(diff))}`;

/** Monats- und Jahresstatistik mit Muskelkarte (Ausbauplan A8.5/A8.6). */
export default function StatsScreen() {
  const units = useUnits();
  const dataColor = useDataColor();
  const [kind, setKind] = useState<Kind>('monat');
  const [offset, setOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const { data, loaded, db } = useLoad(
    (db) => load(db, kind, offset, weekOffset),
    {
      period: { from: '', to: '', label: '' },
      soFar: false,
      stats: null as PeriodStats | null,
      previous: null as PeriodStats | null,
      exercises: [] as Exercise[],
      tally: EMPTY_TALLY as MuscleTally,
      prefs: null as MapPrefs | null,
      spared: null as Awaited<ReturnType<typeof loadSpared>>,
      trends: [] as ExerciseTrend[],
    },
    `${kind}-${offset}-${weekOffset}`
  );
  const byId = new Map(data.exercises.map((e) => [e.id, e]));
  const name = (id: string) => exerciseName(byId.get(id));
  const s = data.stats;
  const prev = data.previous;
  const record = (r: PeriodRecord) =>
    r.kind === 'zeit' ? t('stats.recordTime', { seconds: r.seconds }) : `${formatWeight(r.weightKg ?? 0, units.weight, 2)} × ${r.reps}`;
  // Einstellungen der Karte: gespeichert laden, beim Ändern sofort übernehmen und speichern (Punkte 2.3, 5.4).
  // Die Figur (männlich/weiblich) wählt man im Profil.
  const [ownPrefs, setOwnPrefs] = useState<MapPrefs | null>(null);
  const prefs: MapPrefs = ownPrefs ?? data.prefs ?? { view: 'beide' as MapView, halfSecondary: true, body: 'm' };
  const changePrefs = (change: Partial<MapPrefs>) => {
    const next = { ...prefs, ...change };
    setOwnPrefs(next);
    saveMapPrefs(db, next);
  };
  const compare = (diff: number, text: (abs: number) => string) => t('stats.delta', { delta: signed(diff, text), ref: t(`stats.compare.${kind}`) });
  const weekLabel = weekOffset === 0 ? t('stats.thisWeek') : t('stats.weekOf', { date: formatDayShort(weekStart(shiftDay(todayDay(), -7 * weekOffset))) });

  return (
    <Screen withHeader>
      <Card>
        <PeriodNav
          eyebrow={t('stats.muscleTitle')}
          title={weekLabel}
          prevLabel={t('stats.prevWeek')}
          nextLabel={t('stats.nextWeek')}
          onPrev={() => setWeekOffset((w) => w + 1)}
          onNext={weekOffset > 0 ? () => setWeekOffset((w) => w - 1) : null}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('stats.muscleSub')}
        </ThemedText>
        <MuscleMap
          tally={data.tally}
          ready={loaded}
          halfSecondary={prefs.halfSecondary}
          onHalfSecondary={(halfSecondary) => changePrefs({ halfSecondary })}
          view={prefs.view}
          onView={(view) => changePrefs({ view })}
          body={prefs.body}
          spared={data.spared?.areas ?? []}
          sparedSince={data.spared?.since ?? null}
        />
        <InsightInfo text={t('stats.muscleHint')} />
      </Card>

      <Card>
        <PeriodNav
          eyebrow={t('stats.period')}
          title={data.period.label}
          prevLabel={t('stats.prev')}
          nextLabel={t('stats.next')}
          onPrev={() => setOffset((o) => o + 1)}
          onNext={offset > 0 ? () => setOffset((o) => o - 1) : null}
        />
        <Choice
          label={t('stats.period')}
          hideLabel
          options={KINDS}
          value={kind}
          onChange={(v) => {
            setKind(v);
            setOffset(0);
          }}
          format={(v) => t(`stats.kind.${v}`)}
        />
      </Card>

      {loaded && s ? (
        <>
          {/* Kennzahlen mit dem Vorzeitraum daneben – nur die Differenz, ohne Farbe und ohne Wertung. */}
          <FigureStrip
            figures={[
              {
                label: t('stats.sessions'),
                value: String(s.sessions),
                sub: prev ? compare(s.sessions - prev.sessions, String) : null,
                accessibilityLabel: `${t('stats.sessions')} ${s.sessions}`,
              },
              {
                label: t('stats.sets'),
                value: formatNumber(s.sets, 0),
                sub: prev ? compare(s.sets - prev.sets, String) : null,
                accessibilityLabel: `${t('stats.sets')} ${s.sets}`,
              },
              {
                label: t('stats.volume'),
                value: formatWeight(s.volumeKg, units.weight, 0).replace(/\s*\S+$/, ''),
                unit: units.weight,
                sub: prev ? compare(s.volumeKg - prev.volumeKg, (kg) => formatWeight(kg, units.weight, 0)) : null,
                accessibilityLabel: `${t('stats.volume')} ${formatWeight(s.volumeKg, units.weight, 0)}`,
              },
            ]}
          />
          {data.soFar ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {t('stats.compareSoFar')}
            </ThemedText>
          ) : null}

          <Card title={t('stats.trendsTitle')}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('stats.trendsSub')}
            </ThemedText>
            {data.trends.length === 0 ? <EmptyState icon="chart" title={t('stats.trendsEmpty')} /> : null}
            {data.trends.map((trend, i) => (
              <TrendRow key={trend.exerciseId} trend={trend} name={name(trend.exerciseId)} unit={units.weight} color={dataColor} first={i === 0} />
            ))}
            <InsightInfo text={t('stats.trendsInfo')} />
          </Card>

          <Card title={t('stats.cardioTitle')}>
            <ThemedText>{s.cardioCount ? t('stats.cardio', { count: s.cardioCount, minutes: s.cardioMinutes }) : t('stats.none')}</ThemedText>
          </Card>
          <Card title={t('stats.recordsTitle')}>
            {s.records.length === 0 ? <ThemedText type="small">{t('stats.noRecords')}</ThemedText> : null}
            {s.records.slice(0, 15).map((r, i, list) => (
              <EntryRow key={r.exerciseId} title={name(r.exerciseId)} subtitle={formatDay(r.day)} value={record(r)} last={i === list.length - 1} />
            ))}
          </Card>
          <Card title={t('stats.volumeTitle')}>
            {s.perExercise.length === 0 ? <ThemedText type="small">{t('stats.none')}</ThemedText> : null}
            {s.perExercise.slice(0, 15).map((e) => (
              <View key={e.exerciseId} style={styles.line}>
                <ThemedText type="small" style={styles.flex}>
                  {name(e.exerciseId)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('stats.exerciseLine', { count: e.sets, volume: formatWeight(e.volumeKg, units.weight, 0) })}
                </ThemedText>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

/** Kartenkopf mit Zeitraum: ‹ Titel › – die Pfeile blättern, „später“ gibt es erst, wenn man zurückgeblättert hat. */
function PeriodNav({
  eyebrow,
  title,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
}: {
  eyebrow: string;
  title: string;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: (() => void) | null;
}) {
  return (
    <View style={styles.nav}>
      <NavArrow label={prevLabel} onPress={onPrev} back />
      <View style={styles.navText}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {eyebrow}
        </ThemedText>
        <ThemedText style={styles.navTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </ThemedText>
      </View>
      <NavArrow label={nextLabel} onPress={onNext} />
    </View>
  );
}

function NavArrow({ label, onPress, back = false }: { label: string; onPress: (() => void) | null; back?: boolean }) {
  const theme = useTheme();
  return (
    <PressableScale
      scaleTo={Press.button}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress ?? undefined}
      hitSlop={6}
      style={({ pressed }) => [styles.arrow, { backgroundColor: pressed ? theme.border : theme.backgroundSelected }, !onPress && styles.arrowOff]}>
      <View style={back ? styles.flip : undefined}>
        <Icon name="chevron" color={theme.text} size={18} strokeWidth={2.2} />
      </View>
    </PressableScale>
  );
}

/** Wert einer Kennzahl im Verlauf („101,3 kg“, „45 s“, „12 Wdh.“). */
function trendValue(metric: TrendMetric, value: number, unit: WeightUnit): string {
  if (metric === 'zeit') return t('stats.trendSeconds', { value: formatNumber(value, 0) });
  if (metric === 'wdh') return t('stats.trendReps', { count: value });
  return formatWeight(value, unit, metric === 'volumen' ? 0 : 1);
}

/** Die Leistung hinter einer Bestleistung: der Satz („80 kg × 8“) bzw. der Wert. */
function recordValue(trend: ExerciseTrend, unit: WeightUnit): string {
  const r = trend.record!;
  if ((trend.metric === 'e1rm' || trend.metric === 'gegengewicht') && r.weightKg !== null && r.reps !== null)
    return `${formatWeight(r.weightKg, unit)} × ${r.reps}`;
  return trendValue(trend.metric, r.value, unit);
}

/** Eine Übung: Name, Kennzahl, letzte Bestleistung; rechts der letzte Wert und der Verlauf der 8 Wochen. */
function TrendRow({ trend, name, unit, color, first }: { trend: ExerciseTrend; name: string; unit: WeightUnit; color: string; first: boolean }) {
  const theme = useTheme();
  const latest = trend.latest === null ? '–' : trendValue(trend.metric, trend.latest, unit);
  const recordLine = trend.record ? t('stats.trendRecord', { date: formatDay(trend.record.day), value: recordValue(trend, unit) }) : t('stats.trendNoRecord');
  const metric = t(`stats.trendMetric.${trend.metric}`);
  // Gewichte im Verlauf in der Anzeigeeinheit; die Form der Linie bleibt gleich.
  const values = trend.metric === 'zeit' || trend.metric === 'wdh' ? trend.weeks : trend.weeks.map((v) => (v === null ? null : kgToUnit(v, unit)));
  return (
    <View
      accessible
      accessibilityLabel={`${name}. ${metric}: ${t('stats.trendLatest', { value: latest })}. ${recordLine}`}
      style={[styles.trend, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected }]}>
      <View style={styles.trendText}>
        <ThemedText style={styles.trendName} numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {metric}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {recordLine}
        </ThemedText>
      </View>
      <View style={styles.trendSide}>
        <ThemedText style={styles.trendValue} numberOfLines={1}>
          {latest}
        </ThemedText>
        {/* Verlauf erst ab zwei Wochen mit Training – ein einzelner Punkt sagt nichts. */}
        {values.filter((v) => v !== null).length >= 2 ? (
          <View style={styles.spark}>
            <InsightSparkline values={values} bars={trend.metric === 'volumen'} color={color} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  note: { paddingHorizontal: Spacing.two, marginTop: -Spacing.two },
  nav: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  navText: { flex: 1, alignItems: 'center', minWidth: 0 },
  navTitle: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  arrowOff: { opacity: 0.35 },
  flip: { transform: [{ rotate: '180deg' }] },
  trend: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  trendText: { flex: 1, minWidth: 0, gap: 2 },
  trendName: { fontWeight: 600 },
  trendSide: { width: 104, alignItems: 'flex-end', gap: Spacing.one },
  trendValue: { fontFamily: DisplayFont.semiBold, fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'] },
  spark: { width: 104 },
});
