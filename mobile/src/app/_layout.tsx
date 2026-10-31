import { Manrope_600SemiBold, Manrope_700Bold, useFonts } from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { LockGate } from '@/components/lock-gate';
import { ToastHost } from '@/components/toast';
import { Onboarding } from '@/components/onboarding';
import { configureNotifications } from '@/data/notifications';
import { ProfileProvider, useProfile } from '@/data/profile-provider';
import { StoreProvider } from '@/data/store-provider';
import { ErrorView } from '@/components/error-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();
configureNotifications();

/** Beim ersten Start kommt der Erststart-Ablauf, danach die App (Register UX-010). */
function Gate() {
  const { loaded, onboardingDone } = useProfile();
  // Überschrift-Schrift (Manrope) abwarten; schlägt das Laden fehl, geht es mit der Systemschrift weiter.
  const [fontsLoaded, fontError] = useFonts({ Manrope_600SemiBold, Manrope_700Bold });
  if (!loaded || (!fontsLoaded && !fontError)) return null;
  return onboardingDone ? <AppTabs /> : <Onboarding />;
}

/** Fehler in einem Bildschirm zeigen statt einer leeren Seite. */
export const ErrorBoundary = ErrorView;

export default function TabLayout() {
  const scheme = useColorScheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];
  const navigation = {
    ...base,
    colors: { ...base.colors, primary: colors.tint, background: colors.background, card: colors.background, text: colors.text, border: colors.border },
  };
  return (
    <ThemeProvider value={navigation}>
      <StoreProvider>
        <ProfileProvider>
          <AnimatedSplashOverlay />
          <LockGate>
            <Gate />
          </LockGate>
          <ToastHost />
        </ProfileProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
