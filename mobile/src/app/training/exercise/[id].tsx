import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Choice } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TimeChart } from '@/components/time-chart';
import { DisplayFont, Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { exerciseBests, listExercises, type Exercise, type ExerciseBest } from '@/data/training';
import { loadModeOf } from '@/domain/logger';
import { localDay, timeZone } from '@/domain/time';
import { kgToUnit } from '@/domain/units';
import { exerciseName } from '@/format/exercise-name';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, formatWeight, t } from '@/i18n';
import { useUnits } from '@/providers/profile-provider';

/**
 * Kraftverlauf einer Übung: bester Satz je Training als Linie, Bestleistungen als gefüllte Punkte.
 * Leitfrage „Werde ich stärker?“ – oben groß die aktuelle Bestleistung, darunter der Verlauf und die letzten Einheiten.
 */
async function loadProgress(db: Db, id: string) {
  const exercise = (await listExercises(db)).find((e) => e.id === id) ?? null;
  const bests = await exerciseBests(db, id, exercise ? loadModeOf(exercise) : 'normal');
  return { bests, exercise };
}

export default function ExerciseProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useUnits();
  const theme = useTheme();
  const { data, loaded } = useLoad((db) => loadProgress(db, id), { bests: [] as ExerciseBest[], exercise: null as Exercise | null }, id);
  const { bests, exercise } = data;
  const [metricChoice, setMetric] = useState<'gewicht' | 'e1rm'>('gewicht');
  const timed = bests.some((b) => b.seconds != null);
  const bodyweight = !timed && bests.every((b) => b.weightKg === 0);
  // Gegengewicht-Maschine: weniger ist besser (A1).
  const assisted = exercise ? loadModeOf(exercise) === 'unterstuetzt' : false;
  const canE1rm = !timed && !bodyweight && !assisted && bests.some((b) => b.e1rm != null);
  const metric = canE1rm ? metricChoice : 'gewicht';
  const shownBests = metric === 'e1rm' ? bests.filter((b) => b.e1rm != null) : bests;
  // Messgröße je nach Übung: Sekunden, Wiederholungen (Körpergewicht), geschätztes 1RM oder Gewicht.
  const value = (b: ExerciseBest) =>
    timed ? (b.seconds ?? 0) : bodyweight ? (b.reps ?? 0) : metric === 'e1rm' ? kgToUnit(b.e1rm ?? 0, units.weight) : kgToUnit(b.weightKg, units.weight);
  const better = (a: number, b: number) => (assisted && metric === 'gewicht' && !timed && !bodyweight ? a < b : a > b);
  const text = (b: ExerciseBest) =>
    timed
      ? t('session.setDoneSeconds', { seconds: b.seconds })
      : bodyweight
        ? t('summary.reps', { count: b.reps ?? 0 })
        : metric === 'e1rm'
          ? t('exerciseProgress.e1rmValue', { value: formatWeight(b.e1rm ?? 0, units.weight, 1) })
          : `${formatWeight(b.weightKg, units.weight, 2)} × ${b.reps ?? '–'}`;
  // Gleichmäßig je Training (mehrere Trainings an einem Tag liegen nebeneinander, nicht übereinander).
  const points = shownBests.map((b) => ({ day: b.sessionId, value: value(b) }));
  // Bestleistungen: jeder Punkt, der alle früheren übertrifft (der erste zählt nicht).
  const records = points.filter((p, i) => i > 0 && points.slice(0, i).every((q) => better(p.value, q.value)));
  const best = shownBests.reduce<ExerciseBest | null>((m, b) => (!m || better(value(b), value(m)) ? b : m), null);
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
          {canE1rm ? (
            <Choice
              label={t('exerciseProgress.metric')}
              options={['gewicht', 'e1rm'] as const}
              value={metric}
              onChange={setMetric}
              format={(m) => t(`exerciseProgress.metrics.${m}`)}
            />
          ) : null}
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
          {metric === 'e1rm' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('exerciseProgress.e1rmHint')}
            </ThemedText>
          ) : null}
          {assisted ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('exerciseProgress.assistHint')}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}
      {bests.length > 0 ? (
        <Card title={t('exerciseProgress.recentTitle')}>
          {[...bests]
            .reverse()
            .slice(0, 8)
            .map((b, i, list) => (
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
