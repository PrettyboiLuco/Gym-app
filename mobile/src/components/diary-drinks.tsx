// Getränke im Tagebuch (Ausbauplan B1): Wasserglas mit Welle (N10), Schnellwahl nur der vier zuletzt genutzten
// Koffein-Getränke, der Rest hinter „Mehr …“ in einem Blatt (O5).

import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { DiarySheet } from '@/components/diary-sheet';
import { DiaryWaterGlass } from '@/components/diary-water-glass';
import { ListRow, Presets } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { loadRecentDrinks, logCaffeineDrink, logWater, rememberDrink, type NutritionSettings } from '@/data/nutrition';
import { CAFFEINE_DRINKS, type CaffeineDrink } from '@/domain/caffeine';
import { quickDrinks } from '@/domain/diary';
import type { Units } from '@/domain/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, formatVolume, t } from '@/i18n';
import { whenFor } from '@/services/nutrition-format';

const ALL_IDS = CAFFEINE_DRINKS.map((d) => d.id);
const QUICK_COUNT = 4;

export function DiaryDrinks({
  day,
  settings,
  units,
  allMl,
  waterMl,
  caffeineMg,
  rows,
  onChanged,
}: {
  day: string;
  settings: NutritionSettings;
  units: Units;
  allMl: number;
  waterMl: number;
  caffeineMg: number;
  /** Getränke-Einträge des Tages (Zeilen baut das Tagebuch). */
  rows: ReactNode;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const { data: recent, reload: reloadRecent, db } = useLoad(loadRecentDrinks, [] as string[]);
  const [more, setMore] = useState(false);
  const goal = settings.drinkGoalMl;
  const quick = quickDrinks(ALL_IDS, recent, QUICK_COUNT);

  async function addCaffeine(drink: CaffeineDrink) {
    const name = t(`caffeine.drinks.${drink.id}`);
    await logCaffeineDrink(db, { ...drink, name }, whenFor(day));
    await rememberDrink(db, drink.id);
    showToast(t('caffeine.saved', { name }));
    setMore(false);
    await reloadRecent();
    onChanged();
  }

  async function addWater(ml: number) {
    await logWater(db, ml, whenFor(day), t('nutrition.water'));
    onChanged();
  }

  const chip = (id: string) => t('caffeine.chip', { name: t(`caffeine.drinks.${id}`), ml: CAFFEINE_DRINKS.find((d) => d.id === id)!.ml });

  return (
    <>
      <View style={styles.top}>
        <DiaryWaterGlass progress={goal ? allMl / goal : 0} color={dark ? theme.accent : theme.tint} outline={theme.border} />
        <View style={styles.flex}>
          <ThemedText>
            {goal
              ? t('nutrition.drinks.progress', { all: formatVolume(allMl, units.volume), goal: formatVolume(goal, units.volume) })
              : t('nutrition.drinks.progressNoGoal', { all: formatVolume(allMl, units.volume) })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('nutrition.drinks.water', { water: formatVolume(waterMl, units.volume) })}
          </ThemedText>
          {/* Ziel erreicht: nur feststellen, nicht zum Weitertrinken auffordern (TIME-012). */}
          {goal && allMl >= goal ? <ThemedText type="smallBold">{t('nutrition.drinks.reached')}</ThemedText> : null}
        </View>
      </View>
      {rows}
      <ThemedText type="small" themeColor="textSecondary">
        {t('nutrition.drinks.quick')}
      </ThemedText>
      <Presets
        label={t('nutrition.water')}
        options={settings.glassSizes}
        onChange={addWater}
        format={(ml) => t('nutrition.drinks.addGlass', { ml: formatVolume(ml, units.volume) })}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {t('caffeine.title')}
      </ThemedText>
      <Presets label={t('caffeine.title')} options={quick} onChange={(id) => addCaffeine(CAFFEINE_DRINKS.find((d) => d.id === id)!)} format={chip} />
      <View style={styles.row}>
        <Button label={t('diary.drinks.more')} variant="quiet" size="compact" onPress={() => setMore(true)} />
        <Button
          label={t('nutrition.drinks.other')}
          variant="quiet"
          size="compact"
          onPress={() => router.push({ pathname: '/nutrition/add', params: { day, drink: 'sonstiges' } })}
        />
      </View>
      {caffeineMg > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('caffeine.today', { mg: formatNumber(caffeineMg, 0) })} · {t('caffeine.reference')}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {t('nutrition.drinks.basis')}
      </ThemedText>

      <DiarySheet visible={more} title={t('diary.drinks.moreTitle')} onClose={() => setMore(false)}>
        <View style={[styles.sheetCard, { backgroundColor: theme.backgroundElement }]}>
          {CAFFEINE_DRINKS.map((d, i) => (
            <ListRow
              key={d.id}
              title={t(`caffeine.drinks.${d.id}`)}
              subtitle={t('diary.drinks.detail', { ml: formatVolume(d.ml, units.volume), mg: formatNumber(d.caffeineMg, 0) })}
              accessory={t('nutrition.add')}
              onPress={() => addCaffeine(d)}
              last={i === CAFFEINE_DRINKS.length - 1}
            />
          ))}
        </View>
        <Button
          label={t('nutrition.drinks.other')}
          variant="secondary"
          onPress={() => {
            setMore(false);
            router.push({ pathname: '/nutrition/add', params: { day, drink: 'sonstiges' } });
          }}
        />
      </DiarySheet>
    </>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  sheetCard: { borderRadius: 20, paddingHorizontal: Spacing.three },
});
