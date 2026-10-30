import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { listTimedSessions, type TimedSession } from '@/data/routines';
import { listSessions } from '@/data/training';
import { useLoad } from '@/hooks/use-load';
import { formatDay, t } from '@/i18n';

type Row =
  | { type: 'kraft'; at: string; session: Awaited<ReturnType<typeof listSessions>>[number] }
  | { type: 'zeit'; at: string; session: TimedSession };

async function loadHistory(db: Db): Promise<Row[]> {
  const [workouts, timed] = await Promise.all([listSessions(db), listTimedSessions(db)]);
  return [
    ...workouts.map((s) => ({ type: 'kraft' as const, at: s.startedAt, session: s })),
    // Laufende Einheiten stehen oben in „Training“, nicht im Verlauf.
    ...timed.filter((s) => s.status !== 'aktiv').map((s) => ({ type: 'zeit' as const, at: s.startedAt, session: s })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Verlauf: Krafttrainings und Dehn-/HIIT-Einheiten gemeinsam, getrennt gespeichert (STRETCH-005, HIIT-005). */
export default function HistoryScreen() {
  const { data: rows } = useLoad(loadHistory, [] as Row[]);

  return (
    <Screen withHeader>
      <Card>
        {rows.length === 0 ? <ThemedText themeColor="textSecondary">{t('history.empty')}</ThemedText> : null}
        {rows.map((row) =>
          row.type === 'kraft' ? (
            <ListRow
              key={row.session.id}
              title={row.session.dayName ? `${row.session.planName} – ${row.session.dayName}` : t('session.free')}
              subtitle={`${formatDay(row.at.slice(0, 10))} · ${t(`history.status.${row.session.status}`)} · ${t('history.sets', {
                count: row.session.doneSets ?? 0,
              })}`}
              accessory="›"
              onPress={() => router.push(`/training/session/${row.session.id}`)}
            />
          ) : (
            <ListRow
              key={row.session.id}
              title={row.session.name}
              subtitle={`${formatDay(row.at.slice(0, 10))} · ${t('history.timed', {
                kind: t(`history.kind.${row.session.kind}`),
                minutes: Math.max(1, Math.round((row.session.doneSeconds ?? 0) / 60)),
              })} · ${row.session.abortReason === 'schmerz' ? t('history.abortPain') : t(`history.status.${row.session.status}`)}`}
              accessory="›"
              onPress={() => router.push({ pathname: '/training/timed/[id]', params: { id: row.session.id } })}
            />
          )
        )}
      </Card>
    </Screen>
  );
}
