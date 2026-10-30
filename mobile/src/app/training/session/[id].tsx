import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { ExercisePicker } from '@/components/exercise-picker';
import { Choice, ConfirmButton } from '@/components/fields';
import { RestTimerBar } from '@/components/rest-timer-bar';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { NOTIFICATIONS_SUPPORTED } from '@/data/notifications';
import { useUnits } from '@/data/profile-provider';
import { loadReminders } from '@/data/reminders';
import { timedSessionsForWorkout, type TimedSession } from '@/data/routines';
import { syncRestAlert } from '@/components/alerts';
import { holdLookup, routineMinutes, startRoutineRun } from '@/components/timed';
import { useDb } from '@/data/store-provider';
import {
  addSet,
  completeSet,
  completeTimedSet,
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
import { blockDraft, cooldownItems, warmupItems } from '@/domain/routines';
import type { MuscleGroup } from '@/domain/exercises';
import { extendRest, formatClock, parseSecondsInput, parseSetInput, startRest, stopRest, type RestTimer } from '@/domain/training';
import { kgToUnit, type WeightUnit } from '@/domain/units';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, formatWeight, t } from '@/i18n';

type Inputs = Record<string, { weight: string; reps: string }>;

// Zeitpunkt für Timer-Aktionen (in Event-Handlern, nicht beim Rendern).
const nowMs = () => Date.now();

/** Hält den Bildschirm wach, solange ein Training läuft. */
function KeepAwake() {
  useKeepAwake();
  return null;
}

