import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { ExercisePicker } from '@/components/exercise-picker';
import { Choice, ConfirmButton } from '@/components/fields';
import { RestTimerBar } from '@/components/rest-timer-bar';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDb } from '@/data/store-provider';
import {
  addSet,
  completeSet,
  deleteOpenSet,
  finishSession,
  getSession,
  lastPerformance,
  listExercises,
  listSessionSets,
  loadRestAuto,
  loadRestTimer,
  reopenSet,
  saveRestAuto,
  saveRestTimer,
  type Exercise,
  type LastPerformance,
  type SessionInfo,
  type SetRow,
} from '@/data/training';
import { extendRest, parseSetInput, startRest, stopRest, type RestTimer } from '@/domain/training';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

type Inputs = Record<string, { weight: string; reps: string }>;

// Zeitpunkt für Timer-Aktionen (in Event-Handlern, nicht beim Rendern).
const nowMs = () => Date.now();

/** Hält den Bildschirm wach, solange ein Training läuft. */
function KeepAwake() {
  useKeepAwake();
  return null;
}

function formatSets(sets: { weightKg: number | null; reps: number | null }[]) {
  return sets.map((s) => `${formatNumber(s.weightKg ?? 0)} × ${s.reps}`).join(', ');
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [last, setLast] = useState<Record<string, LastPerformance>>({});
  const [inputs, setInputs] = useState<Inputs>({});
  const [invalid, setInvalid] = useState<string | null>(null);
  const [timer, setTimer] = useState<RestTimer>(null);
  const [picking, setPicking] = useState(false);
  const [restAuto, setRestAuto] = useState(true);

  const load = useCallback(async () => {
    const [info, rows, all, savedTimer, auto] = await Promise.all([
      getSession(db, id),
      listSessionSets(db, id),
      listExercises(db),
      loadRestTimer(db),
      loadRestAuto(db),
    ]);
    setSession(info);
    setRestAuto(auto);
    setSets(rows);
    setExercises(all);
    setTimer(info?.status === 'aktiv' ? savedTimer : null);
    const lastByExercise: Record<string, LastPerformance> = {};
    for (const exerciseId of new Set(rows.map((r) => r.exerciseId))) {
      lastByExercise[exerciseId] = await lastPerformance(db, exerciseId, id);
    }
    setLast(lastByExercise);
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function updateTimer(next: RestTimer) {
    setTimer(next);
    await saveRestTimer(db, next);
  }

  /**
   * Vorschlag fürs Eingabefeld: eigene Werte (wieder geöffneter Satz), sonst voriger Satz in diesem
   * Training, sonst gleicher Satz vom letzten Mal, bei Körpergewichtsübungen 0 kg.
   */
  function suggestion(row: SetRow, indexInExercise: number) {
    if (row.weightKg != null && row.reps != null) {
      return { weight: formatNumber(row.weightKg, 2), reps: String(row.reps) };
    }
    const bodyweight = exercises.find((e) => e.id === row.exerciseId)?.equipment === 'koerpergewicht';
    const own = sets.filter((s) => s.exerciseId === row.exerciseId && s.completedAt && s.position < row.position);
    const previous = own[own.length - 1];
    const lastTime = last[row.exerciseId]?.[indexInExercise] ?? last[row.exerciseId]?.at(-1);
    return {
      weight:
        previous?.weightKg != null
          ? formatNumber(previous.weightKg, 2)
          : lastTime
            ? formatNumber(lastTime.weightKg, 2)
            : bodyweight
              ? '0'
              : '',
      reps: previous?.reps != null ? String(previous.reps) : lastTime ? String(lastTime.reps) : '',
    };
  }

  async function complete(row: SetRow, indexInExercise: number) {
    const value = inputs[row.id] ?? suggestion(row, indexInExercise);
    const parsed = parseSetInput(value.weight, value.reps);
    if (!parsed) {
      setInvalid(row.id);
      return;
    }
    setInvalid(null);
    await completeSet(db, row.id, parsed.weightKg, parsed.reps);
    // Der Satz ist bereits gespeichert; ein Fehler beim Timer darf daran nichts ändern (HEALTH-009).
    if (restAuto && row.restSeconds > 0) {
      try {
        await updateTimer(startRest(timer, row.restSeconds, nowMs()));
      } catch {
        // Timer bleibt aus, das Training geht weiter.
      }
    }
    setInputs(({ [row.id]: _done, ...rest }) => rest);
    await load();
  }

  async function finish(status: 'abgeschlossen' | 'abgebrochen') {
    await finishSession(db, id, status, status === 'abgebrochen' ? 'schmerz_oder_abbruch' : undefined);
    await updateTimer(stopRest(timer));
    // Zurück zur Trainingsübersicht, auch wenn das Training direkt (z. B. von „Heute“) geöffnet wurde.
    router.dismissTo('/training');
  }

  if (!session) return <Screen withHeader>{null}</Screen>;
  const active = session.status === 'aktiv';
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const order = [...new Set(sets.map((s) => s.exerciseId))];
  const doneCount = sets.filter((s) => s.completedAt).length;

  if (picking) {
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: t('session.addExercise') }} />
        <ExercisePicker
          exercises={exercises}
          onCancel={() => setPicking(false)}
          onPick={async (exercise) => {
            await addSet(db, id, exercise.id);
            setPicking(false);
            await load();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      withHeader
      subtitle={t('session.progress', { done: doneCount, total: sets.length })}
      footer={
        active ? (
          <RestTimerBar
            timer={timer}
            onStart={(seconds) => updateTimer(startRest(timer, seconds, nowMs()))}
            onExtend={() => updateTimer(extendRest(timer, 30, nowMs()))}
            onSkip={() => updateTimer(stopRest(timer))}
          />
        ) : null
      }>
      <Stack.Screen
        options={{ title: session.dayName ? `${session.planName} – ${session.dayName}` : t('session.free') }}
      />
      {active && Platform.OS !== 'web' ? <KeepAwake /> : null}
      {!active ? (
        <Card>
          <ThemedText themeColor="textSecondary">
            {t('session.readOnly')} ({t(`history.status.${session.status}`)})
          </ThemedText>
        </Card>
      ) : null}

      {order.map((exerciseId) => {
        const rows = sets.filter((s) => s.exerciseId === exerciseId);
        const lastSets = last[exerciseId] ?? [];
        return (
          <Card key={exerciseId} title={exerciseName(byId.get(exerciseId))}>
            <ThemedText type="small" themeColor="textSecondary">
              {lastSets.length ? t('session.last', { sets: formatSets(lastSets) }) : t('session.lastNone')}
            </ThemedText>
            {rows[0].plannedRepsMin != null ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.target', { min: rows[0].plannedRepsMin, max: rows[0].plannedRepsMax })}
              </ThemedText>
            ) : null}
            {rows.map((row, index) => {
              const value = inputs[row.id] ?? suggestion(row, index);
              return (
                <View key={row.id} style={styles.setRow}>
                  <ThemedText type="smallBold" style={styles.setNumber}>
                    {index + 1}
                  </ThemedText>
                  {row.completedAt ? (
                    <>
                      <ThemedText style={styles.flex}>
                        {t('session.setDone', { weight: formatNumber(row.weightKg ?? 0), reps: row.reps })}
                      </ThemedText>
                      {active ? (
                        <Button
                          label="↺"
                          accessibilityLabel={t('session.undo')}
                          variant="danger"
                          onPress={async () => {
                            await reopenSet(db, row.id);
                            await load();
                          }}
                        />
                      ) : null}
                    </>
                  ) : active ? (
                    <>
                      <TextInput
                        value={value.weight}
                        onChangeText={(weight) => setInputs((i) => ({ ...i, [row.id]: { ...value, weight } }))}
                        placeholder={t('session.weight')}
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`${t('session.weight')} ${index + 1}`}
                        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      />
                      <TextInput
                        value={value.reps}
                        onChangeText={(reps) => setInputs((i) => ({ ...i, [row.id]: { ...value, reps } }))}
                        placeholder={t('session.reps')}
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="number-pad"
                        accessibilityLabel={`${t('session.reps')} ${index + 1}`}
                        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      />
                      <Button label="✓" accessibilityLabel={`${t('session.done')} ${index + 1}`} onPress={() => complete(row, index)} />
                      <Button
                        label="−"
                        accessibilityLabel={`${t('session.removeSet')} ${index + 1}`}
                        variant="danger"
                        onPress={async () => {
                          await deleteOpenSet(db, row.id);
                          await load();
                        }}
                      />
                    </>
                  ) : (
                    <ThemedText themeColor="textSecondary" style={styles.flex}>
                      {t('session.notDone')}
                    </ThemedText>
                  )}
                </View>
              );
            })}
            {invalid && rows.some((r) => r.id === invalid) ? (
              <ThemedText style={{ color: theme.danger }}>{t('session.invalidSet')}</ThemedText>
            ) : null}
            {active ? (
              <Button
                label={t('session.addSet')}
                variant="danger"
                onPress={async () => {
                  await addSet(db, id, exerciseId);
                  await load();
                }}
              />
            ) : null}
          </Card>
        );
      })}

      {active ? (
        <>
          <Button label={t('session.addExercise')} onPress={() => setPicking(true)} />
          <Card>
            <Choice
              label={t('session.restAuto')}
              options={['an', 'aus'] as const}
              value={restAuto ? 'an' : 'aus'}
              format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
              onChange={async (v) => {
                setRestAuto(v === 'an');
                await saveRestAuto(db, v === 'an');
              }}
            />
          </Card>
          <ConfirmButton
            label={t('session.finish')}
            confirmLabel={t('session.finish')}
            onConfirm={() => finish('abgeschlossen')}
          />
          <Card>
            <ConfirmButton
              label={t('session.pain')}
              confirmLabel={t('session.painConfirm')}
              onConfirm={() => finish('abgebrochen')}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {t('session.painHint')}
            </ThemedText>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  setRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  setNumber: { width: 20 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
  },
  flex: { flex: 1 },
});
