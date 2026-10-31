import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { timeZone } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TimeChart } from '@/components/time-chart';
import { DisplayFont, Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { useUnits } from '@/data/profile-provider';
import { exerciseBests, listExercises, type Exercise, type ExerciseBest } from '@/data/training';
import { localDay } from '@/domain/time';
import { kgToUnit } from '@/domain/units';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, formatWeight, t } from '@/i18n';

/**
 * Kraftverlauf einer Übung: bester Satz je Training als Linie, Bestleistungen als gefüllte Punkte.
 * Leitfrage „Werde ich stärker?“ – oben groß die aktuelle Bestleistung, darunter der Verlauf und die letzten Einheiten.
 */
async function loadProgress(db: Db, id: string) {
  const [bests, exercises] = await Promise.all([exerciseBests(db, id), listExercises(db)]);
  return { bests, exercise: exercises.find((e) => e.id === id) ?? null };
}

export default function ExerciseProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useUnits();
  const theme = useTheme();
  const { data, loaded } = useLoad((db) => loadProgress(db, id), { bests: [] as ExerciseBest[], exercise: null as Exercise | null }, id);
  const { bests, exercise } = data;
  const timed = bests.some((b) => b.seconds != null);
  const bodyweight = !timed && bests.every((b) => b.weightKg === 0);
  // Messgröße je nach Übung: Sekunden, Wiederholungen (Körpergewicht) oder Gewicht.
  const value = (b: ExerciseBest) => (timed ? (b.seconds ?? 0) : bodyweight ? (b.reps ?? 0) : kgToUnit(b.weightKg, units.weight));
  const text = (b: ExerciseBest) =>
    timed
      ? t('session.setDoneSeconds', { seconds: b.seconds })
      : bodyweight
        ? t('summary.reps', { count: b.reps ?? 0 })
        : `${formatWeight(b.weightKg, units.weight, 2)} × ${b.reps ?? '–'}`;
  // Gleichmäßig je Training (mehrere Trainings an einem Tag liegen nebeneinander, nicht übereinander).
  const points = bests.map((b) => ({ day: b.sessionId, value: value(b) }));
  // Bestleistungen: jeder Punkt, der alle früheren übertrifft (der erste zählt nicht).
  const records = points.filter((p, i) => i > 0 && points.slice(0, i).every((q) => p.value > q.value));
  const best = bests.reduce<ExerciseBest | null>((m, b) => (!m || value(b) > value(m) ? b : m), null);
  const firstDay = bests.length ? localDay(new Date(bests[0].at), timeZone) : '';
  const lastDay = bests.length ? localDay(new Date(bests[bests.length - 1].at), timeZone) : '';

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: exercise ? exerciseName(exercise) : t('exerciseProgress.title') }} />
      {loaded && bests.length === 0 ? (
        <Card>
          <ThemedText themeColor="textSecondary">{t('exerciseProgress.empty')}</ThemedText>
        </Card>
      ) : null}
      {best ? (
        <Card title={t('exerciseProgress.bestTitle')}>
          <View style={styles.big}>
            <ThemedText style={styles.bigValue}>{text(best)}</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">
            {t('exerciseProgress.bestWhen', { date: formatDay(localDay(new Date(best.at), timeZone)) })} ·{' '}
            {t('exerciseProgress.sessions', { count: bests.length })}
          </ThemedText>
          {points.length >= 2 ? (
            <TimeChart
              days={[firstDay, lastDay]}
              spacing="index"
              line={points}
              markers={records}
              format={(v) => formatNumber(v, timed || bodyweight ? 0 : 1)}
              accessibilityLabel={t('exerciseProgress.chartLabel', { count: points.length, best: text(best) })}
            />
          ) : null}
          {records.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('exerciseProgress.legend', { count: records.length })}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}
      {bests.length > 0 ? (
        <Card title={t('exerciseProgress.recentTitle')}>
          {[...bests].reverse().slice(0, 8).map((b, i, list) => (
            <View key={b.sessionId} style={[styles.row, i < list.length - 1 && [styles.rule, { borderColor: theme.backgroundSelected }]]}>
              <ThemedText style={styles.flex}>{formatDay(localDay(new Date(b.at), timeZone))}</ThemedText>
              <ThemedText style={styles.num}>{text(b)}</ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { flexDirection: 'row', alignItems: 'baseline' },
  bigValue: { fontFamily: DisplayFont.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: Spacing.two },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
