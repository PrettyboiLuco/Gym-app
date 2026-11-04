// Getränke im Tagebuch (Ausbauplan B1, Ernährung neu §4): Kopf wie die Mahlzeiten, Wasserglas mit Welle (N10), Schnellwahl
// als zwei waagrechte Reihen (Wasser, zuletzt genutzte Koffein-Getränke), der Rest hinter „Mehr …“ im Fenster (O5).

import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { DiaryWaterGlass } from '@/components/diary-water-glass';
import { ListRow, Presets } from '@/components/fields';
import { InsightInfo } from '@/components/insight-info';
import { MealHead } from '@/components/meal-head';
import { Sheet, SheetRow } from '@/components/sheet';
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
/** Letzter Chip der Koffein-Reihe öffnet das Fenster mit allen Getränken. */
const MORE = 'mehr';
/** Innenabstand der Karte: die Reihen laufen bis an ihren Rand und scrollen darunter weiter. */
const BLEED = Spacing.three + Spacing.one;

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
  // „Anderes Getränk“ aus dem Fenster: erst schließen, dann den Bildschirm öffnen.
  const otherAfterClose = useRef(false);
  const goal = settings.drinkGoalMl;
  const quick = quickDrinks(ALL_IDS, recent, QUICK_COUNT);
  const openOther = () => router.push({ pathname: '/nutrition/add', params: { day, drink: 'sonstiges' } });

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

  const chip = (id: string) =>
    id === MORE ? t('diary.drinks.more') : t('caffeine.chip', { name: t(`caffeine.drinks.${id}`), ml: CAFFEINE_DRINKS.find((d) => d.id === id)!.ml });
  const sum = goal
    ? t('nutrition.drinks.sum', { all: formatVolume(allMl, units.volume), goal: formatVolume(goal, units.volume) })
    : formatVolume(allMl, units.volume);

  return (
    <>
      <MealHead
        title={t('nutrition.drinks.title')}
        value={sum}
        valueLabel={
          goal
            ? t('nutrition.drinks.progress', { all: formatVolume(allMl, units.volume), goal: formatVolume(goal, units.volume) })
            : t('nutrition.drinks.progressNoGoal', { all: formatVolume(allMl, units.volume) })
        }
        addLabel={t('nutrition.drinks.other')}
        onAdd={openOther}
      />
      <View style={styles.top}>
        <DiaryWaterGlass progress={goal ? allMl / goal : 0} color={dark ? theme.accent : theme.tint} outline={theme.border} />
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('nutrition.drinks.water', { water: formatVolume(waterMl, units.volume) })}
          </ThemedText>
          {caffeineMg > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('caffeine.today', { mg: formatNumber(caffeineMg, 0) })}
            </ThemedText>
          ) : null}
          {/* Ziel erreicht: nur feststellen, nicht zum Weitertrinken auffordern (TIME-012). */}
          {goal && allMl >= goal ? <ThemedText type="smallBold">{t('nutrition.drinks.reached')}</ThemedText> : null}
        </View>
      </View>
      {rows}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.strip}>
        <Presets
          label={t('nutrition.water')}
          options={settings.glassSizes}
          onChange={addWater}
          format={(ml) => t('nutrition.drinks.addGlass', { ml: formatVolume(ml, units.volume) })}
        />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.strip}>
        <Presets
          label={t('caffeine.title')}
          options={[...quick, MORE]}
          onChange={(id) => (id === MORE ? setMore(true) : addCaffeine(CAFFEINE_DRINKS.find((d) => d.id === id)!))}
          format={chip}
        />
      </ScrollView>
      <InsightInfo label={t('diary.drinks.infoLabel')} text={`${t('nutrition.drinks.basis')}\n\n${t('caffeine.reference')}`} />

      <Sheet
        visible={more}
        title={t('diary.drinks.moreTitle')}
        onClose={() => setMore(false)}
        onClosed={() => {
          if (!otherAfterClose.current) return;
          otherAfterClose.current = false;
          openOther();
        }}>
        {CAFFEINE_DRINKS.map((d, i) => (
          <SheetRow key={d.id} index={i}>
            <ListRow
              title={t(`caffeine.drinks.${d.id}`)}
              subtitle={t('diary.drinks.detail', { ml: formatVolume(d.ml, units.volume), mg: formatNumber(d.caffeineMg, 0) })}
              accessory={t('nutrition.add')}
              onPress={() => addCaffeine(d)}
              last={i === CAFFEINE_DRINKS.length - 1}
            />
          </SheetRow>
        ))}
        <SheetRow index={CAFFEINE_DRINKS.length}>
          <Button
            label={t('nutrition.drinks.other')}
            variant="secondary"
            onPress={() => {
              otherAfterClose.current = true;
              setMore(false);
            }}
          />
        </SheetRow>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  bleed: { marginHorizontal: -BLEED, flexGrow: 0 },
  strip: { paddingHorizontal: BLEED },
});
