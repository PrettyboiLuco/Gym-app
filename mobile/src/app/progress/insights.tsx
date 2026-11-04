// Einblicke (Review W9): wählbare Kacheln mit Verlauf und sachliche Wochen-Muster – ohne Serien, ohne Bewertung.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Toggle } from '@/components/fields';
import { InsightInfo } from '@/components/insight-info';
import { InsightGrid, useDataColor, type InsightTileData } from '@/components/insight-tile';
import { Screen } from '@/components/screen';
import { SkeletonBlocks } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { loadInsightData, loadInsightTiles, saveInsightTiles } from '@/data/insights';
import { loadNutritionSettings } from '@/data/nutrition';
import { shiftDay } from '@/domain/dates';
import { availableTiles, tileSummaries, weekPatterns, type InsightDay, type InsightTile, type TileSummary, type WeekPattern } from '@/domain/insights';
import { timeZone, todayDay } from '@/domain/time';
import { kgToUnit, type WeightUnit } from '@/domain/units';
import type { WeightEntry } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, formatWeight, t } from '@/i18n';
import { useModules, useProfile } from '@/providers/profile-provider';
import { diaryToday } from '@/services/nutrition-format';

async function loadInsights(db: Db, withReadiness: boolean) {
  const today = todayDay();
  // Der laufende Ernährungstag ist noch nicht fertig – Essen zählt bis zum Vortag.
  const foodEnd = shiftDay(diaryToday(), -1);
  const [tiles, data, settings] = await Promise.all([
    loadInsightTiles(db),
    loadInsightData(db, today, foodEnd, timeZone, withReadiness),
    loadNutritionSettings(db),
  ]);
  return { tiles, ...data, today, foodEnd, hideNumbers: settings.hideNumbers };
}

const num = (v: number, digits = 0) => formatNumber(v, digits);

/** Wohin eine Kachel führt – leere Kacheln direkt zum Eintragen. */
const TILE_TARGET = {
  kalorien: '/nutrition',
  eiweiss: '/nutrition',
  gewicht: '/progress',
  training: '/training',
  schritte: '/progress/steps',
  schlaf: '/progress/readiness',
  bereitschaft: '/progress/readiness',
} as const satisfies Record<InsightTile, string>;

/** Anzeige einer Kachel aus ihrer Zusammenfassung; `hide` blendet kcal- und Gewichtszahlen aus. */
function tileView(s: TileSummary, hide: boolean, unit: WeightUnit): InsightTileData {
  const label = t(`insights.tile.${s.tile}`);
  const onPress = () => router.push(TILE_TARGET[s.tile]);
  const a11y = (value: string | null, sub?: string | null) =>
    value === null
      ? [t('insights.a11y.none', { label }), sub].filter(Boolean).join(', ')
      : [t('insights.a11y.value', { label, value }), sub].filter(Boolean).join(', ');
  const tracked = t('insights.sub.tracked', { count: s.days });
  // Noch kein Wert: „2 von 3 Tagen erfasst“ mit kleinem Balken statt eines Strichs ohne Erklärung.
  const missing = (key: 'progress' | 'weighProgress') =>
    s.need === null ? {} : { sub: t(`insights.sub.${key}`, { count: Math.min(s.days, s.need), need: s.need }), progress: { have: s.days, need: s.need } };
  const meanTile = (format: (v: number) => string, unitText: string | undefined, sub: string): InsightTileData => {
    const value = s.value === null ? null : format(s.value);
    const view: InsightTileData = {
      key: s.tile,
      label,
      value,
      unit: unitText,
      sub,
      count: s.value === null ? undefined : { to: s.value, format },
      spark: { values: s.spark },
      accessibilityLabel: '',
      onPress,
      ...(s.value === null ? missing('progress') : {}),
    };
    return { ...view, accessibilityLabel: a11y(value === null ? null : `${value}${unitText ? ` ${unitText}` : ''}`, view.sub) };
  };
  const countTile = (sub: string, extra: Partial<InsightTileData> = {}): InsightTileData => {
    const value = s.value === null ? null : String(s.value);
    const of = s.of === null ? undefined : `/ ${s.of}`;
    return {
      key: s.tile,
      label,
      value,
      unit: of,
      sub,
      count: s.value === null ? undefined : { to: s.value, format: (v) => num(Math.round(v)) },
      spark: { values: s.spark, bars: s.bars },
      accessibilityLabel: a11y(value === null ? null : `${value} ${of ?? ''}`.trim(), sub),
      onPress,
      ...extra,
    };
  };
  const daysOnly = (sub: string): InsightTileData => ({
    key: s.tile,
    label,
    value: String(s.days),
    unit: '/ 7',
    sub,
    accessibilityLabel: a11y(`${s.days} / 7`, sub),
    onPress,
  });

  switch (s.tile) {
    case 'kalorien':
      return hide ? daysOnly(t('insights.sub.foodTracked')) : meanTile((v) => num(Math.round(v)), 'kcal', tracked);
    case 'eiweiss':
      return s.kind === 'count' ? countTile(t('insights.sub.proteinGoal')) : meanTile((v) => num(Math.round(v)), 'g', t('insights.sub.proteinMean'));
    case 'gewicht': {
      if (hide) return daysOnly(t('insights.sub.weighDays'));
      if (s.value === null) {
        const view: InsightTileData = { key: s.tile, label, value: null, unit, accessibilityLabel: '', onPress, ...missing('weighProgress') };
        return { ...view, accessibilityLabel: a11y(null, view.sub) };
      }
      const change = s.change;
      const sub =
        change === null
          ? tracked
          : t('insights.sub.weightChange', {
              change: `${change > 0.05 ? '+' : change < -0.05 ? '−' : '±'}${formatWeight(Math.abs(change), unit)}`,
            });
      const value = num(kgToUnit(s.value, unit), 1);
      return {
        key: s.tile,
        label,
        value,
        unit,
        sub,
        spark: { values: s.spark.map((v) => (v === null ? null : kgToUnit(v, unit))) },
        accessibilityLabel: a11y(`${value} ${unit}`, sub),
        onPress,
      };
    }
    case 'training':
      return countTile(t('insights.sub.training'));
    case 'schritte':
      return meanTile((v) => num(Math.round(v / 10) * 10), undefined, tracked);
    case 'schlaf':
      return meanTile((v) => num(v, 1), 'h', tracked);
    case 'bereitschaft':
      return {
        ...countTile(s.value === null ? t('insights.sub.readinessNone') : t('insights.sub.readiness')),
        spark: undefined,
        levels: s.levels,
      };
  }
}

