// Zeitleiste des Tages (Ausbauplan B1, W6): alle Einträge nach Uhrzeit, Essen und Getränke zusammen. Dazu als reine
// Anzeige „erste/letzte Mahlzeit“ und das Essensfenster – ohne Bewertung.

import { StyleSheet, View } from 'react-native';

import { DiaryEntryRow } from '@/components/diary-entry-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ConsumptionEvent } from '@/data/nutrition';
import { byTime, eatingWindow } from '@/domain/diary';
import { foodTitle } from '@/format/food-title';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';
import { formatAmount, formatClock, formatKcal } from '@/services/nutrition-format';

/**
 * „Erste Mahlzeit 08:10 · letzte 19:40 · Essensfenster 11,5 h“ – nur bei mindestens zwei verschiedenen Uhrzeiten
 * (sonst sagt die Zeile nichts: „07:39 · letzte 07:39 · 0 h“). Null ohne Essen.
 */
export function windowLine(events: readonly ConsumptionEvent[]): string | null {
  const w = eatingWindow(events);
  if (!w) return null;
  const first = formatClock(w.firstAt);
  const last = formatClock(w.lastAt);
  if (w.count < 2 || first === last) return null;
  return t('diary.timeline.window', { first, last, hours: formatNumber(w.hours, 1) });
}

/** Zusatzzeile eines Eintrags: Uhrzeit, Menge, kcal (ohne kcal bei ausgeblendeten Zahlen). */
export function entrySubtitle(e: ConsumptionEvent, hide: boolean, extra?: string) {
  return [formatClock(e.occurredAt), extra, formatAmount(e.amount, e.unit), hide ? null : formatKcal(e.kcal)].filter(Boolean).join(' · ');
}

export function DiaryTimeline({
  events,
  hide,
  fresh,
  onOpen,
  onDelete,
}: {
  events: ConsumptionEvent[];
  hide: boolean;
  fresh: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const sorted = byTime(events);
  if (sorted.length === 0)
    return (
      <ThemedText themeColor="textSecondary" style={styles.empty}>
        {t('diary.timeline.empty')}
      </ThemedText>
    );
  return (
    <View style={styles.list}>
      {sorted.map((e) => (
        <View key={e.id} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: e.kind === 'essen' ? theme.text : theme.border }]} />
          <View style={styles.flex}>
            <DiaryEntryRow
              title={foodTitle(e)}
              subtitle={entrySubtitle(
                e,
                hide,
                e.kind === 'essen' ? t(`nutrition.meals.${e.meal ?? 'snack'}`) : t(`nutrition.drinkTypes.${e.drinkType ?? 'sonstiges'}`)
              )}
              fresh={fresh.has(e.id)}
              onPress={() => onOpen(e.id)}
              onDelete={() => onDelete(e.id)}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  empty: { paddingVertical: Spacing.two },
});
