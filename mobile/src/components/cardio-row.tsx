import { ListRow } from '@/components/fields';
import type { CardioEntry } from '@/data/cardio';
import { formatClock } from '@/domain/training';
import { useNow } from '@/hooks/use-now';
import { formatNumber, t } from '@/i18n';

export function cardioName(entry: Pick<CardioEntry, 'activity' | 'customName'>) {
  return entry.activity === 'sonstiges' && entry.customName ? entry.customName : t(`cardio.activities.${entry.activity}`);
}

/** Zusammenfassung eines Eintrags: „20 min · 3,1 km · Anstrengung 6“. */
export function cardioSummary(entry: CardioEntry) {
  if (entry.minutes == null) return null;
  return [
    t('cardio.entryLine', { minutes: formatNumber(entry.minutes, 1) }),
    entry.distanceKm != null ? t('cardio.distanceLine', { km: formatNumber(entry.distanceKm, 2) }) : null,
    entry.effort != null ? t('cardio.effortLine', { effort: entry.effort }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Eine Cardio-Zeile (Training, Abschluss, Training-Tab); Tippen öffnet das Eintragen bzw. Ändern. */
export function CardioRow({ entry, onPress, active = true, last = false }: { entry: CardioEntry; onPress?: () => void; active?: boolean; last?: boolean }) {
  const now = useNow(entry.timerStartedAt !== null, 1000);
  const done = entry.completedAt !== null;
  const subtitle = done
    ? cardioSummary(entry)
    : entry.timerStartedAt
      ? t('cardio.timerRunning', { time: formatClock(now - Date.parse(entry.timerStartedAt)) })
      : [entry.plannedMinutes ? t('cardio.planned', { minutes: entry.plannedMinutes }) : null, active ? null : t('cardio.notDone')].filter(Boolean).join(' · ');
  return (
    <ListRow
      icon="clock"
      title={cardioName(entry)}
      subtitle={subtitle || undefined}
      value={done ? t('cardio.edit') : active ? t('cardio.open') : undefined}
      accessory={onPress ? '›' : undefined}
      onPress={onPress}
      last={last}
    />
  );
}
