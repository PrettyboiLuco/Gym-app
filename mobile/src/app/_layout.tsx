import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { LockGate } from '@/components/lock-gate';
import { Onboarding } from '@/components/onboarding';
import { configureNotifications } from '@/data/notifications';
import { ProfileProvider, useProfile } from '@/data/profile-provider';
import { StoreProvider } from '@/data/store-provider';
import { ErrorView } from '@/components/error-view';

SplashScreen.preventAutoHideAsync();
configureNotifications();

/** Beim ersten Start kommt der Erststart-Ablauf, danach die App (Register UX-010). */
function Gate() {
  const { loaded, onboardingDone } = useProfile();
  if (!loaded) return null;
  return onboardingDone ? <AppTabs /> : <Onboarding />;
}

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <ProfileProvider>
          <AnimatedSplashOverlay />
          <LockGate>
            <Gate />
          </LockGate>
        </ProfileProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
