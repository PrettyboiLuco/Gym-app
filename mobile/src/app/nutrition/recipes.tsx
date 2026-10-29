import { router } from 'expo-router';

import { Button, Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { formatKcal } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { listRecipes, type RecipeSummary } from '@/data/nutrition';
import { useLoad } from '@/hooks/use-load';
import { formatNumber, t } from '@/i18n';

export default function RecipesScreen() {
  const { data: recipes, loaded } = useLoad(listRecipes, [] as RecipeSummary[]);

  return (
    <Screen withHeader>
      <Button label={t('nutrition.recipe.new')} onPress={() => router.push({ pathname: '/nutrition/recipe/[id]', params: { id: 'neu' } })} />
      <Card>
        {loaded && recipes.length === 0 ? <ThemedText themeColor="textSecondary">{t('nutrition.recipe.empty')}</ThemedText> : null}
        {recipes.map((r) => (
          <ListRow
            key={r.recipeId}
            title={r.name}
            subtitle={[
              t('nutrition.recipe.summary', { kcal: formatKcal(r.total.kcal) }),
              r.endWeightG ? t('nutrition.recipe.endWeightInfo', { value: formatNumber(r.endWeightG) }) : null,
              r.portions ? t('nutrition.recipe.portionsInfo', { value: r.portions }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            accessory={t('common.edit')}
            onPress={() => router.push({ pathname: '/nutrition/recipe/[id]', params: { id: r.recipeId } })}
          />
        ))}
      </Card>
    </Screen>
  );
}
