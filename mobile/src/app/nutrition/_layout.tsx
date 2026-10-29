import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

export default function NutritionLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: t('common.back'),
        headerTintColor: theme.tint,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ title: t('nutrition.search.title') }} />
      <Stack.Screen name="food/[id]" options={{ title: t('nutrition.food.title') }} />
      <Stack.Screen name="food-edit/[id]" options={{ title: t('nutrition.edit.titleEdit') }} />
      <Stack.Screen name="scan" options={{ title: t('nutrition.scan.title') }} />
      <Stack.Screen name="entry/[id]" options={{ title: t('nutrition.entry.title') }} />
      <Stack.Screen name="recipes" options={{ title: t('nutrition.recipe.listTitle') }} />
      <Stack.Screen name="recipe/[id]" options={{ title: t('nutrition.recipe.titleEdit') }} />
      <Stack.Screen name="recipe-log/[id]" options={{ title: t('nutrition.recipe.log.title') }} />
      <Stack.Screen name="week" options={{ title: t('nutrition.week.title') }} />
      <Stack.Screen name="settings" options={{ title: t('nutrition.settings.title') }} />
    </Stack>
  );
}
