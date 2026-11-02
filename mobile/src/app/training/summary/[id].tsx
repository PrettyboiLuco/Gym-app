import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { CardioRow } from '@/components/cardio-row';
import { Field } from '@/components/fields';
import { haptic } from '@/components/haptics';
import { HeartLoop } from '@/components/heart-loop';
import { Icon } from '@/components/icon';
import { MuscleMapDone } from '@/components/muscle-map';
import { PopText } from '@/components/rise-text';
import { Screen } from '@/components/screen';
import { SessionFeedback } from '@/components/session-feedback';
import { ShareCard } from '@/components/share-card';
import { ThemedText } from '@/components/themed-text';
import { FigureStrip, WeekStrip, weekDays } from '@/components/today-widgets';
import { DisplayFont, Spacing } from '@/constants/theme';
import { listCardioForSession, type CardioEntry } from '@/data/cardio';
import type { Db } from '@/data/db';
import { timedSessionsForWorkout } from '@/data/routines';
import {
  getSession,
  listExercises,
  listSessionSets,
  planHintsForSession,
  previousBests,
  setSessionNote,
  type Exercise,
  type PlanHint,
  type SessionInfo,
} from '@/data/training';
import { loadMapPrefs, loadTrainingWeek, type TrainingWeek } from '@/data/training-week';
import { bestOneRepMax, countsAsWork, loadModeOf } from '@/domain/logger';
import { EMPTY_TALLY, tallyMuscles, type MapMuscle, type MuscleTally } from '@/domain/muscle-map';
import { findRecords, summarize, type Record } from '@/domain/summary';
import { todayDay } from '@/domain/time';
import { exerciseName } from '@/format/exercise-name';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, formatWeight, t } from '@/i18n';
import { useModules, useUnits } from '@/providers/profile-provider';

/**
 * Abschluss nach einem Training: ein verdienter Moment, gebaut nur aus den echten Sätzen.
 * Leitfrage: „Was habe ich heute geschafft?“ – Antwort groß (Dauer, Sätze, bewegtes Gewicht),
 * darunter neue Bestleistungen (nur gegenüber früheren Trainings) und die Trainingswoche mit dem heutigen Tag.
 * Einmal beim Öffnen ein Erfolgs-Signal (bei Bestleistung deutlicher).
 */
