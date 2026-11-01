import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, ConfirmButton, Field, Presets } from '@/components/fields';
import { foodTitle } from '@/format/food-title';
import {
  dayLabel,
  formatAmount,
  formatKcal,
  extraLine,
  macroLine,
  microLine,
  readTarget,
  targetParams,
  whenFor,
  type TargetParams,
} from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { DietNotice } from '@/components/diet-notice';
import { archiveFood, DEFAULT_SETTINGS, foodFacts, getFood, loadNutritionSettings, logFood, per100, setFavorite, type Target } from '@/data/nutrition';
import { DRINK_TYPES, MEALS, nutrientsForAmount, parseAmount } from '@/domain/nutrition';
import { parseMicros, parsePortions, scaleMicros } from '@/domain/basis-foods';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

export default function FoodScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<TargetParams & { id: string }>();
  const { day, target: initialTarget } = readTarget(params);
  const { data: food, reload, db, loaded } = useLoad((d) => getFood(d, params.id), null, params.id);
  // Allergien/Ernährungsweise für Hinweise (COACH-009).
  const { data: settings } = useLoad(loadNutritionSettings, DEFAULT_SETTINGS);
  const [target, setTarget] = useState<Target>(initialTarget);
  // null = noch nicht angefasst: dann gilt die Portionsgröße bzw. 100.
  const [amountText, setAmountText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!food) {
    return (
      <Screen withHeader>
        {loaded ? <ThemedText>{t('nutrition.food.notFound')}</ThemedText> : null}
      </Screen>
    );
  }

  const unit = food.basis;
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
    await logFood(db, food.id, amount, target, whenFor(day));
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
          {food.catalogId ? t('nutrition.food.source.basis') : food.catalogOrigin ? t('nutrition.food.source.basisEdited') : t(`nutrition.food.source.${food.source}`)}
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
          {dayLabel(day)}
        </ThemedText>
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
        <Button
          label={food.favorite ? t('nutrition.food.unfavorite') : t('nutrition.food.favorite')}
          variant="secondary"
          onPress={toggleFavorite}
        />
        <Button
          label={t('nutrition.food.edit')}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/nutrition/food-edit/[id]', params: { id: food.id, ...targetParams(day, target) } })
          }
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
