import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { t } from '@/i18n';
import { ErrorView } from '@/components/error-view';

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

export default function TrainingLayout() {
  const stackOptions = useStackOptions();
  return (
    <Stack
      screenOptions={stackOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="plan/[id]" options={{ title: t('plan.titleEdit') }} />
      <Stack.Screen name="session/[id]" options={{ title: t('session.title') }} />
      <Stack.Screen name="import" options={{ title: t('planImport.navTitle') }} />
      <Stack.Screen name="exercise/[id]" options={{ title: t('exerciseProgress.title') }} />
      <Stack.Screen name="summary/[id]" options={{ title: t('summary.navTitle'), headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="exercises" options={{ title: t('exercises.title') }} />
      <Stack.Screen name="assistant" options={{ title: t('assistant.title') }} />
      <Stack.Screen name="history" options={{ title: t('history.title') }} />
      <Stack.Screen name="cardio" options={{ title: t('cardio.title') }} />
      <Stack.Screen name="interval" options={{ title: t('interval.title') }} />
      <Stack.Screen name="stretch" options={{ title: t('stretch.title') }} />
      <Stack.Screen name="hiit" options={{ title: t('hiit.title') }} />
      <Stack.Screen name="routine/[id]" options={{ title: t('routine.titleEdit') }} />
      <Stack.Screen name="run" options={{ title: t('run.title') }} />
      <Stack.Screen name="timed/[id]" options={{ title: t('history.detailTitle') }} />
    </Stack>
  );
}
