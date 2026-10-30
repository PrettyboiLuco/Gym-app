import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { Choice, ConfirmButton } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { finishTimedSession, loadTimedRun, loadVoice, saveTimedRun, saveVoice } from '@/data/routines';
import { useDb } from '@/data/store-provider';
import { listExercises, type Exercise } from '@/data/training';
import {
  pauseRun,
  resumeRun,
  runDoneSeconds,
  runElapsedMs,
  runRoundsDone,
  skipStep,
  timelineState,
  type Step,
  type TimedRun,
} from '@/domain/timeline';
import { formatClock } from '@/domain/training';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { t, tOptional } from '@/i18n';

// Zeitpunkt für Aktionen (in Event-Handlern, nicht beim Rendern).
const nowMs = () => Date.now();

function KeepAwake() {
  useKeepAwake();
  return null;
}

type Outcome = { status: 'abgeschlossen' | 'abgebrochen'; minutes: number; kind: TimedRun['kind']; pain: boolean };

/**
 * Ablauf für Dehnroutinen, Aufwärmen/Cool-down und HIIT (Register STRETCH-004–006, HIIT-003/007).
 * Der Zustand wird aus gespeicherter Startzeit, Pausen und Sprüngen berechnet und übersteht so
 * einen App-Neustart. „Schmerzen / abbrechen“ ist immer sichtbar.
 */
