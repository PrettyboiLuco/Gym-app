import { Stack } from 'expo-router';

import { ErrorView } from '@/components/error-view';
import { useStackOptions } from '@/components/stack-options';
import { t } from '@/i18n';

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

/** Tab „Coach“: Übersicht, Einrichtung und Wochen-Check an einem Ort. */
export default function CoachLayout() {
  const stackOptions = useStackOptions();
  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="coach-setup" options={{ title: t('coach.setupTitle') }} />
      <Stack.Screen name="checkin" options={{ title: t('checkin.title') }} />
    </Stack>
  );
}
