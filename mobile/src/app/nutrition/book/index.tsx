import { router } from 'expo-router';
import { useState } from 'react';

import { Card } from '@/components/card';
import { Choice, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { loadCoachSetup } from '@/data/coach';
import { DEFAULT_SETTINGS, loadNutritionSettings } from '@/data/nutrition';
import { ALL_BOOK_RECIPES, BOOK_GOALS, filterBook, goalForCoach, type BookGoal } from '@/domain/recipe-book';
import { MEALS, type Meal } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { formatNumber, t } from '@/i18n';

type GoalOption = BookGoal | 'alle';
type MealOption = Meal | 'alle';
type DietOption = 'alles' | 'vegetarisch' | 'vegan';

/**
 * Rezeptbuch: mitgelieferte Rezepte nach Ziel. Startet mit dem Ziel aus dem Coach und der eigenen Ernährungsweise;
 * beides lässt sich umstellen. Jede Zeile zeigt das, wonach man auswählt: kcal und Eiweiß je Portion, Zeit.
 */
export default function RecipeBookScreen() {
  const { data } = useLoad(
    async (db) => ({ setup: await loadCoachSetup(db), settings: await loadNutritionSettings(db), loaded: true }),
    { setup: null as Awaited<ReturnType<typeof loadCoachSetup>>, settings: DEFAULT_SETTINGS, loaded: false }
  );
  const suggested = goalForCoach(data.setup?.goal ?? null);
  const [goalChoice, setGoal] = useState<GoalOption | null>(null);
  const [meal, setMeal] = useState<MealOption>('alle');
  const [dietChoice, setDiet] = useState<DietOption | null>(null);
  const goal = goalChoice ?? suggested ?? 'alle';
  const diet = dietChoice ?? data.settings.diet;

  const list = filterBook(ALL_BOOK_RECIPES, {
    goal: goal === 'alle' ? null : goal,
    meal: meal === 'alle' ? null : meal,
    diet,
  });

  return (
    <Screen withHeader>
      <Card>
        <Choice
          label={t('book.goal')}
          options={['alle', ...BOOK_GOALS] as const}
          value={goal}
          onChange={setGoal}
          format={(g) => t(`book.goals.${g}`)}
        />
        {goal !== 'alle' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t(`book.goalHint.${goal}`)}
            {suggested === goal ? ` ${t('book.fromCoach')}` : ''}
          </ThemedText>
        ) : null}
        <Choice
          label={t('nutrition.meal')}
          options={['alle', ...MEALS] as const}
          value={meal}
          onChange={setMeal}
          format={(m) => (m === 'alle' ? t('book.goals.alle') : t(`nutrition.meals.${m}`))}
        />
        <Choice
          label={t('book.diet')}
          options={['alles', 'vegetarisch', 'vegan'] as const}
          value={diet}
          onChange={setDiet}
          format={(d) => t(`book.diets.${d}`)}
        />
      </Card>

      <Card title={t('book.count', { count: list.length })}>
        {list.length === 0 ? <ThemedText themeColor="textSecondary">{t('book.empty')}</ThemedText> : null}
        {list.map((r, i) => (
          <ListRow
            key={r.id}
            title={r.name}
            subtitle={[
              t('book.kcalProtein', { kcal: formatNumber(r.perPortion.kcal ?? 0, 0), protein: formatNumber(r.perPortion.protein ?? 0, 0) }),
              t('book.minutes', { count: r.minutes }),
              goal === 'alle' ? t(`book.goals.${r.goal}`) : t(`nutrition.meals.${r.meal}`),
            ].join(' · ')}
            accessory="›"
            last={i === list.length - 1}
            onPress={() => router.push({ pathname: '/nutrition/book/[id]', params: { id: r.id } })}
          />
        ))}
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        {t('book.disclaimer')}
      </ThemedText>
    </Screen>
  );
}
