import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, Field } from '@/components/fields';
import { dayLabel, formatKcal, macroLine, readTarget, whenFor, type TargetParams } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { DietNotice } from '@/components/diet-notice';
import { DEFAULT_SETTINGS, getRecipeVersion, loadNutritionSettings, logRecipe, recipeFacts } from '@/data/nutrition';
import type { FoodFacts } from '@/domain/diet';
import { fractionOf, MEALS, nutrientsForAmount, parseAmount, per100FromTotal, type Meal } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

type Mode = 'gramm' | 'portion';

export default function RecipeLogScreen() {
  const params = useLocalSearchParams<TargetParams & { id: string }>();
  const { day, target } = readTarget(params);
  const theme = useTheme();
  const { data: recipe, db } = useLoad((d) => getRecipeVersion(d, params.id), null, params.id);
  // Allergene aus den Zutaten (COACH-009).
  const { data: extra } = useLoad(
    async (d) => ({ facts: await recipeFacts(d, params.id), settings: await loadNutritionSettings(d) }),
    { facts: null as FoodFacts | null, settings: DEFAULT_SETTINGS },
    params.id
  );
  const [meal, setMeal] = useState<Meal>(target.kind === 'essen' ? target.meal : 'snack');
  const [modeChoice, setModeChoice] = useState<Mode | null>(null);
  const [amountText, setAmountText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!recipe) return <Screen withHeader>{null}</Screen>;

  // Nur anbieten, was das Rezept hergibt: Gramm braucht Endgewicht, Portionen die Anzahl (FOOD-017).
  const modes: Mode[] = [...(recipe.endWeightG ? (['gramm'] as const) : []), ...(recipe.portions ? (['portion'] as const) : [])];
  const mode = modeChoice ?? (recipe.portions ? 'portion' : 'gramm');
  const text = amountText ?? (mode === 'portion' ? '1' : formatNumber(recipe.endWeightG && recipe.portions ? recipe.endWeightG / recipe.portions : 200));
  const amount = parseAmount(text);
  const preview =
    amount === null
      ? null
      : mode === 'gramm' && recipe.endWeightG
        ? nutrientsForAmount(per100FromTotal(recipe.total, recipe.endWeightG), amount, 'g', 'g')
        : mode === 'portion' && recipe.portions
          ? fractionOf(recipe.total, amount / recipe.portions)
          : null;

  async function log() {
    if (amount === null || !preview || !recipe) {
      setError(true);
      return;
    }
    await logRecipe(db, recipe.versionId, mode === 'gramm' ? { grams: amount } : { portions: amount }, meal, whenFor(day));
    router.dismissTo('/nutrition');
  }

  return (
    <Screen withHeader>
      <Card>
        <ThemedText type="subtitle">{recipe.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.recipe.total', { kcal: formatKcal(recipe.total.kcal) })}
        </ThemedText>
        {extra.facts ? <DietNotice facts={extra.facts} prefs={extra.settings} /> : null}
      </Card>
      <Card>
        {modes.length > 1 ? (
          <Choice
            label={t('nutrition.entry.amount')}
            options={modes}
            value={mode}
            onChange={(m) => {
              setModeChoice(m);
              setAmountText(null);
            }}
            format={(m) => (m === 'gramm' ? t('nutrition.recipe.log.byGrams') : t('nutrition.recipe.log.byPortions'))}
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {recipe.endWeightG ? t('nutrition.recipe.log.noPortions') : t('nutrition.recipe.log.noEndWeight')}
          </ThemedText>
        )}
        <Field
          label={mode === 'gramm' ? t('nutrition.recipe.log.grams') : t('nutrition.recipe.log.portionsLabel')}
          value={text}
          onChangeText={(v) => {
            setAmountText(v);
            setError(false);
          }}
          keyboardType="decimal-pad"
        />
        {error ? <ThemedText style={{ color: theme.danger }}>{t('nutrition.recipe.log.invalid')}</ThemedText> : null}
        {preview ? (
          <>
            <ThemedText type="smallBold">{formatKcal(preview.kcal)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {macroLine(preview)}
            </ThemedText>
          </>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {dayLabel(day)}
        </ThemedText>
        <Choice label={t('nutrition.meal')} options={MEALS} value={meal} onChange={setMeal} format={(m) => t(`nutrition.meals.${m}`)} />
        <Button label={t('nutrition.food.log')} onPress={log} />
      </Card>
    </Screen>
  );
}
