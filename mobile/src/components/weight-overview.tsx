import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Segmented } from '@/components/fields';
import { InsightInfo } from '@/components/insight-info';
import { SmoothChart } from '@/components/smooth-chart';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import { shiftDay } from '@/domain/dates';
import { kgToUnit, type WeightUnit } from '@/domain/units';
import { dailyMeans, DISPLAY_MIN_DAYS, projectWeight, weeklyChange, weightTrend, type WeightEntry } from '@/domain/weight';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatDayShort, formatNumber, formatWeight, t } from '@/i18n';

const RANGES = ['7', '30', '90', '365'] as const;
type Range = (typeof RANGES)[number];
const dayIndex = (day: string) => Math.round(Date.parse(`${day}T12:00:00Z`) / 86_400_000);

/**
 * Körpergewicht auf einen Blick (wie die Kalorien-Übersicht):
 * - oben groß der Trend (Ø 7 Tage), darunter die Veränderung zur Vorwoche – in der Datenfarbe, wenn sie Richtung Ziel
 *   geht; rechts die letzte Messung mit Datum
 * - Zeitraum 1 W / 1 M / 3 M / 1 J; Diagramm mit weicher Trendkurve, Fläche und Messpunkten, zeichnet sich ein,
 *   Finger zeigt Wert und Datum, gestrichelt das Zielgewicht
 * - drei Kacheln für den Zeitraum: Veränderung, tiefster und höchster Tageswert
 */
