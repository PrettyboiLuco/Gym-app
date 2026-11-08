import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Choice, Field, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { loadCoachSetup } from '@/data/coach';
import { DEFAULT_SETTINGS, loadNutritionSettings } from '@/data/nutrition';
import { MEALS, type Meal } from '@/domain/nutrition';
import { ALL_BOOK_RECIPES, BOOK_GOALS, BOOK_TAGS, filterBook, goalForCoach, type BookGoal, type BookTag } from '@/domain/recipe-book';
import { useLoad } from '@/hooks/use-load';
import { formatNumber, t } from '@/i18n';

type GoalOption = BookGoal | 'alle';
type MealOption = Meal | 'alle';
type DietOption = 'alles' | 'vegetarisch' | 'vegan';
type TagOption = BookTag | 'alle';

/**
 * Rezeptbuch: mitgelieferte Rezepte nach Ziel. Startet mit dem Ziel aus dem Coach und der eigenen Ernährungsweise;
 * beides lässt sich umstellen. Jede Zeile zeigt das, wonach man auswählt: kcal und Eiweiß je Portion, Zeit.
 */
export default function RecipeBookScreen() {
  // Aus dem Wochenplan (A9): Tag wird an die Rezeptansicht weitergegeben.
  const { planDay } = useLocalSearchParams<{ planDay?: string }>();
  const { data } = useLoad(async (db) => ({ setup: await loadCoachSetup(db), settings: await loadNutritionSettings(db), loaded: true }), {
    setup: null as Awaited<ReturnType<typeof loadCoachSetup>>,
    settings: DEFAULT_SETTINGS,
    loaded: false,
  });
  const suggested = goalForCoach(data.setup?.goal ?? null);
  const [goalChoice, setGoal] = useState<GoalOption | null>(null);
  const [meal, setMeal] = useState<MealOption>('alle');
  const [dietChoice, setDiet] = useState<DietOption | null>(null);
  const [tag, setTag] = useState<TagOption>('alle');
  const [query, setQuery] = useState('');
  // Filter zugeklappt: die Rezepte stehen gleich unter der Suche, die gewählten Filter in einer Zeile darüber.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const goal = goalChoice ?? suggested ?? 'alle';
  const diet = dietChoice ?? data.settings.diet;

  const list = filterBook(ALL_BOOK_RECIPES, {
    goal: goal === 'alle' ? null : goal,
    meal: meal === 'alle' ? null : meal,
    diet,
    tag: tag === 'alle' ? null : tag,
    query,
  });

  return (
    <Screen withHeader>
      <Field
        label={t('book.search')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('book.searchPlaceholder')}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      <View style={styles.filterBar}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex} numberOfLines={2}>
          {[
            tag !== 'alle' ? t(`book.tags.${tag}`) : null,
            goal !== 'alle' ? t(`book.goals.${goal}`) : null,
            meal !== 'alle' ? t(`nutrition.meals.${meal}`) : null,
            diet !== 'alles' ? t(`book.diets.${diet}`) : null,
          ]
            .filter(Boolean)
            .join(' · ') || t('book.noFilter')}
        </ThemedText>
        <Button label={filtersOpen ? t('book.filtersDone') : t('book.filters')} variant="secondary" size="compact" onPress={() => setFiltersOpen((v) => !v)} />
      </View>
      {filtersOpen ? (
        <Card>
          <Choice label={t('book.theme')} options={['alle', ...BOOK_TAGS] as const} value={tag} onChange={setTag} format={(g) => t(`book.tags.${g}`)} />
          <Choice label={t('book.goal')} options={['alle', ...BOOK_GOALS] as const} value={goal} onChange={setGoal} format={(g) => t(`book.goals.${g}`)} />
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
      ) : null}

      <Card title={t('book.count', { count: list.length })}>
        {list.length === 0 ? <EmptyState icon="book" title={t('book.empty')} /> : null}
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
            onPress={() => router.push({ pathname: '/nutrition/book/[id]', params: planDay ? { id: r.id, planDay } : { id: r.id } })}
          />
        ))}
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        {t('book.disclaimer')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, minWidth: 0 },
});
