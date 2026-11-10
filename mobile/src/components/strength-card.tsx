// „Kraft pro Übung“ im Fortschritt (Idee aus fin, 10.11.2026): Verlauf des geschätzten Maximums (e1RM) je Woche für die
// häufigsten Übungen der letzten Wochen – vorher nur eine Ebene tiefer in der Statistik. Keine Beispielwerte.

import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Choice } from '@/components/fields';
import { useDataColor } from '@/components/insight-tile';
import { SmoothChart } from '@/components/smooth-chart';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Spacing } from '@/constants/theme';
import { listExercises, type Exercise } from '@/data/training';
import { loadExerciseTrends } from '@/data/training-stats';
import { shiftDay, weekStart } from '@/domain/dates';
import { todayDay } from '@/domain/time';
import { trendChange, type ExerciseTrend } from '@/domain/training-stats';
import { kgToUnit, type WeightUnit } from '@/domain/units';
import { exerciseName } from '@/format/exercise-name';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDayShort, formatNumber, formatWeight, t } from '@/i18n';

async function load(db: Parameters<typeof loadExerciseTrends>[0]) {
  const [trends, exercises] = await Promise.all([loadExerciseTrends(db, todayDay()), listExercises(db)]);
  // Nur Gewichts-Übungen mit mindestens zwei Wochenwerten – eine Kurve aus einem Punkt sagt nichts.
  return { trends: trends.filter((tr) => tr.metric === 'e1rm' && tr.weeks.filter((w) => w !== null).length >= 2).slice(0, 3), exercises };
}

export function StrengthCard({ unit }: { unit: WeightUnit }) {
  const theme = useTheme();
  const color = useDataColor();
  const { data } = useLoad(load, { trends: [] as ExerciseTrend[], exercises: [] as Exercise[] });
  const [chosen, setChosen] = useState<string | null>(null);
  const byId = new Map(data.exercises.map((e) => [e.id, e]));
  const trend = data.trends.find((tr) => tr.exerciseId === chosen) ?? data.trends[0];

  if (!trend) {
    return (
      <Card title={t('strength.title')}>
        <EmptyState icon="chart" title={t('strength.empty')} />
      </Card>
    );
  }
  const name = (id: string) => exerciseName(byId.get(id));
  const firstWeek = shiftDay(weekStart(todayDay()), -7 * (trend.weeks.length - 1));
  const points = trend.weeks
    .map((v, i) => (v === null ? null : { x: i * 7, value: kgToUnit(v, unit), label: t('strength.weekOf', { date: formatDayShort(shiftDay(firstWeek, 7 * i)) }) }))
    .filter((p): p is { x: number; value: number; label: string } => p !== null);
  const change = trendChange(trend);
  return (
    <Card title={t('strength.title')}>
      {data.trends.length > 1 ? (
        <Choice
          scroll
          hideLabel
          label={t('strength.choose')}
          options={data.trends.map((tr) => tr.exerciseId)}
          value={trend.exerciseId}
          onChange={setChosen}
          format={name}
        />
      ) : null}
      <View style={styles.head}>
        <View style={styles.flex}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {name(trend.exerciseId)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('strength.estimated', { value: trend.latest !== null ? formatWeight(trend.latest, unit, 1) : '–' })}
          </ThemedText>
        </View>
        {change !== null ? (
          <ThemedText style={[styles.change, { color: change > 0 ? color : theme.textSecondary }]}>
            {`${change > 0 ? '+' : change < 0 ? '−' : '±'}${formatNumber(Math.abs(change), 0)} %`}
          </ThemedText>
        ) : null}
      </View>
      <SmoothChart
        animationKey={trend.exerciseId}
        line={points}
        dots={points}
        domain={[0, (trend.weeks.length - 1) * 7]}
        color={color}
        height={140}
        format={(v) => formatNumber(v, 0)}
        xLabels={[formatDayShort(firstWeek), t('nutrition.today')]}
        accessibilityLabel={t('strength.chartLabel', { name: name(trend.exerciseId) })}
      />
      <ThemedText
        type="small"
        themeColor="textSecondary"
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/training/exercise/[id]', params: { id: trend.exerciseId } })}>
        {t('strength.open')}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  name: { fontFamily: DisplayFont.bold, fontSize: 18, lineHeight: 24 },
  change: { fontFamily: DisplayFont.bold, fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] },
});
