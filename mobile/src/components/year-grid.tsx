// „Dein Jahr“ (Idee aus fin, 10.11.2026): Kästchen je Tag der letzten 52 Wochen, trainiert in der Datenfarbe,
// Ruhetag/krank als Umriss. Wischbar (beginnt rechts bei heute). Bewusst ohne Serie und ohne „Tage auf Eis“.

import { useRef } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { useDataColor } from '@/components/insight-tile';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Spacing } from '@/constants/theme';
import { activeWeeks, yearCells } from '@/domain/year-grid';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

const CELL = 11;
const GAP = 3;

export function YearGrid({
  today,
  trained,
  marked,
  minutes,
}: {
  today: string;
  /** Trainingstage (YYYY-MM-DD). */
  trained: readonly string[];
  /** Ruhetage und Krank-Tage (Umriss). */
  marked: readonly string[];
  minutes: number;
}) {
  const theme = useTheme();
  const data = useDataColor();
  const scroll = useRef<ScrollViewInstance>(null);
  const cells = yearCells(today);
  const done = new Set(trained);
  const other = new Set(marked);
  const width = 52 * (CELL + GAP);
  const height = 7 * (CELL + GAP);
  const days = trained.length;
  return (
    <View style={styles.wrap} accessible accessibilityLabel={t('year.summary', { days, hours: formatNumber(minutes / 60, 0) })}>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        {...HIDDEN}>
        <Svg width={width} height={height}>
          {cells.map((c) => {
            const x = c.col * (CELL + GAP);
            const y = c.row * (CELL + GAP);
            if (c.future) return null;
            if (done.has(c.day)) return <Rect key={c.day} x={x} y={y} width={CELL} height={CELL} rx={3} fill={data} />;
            if (other.has(c.day))
              return <Rect key={c.day} x={x + 0.75} y={y + 0.75} width={CELL - 1.5} height={CELL - 1.5} rx={3} fill="none" stroke={theme.textSecondary} strokeWidth={1.5} />;
            return <Rect key={c.day} x={x} y={y} width={CELL} height={CELL} rx={3} fill={theme.backgroundSelected} />;
          })}
        </Svg>
      </ScrollView>
      <View style={styles.stats}>
        <Stat value={formatNumber(days, 0)} label={t('year.days')} />
        <Stat value={formatNumber(minutes / 60, 0)} label={t('year.hours')} />
        <Stat value={formatNumber(activeWeeks(trained), 0)} label={t('year.weeks')} />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.value}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  stats: { flexDirection: 'row', gap: Spacing.three },
  stat: { flex: 1, minWidth: 0, gap: Spacing.half },
  value: { fontFamily: DisplayFont.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
});
