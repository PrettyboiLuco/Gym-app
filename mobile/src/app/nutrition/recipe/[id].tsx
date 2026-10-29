import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { ConfirmButton, Field, ListRow } from '@/components/fields';
import { foodTitle } from '@/components/food-title';
import { formatKcal, macroLine } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { archiveRecipe, getFood, loadRecipeDraft, per100, saveRecipe, searchFoods, type Food } from '@/data/nutrition';
import { useDb } from '@/data/store-provider';
import { nutrientsForAmount, parseAmount, parseRecipeForm, totalOf, type RecipeForm, type RecipeProblem } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatNumber, t } from '@/i18n';

const EMPTY: RecipeForm = { name: '', endWeight: '', portions: '', ingredients: [] };

async function loadRecipe(db: Db, recipeId: string) {
  const draft = await loadRecipeDraft(db, recipeId);
  if (!draft) return null;
  const foods = await Promise.all(draft.ingredients.map((i) => getFood(db, i.foodId)));
  const form: RecipeForm = {
    name: draft.name,
    endWeight: draft.endWeightG === null ? '' : formatNumber(draft.endWeightG),
    portions: draft.portions === null ? '' : String(draft.portions),
    ingredients: draft.ingredients.map((i) => ({ foodId: i.foodId, amount: formatNumber(i.amount) })),
  };
  return { form, foods: foods.filter((f): f is Food => f !== null) };
}

export default function RecipeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'neu';
  const db = useDb();
  const theme = useTheme();
  const [form, setForm] = useState<RecipeForm>(EMPTY);
  const [baseline, setBaseline] = useState(() => JSON.stringify(EMPTY));
  const [foods, setFoods] = useState<Record<string, Food>>({});
  const [problems, setProblems] = useState<RecipeProblem[]>([]);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const { data: candidates } = useLoad((d) => searchFoods(d, query), [] as Food[], query);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    loadRecipe(db, id).then((loaded) => {
      if (cancelled || !loaded) return;
      setForm(loaded.form);
      setBaseline(JSON.stringify(loaded.form));
      setFoods(Object.fromEntries(loaded.foods.map((f) => [f.id, f])));
    });
    return () => {
      cancelled = true;
    };
  }, [db, id, isNew]);

  const allowLeave = useUnsavedGuard(JSON.stringify(form) !== baseline);

  // Vorschau der Gesamtwerte; unbekannte Zutatenwerte machen die Summe unbekannt.
  const parts = form.ingredients.flatMap((i) => {
    const food = foods[i.foodId];
    const amount = parseAmount(i.amount);
    return food && amount !== null ? [nutrientsForAmount(per100(food), amount, food.basis, food.basis)] : [];
  });
  const total = totalOf(parts);

  function updateIngredient(index: number, amount: string) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((i, n) => (n === index ? { ...i, amount } : i)) }));
  }

  function pick(food: Food) {
    setFoods((all) => ({ ...all, [food.id]: food }));
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, { foodId: food.id, amount: formatNumber(food.servingAmount ?? 100) }] }));
    setPicking(false);
    setQuery('');
  }

  async function save() {
    const { draft, problems: found } = parseRecipeForm(form);
    if (!draft) {
      setProblems(found);
      return;
    }
    await saveRecipe(db, isNew ? null : id, draft);
    allowLeave();
    router.back();
  }

  async function archive() {
    await archiveRecipe(db, id);
    allowLeave();
    router.back();
  }

  if (picking) {
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: t('nutrition.recipe.pickTitle') }} />
        <Field label={t('nutrition.search.label')} value={query} onChangeText={setQuery} autoCorrect={false} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.recipe.ingredientHint')}
        </ThemedText>
        <Card>
          {candidates.map((f) => (
            <ListRow key={f.id} title={foodTitle(f)} subtitle={`${formatKcal(f.kcal)} / 100 ${f.basis}`} accessory="+" onPress={() => pick(f)} />
          ))}
        </Card>
        <Button label={t('common.cancel')} variant="danger" onPress={() => setPicking(false)} />
      </Screen>
    );
  }

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: isNew ? t('nutrition.recipe.titleNew') : t('nutrition.recipe.titleEdit') }} />
      <Card>
        <Field
          label={t('nutrition.recipe.name')}
          placeholder={t('nutrition.recipe.namePlaceholder')}
          value={form.name}
          onChangeText={(name) => setForm((f) => ({ ...f, name }))}
        />
      </Card>

      <Card title={t('nutrition.recipe.ingredients')}>
        {form.ingredients.map((ing, index) => {
          const food = foods[ing.foodId];
          return (
            <View key={`${ing.foodId}-${index}`} style={styles.ingredient}>
              <ThemedText style={styles.flex}>{food ? foodTitle(food) : '…'}</ThemedText>
              <Field
                label={food?.basis ?? 'g'}
                value={ing.amount}
                onChangeText={(v) => updateIngredient(index, v)}
                keyboardType="decimal-pad"
                style={styles.amount}
              />
              <Button
                label={t('common.remove')}
                variant="danger"
                onPress={() => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, n) => n !== index) }))}
              />
            </View>
          );
        })}
        <Button label={t('nutrition.recipe.addIngredient')} onPress={() => setPicking(true)} />
        {form.ingredients.length > 0 ? (
          <>
            <ThemedText type="smallBold">{t('nutrition.recipe.total', { kcal: formatKcal(total.kcal) })}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {macroLine(total)}
            </ThemedText>
          </>
        ) : null}
      </Card>

      <Card>
        <Field
          label={t('nutrition.recipe.endWeight')}
          value={form.endWeight}
          onChangeText={(endWeight) => setForm((f) => ({ ...f, endWeight }))}
          keyboardType="decimal-pad"
        />
        <Field
          label={t('nutrition.recipe.portions')}
          value={form.portions}
          onChangeText={(portions) => setForm((f) => ({ ...f, portions }))}
          keyboardType="number-pad"
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.recipe.needOne')}
        </ThemedText>
      </Card>

      {problems.length > 0 ? (
        <Card>
          {problems.map((p) => (
            <ThemedText key={p} style={{ color: theme.danger }}>
              {t(`nutrition.recipe.problems.${p}`)}
            </ThemedText>
          ))}
        </Card>
      ) : null}
      <Button label={t('common.save')} onPress={save} />

      {!isNew ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('nutrition.recipe.archiveHint')}
          </ThemedText>
          <ConfirmButton label={t('nutrition.recipe.archive')} onConfirm={archive} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ingredient: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex: { flex: 1, paddingBottom: Spacing.two },
  amount: { width: 90 },
});
