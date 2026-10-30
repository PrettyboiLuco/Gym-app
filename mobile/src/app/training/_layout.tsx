import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { ErrorView } from '@/components/error-view';

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

export default function TrainingLayout() {
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
      <Stack.Screen name="plan/[id]" options={{ title: t('plan.titleEdit') }} />
      <Stack.Screen name="session/[id]" options={{ title: t('session.title') }} />
      <Stack.Screen name="exercises" options={{ title: t('exercises.title') }} />
      <Stack.Screen name="history" options={{ title: t('history.title') }} />
      <Stack.Screen name="interval" options={{ title: t('interval.title') }} />
      <Stack.Screen name="stretch" options={{ title: t('stretch.title') }} />
      <Stack.Screen name="hiit" options={{ title: t('hiit.title') }} />
      <Stack.Screen name="routine/[id]" options={{ title: t('routine.titleEdit') }} />
      <Stack.Screen name="run" options={{ title: t('run.title') }} />
      <Stack.Screen name="timed/[id]" options={{ title: t('history.detailTitle') }} />
    </Stack>
  );
}
