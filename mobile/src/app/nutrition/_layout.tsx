import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { t } from '@/i18n';
import { ErrorView } from '@/components/error-view';

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

export default function NutritionLayout() {
  const stackOptions = useStackOptions();
  return (
    <Stack
      screenOptions={stackOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ title: t('nutrition.search.title') }} />
      <Stack.Screen name="text" options={{ title: t('foodText.title') }} />
      <Stack.Screen name="food/[id]" options={{ title: t('nutrition.food.title') }} />
      <Stack.Screen name="food-edit/[id]" options={{ title: t('nutrition.edit.titleEdit') }} />
      <Stack.Screen name="scan" options={{ title: t('nutrition.scan.title') }} />
      {/* Einen Eintrag ändern: als Sheet von unten (zum Schließen nach unten wischen). */}
      <Stack.Screen name="entry/[id]" options={{ title: t('nutrition.entry.title'), presentation: 'modal' }} />
      <Stack.Screen name="recipes" options={{ title: t('nutrition.recipe.listTitle') }} />
      <Stack.Screen name="book/index" options={{ title: t('book.title') }} />
      <Stack.Screen name="book/[id]" options={{ title: t('book.title') }} />
      <Stack.Screen name="recipe/[id]" options={{ title: t('nutrition.recipe.titleEdit') }} />
      <Stack.Screen name="recipe-log/[id]" options={{ title: t('nutrition.recipe.log.title') }} />
      <Stack.Screen name="week" options={{ title: t('nutrition.week.title') }} />
      <Stack.Screen name="settings" options={{ title: t('nutrition.settings.title') }} />
      <Stack.Screen name="supplements" options={{ title: t('supplements.title') }} />
    </Stack>
  );
}