function formatSets(sets: { weightKg: number | null; reps: number | null; seconds: number | null }[], unit: WeightUnit) {
  return sets
    .map((s) => (s.seconds != null ? t('session.setDoneSeconds', { seconds: s.seconds }) : `${formatNumber(kgToUnit(s.weightKg ?? 0, unit))} × ${s.reps}`))
    .join(', ');
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const units = useUnits();
  // Eingabefelder zeigen das Gewicht in der gewählten Einheit; gespeichert wird kg (UX-003).
  const shown = (kg: number) => formatNumber(kgToUnit(kg, units.weight), 2);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [last, setLast] = useState<Record<string, LastPerformance>>({});
  const [inputs, setInputs] = useState<Inputs>({});
  const [invalid, setInvalid] = useState<string | null>(null);
  const [timer, setTimer] = useState<RestTimer>(null);
  const [picking, setPicking] = useState(false);
  const [restAuto, setRestAuto] = useState(true);
  const [blocks, setBlocks] = useState<TimedSession[]>([]);
  // Tipp, den Hinweis bei gesperrtem Handy einzuschalten (nur solange er aus ist).
  const [alertsOff, setAlertsOff] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  // Zeitpunkt des letzten Ladens; nötig für „Cool-down bis 3 Stunden nach dem Ende anbieten“.
  const [loadedAtMs, setLoadedAtMs] = useState(0);
  // Countdown für einen Zeit-Satz (UX-011, z. B. Plank): läuft im Vordergrund, trägt am Ende die Sekunden ein.
  const [hold, setHold] = useState<{ rowId: string; index: number; seconds: number; endAtMs: number } | null>(null);
  const holdNow = useNow(hold !== null);
  const holdLeftMs = hold ? Math.max(0, hold.endAtMs - holdNow) : 0;

  const load = useCallback(async () => {
    const [info, rows, all, savedTimer, auto, timed] = await Promise.all([
      getSession(db, id),
      listSessionSets(db, id),
      listExercises(db),
      loadRestTimer(db),
      loadRestAuto(db),
      timedSessionsForWorkout(db, id),
    ]);
    setBlocks(timed);
    setAlertsOff(NOTIFICATIONS_SUPPORTED && !(await loadReminders(db)).timerAlerts);
    setLoadedAtMs(nowMs());
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

  // Zeitgeber des Countdowns; beim Verlassen des Bildschirms aufräumen.
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
  }, []);

  async function updateTimer(next: RestTimer) {
    setTimer(next);
    await saveRestTimer(db, next);
    // Hinweis bei gesperrtem Handy (falls eingeschaltet); ein Fehler darf das Training nicht stören.
    syncRestAlert(db, next).catch(() => undefined);
  }

  /**
   * Vorschlag fürs Eingabefeld: eigene Werte (wieder geöffneter Satz), sonst voriger Satz in diesem
   * Training, sonst gleicher Satz vom letzten Mal, bei Körpergewichtsübungen 0 kg.
   */
  function suggestion(row: SetRow, indexInExercise: number) {
    if (isTimed(row.exerciseId)) {
      const own = sets.filter((s) => s.exerciseId === row.exerciseId && s.completedAt && s.position < row.position);
      const lastTime = last[row.exerciseId]?.[indexInExercise] ?? last[row.exerciseId]?.at(-1);
      const seconds = row.seconds ?? own.at(-1)?.seconds ?? row.plannedSeconds ?? lastTime?.seconds ?? null;
      return { weight: '0', reps: seconds === null ? '' : String(seconds) };
    }
    if (row.weightKg != null && row.reps != null) {
      return { weight: shown(row.weightKg), reps: String(row.reps) };
    }
    const bodyweight = exercises.find((e) => e.id === row.exerciseId)?.equipment === 'koerpergewicht';
    const own = sets.filter((s) => s.exerciseId === row.exerciseId && s.completedAt && s.position < row.position);
    const previous = own[own.length - 1];
    const lastTime = last[row.exerciseId]?.[indexInExercise] ?? last[row.exerciseId]?.at(-1);
    return {
      weight:
        previous?.weightKg != null
          ? shown(previous.weightKg)
          : lastTime
            ? shown(lastTime.weightKg)
            : bodyweight
              ? '0'
              : '',
      reps: previous?.reps != null ? String(previous.reps) : lastTime?.reps != null ? String(lastTime.reps) : '',
    };
  }

  function startHold(row: SetRow, index: number, value: { reps: string }) {
    const seconds = parseSecondsInput(value.reps);
    if (seconds === null) {
      setInvalid(row.id);
      return;
    }
    setInvalid(null);
    setHold({ rowId: row.id, index, seconds, endAtMs: nowMs() + seconds * 1000 });
    // Am Ende: Signal und Satz mit den geplanten Sekunden erledigen.
    holdTimeout.current = setTimeout(() => {
      holdTimeout.current = null;
      setHold(null);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      complete(row, index, String(seconds));
    }, seconds * 1000);
  }

  /** Countdown vorzeitig beenden: die tatsächlich gehaltenen Sekunden werden eingetragen. */
  function stopHold() {
    if (!hold) return;
    const held = Math.max(1, Math.round(hold.seconds - holdLeftMs / 1000));
    const row = sets.find((r) => r.id === hold.rowId);
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    holdTimeout.current = null;
    setHold(null);
    if (row) complete(row, hold.index, String(held));
  }

  async function complete(row: SetRow, indexInExercise: number, secondsOverride?: string) {
    const value = secondsOverride ? { weight: '0', reps: secondsOverride } : (inputs[row.id] ?? suggestion(row, indexInExercise));
    if (isTimed(row.exerciseId)) {
      // Zeit-Satz (UX-011): im Feld stehen die Sekunden.
      const seconds = parseSecondsInput(value.reps);
      if (seconds === null) {
        setInvalid(row.id);
        return;
      }
      setInvalid(null);
      await completeTimedSet(db, row.id, seconds);
    } else {
      const parsed = parseSetInput(value.weight, value.reps, units.weight);
      if (!parsed) {
        setInvalid(row.id);
        return;
      }
      setInvalid(null);
      await completeSet(db, row.id, parsed.weightKg, parsed.reps);
    }
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
    // Nach einem normalen Ende bleibt die Seite offen, wenn ein Cool-down vorgeschlagen wird (STRETCH-002).
    if (status === 'abgeschlossen' && session?.cooldown !== 0 && !blocks.some((b) => b.kind === 'cooldown')) {
      await load();
      return;
    }
    // Zurück zur Trainingsübersicht, auch wenn das Training direkt (z. B. von „Heute“) geöffnet wurde.
    router.dismissTo('/training');
  }

  /** Aufwärmen/Cool-down passend zu den Muskelgruppen dieses Trainings (STRETCH-001/002). */
  function blockFor(kind: 'aufwaermen' | 'cooldown') {
    const groups = [...new Set(sets.map((s) => byIdAll.get(s.exerciseId)?.muscleGroup).filter((g): g is MuscleGroup => !!g))];
    const items = kind === 'aufwaermen' ? warmupItems(groups, holdLookup(exercises)) : cooldownItems(groups, holdLookup(exercises));
    return blockDraft(items);
  }

  async function startBlock(kind: 'aufwaermen' | 'cooldown') {
    const draft = blockFor(kind);
    const result = await startRoutineRun(db, {
      kind,
      name: kind === 'aufwaermen' ? t('session.warmupTitle') : t('session.cooldownTitle'),
      source: 'training',
      draft,
      exercises,
      workoutSessionId: id,
    });
    if (result === 'running') {
      setBlockMessage(t('routine.alreadyRunning'));
      return;
    }
    router.push('/training/run');
  }

  const byIdAll = new Map(exercises.map((e) => [e.id, e]));
  const isTimed = (exerciseId: string) => byIdAll.get(exerciseId)?.measure === 'zeit';
  if (!session) return <Screen withHeader>{null}</Screen>;
  const active = session.status === 'aktiv';
  const byId = byIdAll;
  const warmupDone = blocks.some((b) => b.kind === 'aufwaermen' && b.status === 'abgeschlossen');
  const cooldownDone = blocks.some((b) => b.kind === 'cooldown' && b.status === 'abgeschlossen');
  // Cool-down noch bis 3 Stunden nach dem Ende anbieten.
  const recentlyFinished = session.finishedAt !== null && Date.parse(session.finishedAt) > loadedAtMs - 3 * 3600_000;
  const showWarmup = active && session.warmup !== 0 && !warmupDone && sets.every((s) => !s.completedAt);
  const showCooldown =
    session.cooldown !== 0 && !cooldownDone && session.status !== 'abgebrochen' && (active ? doneCountOf(sets) > 0 : recentlyFinished);
  const order = [...new Set(sets.map((s) => s.exerciseId))];
  const doneCount = sets.filter((s) => s.completedAt).length;

  if (picking) {
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: t('session.addExercise') }} />
        <ExercisePicker
          exercises={exercises.filter((e) => e.kind === 'kraft')}
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
      {showWarmup ? (
        <Card title={t('session.warmupTitle')}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('session.warmupText', { count: blockFor('aufwaermen').items.length, minutes: routineMinutes(blockFor('aufwaermen'), exercises) })}
          </ThemedText>
          <Button label={t('session.warmupStart')} onPress={() => startBlock('aufwaermen')} />
        </Card>
      ) : null}
      {warmupDone ? <ThemedText type="small" themeColor="textSecondary">{t('session.warmupDone')}</ThemedText> : null}
      {blockMessage ? <ThemedText>{blockMessage}</ThemedText> : null}

      {order.map((exerciseId) => {
        const rows = sets.filter((s) => s.exerciseId === exerciseId);
        const lastSets = last[exerciseId] ?? [];
        return (
          <Card key={exerciseId} title={exerciseName(byId.get(exerciseId))}>
            <ThemedText type="small" themeColor="textSecondary">
              {lastSets.length ? t('session.last', { sets: formatSets(lastSets, units.weight), unit: units.weight }) : t('session.lastNone')}
            </ThemedText>
            {rows[0].plannedSeconds != null ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.targetSeconds', { seconds: rows[0].plannedSeconds })}
              </ThemedText>
            ) : null}
            {isTimed(exerciseId) && active ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.holdHint')}
              </ThemedText>
            ) : null}
            {rows[0].plannedSeconds == null && rows[0].plannedRepsMin != null ? (
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
                        {row.seconds != null
                          ? t('session.setDoneSeconds', { seconds: row.seconds })
                          : t('session.setDone', { weight: formatWeight(row.weightKg ?? 0, units.weight, 2), reps: row.reps })}
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
                      {isTimed(exerciseId) ? null : (
                      <TextInput
                        value={value.weight}
                        onChangeText={(weight) => setInputs((i) => ({ ...i, [row.id]: { ...value, weight } }))}
                        placeholder={units.weight}
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`${t('session.weightIn', { unit: units.weight })} ${index + 1}`}
                        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      />
                      )}
                      <TextInput
                        value={value.reps}
                        onChangeText={(reps) => setInputs((i) => ({ ...i, [row.id]: { ...value, reps } }))}
                        placeholder={isTimed(exerciseId) ? t('session.seconds') : t('session.reps')}
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="number-pad"
                        accessibilityLabel={`${isTimed(exerciseId) ? t('session.secondsLabel') : t('session.reps')} ${index + 1}`}
                        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      />
                      {isTimed(exerciseId) ? (
                        hold?.rowId === row.id ? (
                          <Button
                            label={`■ ${formatClock(holdLeftMs)}`}
                            accessibilityLabel={`${t('session.holdStop')} ${index + 1}`}
                            onPress={stopHold}
                          />
                        ) : (
                          <Button
                            label="▶"
                            accessibilityLabel={`${t('session.holdStart')} ${index + 1}`}
                            variant="danger"
                            disabled={hold !== null}
                            onPress={() => startHold(row, index, value)}
                          />
                        )
                      ) : null}
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
              <ThemedText style={{ color: theme.danger }}>
                {isTimed(exerciseId) ? t('session.invalidSeconds') : t('session.invalidSet')}
              </ThemedText>
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

      {showCooldown ? (
        <Card title={t('session.cooldownTitle')}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('session.cooldownText', { count: blockFor('cooldown').items.length, minutes: routineMinutes(blockFor('cooldown'), exercises) })}
          </ThemedText>
          <Button label={t('session.cooldownStart')} variant={active ? 'danger' : 'primary'} onPress={() => startBlock('cooldown')} />
        </Card>
      ) : null}
      {cooldownDone ? <ThemedText type="small" themeColor="textSecondary">{t('session.cooldownDone')}</ThemedText> : null}

      {active && alertsOff ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('session.alertsTip')}
          </ThemedText>
          <Button label={t('session.alertsOpen')} variant="danger" onPress={() => router.push('/more/notifications')} />
        </Card>
      ) : null}
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

function doneCountOf(rows: SetRow[]) {
  return rows.filter((r) => r.completedAt).length;
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
