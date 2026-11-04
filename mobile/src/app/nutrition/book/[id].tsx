import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DietNotice } from '@/components/diet-notice';
import { Choice } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { FigureStrip } from '@/components/today-widgets';
import { Spacing } from '@/constants/theme';
import { calorieGoalOn } from '@/data/goals';
import { addPlanEntries } from '@/data/meal-plan';
import { cachedMealTimes, DEFAULT_SETTINGS, loadNutritionSettings } from '@/data/nutrition';
import { copyBookRecipe, logBookRecipe } from '@/data/recipe-book';
import { shiftDay } from '@/domain/dates';
import { suggestMealAt } from '@/domain/diet';
import { mealPrep } from '@/domain/meal-plan';
import { MEALS, type Meal } from '@/domain/nutrition';
import { findBookRecipe, scaledIngredients } from '@/domain/recipe-book';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatNumber, t } from '@/i18n';
import { diaryToday, whenFor } from '@/services/nutrition-format';

const SERVINGS = ['1', '2', '3', '4'] as const;
const LOG_AMOUNTS = ['0.5', '1', '1.5', '2'] as const;
const PREP_DAYS = ['2', '3', '4', '5'] as const;

/**
 * Ein Rezept aus dem Rezeptbuch: Nährwerte je Portion, Zutaten für die gewünschte Portionszahl, Zubereitung.
 * Eintragen bucht Portionen direkt ins Tagebuch; „In meine Rezepte“ legt eine änderbare Kopie an.
 */
