import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Button, Card } from '@/components/card';
import { MeterBar } from '@/components/charts';
import { haptic } from '@/components/haptics';
import { SetCheck } from '@/components/set-check';
import { RirChoice, SetDetails } from '@/components/set-details';
import { CardioRow } from '@/components/cardio-row';
import { listCardioForSession, type CardioEntry } from '@/data/cardio';
import { exerciseName } from '@/components/exercise-name';
import { ExerciseMedia } from '@/components/exercise-media';
import { ExercisePicker } from '@/components/exercise-picker';
import { Choice, ConfirmButton, Field, ListRow } from '@/components/fields';
import { RestTimerBar, type NextUp } from '@/components/rest-timer-bar';
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
  addWarmupSets,
  deleteOpenSet,
  exerciseHistory,
  finishSession,
  getSession,
  lastPerformance,
  listExercises,
  listSessionSets,
  loadPlateSetup,
  loadProgressionOn,
  planHintsForSession,
  savePlateSetup,
  setSessionNote,
  updateSetDetails,
  type PlanHint,
  loadRestAuto,
  loadRestTimer,
  reopenSet,
  replaceOpenSets,
  saveProgressionOn,
  saveRestAuto,
  saveRestTimer,
  type Exercise,
  type LastPerformance,
  type SessionInfo,
  type SetRow,
} from '@/data/training';
import { blockDraft, cooldownItems, warmupItems } from '@/domain/routines';
import type { MuscleGroup } from '@/domain/exercises';
import { replacementOptions } from '@/domain/planner';
import { defaultPlateSetup, loadModeOf, setLabels, supersetLetters, usesPlates, warmupSets, type LoadMode, type PlateSetup } from '@/domain/logger';
import { adviceValues, progressionAdvice, PROGRESSION_RULES_VERSION, weightStep, type Advice, type PastSession } from '@/domain/progression';
import { extendRest, formatClock, isStaleSession, parseSecondsInput, parseSetInput, startRest, stopRest, type RestTimer } from '@/domain/training';
import { kgToUnit, parseDecimal, type WeightUnit } from '@/domain/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, formatWeight, t } from '@/i18n';

type Inputs = Record<string, { weight: string; reps: string }>;

