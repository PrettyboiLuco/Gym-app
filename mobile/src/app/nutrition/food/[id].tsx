import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, ConfirmButton, Field, Presets } from '@/components/fields';
import { foodTitle } from '@/components/food-title';
import {
  dayLabel,
  formatAmount,
  formatKcal,
  macroLine,
  readTarget,
  targetParams,
  whenFor,
  type TargetParams,
} from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { archiveFood, getFood, logFood, per100, setFavorite, type Target } from '@/data/nutrition';
import { DRINK_TYPES, MEALS, nutrientsForAmount, parseAmount } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

export default function FoodScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<TargetParams & { id: string }>();
  const { day, target: initialTarget } = readTarget(params);
  const { data: food, reload, db, loaded } = useLoad((d) => getFood(d, params.id), null, params.id);
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
  const amountPresets = [...new Set([...(food.servingAmount ? [food.servingAmount] : []), 50, 100, 150, 200, 250])];

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
          {t(`nutrition.food.source.${food.source}`)}
        </ThemedText>
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
        {Object.values(values).some((v) => v === null) ? (
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
            v === food.servingAmount ? t('nutrition.food.serving', { value: formatAmount(v, unit) }) : formatAmount(v, unit)
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
          variant="danger"
          onPress={toggleFavorite}
        />
        <Button
          label={t('nutrition.food.edit')}
          variant="danger"
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