export default function BookRecipeScreen() {
  const { id, planDay } = useLocalSearchParams<{ id: string; planDay?: string }>();
  const recipe = findBookRecipe(id);
  const { data, db } = useLoad(async (d) => ({ settings: await loadNutritionSettings(d), goal: (await calorieGoalOn(d, diaryToday()))?.kcal ?? null }), {
    settings: DEFAULT_SETTINGS,
    goal: null as number | null,
  });
  const [servings, setServings] = useState<(typeof SERVINGS)[number] | null>(null);
  const [meal, setMeal] = useState<Meal>(recipe?.meal === 'snack' ? 'snack' : suggestMealAt(new Date().getHours(), cachedMealTimes()));
  const [logAmount, setLogAmount] = useState<(typeof LOG_AMOUNTS)[number]>('1');
  const [busy, setBusy] = useState(false);
  // Wochenplan und Meal-Prep (A9.1/A9.5)
  const [planTo, setPlanTo] = useState(planDay ?? diaryToday());
  const [prepDays, setPrepDays] = useState<(typeof PREP_DAYS)[number]>('4');

  if (!recipe) return <Screen withHeader>{null}</Screen>;

  const shown = servings ?? (String(Math.min(recipe.portions, 4)) as (typeof SERVINGS)[number]);
  const lines = scaledIngredients(recipe, Number(shown));
  const n = recipe.perPortion;
  const share = data.goal && n.kcal ? Math.round((n.kcal / data.goal) * 100) : null;

  async function log() {
    if (!recipe) return;
    setBusy(true);
    try {
      await logBookRecipe(db, recipe, Number(logAmount), meal, whenFor(diaryToday(), meal));
      showToast(t('book.logged', { meal: t(`nutrition.meals.${meal}`) }));
      router.dismissTo('/nutrition');
    } finally {
      setBusy(false);
    }
  }

  async function plan() {
    if (!recipe) return;
    await addPlanEntries(db, [{ day: planTo, meal, source: 'buch', ref: recipe.id, name: recipe.name, portions: Number(logAmount) }]);
    showToast(t('mealPlan.added', { day: formatDay(planTo) }));
    if (planDay) router.dismissTo('/nutrition/plan');
  }

  async function prep() {
    if (!recipe) return;
    await addPlanEntries(db, mealPrep({ meal, source: 'buch', ref: recipe.id, name: recipe.name }, planTo, Number(prepDays)));
    showToast(t('mealPlan.prepAdded', { count: Number(prepDays), from: formatDay(planTo) }));
    // Vom Wochenplan gekommen: dorthin zurück statt ihn ein zweites Mal auf den Stapel zu legen.
    if (planDay) router.dismissTo('/nutrition/plan');
    else router.push('/nutrition/plan');
  }

  async function copy() {
    if (!recipe) return;
    setBusy(true);
    try {
      const recipeId = await copyBookRecipe(db, recipe);
      showToast(t('book.copied'));
      router.push({ pathname: '/nutrition/recipe/[id]', params: { id: recipeId } });
    } finally {
      setBusy(false);
    }
  }

  const figure = (label: string, value: number | null, unit: string, sub?: string) => ({
    label,
    value: value === null ? null : formatNumber(value, 0),
    unit,
    sub,
    accessibilityLabel: `${label} ${value === null ? '–' : formatNumber(value, 0)} ${unit}`,
  });

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: recipe.name }} />
      <View style={styles.head}>
        <ThemedText type="small" themeColor="textSecondary">
          {[
            t(`book.goals.${recipe.goal}`),
            t(`nutrition.meals.${recipe.meal}`),
            t('book.minutes', { count: recipe.minutes }),
            recipe.diet !== 'nicht_vegetarisch' ? t(`book.diets.${recipe.diet}`) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>
      <FigureStrip
        figures={[
          figure('kcal', n.kcal, '', t('book.perPortion')),
          figure(t('nutrition.protein'), n.protein, 'g'),
          figure(t('book.carbsShort'), n.carbs, 'g'),
          figure(t('nutrition.fat'), n.fat, 'g'),
        ]}
      />
      {share !== null ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('book.goalShare', { share, goal: formatNumber(data.goal ?? 0, 0) })}
        </ThemedText>
      ) : null}

      <Card title={t('book.ingredients')}>
        <Choice label={t('book.servings')} options={SERVINGS} value={shown} onChange={setServings} format={(s) => s} />
        {lines.map((l, i) => (
          <View key={`${l.id}-${i}`} style={styles.row}>
            <ThemedText style={styles.flex}>{l.name}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.num}>
              {formatNumber(l.amount, 0)} {l.basis}
            </ThemedText>
          </View>
        ))}
        <ThemedText type="small" themeColor="textSecondary">
          {t('book.spices')}
        </ThemedText>
      </Card>

      <Card title={t('book.steps')}>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.step}>
            <ThemedText type="smallBold" style={styles.stepNum}>
              {i + 1}
            </ThemedText>
            <ThemedText style={styles.flex}>{step}</ThemedText>
          </View>
        ))}
        {recipe.tip ? (
          <ThemedText type="small" themeColor="textSecondary">
            {recipe.tip}
          </ThemedText>
        ) : null}
      </Card>

      <Card title={t('book.logTitle')}>
        <Choice label={t('nutrition.meal')} options={MEALS} value={meal} onChange={setMeal} format={(m) => t(`book.mealShort.${m}`)} />
        <Choice label={t('book.logAmountLabel')} options={LOG_AMOUNTS} value={logAmount} onChange={setLogAmount} format={(a) => formatNumber(Number(a), 1)} />
        <Button
          label={t('book.log', {
            kcal: formatNumber((n.kcal ?? 0) * Number(logAmount), 0),
          })}
          loading={busy}
          onPress={log}
        />
        <Button label={t('book.copy')} variant="secondary" onPress={() => (busy ? undefined : copy())} />
      </Card>

      <Card title={t('mealPlan.planTitle')}>
        <Choice
          label={t('mealPlan.planDay')}
          options={[0, 1, 2, 3, 4, 5, 6].map((i) => shiftDay(planDay ?? diaryToday(), i))}
          value={planTo}
          onChange={setPlanTo}
          format={(d) => formatDay(d).slice(0, 5)}
          chips
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('mealPlan.planUses', { meal: t(`nutrition.meals.${meal}`), portions: formatNumber(Number(logAmount), 1), count: Number(logAmount) })}
        </ThemedText>
        <Button label={t('mealPlan.planAdd')} variant="secondary" onPress={plan} />
        <Choice
          label={t('mealPlan.prepDays')}
          options={PREP_DAYS}
          value={prepDays}
          onChange={setPrepDays}
          format={(d) => t('mealPlan.prepDaysOption', { count: d })}
        />
        <Button label={t('mealPlan.prep', { count: Number(prepDays) })} variant="secondary" onPress={prep} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('mealPlan.prepHint', { scaled: Number(prepDays) })}
        </ThemedText>
      </Card>

      {recipe.allergens.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('book.allergens', { list: recipe.allergens.map((a) => t(`diet.allergen.${a}`)).join(', ') })}
        </ThemedText>
      ) : null}
      <DietNotice facts={{ allergens: recipe.allergens, traces: [], diet: recipe.diet }} prefs={data.settings} />
      <ThemedText type="small" themeColor="textSecondary">
        {t('book.disclaimer')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 36 },
  step: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  stepNum: { width: 20, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