// Übungen rücken weich nach, wenn eine fertige Übung zusammenklappt (nur Handy; im Web verschiebt Reanimated sonst das Layout).
const cardLayout = Platform.OS === 'web' ? undefined : LinearTransition.springify().stiffness(180).damping(22);

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
  const dark = useColorScheme() === 'dark';
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
  // Pause im Vollbild (öffnet sich nach einem erledigten Satz von selbst) und wieder aufgeklappte fertige Übungen.
  const [restFocus, setRestFocus] = useState(false);
  const [openDone, setOpenDone] = useState<Set<string>>(new Set());
  // RIR und Hinweise aus dem Plan (z. B. „Becken bleibt am Polster“).
  const [hints, setHints] = useState<Record<string, PlanHint>>({});
  const [restAuto, setRestAuto] = useState(true);
  // Steigerungsvorschläge (TRAIN-018) und Ersatz bei belegtem Gerät (TRAIN-016).
  const [progressionOn, setProgressionOn] = useState(true);
  const [history, setHistory] = useState<Record<string, PastSession[]>>({});
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<TimedSession[]>([]);
  // Tipp, den Hinweis bei gesperrtem Handy einzuschalten (nur solange er aus ist).
  const [alertsOff, setAlertsOff] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  // Zeitpunkt des letzten Ladens; nötig für „Cool-down bis 3 Stunden nach dem Ende anbieten“.
  const [loadedAtMs, setLoadedAtMs] = useState(0);
  // Countdown für einen Zeit-Satz (UX-011, z. B. Plank): läuft im Vordergrund, trägt am Ende die Sekunden ein.
  const [hold, setHold] = useState<{ rowId: string; index: number; seconds: number; endAtMs: number } | null>(null);
  // A1: Detail-Feld eines Satzes (Satzart, RIR, Notiz, Scheiben), RIR-Frage in der Pause, Scheiben-Einstellung.
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [askRirFor, setAskRirFor] = useState<string | null>(null);
  const [plateSetup, setPlateSetup] = useState<PlateSetup | null>(null);
  // Cardio dieses Trainings (A2): geplant aus dem Plantag oder hinzugefügt.
  const [cardio, setCardio] = useState<CardioEntry[]>([]);
  const holdNow = useNow(hold !== null);
  const holdLeftMs = hold ? Math.max(0, hold.endAtMs - holdNow) : 0;

  const load = useCallback(async () => {
    const [info, rows, all, savedTimer, auto, timed, progression] = await Promise.all([
      getSession(db, id),
      listSessionSets(db, id),
      listExercises(db),
      loadRestTimer(db),
      loadRestAuto(db),
      timedSessionsForWorkout(db, id),
      loadProgressionOn(db),
    ]);
    setProgressionOn(progression);
    setPlateSetup(await loadPlateSetup(db));
    setCardio(await listCardioForSession(db, id));
    setHints(await planHintsForSession(db, id));
    setBlocks(timed);
    setAlertsOff(NOTIFICATIONS_SUPPORTED && !(await loadReminders(db)).timerAlerts);
    setLoadedAtMs(nowMs());
    setSession(info);
    setRestAuto(auto);
    setSets(rows);
    setExercises(all);
    setTimer(info?.status === 'aktiv' ? savedTimer : null);
    const lastByExercise: Record<string, LastPerformance> = {};
    const historyByExercise: Record<string, PastSession[]> = {};
    for (const exerciseId of new Set(rows.map((r) => r.exerciseId))) {
      lastByExercise[exerciseId] = await lastPerformance(db, exerciseId, id);
      historyByExercise[exerciseId] = await exerciseHistory(db, exerciseId, id, nowMs());
    }
    setLast(lastByExercise);
    setHistory(historyByExercise);
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
  function suggestion(row: SetRow) {
    // Aufwärmsätze: nur eigene Werte bzw. die geplanten Wiederholungen; das Gewicht kommt aus dem Vorschlag.
    if (row.setType === 'aufwaermen') {
      return {
        weight: row.weightKg != null ? shown(row.weightKg) : '',
        reps: row.reps != null ? String(row.reps) : row.plannedRepsMin != null ? String(row.plannedRepsMin) : '',
      };
    }
    const work = sets.filter((s) => s.exerciseId === row.exerciseId && s.setType !== 'aufwaermen');
    const indexInExercise = Math.max(0, work.indexOf(row));
    if (isTimed(row.exerciseId)) {
      const own = work.filter((s) => s.completedAt && s.position < row.position);
      const lastTime = last[row.exerciseId]?.[indexInExercise] ?? last[row.exerciseId]?.at(-1);
      const seconds = row.seconds ?? own.at(-1)?.seconds ?? row.plannedSeconds ?? lastTime?.seconds ?? null;
      return { weight: '0', reps: seconds === null ? '' : String(seconds) };
    }
    if (row.weightKg != null && row.reps != null) {
      return { weight: shown(row.weightKg), reps: String(row.reps) };
    }
    const bodyweight = exercises.find((e) => e.id === row.exerciseId)?.equipment === 'koerpergewicht';
    const own = work.filter((s) => s.completedAt && s.position < row.position);
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
      haptic.success();
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
    const value = secondsOverride ? { weight: '0', reps: secondsOverride } : (inputs[row.id] ?? suggestion(row));
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
    // Letzter offener Satz dieser Übung? Dann ein Erfolgs-Signal statt nur eines Drucks.
    const openLeft = sets.filter((s) => s.exerciseId === row.exerciseId && !s.completedAt && s.id !== row.id).length;
    if (openLeft === 0) haptic.success();
    const anyOpenElsewhere = sets.some((s) => !s.completedAt && s.id !== row.id);
    // Vor einem Drop-Satz gibt es keine Pause (A1).
    const nextOfExercise = sets.find((s) => s.exerciseId === row.exerciseId && !s.completedAt && s.id !== row.id && s.position > row.position);
    const beforeDrop = nextOfExercise?.setType === 'drop';
    // In der Pause fragen, wie viele Wiederholungen noch gegangen wären (nicht bei Zeit- und Aufwärmsätzen).
    setAskRirFor(!isTimed(row.exerciseId) && row.setType !== 'aufwaermen' ? row.id : null);
    // Der Satz ist bereits gespeichert; ein Fehler beim Timer darf daran nichts ändern (HEALTH-009).
    if (restAuto && row.restSeconds > 0 && !beforeDrop) {
      try {
        await updateTimer(startRest(timer, row.restSeconds, nowMs()));
        // Pause im Vollbild, solange noch etwas zu tun ist.
        if (anyOpenElsewhere) setRestFocus(true);
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
    setRestFocus(false);
    // Nach einem normalen Ende: Abschluss-Bildschirm (Zusammenfassung, Bestleistungen, Woche).
    // Ein vorgeschlagenes Cool-down startet von dort aus (STRETCH-002).
    if (status === 'abgeschlossen') {
      router.replace(`/training/summary/${id}`);
      return;
    }
    // Zurück zur Trainingsübersicht, auch wenn das Training direkt (z. B. von „Heute“) geöffnet wurde.
    router.dismissTo('/training');
  }

  /**
   * Vergessenes Training (länger als 6 Stunden offen): beenden mit dem Zeitpunkt des letzten Satzes
   * (sonst stünde eine Dauer von Stunden oder Tagen in der Zusammenfassung) oder verwerfen, wenn nichts gemacht wurde.
   */
  async function closeStale(keep: boolean) {
    const lastSet = sets.filter((s) => s.completedAt).map((s) => s.completedAt!).sort().at(-1) ?? session?.startedAt;
    await finishSession(db, id, keep ? 'abgeschlossen' : 'abgebrochen', keep ? undefined : 'vergessen', lastSet);
    await updateTimer(stopRest(timer));
    setRestFocus(false);
    if (keep) router.replace(`/training/summary/${id}`);
    else router.dismissTo('/training');
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

  /** Vorschlag nach den Steigerungsregeln für die offenen Sätze einer Übung (nur im laufenden Training). */
  function adviceFor(exerciseId: string): Advice | null {
    const planned = sets.filter((s) => s.exerciseId === exerciseId && s.setType !== 'aufwaermen');
    const open = planned.filter((s) => !s.completedAt);
    const exercise = byIdAll.get(exerciseId);
    if (!progressionOn || open.length === 0 || planned.length === 0 || !exercise) return null;
    const first = planned[0];
    return progressionAdvice(
      history[exerciseId] ?? [],
      { sets: planned.length, repsMin: first.plannedRepsMin, repsMax: first.plannedRepsMax, seconds: first.plannedSeconds },
      exercise.equipment,
      units.weight,
      loadModeOf(exercise)
    );
  }

  function adviceText(advice: Advice) {
    const v = adviceValues(advice);
    const value =
      v.seconds !== null
        ? t('session.setDoneSeconds', { seconds: v.seconds })
        : v.weightKg !== null
          ? `${formatWeight(v.weightKg, units.weight, 2)} × ${v.reps ?? '–'}`
          : String(v.reps ?? '');
    return t(`session.advice.${advice.kind}`, {
      value,
      days: advice.kind === 'wiedereinstieg' ? advice.daysAgo : '',
      percent: advice.kind === 'wiedereinstieg' ? advice.percent : '',
    });
  }

  /** Vorschlag in die offenen Sätze eintragen; gespeichert wird erst mit ✓. */
  function applyAdvice(exerciseId: string, advice: Advice) {
    const v = adviceValues(advice);
    const next: Inputs = {};
    sets
      .filter((s) => s.exerciseId === exerciseId && !s.completedAt && s.setType !== 'aufwaermen')
      .forEach((row) => {
        const base = inputs[row.id] ?? suggestion(row);
        next[row.id] = {
          weight: v.weightKg !== null ? shown(v.weightKg) : base.weight,
          reps: v.seconds !== null ? String(v.seconds) : v.reps !== null ? String(v.reps) : base.reps,
        };
      });
    setInputs((i) => ({ ...i, ...next }));
  }

  /** Aufwärmsätze aus dem Arbeitsgewicht vorschlagen und vor dem ersten Satz einfügen (A1). */
  function warmupPlan(exerciseId: string) {
    const exercise = byIdAll.get(exerciseId);
    const firstWork = sets.find((s) => s.exerciseId === exerciseId && s.setType !== 'aufwaermen');
    if (!exercise || !firstWork || isTimed(exerciseId)) return [];
    if (sets.some((s) => s.exerciseId === exerciseId && (s.completedAt || s.setType === 'aufwaermen'))) return [];
    const mode = loadModeOf(exercise);
    if (mode === 'unterstuetzt' || mode === 'zusatzgewicht') return [];
    const work = parseDecimal((inputs[firstWork.id] ?? suggestion(firstWork)).weight);
    return work === null ? [] : warmupSets(work, weightStep(exercise.equipment, units.weight), units.weight);
  }

  async function addWarmups(exerciseId: string) {
    const plan = warmupPlan(exerciseId);
    if (plan.length === 0) return;
    const ids = await addWarmupSets(db, id, exerciseId, plan.map((p) => p.reps));
    setInputs((i) => ({
      ...i,
      ...Object.fromEntries(ids.map((setId, k) => [setId, { weight: formatNumber(plan[k].weight, 2), reps: String(plan[k].reps) }])),
    }));
    await load();
  }

  async function changeSet(setId: string, change: Parameters<typeof updateSetDetails>[2]) {
    await updateSetDetails(db, setId, change);
    await load();
  }

  async function changePlates(setup: PlateSetup) {
    setPlateSetup(setup);
    await savePlateSetup(db, setup);
  }

  async function replaceWith(fromId: string, toId: string) {
    await replaceOpenSets(db, id, fromId, toId);
    setBusyFor(null);
    setInputs({});
    await load();
  }

  const byIdAll = new Map(exercises.map((e) => [e.id, e]));
  const isTimed = (exerciseId: string) => byIdAll.get(exerciseId)?.measure === 'zeit';
  if (!session) return <Screen withHeader>{null}</Screen>;
  const active = session.status === 'aktiv';
  const byId = byIdAll;
  // Name aus dem Plan (z. B. „Cable Flys“) vor dem Katalognamen; Verlauf hängt weiter an der Übung.
  const nameOf = (exerciseId: string) => hints[exerciseId]?.label || exerciseName(byIdAll.get(exerciseId));
  const warmupDone = blocks.some((b) => b.kind === 'aufwaermen' && b.status === 'abgeschlossen');
  const cooldownDone = blocks.some((b) => b.kind === 'cooldown' && b.status === 'abgeschlossen');
  // Cool-down noch bis 3 Stunden nach dem Ende anbieten.
  const recentlyFinished = session.finishedAt !== null && Date.parse(session.finishedAt) > loadedAtMs - 3 * 3600_000;
  const showWarmup = active && session.warmup !== 0 && !warmupDone && sets.every((s) => !s.completedAt);
  const showCooldown =
    session.cooldown !== 0 && !cooldownDone && session.status !== 'abgebrochen' && (active ? doneCountOf(sets) > 0 : recentlyFinished);
  const order = [...new Set(sets.map((s) => s.exerciseId))];
  const doneCount = sets.filter((s) => s.completedAt).length;
  // Was gerade dran ist: der erste offene Satz in Trainingsreihenfolge (bei Supersätzen im Wechsel).
  const nextRow = sets.find((s) => !s.completedAt);
  const currentId = nextRow?.exerciseId ?? null;
  const modeOf = (exerciseId: string): LoadMode => {
    const e = byIdAll.get(exerciseId);
    return e ? loadModeOf(e) : 'normal';
  };
  const letters = supersetLetters(sets.map((s) => s.superset));
  const askRow = askRirFor ? sets.find((s) => s.id === askRirFor) : undefined;
  const ask = askRow ? (
    <View style={[styles.ask, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <RirChoice
        label={t('logger.rirAsk')}
        allowEmpty={false}
        value={askRow.rir}
        onChange={async (rir) => {
          setAskRirFor(null);
          await changeSet(askRow.id, { rir });
        }}
      />
      {hints[askRow.exerciseId]?.rir ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('logger.rirTarget', { rir: hints[askRow.exerciseId]?.rir })}
        </ThemedText>
      ) : null}
    </View>
  ) : null;
  let nextUp: NextUp = null;
  if (nextRow) {
    const rowsOfNext = sets.filter((s) => s.exerciseId === nextRow.exerciseId);
    const index = rowsOfNext.indexOf(nextRow);
    const value = inputs[nextRow.id] ?? suggestion(nextRow);
    const what = isTimed(nextRow.exerciseId)
      ? value.reps
        ? t('session.setDoneSeconds', { seconds: value.reps })
        : ''
      : value.weight && value.reps
        ? `${value.weight} ${units.weight} × ${value.reps}`
        : '';
    nextUp = {
      title: nameOf(nextRow.exerciseId),
      detail: [t('session.setOf', { n: setLabels(rowsOfNext.map((r) => r.setType))[index], total: rowsOfNext.length }), what].filter(Boolean).join(' · '),
    };
  }

  function cardioCard(entries: CardioEntry[]) {
    if (entries.length === 0) return null;
    return (
      <Card title={t('cardio.title')}>
        {entries.map((c, i) => (
          <CardioRow
            key={c.id}
            entry={c}
            active={active}
            last={i === entries.length - 1}
            onPress={active || c.completedAt ? () => router.push({ pathname: '/training/cardio', params: { id: c.id } }) : undefined}
          />
        ))}
      </Card>
    );
  }

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
            next={nextUp}
            focus={restFocus}
            onFocusChange={setRestFocus}
            ask={ask}
          />
        ) : null
      }>
      <Stack.Screen
        options={{ title: session.dayName ? `${session.planName} – ${session.dayName}` : t('session.free') }}
      />
      {active && Platform.OS !== 'web' ? <KeepAwake /> : null}
      {active && loadedAtMs > 0 && isStaleSession(session.startedAt, loadedAtMs) ? (
        <Card title={t('session.staleTitle')}>
          <ThemedText>
            {t('session.staleText', {
              date: new Date(session.startedAt).toLocaleString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
            })}
          </ThemedText>
          {doneCount > 0 ? <Button label={t('session.staleFinish', { count: doneCount })} onPress={() => closeStale(true)} /> : null}
          <ConfirmButton label={t('session.staleDiscard')} confirmLabel={t('session.staleDiscardConfirm')} onConfirm={() => closeStale(false)} />
          <ThemedText type="small" themeColor="textSecondary">
            {doneCount > 0 ? t('session.staleHint') : t('session.staleHintEmpty')}
          </ThemedText>
        </Card>
      ) : null}
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
      {active && sets.length > 0 ? (
        <MeterBar progress={doneCount / sets.length} color={dark ? theme.accent : theme.tint} trackColor={theme.backgroundSelected} height={6} />
      ) : null}
      {warmupDone ? <ThemedText type="small" themeColor="textSecondary">{t('session.warmupDone')}</ThemedText> : null}
      {blockMessage ? <ThemedText>{blockMessage}</ThemedText> : null}

      {cardioCard(cardio.filter((c) => c.atEnd === 0))}

      {order.map((exerciseId) => {
        const rows = sets.filter((s) => s.exerciseId === exerciseId);
        const lastSets = last[exerciseId] ?? [];
        const advice = active ? adviceFor(exerciseId) : null;
        const hasOpen = rows.some((r) => !r.completedAt);
        const exercise = byId.get(exerciseId);
        const allDone = rows.every((r) => r.completedAt);
        // Ziel aus dem ersten Arbeitssatz (Aufwärmsätze haben eigene Wiederholungen).
        const target = rows.find((r) => r.setType !== 'aufwaermen') ?? rows[0];
        // Fertige Übungen klappen im laufenden Training zu einer Zeile zusammen; Tippen klappt sie wieder auf.
        if (active && allDone && !openDone.has(exerciseId)) {
          return (
            <Animated.View key={exerciseId} layout={cardLayout}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${nameOf(exerciseId)}: ${t('session.exerciseDone', { count: rows.length })}. ${t('session.showSets')}`}
                onPress={() => setOpenDone((o) => new Set(o).add(exerciseId))}
                style={({ pressed }) => [
                  styles.doneCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.hairline, opacity: pressed ? 0.7 : 1 },
                ]}>
                <View style={[styles.doneMark, { backgroundColor: dark ? theme.accent : theme.tint }]}>
                  <ThemedText style={[styles.doneMarkText, { color: dark ? theme.onAccent : theme.onTint }]}>✓</ThemedText>
                </View>
                <View style={styles.flex}>
                  <ThemedText style={styles.doneTitle} numberOfLines={1}>
                    {nameOf(exerciseId)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {t('session.doneSummary', {
                      unit: units.weight,
                      sets: formatSets(
                        rows.map((r) => ({ weightKg: r.weightKg, reps: r.reps, seconds: r.seconds })),
                        units.weight
                      ),
                    })}
                  </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary">›</ThemedText>
              </Pressable>
            </Animated.View>
          );
        }
        return (
          <Animated.View key={exerciseId} layout={cardLayout}>
          <Card title={nameOf(exerciseId)}>
            {hints[exerciseId]?.label && hints[exerciseId]?.label !== exerciseName(exercise) ? (
              <ThemedText type="small" themeColor="textSecondary">
                {exerciseName(exercise)}
              </ThemedText>
            ) : null}
            {active && exerciseId === currentId ? (
              <View style={styles.nowRow}>
                <View style={[styles.nowDot, { backgroundColor: dark ? theme.accent : theme.tint }]} />
                <ThemedText type="small">{t('session.now')}</ThemedText>
              </View>
            ) : null}
            <ExerciseMedia exerciseId={exerciseId} label={nameOf(exerciseId)} />
            <ThemedText type="small" themeColor="textSecondary">
              {lastSets.length ? t('session.last', { sets: formatSets(lastSets, units.weight), unit: units.weight }) : t('session.lastNone')}
            </ThemedText>
            {advice ? (
              <>
                <ThemedText type="small">{adviceText(advice)}</ThemedText>
                {advice.kind !== 'variante' ? (
                  <Button label={t('session.adviceApply')} variant="secondary" onPress={() => applyAdvice(exerciseId, advice)} />
                ) : null}
              </>
            ) : null}
            {target.plannedSeconds != null ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.targetSeconds', { seconds: target.plannedSeconds })}
              </ThemedText>
            ) : null}
            {isTimed(exerciseId) && active ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.holdHint')}
              </ThemedText>
            ) : null}
            {target.plannedSeconds == null && target.plannedRepsMin != null ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.target', { min: target.plannedRepsMin, max: target.plannedRepsMax })}
                {hints[exerciseId]?.rir ? ` · ${t('session.rir', { rir: hints[exerciseId]?.rir })}` : ''}
              </ThemedText>
            ) : null}
            {hints[exerciseId]?.note ? <ThemedText type="small">{hints[exerciseId]?.note}</ThemedText> : null}
            {rows[0].superset != null ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('logger.supersetWith', {
                  letter: letters.get(rows[0].superset) ?? '',
                  names: [...new Set(sets.filter((s) => s.superset === rows[0].superset && s.exerciseId !== exerciseId).map((s) => nameOf(s.exerciseId)))].join(', '),
                })}
              </ThemedText>
            ) : null}
            {modeOf(exerciseId) !== 'normal' && !isTimed(exerciseId) ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t(`logger.load.${modeOf(exerciseId) as 'einseitig' | 'unterstuetzt' | 'zusatzgewicht'}`)}
              </ThemedText>
            ) : null}
            {rows.map((row, index) => {
              const value = inputs[row.id] ?? suggestion(row);
              const label = setLabels(rows.map((r) => r.setType))[index];
              return (
                <View key={row.id}>
                <View style={styles.setRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('logger.details', { n: label })}
                    accessibilityState={{ expanded: detailFor === row.id }}
                    onPress={() => setDetailFor((d) => (d === row.id ? null : row.id))}
                    style={styles.setNumberHit}>
                    <ThemedText type="smallBold" themeColor={row.completedAt ? 'textSecondary' : 'text'} style={styles.setNumber}>
                      {label}
                    </ThemedText>
                  </Pressable>
                  {row.completedAt ? (
                    <>
                      <ThemedText style={[styles.flex, styles.doneText]}>
                        {row.seconds != null
                          ? t('session.setDoneSeconds', { seconds: row.seconds })
                          : t('session.setDone', { weight: formatWeight(row.weightKg ?? 0, units.weight, 2), reps: row.reps })}
                        {row.rir != null ? ` · ${t('logger.rirShort', { rir: row.rir === 4 ? '4+' : row.rir })}` : ''}
                      </ThemedText>
                      {active ? (
                        <SetCheck
                          done
                          accessibilityLabel={`${t('session.undo')} ${label}`}
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
                        placeholder={t(`logger.placeholder.${modeOf(exerciseId)}`, { unit: units.weight })}
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`${t('session.weightIn', { unit: units.weight })} ${label}`}
                        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      />
                      )}
                      <TextInput
                        value={value.reps}
                        onChangeText={(reps) => setInputs((i) => ({ ...i, [row.id]: { ...value, reps } }))}
                        placeholder={isTimed(exerciseId) ? t('session.seconds') : t('session.reps')}
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="number-pad"
                        accessibilityLabel={`${isTimed(exerciseId) ? t('session.secondsLabel') : t('session.reps')} ${label}`}
                        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      />
                      {isTimed(exerciseId) ? (
                        hold?.rowId === row.id ? (
                          <Button
                            label={`■ ${formatClock(holdLeftMs)}`}
                            accessibilityLabel={`${t('session.holdStop')} ${label}`}
                            onPress={stopHold}
                          />
                        ) : (
                          <Button
                            label="▶"
                            accessibilityLabel={`${t('session.holdStart')} ${label}`}
                            variant="secondary"
                            disabled={hold !== null}
                            onPress={() => startHold(row, index, value)}
                          />
                        )
                      ) : null}
                      <SetCheck done={false} accessibilityLabel={`${t('session.done')} ${label}`} onPress={() => complete(row, index)} />
                      <Button
                        label="−"
                        accessibilityLabel={`${t('session.removeSet')} ${label}`}
                        variant="secondary"
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
                {askRirFor === row.id && !restFocus && row.completedAt ? (
                  <View style={styles.inlineAsk}>
                    <RirChoice
                      label={t('logger.rirAsk')}
                      allowEmpty={false}
                      value={row.rir}
                      onChange={async (rir) => {
                        setAskRirFor(null);
                        await changeSet(row.id, { rir });
                      }}
                    />
                  </View>
                ) : null}
                {row.note && detailFor !== row.id ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.setNote}>
                    {row.note}
                  </ThemedText>
                ) : null}
                {detailFor === row.id ? (
                  <SetDetails
                    setType={row.setType}
                    rir={row.rir}
                    note={row.note}
                    targetRir={hints[exerciseId]?.rir ?? null}
                    onChange={(change) => changeSet(row.id, change)}
                    plates={
                      exercise && usesPlates(exercise.equipment) && !isTimed(exerciseId)
                        ? {
                            weightText: row.completedAt ? shown(row.weightKg ?? 0) : value.weight,
                            unit: units.weight,
                            setup: plateSetup ?? defaultPlateSetup(units.weight),
                            onSetup: changePlates,
                          }
                        : null
                    }
                  />
                ) : null}
                </View>
              );
            })}
            {invalid && rows.some((r) => r.id === invalid) ? (
              <ThemedText style={{ color: theme.danger }}>
                {isTimed(exerciseId) ? t('session.invalidSeconds') : t('session.invalidSet')}
              </ThemedText>
            ) : null}
            {active && warmupPlan(exerciseId).length > 0 ? (
              <>
                <Button
                  label={t('logger.warmup', { count: warmupPlan(exerciseId).length })}
                  variant="secondary"
                  onPress={() => addWarmups(exerciseId)}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('logger.warmupHint', {
                    list: warmupPlan(exerciseId)
                      .map((w) => `${formatNumber(w.weight, 2)} ${units.weight} × ${w.reps}`)
                      .join(' · '),
                  })}
                </ThemedText>
              </>
            ) : null}
            {active ? (
              <Button
                label={t('session.addSet')}
                variant="secondary"
                onPress={async () => {
                  await addSet(db, id, exerciseId);
                  await load();
                }}
              />
            ) : null}
            {active && hasOpen && exercise ? (
              busyFor === exerciseId ? (
                <View style={styles.busy}>
                  <ThemedText type="smallBold">{t('session.busyTitle', { name: nameOf(exerciseId) })}</ThemedText>
                  {replacementOptions(exercise, exercises.filter((e) => e.kind === 'kraft')).map((alt) => (
                    <ListRow
                      key={alt.id}
                      title={exerciseName(byId.get(alt.id))}
                      subtitle={t(`equipment.${alt.equipment}`)}
                      accessory="⇄"
                      onPress={() => replaceWith(exerciseId, alt.id)}
                    />
                  ))}
                  {replacementOptions(exercise, exercises.filter((e) => e.kind === 'kraft')).length === 0 ? (
                    <ThemedText type="small">{t('session.busyNone')}</ThemedText>
                  ) : null}
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('session.busyHint')}
                  </ThemedText>
                  <Button label={t('common.cancel')} variant="secondary" onPress={() => setBusyFor(null)} />
                </View>
              ) : (
                <Button label={t('session.busy')} variant="secondary" onPress={() => setBusyFor(exerciseId)} />
              )
            ) : null}
            {active && allDone ? (
              <Button
                label={t('session.hideSets')}
                variant="secondary"
                onPress={() =>
                  setOpenDone((o) => {
                    const n = new Set(o);
                    n.delete(exerciseId);
                    return n;
                  })
                }
              />
            ) : null}
          </Card>
          </Animated.View>
        );
      })}

      {cardioCard(cardio.filter((c) => c.atEnd === 1))}

      {showCooldown ? (
        <Card title={t('session.cooldownTitle')}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('session.cooldownText', { count: blockFor('cooldown').items.length, minutes: routineMinutes(blockFor('cooldown'), exercises) })}
          </ThemedText>
          <Button label={t('session.cooldownStart')} variant={active ? 'danger' : 'primary'} onPress={() => startBlock('cooldown')} />
        </Card>
      ) : null}
      {cooldownDone ? <ThemedText type="small" themeColor="textSecondary">{t('session.cooldownDone')}</ThemedText> : null}

      <Card>
        <Field
          label={t('logger.sessionNote')}
          defaultValue={session.note ?? ''}
          placeholder={t('logger.sessionNotePlaceholder')}
          multiline
          onEndEditing={(e) => setSessionNote(db, id, e.nativeEvent.text)}
        />
      </Card>

      {active && alertsOff ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('session.alertsTip')}
          </ThemedText>
          <Button label={t('session.alertsOpen')} variant="secondary" onPress={() => router.push('/more/notifications')} />
        </Card>
      ) : null}
      {active ? (
        <>
          <Button label={t('session.addExercise')} onPress={() => setPicking(true)} />
          <Button
            label={t('cardio.addInSession')}
            variant="secondary"
            onPress={() => router.push({ pathname: '/training/cardio', params: { session: id } })}
          />
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
            <Choice
              label={t('session.progressionOn')}
              options={['an', 'aus'] as const}
              value={progressionOn ? 'an' : 'aus'}
              format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
              onChange={async (v) => {
                setProgressionOn(v === 'an');
                await saveProgressionOn(db, v === 'an');
              }}
            />
            {progressionOn ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.adviceNote', { version: PROGRESSION_RULES_VERSION })}
              </ThemedText>
            ) : null}
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
  setNumber: { minWidth: 20, fontVariant: ['tabular-nums'] },
  setNote: { marginLeft: 44, marginTop: -Spacing.one },
  inlineAsk: { marginLeft: 44 },
  doneText: { fontVariant: ['tabular-nums'] },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: -Spacing.one },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  doneCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: 20, borderWidth: 1, padding: Spacing.three, minHeight: 64 },
  doneMark: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  doneMarkText: { fontSize: 16, lineHeight: 20, fontWeight: 700 },
  doneTitle: { fontSize: 16, lineHeight: 22, fontWeight: 600 },
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
  busy: { gap: Spacing.two },
  ask: { borderRadius: 20, borderWidth: 1, padding: Spacing.three, gap: Spacing.one },
  setNumberHit: { minWidth: 36, minHeight: 44, justifyContent: 'center' },
});