async function loadSummary(db: Db, id: string) {
  const [session, sets, exercises, week, blocks, hints] = await Promise.all([
    getSession(db, id),
    listSessionSets(db, id),
    listExercises(db),
    loadTrainingWeek(db, todayDay()),
    timedSessionsForWorkout(db, id),
    planHintsForSession(db, id),
  ]);
  const cardio = (await listCardioForSession(db, id)).filter((c) => c.completedAt);
  const { body } = await loadMapPrefs(db);
  const done = sets.filter((s) => s.completedAt);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const modeOf = (exerciseId: string) => {
    const e = byId.get(exerciseId);
    return e ? loadModeOf(e) : 'normal';
  };
  const records = session ? findRecords(done, await previousBests(db, [...new Set(done.map((s) => s.exerciseId))], id, session.startedAt), modeOf) : [];
  // Geschätztes 1RM je Übung dieses Trainings (A1), für die Bestleistungen.
  const e1rm: { [exerciseId: string]: number | null } = {};
  for (const exerciseId of new Set(done.map((s) => s.exerciseId))) {
    e1rm[exerciseId] = bestOneRepMax(
      done.filter((s) => s.exerciseId === exerciseId),
      modeOf(exerciseId)
    );
  }
  const cooldownOffered = session?.cooldown !== 0 && !blocks.some((b) => b.kind === 'cooldown');
  // Arbeitssätze je Muskel (nur Kraftübungen, ohne Aufwärmsätze) für die Muskelkarte „Heute trainiert“
  const perExercise = new Map<string, number>();
  for (const s of done) {
    const e = byId.get(s.exerciseId);
    if (!e || e.kind !== 'kraft' || !countsAsWork(s.setType)) continue;
    perExercise.set(e.id, (perExercise.get(e.id) ?? 0) + 1);
  }
  const muscleTally = tallyMuscles([...perExercise].map(([exerciseId, sets]) => ({ exercise: byId.get(exerciseId)!, sets })));
  return {
    session,
    summary: session ? summarize(done, session.startedAt, session.finishedAt, modeOf) : null,
    records,
    e1rm,
    cardio,
    exercises,
    hints,
    week,
    cooldownOffered,
    // Muskelgruppen dieses Trainings für die Rückmeldung (A6.3)
    muscleGroups: [...new Set(done.map((s) => byId.get(s.exerciseId)?.muscleGroup).filter((m): m is NonNullable<typeof m> => !!m))] as string[],
    muscleTally,
    body,
    loaded: true,
  };
}

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const units = useUnits();
  const { data, db } = useLoad(
    (d) => loadSummary(d, id),
    {
      session: null as SessionInfo | null,
      summary: null as ReturnType<typeof summarize> | null,
      records: [] as Record[],
      e1rm: {} as { [exerciseId: string]: number | null },
      cardio: [] as CardioEntry[],
      exercises: [] as Exercise[],
      hints: {} as { [exerciseId: string]: PlanHint },
      week: {
        done: [],
        planned: [],
        goal: null,
        todayIndex: 0,
        doneSets: [],
        plannedSets: [],
      } as TrainingWeek,
      cooldownOffered: false,
      muscleGroups: [] as string[],
      muscleTally: EMPTY_TALLY as MuscleTally,
      body: 'm' as 'm' | 'w',
      loaded: false,
    },
    id
  );
  const { session, summary, records, e1rm, cardio, exercises, hints, week, cooldownOffered, muscleTally, body, loaded } = data;
  const [note, setNote] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const modules = useModules();

  useEffect(() => {
    if (!loaded) return;
    haptic.success();
  }, [loaded]);

  if (!session || !summary) return <Screen withHeader>{null}</Screen>;

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const nameOf = (exerciseId: string) => hints[exerciseId]?.label || exerciseName(byId.get(exerciseId));
  const days = weekDays(week);
  const doneDays = week.done.filter(Boolean).length;
  const weekSummary = week.goal ? t('today.weekSummaryGoal', { count: doneDays, goal: week.goal }) : t('today.weekSummary', { count: doneDays });
  const volume = formatWeight(summary.volumeKg, units.weight, 0);
  // Hauptmuskeln mit Sätzen, größte zuerst; Ganzkörper-Sätze am Ende
  const trained = (Object.entries(muscleTally.primary) as [MapMuscle, number][]).sort((a, b) => b[1] - a[1]);
  const trainedList = [
    ...trained.map(([m, n]) => `${t(`mapMuscle.${m}`)} ${n}`),
    ...(muscleTally.whole > 0 ? [`${t('muscle.ganzkoerper')} ${muscleTally.whole}`] : []),
  ].join(' · ');
  const recordText = (r: Record) =>
    r.kind === 'gewicht'
      ? t('summary.recordWeight', {
          value: `${formatWeight(r.weightKg, units.weight, 2)} × ${r.reps}`,
          before: formatWeight(r.previousKg, units.weight, 2),
        })
      : r.kind === 'wiederholungen'
        ? t('summary.recordReps', {
            value: r.weightKg > 0 ? `${formatWeight(r.weightKg, units.weight, 2)} × ${r.reps}` : t('summary.reps', { count: r.reps }),
            before: r.previousReps,
          })
        : r.kind === 'weniger'
          ? t('summary.recordAssist', {
              value: `${formatWeight(r.weightKg, units.weight, 2)} × ${r.reps}`,
              before: formatWeight(r.previousKg, units.weight, 2),
            })
          : t('summary.recordTime', {
              seconds: r.seconds,
              before: r.previousSeconds,
            });
  const e1rmText = (r: Record) =>
    (r.kind === 'gewicht' || r.kind === 'wiederholungen') && e1rm[r.exerciseId]
      ? ` · ${t('summary.e1rm', { value: formatWeight(e1rm[r.exerciseId]!, units.weight, 1) })}`
      : '';

  return (
    <Screen withHeader>
      {/* U5: Erfolgsmoment als Rückmeldung – Überschrift mit getlayers „Pop Scale“, das Herz vom Start schwingt zweimal. */}
      <View style={styles.headRow}>
        <View style={[styles.head, styles.headText]}>
          <ThemedText themeColor="textSecondary">{session.dayName ? `${session.planName} – ${session.dayName}` : t('session.free')}</ThemedText>
          <PopText text={records.length > 0 ? t('summary.titleRecord') : t('summary.title')} />
        </View>
        <HeartLoop size={72} loops={2} />
      </View>

      <FigureStrip
        figures={
          summary.sets === 0 && cardio.length > 0
            ? [
                {
                  label: t('summary.duration'),
                  value: summary.minutes === null ? null : formatNumber(summary.minutes, 0),
                  unit: 'min',
                  accessibilityLabel: `${t('summary.duration')} ${summary.minutes ?? '–'} min`,
                  onPress: () => router.push('/training/history'),
                },
                {
                  label: t('cardio.title'),
                  value: formatNumber(
                    cardio.reduce((m, c) => m + (c.minutes ?? 0), 0),
                    0
                  ),
                  unit: 'min',
                  accessibilityLabel: `${t('cardio.title')} ${cardio.reduce((m, c) => m + (c.minutes ?? 0), 0)} min`,
                  onPress: () => router.push('/training/history'),
                },
                {
                  label: t('cardio.distance'),
                  value: cardio.some((c) => c.distanceKm != null)
                    ? formatNumber(
                        cardio.reduce((m, c) => m + (c.distanceKm ?? 0), 0),
                        1
                      )
                    : null,
                  unit: 'km',
                  accessibilityLabel: t('cardio.distance'),
                  onPress: () => router.push('/training/history'),
                },
              ]
            : [
                {
                  label: t('summary.duration'),
                  value: summary.minutes === null ? null : formatNumber(summary.minutes, 0),
                  unit: 'min',
                  accessibilityLabel: `${t('summary.duration')} ${summary.minutes ?? '–'} min`,
                  onPress: () => router.push('/training/history'),
                },
                {
                  label: t('summary.sets'),
                  value: String(summary.sets),
                  sub: t('summary.exercises', { count: summary.exercises }),
                  accessibilityLabel: `${t('summary.sets')} ${summary.sets}, ${t('summary.exercises', { count: summary.exercises })}`,
                  onPress: () => router.push(`/training/session/${id}`),
                },
                {
                  label: t('summary.volume'),
                  value: volume.replace(/\s*\S+$/, ''),
                  unit: units.weight,
                  accessibilityLabel: `${t('summary.volume')} ${volume}`,
                  onPress: () => router.push(`/training/session/${id}`),
                },
              ]
        }
      />

      {trained.length > 0 || muscleTally.whole > 0 ? (
        <Card title={t('summary.musclesTitle')}>
          <MuscleMapDone tally={muscleTally} body={body} label={t('summary.musclesLabel', { list: trainedList })} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.musclesList}>
            {trainedList}
          </ThemedText>
        </Card>
      ) : null}

      {records.length > 0 ? (
        <Card title={t('summary.recordsTitle', { count: records.length })}>
          {records.map((r) => (
            <Pressable
              key={r.exerciseId}
              accessibilityRole="button"
              accessibilityLabel={`${nameOf(r.exerciseId)}: ${recordText(r)}. ${t('exerciseProgress.open')}`}
              onPress={() => router.push(`/training/exercise/${r.exerciseId}`)}
              style={({ pressed }) => [styles.record, { opacity: pressed ? 0.7 : 1 }]}>
              <View style={[styles.recordMark, { backgroundColor: dark ? theme.accent : theme.tint }]}>
                <ThemedText style={[styles.recordMarkText, { color: dark ? theme.onAccent : theme.onTint }]}>↑</ThemedText>
              </View>
              <View style={styles.flex}>
                <ThemedText style={styles.recordName}>{nameOf(r.exerciseId)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {recordText(r)}
                  {e1rmText(r)}
                </ThemedText>
              </View>
              <Icon name="chevron" color={theme.textSecondary} size={18} strokeWidth={2} />
            </Pressable>
          ))}
        </Card>
      ) : null}

      {cardio.length > 0 ? (
        <Card title={t('cardio.title')}>
          {cardio.map((c, i) => (
            <CardioRow key={c.id} entry={c} active={false} last={i === cardio.length - 1} />
          ))}
        </Card>
      ) : null}

      {modules.bereitschaft ? <SessionFeedback db={db} sessionId={id} muscleGroups={data.muscleGroups} /> : null}

      <Card title={t('shareCard.title')}>
        {showShare ? (
          <ShareCard
            content={{
              eyebrow: t('shareCard.training'),
              value: String(summary.sets),
              unit: t('shareCard.sets'),
              title: session.dayName ?? t('session.free'),
              lines: [
                summary.minutes ? t('shareCard.minutes', { count: summary.minutes }) : null,
                summary.volumeKg > 0 ? t('shareCard.volume', { value: volume }) : null,
                ...records.slice(0, 3).map((r) => `${nameOf(r.exerciseId)}: ${recordText(r)}`),
              ].filter((x): x is string => !!x),
            }}
          />
        ) : (
          <Button label={t('shareCard.show')} variant="secondary" onPress={() => setShowShare(true)} />
        )}
      </Card>

      <Card title={t('summary.noteTitle')}>
        <Field
          label={t('summary.noteLabel')}
          value={note ?? session.note ?? ''}
          onChangeText={setNote}
          onEndEditing={() => (note !== null ? setSessionNote(db, id, note) : undefined)}
          placeholder={t('summary.notePlaceholder')}
          multiline
        />
      </Card>

      <Card title={t('summary.weekTitle')}>
        <WeekStrip days={days} summary={weekSummary} celebrateToday />
      </Card>

      <View style={styles.actions}>
        {cooldownOffered ? <Button label={t('summary.cooldown')} variant="secondary" onPress={() => router.replace(`/training/session/${id}`)} /> : null}
        <Button label={t('summary.done')} onPress={() => router.dismissTo('/training')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one, paddingTop: Spacing.two },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headText: { flex: 1 },
  musclesList: { textAlign: 'center' },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
  },
  recordMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordMarkText: {
    fontFamily: DisplayFont.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  recordName: { fontSize: 16, lineHeight: 22, fontWeight: 600 },
  flex: { flex: 1 },
  actions: { gap: Spacing.three },
});
