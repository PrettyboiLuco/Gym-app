import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { listSessions } from '@/data/training';
import { useLoad } from '@/hooks/use-load';
import { formatDay, t } from '@/i18n';

export default function HistoryScreen() {
  const { data: sessions } = useLoad((db) => listSessions(db), [] as Awaited<ReturnType<typeof listSessions>>);

  return (
    <Screen withHeader>
      <Card>
        {sessions.length === 0 ? <ThemedText themeColor="textSecondary">{t('history.empty')}</ThemedText> : null}
        {sessions.map((s) => (
          <ListRow
            key={s.id}
            title={s.dayName ? `${s.planName} – ${s.dayName}` : t('session.free')}
            subtitle={`${formatDay(s.startedAt.slice(0, 10))} · ${t(`history.status.${s.status}`)} · ${t('history.sets', {
              count: s.doneSets ?? 0,
            })}`}
            accessory="›"
            onPress={() => router.push(`/training/session/${s.id}`)}
          />
        ))}
      </Card>
    </Screen>
  );
}
