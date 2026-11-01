import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { t } from '@/i18n';
import { ErrorView } from '@/components/error-view';

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

export default function MoreLayout() {
  const stackOptions = useStackOptions();
  return (
    <Stack
      screenOptions={stackOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: t('reminders.title') }} />
      <Stack.Screen name="modules" options={{ title: t('modules.title') }} />
      <Stack.Screen name="data" options={{ title: t('dataScreen.title') }} />
      <Stack.Screen name="import" options={{ title: t('importCsv.title') }} />
      <Stack.Screen name="report" options={{ title: t('report.screenTitle') }} />
      <Stack.Screen name="learn/index" options={{ title: t('learn.title') }} />
      <Stack.Screen name="learn/[id]" options={{ title: t('learn.title') }} />
      <Stack.Screen name="security" options={{ title: t('security.title') }} />
      <Stack.Screen name="feedback" options={{ title: t('feedback.title') }} />
      <Stack.Screen name="help" options={{ title: t('help.title') }} />
    </Stack>
  );
}
