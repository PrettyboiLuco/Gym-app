import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { ConfirmButton } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { deleteTimedSession, getTimedSession, type TimedSession } from '@/data/routines';
import { listExercises, type Exercise } from '@/data/training';
import { useLoad } from '@/hooks/use-load';
import { formatDay, t } from '@/i18n';

async function load(db: Db, id: string) {
  const [session, exercises] = await Promise.all([getTimedSession(db, id), listExercises(db)]);
  return { session, exercises };
}

/** Eine absolvierte Dehn-/HIIT-Einheit aus dem Protokoll, löschbar (STRETCH-005). */
export default function TimedSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, db, loaded } = useLoad((d) => load(d, id), { session: null as TimedSession | null, exercises: [] as Exercise[] }, id);
  const s = data.session;
  if (!loaded) return <Screen withHeader>{null}</Screen>;
  if (!s) {
    return (
      <Screen withHeader>
        <ThemedText themeColor="textSecondary">{t('run.none')}</ThemedText>
      </Screen>
    );
  }
  const byId = new Map(data.exercises.map((e) => [e.id, e]));
  const ids: string[] = JSON.parse(s.items);
  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: s.name }} />
      <Card>
        <ThemedText>
          {formatDay(s.startedAt.slice(0, 10))} · {t(`history.kind.${s.kind}`)}
        </ThemedText>
        <ThemedText>
          {t('history.timed', { kind: t(`history.status.${s.status}`), minutes: Math.max(1, Math.round((s.doneSeconds ?? 0) / 60)) })}
          {s.roundsDone !== null ? ` · ${t('history.rounds', { count: s.roundsDone })}` : ''}
        </ThemedText>
        {s.abortReason === 'schmerz' ? <ThemedText>{t('history.abortPain')}</ThemedText> : null}
      </Card>
      <Card title={t('history.exercises')}>
        {ids.map((exerciseId) => (
          <ThemedText key={exerciseId}>• {exerciseName(byId.get(exerciseId))}</ThemedText>
        ))}
      </Card>
      <Card>
        <ConfirmButton
          label={t('common.delete')}
          onConfirm={async () => {
            await deleteTimedSession(db, s.id);
            router.back();
          }}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('history.deleteHint')}
        </ThemedText>
      </Card>
    </Screen>
  );
}
