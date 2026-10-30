import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { Onboarding } from '@/components/onboarding';
import { ProfileProvider, useProfile } from '@/data/profile-provider';
import { StoreProvider } from '@/data/store-provider';

SplashScreen.preventAutoHideAsync();

/** Beim ersten Start kommt der Erststart-Ablauf, danach die App (Register UX-010). */
function Gate() {
  const { loaded, onboardingDone } = useProfile();
  if (!loaded) return null;
  return onboardingDone ? <AppTabs /> : <Onboarding />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <ProfileProvider>
          <AnimatedSplashOverlay />
          <Gate />
        </ProfileProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
