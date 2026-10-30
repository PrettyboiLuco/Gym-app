import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { ErrorView } from '@/components/error-view';

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

export default function ProgressLayout() {
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
      <Stack.Screen name="profile" options={{ title: t('profile.title') }} />
      <Stack.Screen name="goal/[id]" options={{ title: t('goals.titleEdit') }} />
      <Stack.Screen name="calculator" options={{ title: t('calculator.title') }} />
      <Stack.Screen name="measurements" options={{ title: t('measure.title') }} />
      <Stack.Screen name="photos" options={{ title: t('photos.title') }} />
      <Stack.Screen name="steps" options={{ title: t('steps.title') }} />
      <Stack.Screen name="checkin" options={{ title: t('checkin.title') }} />
    </Stack>
  );
}
