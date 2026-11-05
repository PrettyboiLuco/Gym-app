import { router } from 'expo-router';

import { Button, Card } from '@/components/card';
import { cardioName, cardioSummary } from '@/components/cardio-row';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { listCardio, type CardioEntry } from '@/data/cardio';
import type { Db } from '@/data/db';
import { listTimedSessions, type TimedSession } from '@/data/routines';
import { listSessions } from '@/data/training';
import { localDay, timeZone } from '@/domain/time';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatNumber, t } from '@/i18n';

type Row =
  | { type: 'kraft'; at: string; session: Awaited<ReturnType<typeof listSessions>>[number]; cardioMinutes: number }
  | { type: 'zeit'; at: string; session: TimedSession }
  | { type: 'cardio'; at: string; entry: CardioEntry };

async function loadHistory(db: Db): Promise<Row[]> {
  const [workouts, timed, cardio] = await Promise.all([listSessions(db), listTimedSessions(db), listCardio(db, '0000-01-01', '9999-12-31')]);
  const cardioBySession = new Map<string, number>();
  for (const c of cardio) if (c.sessionId) cardioBySession.set(c.sessionId, (cardioBySession.get(c.sessionId) ?? 0) + (c.minutes ?? 0));
  return [
    ...workouts.map((s) => ({ type: 'kraft' as const, at: s.startedAt, session: s, cardioMinutes: cardioBySession.get(s.id) ?? 0 })),
    // Cardio ohne Training (A2) als eigene Zeile; Tag als Zeitpunkt (mittags), damit die Reihenfolge passt.
    ...cardio.filter((c) => !c.sessionId).map((c) => ({ type: 'cardio' as const, at: c.completedAt ?? `${c.day}T12:00:00Z`, entry: c })),
    // Laufende Einheiten stehen oben in „Training“, nicht im Verlauf.
    ...timed.filter((s) => s.status !== 'aktiv').map((s) => ({ type: 'zeit' as const, at: s.startedAt, session: s })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Verlauf: Krafttrainings und Dehn-/HIIT-Einheiten gemeinsam, getrennt gespeichert (STRETCH-005, HIIT-005). */
export default function HistoryScreen() {
  const { data: rows } = useLoad(loadHistory, [] as Row[]);

  return (
    <Screen withHeader>
      {/* Vergessenes Training (Prüfung 05.11.2026): mit Datum und Sätzen nachtragen. */}
      <Button label={t('history.backfill')} variant="secondary" onPress={() => router.push({ pathname: '/training/edit/[id]', params: { id: 'neu' } })} />
      <Card>
        {rows.length === 0 ? <ThemedText themeColor="textSecondary">{t('history.empty')}</ThemedText> : null}
        {rows.map((row) =>
          row.type === 'cardio' ? (
            <ListRow
              key={row.entry.id}
              title={t('cardio.historyTitle', { name: cardioName(row.entry) })}
              subtitle={`${formatDay(row.entry.day)} · ${cardioSummary(row.entry) ?? ''}`}
              accessory="›"
              onPress={() => router.push({ pathname: '/training/cardio', params: { id: row.entry.id } })}
            />
          ) : row.type === 'kraft' ? (
            <ListRow
              key={row.session.id}
              title={row.session.dayName ? `${row.session.planName} – ${row.session.dayName}` : t('session.free')}
              subtitle={`${formatDay(localDay(new Date(row.at), timeZone))} · ${t(`history.status.${row.session.status}`)} · ${t('history.sets', {
                count: row.session.doneSets ?? 0,
              })}${row.cardioMinutes ? ` · ${t('cardio.inSession', { minutes: formatNumber(row.cardioMinutes, 0) })}` : ''}${
                row.session.note ? `\n${row.session.note}` : ''
              }`}
              accessory="›"
              onPress={() => router.push(`/training/session/${row.session.id}`)}
            />
          ) : (
            <ListRow
              key={row.session.id}
              title={row.session.name}
              subtitle={`${formatDay(localDay(new Date(row.at), timeZone))} · ${t('history.timed', {
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