export function WeightOverview({ weights, unit, targetKg, today }: { weights: WeightEntry[]; unit: WeightUnit; targetKg: number | null; today: string }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const data = dark ? theme.accent : theme.tint;
  const [range, setRange] = useState<Range>('30');
  const days = Number(range);
  const u = (kg: number) => kgToUnit(kg, unit);
  const num = (kg: number) => formatNumber(u(kg), 1);

  const trend = weightTrend(weights, today, 7, DISPLAY_MIN_DAYS);
  const change = weeklyChange(weights, today, DISPLAY_MIN_DAYS);
  // Wie viele Wiegetage im Schnitt stecken – unter 4 sagt die Überschrift das offen.
  const trendDays = dailyMeans(weights, today, 7).length;
  const latest = [...weights].sort((a, b) => (a.day < b.day ? 1 : -1))[0] ?? null;
  const points = dailyMeans(weights, today, days);
  const start = shiftDay(today, -(days - 1));
  const trendLine = Array.from({ length: days }, (_, i) => shiftDay(start, i))
    .map((d) => ({ day: d, kg: weightTrend(weights, d, 7, DISPLAY_MIN_DAYS) }))
    .filter((p): p is { day: string; kg: number } => p.kg !== null);
  // Zu wenig Messungen für einen Durchschnitt: dann verbindet die Kurve die Tageswerte.
  const line = trendLine.length >= 2 ? trendLine : points;
  const towardGoal = change !== null && targetKg !== null && trend !== null && Math.sign(targetKg - trend) === Math.sign(change) && Math.abs(change) >= 0.05;
  const projection = projectWeight(trend, change, targetKg, today);
  const low = points.length ? Math.min(...points.map((p) => p.kg)) : null;
  const high = points.length ? Math.max(...points.map((p) => p.kg)) : null;
  const rangeChange = line.length >= 2 ? line[line.length - 1].kg - line[0].kg : null;
  const signed = (kg: number) => `${kg > 0.05 ? '+' : kg < -0.05 ? '−' : '±'}${formatWeight(Math.abs(kg), unit)}`;
  // Erst ab der ersten Messung im Zeitraum zeichnen – sonst klebt die Kurve bei langen Zeiträumen rechts am Rand.
  const firstDay = [...points, ...line].reduce((min, p) => (p.day < min ? p.day : min), today);
  const from = firstDay > start ? firstDay : start;
  const span = dayIndex(today) - dayIndex(from);
  const mid = shiftDay(from, Math.floor(span / 2));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            {trend === null ? t('progress.lastWeighIn') : trendDays >= 4 ? t('progress.trendLabel') : t('progress.trendLabelFew', { count: trendDays })}
          </ThemedText>
          {trend !== null || latest ? (
            <View style={styles.bigRow}>
              <ThemedText style={styles.big}>{trend !== null ? num(trend) : num(latest!.kg)}</ThemedText>
              <ThemedText themeColor="textSecondary">{unit}</ThemedText>
            </View>
          ) : (
            // Ohne Messung kein riesiger Strich: normal groß, mit kurzem Satz.
            <View style={styles.noneRow}>
              <ThemedText themeColor="textSecondary" style={styles.none}>
                –
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('progress.noWeighIn')}
              </ThemedText>
            </View>
          )}
          {change !== null ? (
            <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={{ color: towardGoal ? data : theme.text }}>
                {signed(change)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('progress.vsLastWeek')}
              </ThemedText>
            </View>
          ) : null}
        </View>
        {latest && trend !== null ? (
          <View style={styles.side}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('progress.lastWeighIn')}
            </ThemedText>
            <ThemedText style={styles.sideValue}>{formatWeight(latest.kg, unit)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDay(latest.day)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* Warum der Durchschnitt – und solange er fehlt, was dafür nötig ist – hinter dem „i“. */}
      <InsightInfo
        label={t('progress.trendHintLabel')}
        text={trend === null ? `${t('progress.trendMissing')} ${t('progress.trendHint')}` : t('progress.trendHint')}
      />

      {weights.length >= 2 ? (
        <Segmented label={t('progress.rangeLabel')} options={RANGES} value={range} onChange={setRange} format={(r) => t(`progress.range.${r}`)} />
      ) : null}

      {points.length >= 2 || line.length >= 2 ? (
        <SmoothChart
          animationKey={range}
          domain={[dayIndex(from), dayIndex(today)]}
          line={line.map((p) => ({ x: dayIndex(p.day), value: u(p.kg), label: formatDay(p.day) }))}
          dots={points.map((p) => ({ x: dayIndex(p.day), value: u(p.kg), label: formatDay(p.day) }))}
          reference={targetKg !== null ? { value: u(targetKg), label: t('progress.chartTarget', { value: formatWeight(targetKg, unit) }) } : undefined}
          color={data}
          format={(v) => formatNumber(v, 1)}
          xLabels={span >= 4 ? [formatDayShort(from), formatDayShort(mid), t('nutrition.today')] : [formatDayShort(from), t('nutrition.today')]}
          accessibilityLabel={t('progress.chartLabel', {
            range: t(`progress.range.${range}`),
            min: low !== null ? formatWeight(low, unit) : '–',
            max: high !== null ? formatWeight(high, unit) : '–',
          })}
        />
      ) : (
        <EmptyState icon="chart" title={t('progress.chartEmpty')} />
      )}

      {points.length >= 2 ? (
        <View style={styles.tiles}>
          <Tile label={t('progress.statChange')} value={rangeChange !== null ? signed(rangeChange) : '–'} />
          <Tile label={t('progress.statLow')} value={low !== null ? formatWeight(low, unit) : '–'} />
          <Tile label={t('progress.statHigh')} value={high !== null ? formatWeight(high, unit) : '–'} />
        </View>
      ) : null}

      {projection ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('progress.chartProjection', { value: formatWeight(projection.kg, unit), date: formatDay(projection.day) })}
        </ThemedText>
      ) : null}
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.backgroundSelected }]} accessible accessibilityLabel={`${label} ${value}`}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.one },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  big: { fontFamily: DisplayFont.bold, fontSize: 44, lineHeight: 50, letterSpacing: -1.4, fontVariant: ['tabular-nums'] },
  noneRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  none: { fontFamily: DisplayFont.semiBold, fontSize: 22, lineHeight: 30 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one + 2,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  side: { alignItems: 'flex-end', gap: Spacing.half, paddingTop: Spacing.one },
  sideValue: { fontWeight: 600, fontVariant: ['tabular-nums'] },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, minWidth: 0, borderRadius: Radius.field + 4, paddingVertical: Spacing.three - 2, paddingHorizontal: Spacing.three - 2, gap: Spacing.half },
  tileValue: { fontFamily: DisplayFont.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
});
