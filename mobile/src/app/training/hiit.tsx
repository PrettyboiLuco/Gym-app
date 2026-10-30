import { router } from 'expo-router';

import { Button, Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { routineMinutes, templateName, withMinutes } from '@/components/timed';
import type { Db } from '@/data/db';
import { useProfile } from '@/data/profile-provider';
import { listRoutines, type RoutineSummary } from '@/data/routines';
import { listExercises, type Exercise } from '@/data/training';
import { HIIT_PROGRAMS } from '@/domain/routines';
import { useLoad } from '@/hooks/use-load';
import { t } from '@/i18n';

async function loadHiit(db: Db) {
  const [list, exercises] = await Promise.all([listRoutines(db, 'hiit'), listExercises(db)]);
  return { routines: await withMinutes(db, list, exercises), exercises };
}

/** HIIT (Register HIIT-001–007): fertige Programme in Stufen, eigene Abläufe, Sicherheitshinweise. */
export default function HiitScreen() {
  const { profile } = useProfile();
  const { data } = useLoad(loadHiit, { routines: [] as (RoutineSummary & { minutes: number })[], exercises: [] as Exercise[] });

  return (
    <Screen withHeader>
      <Card title={t('hiit.safetyTitle')}>
        <ThemedText type="small">{t('hiit.safety')}</ThemedText>
        {profile.sensitive ? <ThemedText type="small">{t('hiit.sensitive')}</ThemedText> : null}
      </Card>

      {(['bauch', 'ganzkoerper'] as const).map((focus) => (
        <Card key={focus} title={`${t('hiit.programs')}: ${t(`hiit.focus.${focus}`)}`}>
          {HIIT_PROGRAMS.filter((p) => p.focus === focus).map((p) => (
            <ListRow
              key={p.id}
              title={templateName(p)}
              subtitle={`${t(`templates.${p.id}.text`)}\n${t('hiit.summary', {
                count: p.items.length,
                work: p.workSeconds,
                rest: p.restSeconds,
                rounds: p.rounds,
                minutes: routineMinutes(p, data.exercises),
              })}`}
              accessory="›"
              onPress={() => router.push({ pathname: '/training/routine/[id]', params: { id: 'neu', template: p.id } })}
            />
          ))}
          {focus === 'bauch' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('hiit.abs')}
            </ThemedText>
          ) : null}
        </Card>
      ))}

      <Card title={t('hiit.own')}>
        {data.routines.length === 0 ? <ThemedText themeColor="textSecondary">{t('hiit.ownEmpty')}</ThemedText> : null}
        {data.routines.map((r) => (
          <ListRow
            key={r.routineId}
            title={r.name}
            subtitle={t('stretch.summary', { count: r.itemCount, minutes: r.minutes })}
            accessory="›"
            onPress={() => router.push({ pathname: '/training/routine/[id]', params: { id: r.routineId } })}
          />
        ))}
        <Button label={t('hiit.new')} onPress={() => router.push({ pathname: '/training/routine/[id]', params: { id: 'neu', kind: 'hiit' } })} />
      </Card>

      <Card>
        <ListRow title={t('hiit.interval')} accessory="›" onPress={() => router.push('/training/interval')} />
        <ListRow title={t('stretch.historyLink')} accessory="›" onPress={() => router.push('/training/history')} />
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        {t('hiit.note')} {t('exerciseHow.note')}
      </ThemedText>
    </Screen>
  );
}
