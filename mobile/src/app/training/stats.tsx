import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/format/exercise-name';
import { Choice } from '@/components/fields';
import { MuscleMap } from '@/components/muscle-map';
import { todayDay } from '@/domain/time';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { FigureStrip } from '@/components/today-widgets';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { useUnits } from '@/providers/profile-provider';
import { loadPeriodStats } from '@/data/training-stats';
import { listExercises, type Exercise } from '@/data/training';
import { loadWeekSetsByMuscle } from '@/data/training-week';
import type { MuscleGroup } from '@/domain/exercises';
import { shiftDay } from '@/domain/dates';
import type { PeriodRecord, PeriodStats } from '@/domain/training-stats';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatNumber, formatWeight, t } from '@/i18n';

type Kind = 'monat' | 'jahr';

/** Zeitraum `offset` Monate bzw. Jahre vor dem aktuellen. */
function period(kind: Kind, offset: number, today: string) {
  const [y, m] = today.split('-').map(Number);
  if (kind === 'jahr') {
    const year = y - offset;
    return { from: `${year}-01-01`, to: `${year}-12-31`, label: String(year) };
  }
  const d = new Date(Date.UTC(y, m - 1 - offset, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return {
    from: d.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
}

async function load(db: Db, kind: Kind, offset: number, weekOffset: number) {
  const today = todayDay();
  const p = period(kind, offset, today);
  const weekDay = shiftDay(today, -7 * weekOffset);
  const [stats, exercises, muscles] = await Promise.all([loadPeriodStats(db, p.from, p.to), listExercises(db), loadWeekSetsByMuscle(db, weekDay)]);
  return { period: p, stats, exercises, muscles: Object.fromEntries(muscles.map((m) => [m.group, m.sets])) as Partial<Record<MuscleGroup, number>>, weekDay };
}

/** Monats- und Jahresstatistik mit Muskelkarte (Ausbauplan A8.5/A8.6). */
export default function StatsScreen() {
  const units = useUnits();
  const [kind, setKind] = useState<Kind>('monat');
  const [offset, setOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const { data, loaded } = useLoad((db) => load(db, kind, offset, weekOffset), {
    period: { from: '', to: '', label: '' },
    stats: null as PeriodStats | null,
    exercises: [] as Exercise[],
    muscles: {} as Partial<Record<MuscleGroup, number>>,
    weekDay: '',
  }, `${kind}-${offset}-${weekOffset}`);
  const byId = new Map(data.exercises.map((e) => [e.id, e]));
  const name = (id: string) => exerciseName(byId.get(id));
  const s = data.stats;
  const record = (r: PeriodRecord) =>
    r.kind === 'zeit'
      ? t('stats.recordTime', { seconds: r.seconds })
      : `${formatWeight(r.weightKg ?? 0, units.weight, 2)} × ${r.reps}`;
  const muscleList = Object.entries(data.muscles).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  return (
    <Screen withHeader>
      <Card title={t('stats.muscleTitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {weekOffset === 0 ? t('stats.thisWeek') : t('stats.weekOf', { date: formatDay(data.weekDay) })}
        </ThemedText>
        <MuscleMap sets={data.muscles} />
        <ThemedText type="small">
          {muscleList.length
            ? muscleList.map(([g, n]) => `${t(`muscle.${g}`)} ${n}`).join(' · ')
            : t('stats.noSets')}
        </ThemedText>
        <View style={styles.row}>
          <Button label={t('stats.prevWeek')} variant="secondary" size="compact" onPress={() => setWeekOffset((w) => w + 1)} />
          {weekOffset > 0 ? <Button label={t('stats.nextWeek')} variant="secondary" size="compact" onPress={() => setWeekOffset((w) => w - 1)} /> : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {t('stats.muscleHint')}
        </ThemedText>
      </Card>

      <Card title={data.period.label}>
        <Choice
          label={t('stats.period')}
          options={['monat', 'jahr'] as const}
          value={kind}
          onChange={(v) => {
            setKind(v);
            setOffset(0);
          }}
          format={(v) => t(`stats.kind.${v}`)}
        />
        <View style={styles.row}>
          <Button label={t('stats.prev')} variant="secondary" size="compact" onPress={() => setOffset((o) => o + 1)} />
          {offset > 0 ? <Button label={t('stats.next')} variant="secondary" size="compact" onPress={() => setOffset((o) => o - 1)} /> : null}
        </View>
      </Card>

      {loaded && s ? (
        <>
          <FigureStrip
            figures={[
              { label: t('stats.sessions'), value: String(s.sessions), accessibilityLabel: `${t('stats.sessions')} ${s.sessions}`, onPress: () => {} },
              { label: t('stats.sets'), value: formatNumber(s.sets, 0), accessibilityLabel: `${t('stats.sets')} ${s.sets}`, onPress: () => {} },
              {
                label: t('stats.volume'),
                value: formatWeight(s.volumeKg, units.weight, 0).replace(/\s*\S+$/, ''),
                unit: units.weight,
                accessibilityLabel: `${t('stats.volume')} ${formatWeight(s.volumeKg, units.weight, 0)}`,
                onPress: () => {},
              },
            ]}
          />
          <Card title={t('stats.cardioTitle')}>
            <ThemedText>{s.cardioCount ? t('stats.cardio', { count: s.cardioCount, minutes: s.cardioMinutes }) : t('stats.none')}</ThemedText>
          </Card>
          <Card title={t('stats.recordsTitle')}>
            {s.records.length === 0 ? <ThemedText type="small">{t('stats.noRecords')}</ThemedText> : null}
            {s.records.slice(0, 15).map((r) => (
              <ThemedText key={r.exerciseId} type="small">
                {`${name(r.exerciseId)}: ${record(r)} · ${formatDay(r.day)}`}
              </ThemedText>
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
                  {t('stats.exerciseLine', { sets: e.sets, volume: formatWeight(e.volumeKg, units.weight, 0) })}
                </ThemedText>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  line: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
