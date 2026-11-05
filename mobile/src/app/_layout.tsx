import { Manrope_600SemiBold, Manrope_700Bold, useFonts } from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ErrorView } from '@/components/error-view';
import { LockGate } from '@/components/lock-gate';
import { Onboarding } from '@/components/onboarding';
import { ToastHost } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { configureNotifications } from '@/data/notifications';
import { loadNutritionSettings } from '@/data/nutrition';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProfileProvider, useProfile } from '@/providers/profile-provider';
import { StoreProvider, useDb } from '@/providers/store-provider';
import { syncFastingAlert, syncMealReminders } from '@/services/alerts';
import { diaryToday } from '@/services/nutrition-format';

SplashScreen.preventAutoHideAsync();
configureNotifications();

/**
 * Mahlzeit-Erinnerungen und Fasten-Ende beim Start und bei jeder Rückkehr in die App neu planen (B1): Sie werden nur
 * für ein paar Tage im Voraus geplant und liefen sonst aus, wenn das Tagebuch länger nicht geöffnet wird.
 */
function AlertsSync() {
  const db = useDb();
  useEffect(() => {
    const sync = () => {
      // Tagesende und Essenszeiten einmal laden: „heute“ (diaryToday) hängt am Zwischenspeicher der Ernährung.
      loadNutritionSettings(db)
        .catch(() => undefined)
        .then(() => syncMealReminders(db, diaryToday()))
        .catch(() => undefined);
      syncFastingAlert(db).catch(() => undefined);
    };
    sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, [db]);
  return null;
}

/** Beim ersten Start kommt der Erststart-Ablauf, danach die App (Register UX-010). */
function Gate() {
  const db = useDb();
  const { loaded, onboardingDone } = useProfile();
  // Überschrift-Schrift (Manrope) abwarten; schlägt das Laden fehl, geht es mit der Systemschrift weiter.
  const [fontsLoaded, fontError] = useFonts({ Manrope_600SemiBold, Manrope_700Bold });
  // Tagesende einmal laden, bevor ein Bildschirm „heute“ bestimmt: sonst zeigte Ernährung beim Kaltstart (Neuladen,
  // Öffnen aus einer Erinnerung) um 1 Uhr bei Tagesende 4 Uhr den Kalendertag statt den Vortag (Browser-Prüfung S7).
  const [dayEndReady, setDayEndReady] = useState(false);
  useEffect(() => {
    loadNutritionSettings(db)
      .catch(() => undefined)
      .then(() => setDayEndReady(true));
  }, [db]);
  if (!loaded || !dayEndReady || (!fontsLoaded && !fontError)) return null;
  return onboardingDone ? (
    <>
      <AlertsSync />
      <AppTabs />
    </>
  ) : (
    <Onboarding />
  );
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
  // Wurzel für Gesten (Wisch-Löschen in der Satztabelle, react-native-gesture-handler).
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navigation}>
        <StoreProvider>
          <ProfileProvider>
            <AnimatedSplashOverlay />
            {/* Meldungen innerhalb der Sperre: Die Sperrebene deckt sie ab, gesperrt werden sie gar nicht gezeigt. */}
            <LockGate>
              <Gate />
              <ToastHost />
            </LockGate>
          </ProfileProvider>
        </StoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