function patternText(p: WeekPattern): string {
  switch (p.key) {
    case 'wochenendeKcal':
      return t(`insights.pattern.wochenendeKcal.${p.direction}`, { diff: num(p.diff), weekend: num(p.weekend), weekday: num(p.weekday) });
    case 'eiweissZiel':
      return t('insights.pattern.eiweissZiel', { perWeek: p.perWeek, hits: p.hits, of: p.of });
    case 'trainingKcal':
      return t('insights.pattern.trainingKcal', { training: num(p.training), rest: num(p.rest) });
    case 'trainingWochentage':
      return t('insights.pattern.trainingWochentage', { days: p.weekdays.map((d) => t(`reminders.day.${d}`)).join(', ') });
    case 'schlafWochenende':
      return t(`insights.pattern.schlafWochenende.${p.direction}`, { diff: num(p.diff, 1) });
    case 'schritteTraining':
      return t('insights.pattern.schritteTraining', { training: num(p.training), rest: num(p.rest) });
  }
}

export default function InsightsScreen() {
  const modules = useModules();
  const { profile } = useProfile();
  const theme = useTheme();
  const dataColor = useDataColor();
  const { data, db, loaded, reload } = useLoad(
    (d) => loadInsights(d, modules.bereitschaft),
    {
      tiles: [] as InsightTile[],
      days: [] as InsightDay[],
      weights: [] as WeightEntry[],
      today: '',
      foodEnd: '',
      hideNumbers: false,
    },
    String(modules.bereitschaft)
  );
  const [editing, setEditing] = useState(false);
  if (!loaded) {
    return (
      <Screen withHeader>
        <SkeletonBlocks blocks={[300, 200]} />
      </Screen>
    );
  }

  const hide = profile.sensitive || data.hideNumbers;
  const available = availableTiles(modules);
  const chosen = data.tiles.filter((tile) => available.includes(tile));
  const summaries = tileSummaries(data.days, data.weights, data.today, data.foodEnd);
  const patterns = weekPatterns(data.days, { today: data.today, foodEnd: data.foodEnd, modules, hideNumbers: hide });

  async function toggle(tile: InsightTile, on: boolean) {
    const next = on ? [...data.tiles, tile] : data.tiles.filter((x) => x !== tile);
    await saveInsightTiles(db, next);
    await reload();
  }

  return (
    <Screen withHeader>
      <Card
        title={t('insights.tilesTitle')}
        trailing={
          <Button
            label={editing ? t('insights.customizeDone') : t('insights.customize')}
            variant="secondary"
            size="compact"
            onPress={() => setEditing((v) => !v)}
          />
        }>
        {editing ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {t('insights.customizeHint')}
            </ThemedText>
            {available.map((tile) => (
              <Toggle key={tile} label={t(`insights.tile.${tile}`)} value={chosen.includes(tile)} onChange={(on) => toggle(tile, on)} />
            ))}
          </>
        ) : chosen.length === 0 ? (
          <EmptyState icon="chart" title={t('insights.tilesEmpty')} action={{ label: t('insights.customize'), onPress: () => setEditing(true) }} />
        ) : (
          <InsightGrid tiles={chosen.map((tile) => tileView(summaries[tile], hide, profile.units.weight))} />
        )}
        {hide ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('insights.hidden')}
          </ThemedText>
        ) : null}
      </Card>

      <Card title={t('insights.patternsTitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('insights.patternsSubtitle')}
        </ThemedText>
        {patterns.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={t('insights.patternsEmpty')}
            action={modules.ernaehrung ? { label: t('insights.patternsAction'), onPress: () => router.push('/nutrition') } : undefined}
          />
        ) : (
          patterns.map((p, i) => (
            <View key={p.key} style={[styles.pattern, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected }]}>
              <View style={[styles.dot, { backgroundColor: dataColor }]} />
              <ThemedText style={styles.patternText}>{patternText(p)}</ThemedText>
            </View>
          ))
        )}
        <InsightInfo text={t('insights.patternsInfo')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pattern: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingVertical: Spacing.two + 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  patternText: { flex: 1, fontVariant: ['tabular-nums'] },
});