export default function RunScreen() {
  const db = useDb();
  const theme = useTheme();
  const [run, setRun] = useState<TimedRun | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [voice, setVoice] = useState(true);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const finishing = useRef(false);
  const lastAnnounced = useRef(-1);
  // Lief die Einheit ab, während dieser Bildschirm nicht offen war? Dann nachfragen statt sie
  // stillschweigend als absolviert zu zählen.
  const [askDone, setAskDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadTimedRun(db), listExercises(db), loadVoice(db)]).then(([r, all, v]) => {
      if (cancelled) return;
      if (r && timelineState(r.steps, runElapsedMs(r, nowMs())).done) setAskDone(true);
      setRun(r);
      setExercises(all);
      setVoice(v);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const running = run !== null && run.pausedAtMs === null && outcome === null;
  const now = useNow(running);
  const state = run ? timelineState(run.steps, runElapsedMs(run, run.pausedAtMs ?? now)) : null;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const nameOf = (id: string) => exerciseName(byId.get(id));

  const update = useCallback(
    async (next: TimedRun) => {
      setRun(next);
      await saveTimedRun(db, next);
    },
    [db]
  );

  const finish = useCallback(
    async (status: Outcome['status'], reason?: string) => {
      if (!run || finishing.current) return;
      finishing.current = true;
      const at = nowMs();
      await finishTimedSession(db, run.sessionId, status, {
        doneSeconds: runDoneSeconds(run, at),
        roundsDone: run.kind === 'hiit' ? runRoundsDone(run, at) : null,
        reason,
      });
      Speech.stop();
      setOutcome({ status, minutes: Math.max(1, Math.round(runDoneSeconds(run, at) / 60)), kind: run.kind, pain: reason === 'schmerz' });
    },
    [db, run]
  );

  // Ende erreicht: als abgeschlossen speichern (genau einmal).
  useEffect(() => {
    if (state?.done && !outcome && !askDone) {
      if (voice && Platform.OS !== 'web') Speech.speak(t('run.speak.done'), { language: 'de-DE' });
      finish('abgeschlossen');
    }
  }, [state?.done, outcome, finish, voice, askDone]);

  // Letzte drei Sekunden vor einem Wechsel: kurzes Tippen als Vorwarnung (3-2-1).
  const lastTick = useRef('');
  const secondsLeft = state && !state.done ? Math.ceil(state.remainingMs / 1000) : 0;
  useEffect(() => {
    if (!state || state.done || run?.pausedAtMs !== null || outcome || Platform.OS === 'web') return;
    if (secondsLeft < 1 || secondsLeft > 3 || state.step.seconds <= 5) return;
    const key = `${state.index}-${secondsLeft}`;
    if (key === lastTick.current) return;
    lastTick.current = key;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [state, secondsLeft, run?.pausedAtMs, outcome]);

  // Ansage und kurzes Signal bei jedem neuen Schritt.
  useEffect(() => {
    if (!state || state.done || run?.pausedAtMs !== null || outcome) return;
    if (state.index === lastAnnounced.current) return;
    lastAnnounced.current = state.index;
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (voice) {
      Speech.stop();
      Speech.speak(announcement(state.step, nameOf), { language: 'de-DE' });
    }
    // nameOf hängt nur von den geladenen Übungen ab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, run?.pausedAtMs, outcome, voice]);

  if (!loaded) return <Screen withHeader>{null}</Screen>;

  if (outcome) {
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: run?.title ?? t('run.title') }} />
        <Card>
          <ThemedText type="subtitle">{outcome.status === 'abgeschlossen' ? t('run.done') : t('run.aborted')}</ThemedText>
          <ThemedText>{t('run.doneText', { minutes: outcome.minutes })}</ThemedText>
          {outcome.pain ? <ThemedText>{t('run.painHint')}</ThemedText> : null}
        </Card>
        {outcome.kind === 'dehnen' && outcome.status === 'abgeschlossen' ? (
          <Button label={t('run.flexLink')} variant="danger" onPress={() => router.replace('/training/stretch')} />
        ) : null}
        <Button
          label={outcome.kind === 'aufwaermen' || outcome.kind === 'cooldown' ? t('run.backToWorkout') : t('run.close')}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  if (askDone && run && !outcome) {
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: run.title }} />
        <Card title={t('run.askTitle')}>
          <ThemedText>{t('run.askText')}</ThemedText>
          <View style={styles.row}>
            <Button label={t('run.askYes')} onPress={() => finish('abgeschlossen')} />
            <Button label={t('run.askNo')} variant="danger" onPress={() => finish('abgebrochen', 'nicht_bestaetigt')} />
          </View>
        </Card>
      </Screen>
    );
  }

  if (!run || !state || state.done) {
    return (
      <Screen withHeader>
        <Card>
          <ThemedText themeColor="textSecondary">{t('run.none')}</ThemedText>
        </Card>
      </Screen>
    );
  }

  const step = state.step;
  const exercise = byId.get(step.exerciseId);
  const moving = exercise && (exercise.kind === 'dehnung_dynamisch' || exercise.kind === 'mobilitaet' || exercise.kind === 'kraft');
  const stepLabel = step.kind === 'halten' && moving ? t('run.step.bewegen') : t(`run.step.${step.kind}`);
  const active = step.kind === 'halten' || step.kind === 'belastung';
  const exerciseCount = Math.max(...run.steps.map((s) => s.index)) + 1;
  const rounds = Math.max(...run.steps.map((s) => s.round));
  const paused = run.pausedAtMs !== null;
  const next = state.next && state.next.exerciseId !== step.exerciseId ? state.next : null;
  const howTo = exercise?.nameKey ? tOptional(`exerciseHow.${exercise.id}`) : null;

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: run.title }} />
      {!paused && Platform.OS !== 'web' ? <KeepAwake /> : null}
      <Card>
        <ThemedText type="smallBold" style={{ color: active ? theme.tint : theme.textSecondary }} accessibilityLiveRegion="polite">
          {paused ? t('run.paused') : stepLabel}
        </ThemedText>
        <ThemedText type="subtitle">
          {nameOf(step.exerciseId)}
          {step.side ? ` – ${t(`run.side.${step.side}`)}` : ''}
        </ThemedText>
        <ThemedText style={styles.clock}>{formatClock(state.remainingMs)}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('run.progress', { index: step.index + 1, count: exerciseCount })}
          {rounds > 1 ? ` · ${t('run.round', { round: step.round, rounds })}` : ''}
        </ThemedText>
        {howTo ? (
          <ThemedText type="small" themeColor="textSecondary">
            {howTo}
          </ThemedText>
        ) : null}
        {next ? <ThemedText>{t('run.next', { name: nameOf(next.exerciseId) })}</ThemedText> : null}
      </Card>

      <View style={styles.row}>
        <Button
          label={paused ? t('run.resume') : t('run.pause')}
          onPress={() => update(paused ? resumeRun(run, nowMs()) : pauseRun(run, nowMs()))}
        />
        <Button label={t('run.skip')} variant="danger" onPress={() => update(skipStep(run, nowMs()))} />
      </View>

      <Card>
        <ConfirmButton label={t('run.pain')} confirmLabel={t('run.painConfirm')} onConfirm={() => finish('abgebrochen', 'schmerz')} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('run.painHint')}
        </ThemedText>
      </Card>

      <Card>
        <Choice
          label={t('run.voice')}
          options={['an', 'aus'] as const}
          value={voice ? 'an' : 'aus'}
          onChange={async (v) => {
            setVoice(v === 'an');
            if (v === 'aus') Speech.stop();
            await saveVoice(db, v === 'an');
          }}
          format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
        />
        <ConfirmButton label={t('run.stop')} confirmLabel={t('run.stopConfirm')} onConfirm={() => finish('abgebrochen', 'beendet')} />
      </Card>
    </Screen>
  );
}

/** Kurzer Ansagetext für einen Schritt (HIIT-003: nächste Übung ansagen). */
function announcement(step: Step, nameOf: (id: string) => string): string {
  const name = nameOf(step.exerciseId);
  switch (step.kind) {
    case 'seitenwechsel':
      return t('run.speak.switch');
    case 'vorbereitung':
      return t('run.speak.prep', { name });
    case 'pause':
    case 'rundenpause':
    case 'wechsel':
      return t('run.speak.pause', { name });
    default:
      return step.side ? t('run.speak.side', { name, side: t(`run.side.${step.side}`) }) : t('run.speak.exercise', { name });
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  clock: { fontSize: 72, lineHeight: 80, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
