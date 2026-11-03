import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DietNotice } from '@/components/diet-notice';
import { Choice, ConfirmButton, Field, Presets, Segmented } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  archiveFood,
  cachedMealTimes,
  DEFAULT_SETTINGS,
  foodFacts,
  getFood,
  loadNutritionSettings,
  logFood,
  per100,
  repairDrinkBasis,
  setFavorite,
  type Target,
} from '@/data/nutrition';
import { parseMicros, parsePortions, scaleMicros } from '@/domain/basis-foods';
import { suggestMealAt } from '@/domain/diet';
import { DRINK_TYPES, guessDrinkType, MEALS, nutrientsForAmount, parseAmount } from '@/domain/nutrition';
import { foodTitle } from '@/format/food-title';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';
import {
  dayLabel,
  diaryToday,
  formatAmount,
  formatKcal,
  extraLine,
  macroLine,
  microLine,
  readTarget,
  targetParams,
  whenFor,
  type TargetParams,
} from '@/services/nutrition-format';

export default function FoodScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<TargetParams & { id: string }>();
  const { day, target: initialTarget } = readTarget(params);
  // Früher als Gramm gescannte Getränke beim Öffnen auf ml umstellen (zählen dann zur Trinkmenge).
  const { data: food, reload, db, loaded } = useLoad(
    async (d) => {
      const found = await getFood(d, params.id);
      return found ? repairDrinkBasis(d, found) : null;
    },
    null,
    params.id
  );
  // Allergien/Ernährungsweise für Hinweise (COACH-009).
  const { data: settings } = useLoad(loadNutritionSettings, DEFAULT_SETTINGS);
  // Gewählt (Essen/Getränk, Mahlzeit, Getränkeart); null = Vorgabe: Ein Getränk (ml) wird als Getränk gebucht – auch
  // wenn der Weg über „Hinzufügen“ bei einer Mahlzeit kam –, damit es zur Trinkmenge zählt.
  const [chosen, setChosen] = useState<Target | null>(null);
  // null = noch nicht angefasst: dann gilt die Portionsgröße bzw. 100.
  const [amountText, setAmountText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!food) {
    return <Screen withHeader>{loaded ? <ThemedText>{t('nutrition.food.notFound')}</ThemedText> : null}</Screen>;
  }

  const unit = food.basis;
  const drinkGuess = guessDrinkType(food.name);
  const target: Target =
    chosen ?? (initialTarget.kind === 'essen' && unit === 'ml' ? { kind: 'getraenk', drinkType: drinkGuess ?? 'sonstiges' } : initialTarget);
  const setTarget = setChosen;
  const shownAmount = amountText ?? formatNumber(food.servingAmount ?? 100);
  const amount = parseAmount(shownAmount);
  const values = per100(food);
  const forAmount = amount === null ? null : nutrientsForAmount(values, amount, unit, unit);
  // Portionen der Grundnahrungsmittel (A4), Portion und Packung (A3) zuerst, dann übliche Mengen.
  const packageAmount = food.packageAmount;
  const portions = parsePortions(food.portionsJson);
  const portionLabel = new Map(portions.map((p) => [p.g, p.label]));
  const micros = parseMicros(food.microsJson);
  const amountPresets = [
    ...new Set([
      ...portions.map((p) => p.g),
      ...(food.servingAmount ? [food.servingAmount] : []),
      ...(packageAmount ? [packageAmount / 2, packageAmount] : []),
      50,
      100,
      150,
      200,
      250,
    ]),
  ];

  async function log() {
    if (amount === null || !food) {
      setError(true);
      return;
    }
    await logFood(db, food.id, amount, target, whenFor(day, target.kind === 'essen' ? target.meal : null));
    router.dismissTo('/nutrition');
  }

  async function archive() {
    if (!food) return;
    await archiveFood(db, food.id);
    router.back();
  }

  async function toggleFavorite() {
    if (!food) return;
    await setFavorite(db, food.id, !food.favorite);
    await reload();
  }

  return (
    <Screen withHeader>
      <Card>
        <ThemedText type="subtitle">{foodTitle(food)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {food.catalogId
            ? t('nutrition.food.source.basis')
            : food.catalogOrigin
              ? t('nutrition.food.source.basisEdited')
              : t(`nutrition.food.source.${food.source}`)}
        </ThemedText>
        <DietNotice facts={foodFacts(food)} prefs={settings} />
        {food.barcode ? (
          <ThemedText type="small" themeColor="textSecondary">
            {food.barcode}
          </ThemedText>
        ) : null}
      </Card>

      <Card title={t('nutrition.food.per100', { unit })}>
        <ThemedText>{formatKcal(values.kcal)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {macroLine(values)}
        </ThemedText>
        {extraLine(values) ? (
          <ThemedText type="small" themeColor="textSecondary">
            {extraLine(values)}
          </ThemedText>
        ) : null}
        {food.caffeine != null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('nutrition.food.caffeine', { mg: formatNumber(food.caffeine, 0), unit })}
          </ThemedText>
        ) : null}
        {/* Hinweis nur für die Grundwerte – Zucker/Salz fehlen bei älteren Produkten oft und sind freiwillig. */}
        {(['kcal', 'protein', 'carbs', 'fat'] as const).some((k) => values[k] === null) ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {t('nutrition.food.unknownHint')}
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <Field
          label={t('nutrition.food.amount', { unit })}
          value={shownAmount}
          onChangeText={(text) => {
            setAmountText(text);
            setError(false);
          }}
          keyboardType="decimal-pad"
        />
        <Presets
          label={t('nutrition.food.amount', { unit })}
          options={amountPresets}
          value={amount ?? undefined}
          onChange={(v) => setAmountText(formatNumber(v))}
          format={(v) =>
            portionLabel.has(v)
              ? `${portionLabel.get(v)} (${formatAmount(v, unit)})`
              : v === food.servingAmount
                ? t('nutrition.food.serving', { value: formatAmount(v, unit) })
                : v === packageAmount
                  ? t('nutrition.food.package', { value: formatAmount(v, unit) })
                  : packageAmount && v === packageAmount / 2
                    ? t('nutrition.food.halfPackage', { value: formatAmount(v, unit) })
                    : formatAmount(v, unit)
          }
        />
        {error ? <ThemedText style={{ color: theme.danger }}>{t('nutrition.food.amountInvalid')}</ThemedText> : null}
        {forAmount ? (
          <View style={styles.preview}>
            <ThemedText type="smallBold">
              {t('nutrition.food.forAmount')}: {formatKcal(forAmount.kcal)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {macroLine(forAmount)}
            </ThemedText>
            {extraLine(forAmount) ? (
              <ThemedText type="small" themeColor="textSecondary">
                {extraLine(forAmount)}
              </ThemedText>
            ) : null}
            {micros && amount !== null && microLine(scaleMicros(micros, amount / 100)) ? (
              <ThemedText type="small" themeColor="textSecondary">
                {microLine(scaleMicros(micros, amount / 100))}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          {dayLabel(day, diaryToday())}
        </ThemedText>
        <Segmented
          label={t('nutrition.food.logAs')}
          options={['essen', 'getraenk'] as const}
          value={target.kind}
          onChange={(kind) =>
            setTarget(
              kind === 'essen'
                ? { kind: 'essen', meal: initialTarget.kind === 'essen' ? initialTarget.meal : suggestMealAt(new Date().getHours(), cachedMealTimes()) }
                : { kind: 'getraenk', drinkType: drinkGuess ?? 'sonstiges' }
            )
          }
          format={(k) => t(`nutrition.food.logAsOption.${k}`)}
        />
        {target.kind === 'essen' ? (
          <Choice
            label={t('nutrition.meal')}
            options={MEALS}
            value={target.meal}
            onChange={(meal) => setTarget({ kind: 'essen', meal })}
            format={(m) => t(`nutrition.meals.${m}`)}
          />
        ) : (
          <Choice
            label={t('nutrition.drinkType')}
            options={DRINK_TYPES}
            value={target.drinkType}
            onChange={(drinkType) => setTarget({ kind: 'getraenk', drinkType })}
            format={(d) => t(`nutrition.drinkTypes.${d}`)}
          />
        )}
        <Button label={t('nutrition.food.log')} onPress={log} />
      </Card>

      <View style={styles.row}>
        <Button label={food.favorite ? t('nutrition.food.unfavorite') : t('nutrition.food.favorite')} variant="secondary" onPress={toggleFavorite} />
        <Button
          label={t('nutrition.food.edit')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/nutrition/food-edit/[id]', params: { id: food.id, ...targetParams(day, target) } })}
        />
      </View>
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.food.archiveHint')}
        </ThemedText>
        <ConfirmButton label={t('nutrition.food.archive')} onConfirm={archive} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { gap: Spacing.half },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
