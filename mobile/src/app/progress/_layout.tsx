import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { t } from '@/i18n';
import { ErrorView } from '@/components/error-view';

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

export default function ProgressLayout() {
  const stackOptions = useStackOptions();
  return (
    <Stack
      screenOptions={stackOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: t('profile.title') }} />
      <Stack.Screen name="goal/[id]" options={{ title: t('goals.titleEdit'), presentation: 'modal' }} />
      <Stack.Screen name="calculator" options={{ title: t('calculator.title') }} />
      <Stack.Screen name="measurements" options={{ title: t('measure.title') }} />
      <Stack.Screen name="photos" options={{ title: t('photos.title') }} />
      <Stack.Screen name="steps" options={{ title: t('steps.title') }} />
      <Stack.Screen name="checkin" options={{ title: t('checkin.title') }} />
      <Stack.Screen name="readiness" options={{ title: t('readiness.title') }} />
      <Stack.Screen name="breathe" options={{ title: t('breathe.title') }} />
      <Stack.Screen name="coach-setup" options={{ title: t('coach.setupTitle') }} />
    </Stack>
  );
}
