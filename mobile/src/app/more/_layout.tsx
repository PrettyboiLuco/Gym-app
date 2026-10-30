import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

export default function MoreLayout() {
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
      <Stack.Screen name="notifications" options={{ title: t('reminders.title') }} />
      <Stack.Screen name="data" options={{ title: t('dataScreen.title') }} />
      <Stack.Screen name="security" options={{ title: t('security.title') }} />
    </Stack>
  );
}
