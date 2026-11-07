import { useNavigation } from 'expo-router';
import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { introRunning, onIntroExit } from '@/components/intro-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenEnter } from '@/constants/motion';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Grundgerüst jedes Bereichs: sicherer Rand, Titel, scrollbarer Inhalt.
 * Unterseiten mit Navigationsleiste (withHeader) zeigen den Titel oben in der Leiste.
 * Seitenwechsel (useScreenEnter): Inhalt gleitet weich herein statt hart umzuspringen.
 */
export function Screen({
  title,
  subtitle,
  withHeader = false,
  footer,
  scrollRef,
  leading,
  trailing,
  children,
}: {
  title?: string;
  subtitle?: string;
  withHeader?: boolean;
  footer?: ReactNode;
  /** Für Bildschirme, die selbst nach oben scrollen müssen (z. B. Formular oben, Liste darunter). */
  scrollRef?: Ref<ScrollViewInstance>;
  /** Links vor dem Titel (z. B. „Zurück“ in den Einstellungen). */
  leading?: ReactNode;
  /** Rechts neben dem Titel (z. B. das Zahnrad zu den Einstellungen). */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const enter = useScreenEnter(withHeader);
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={withHeader ? ['left', 'right'] : ['top', 'left', 'right']}>
        <Animated.View style={[styles.flex, enter]}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {title && !withHeader ? (
              <View style={styles.head}>
                {leading}
                <View style={styles.titleRow}>
                  <ThemedText type="subtitle" accessibilityRole="header" style={styles.flex}>
                    {title}
                  </ThemedText>
                  {trailing}
                </View>
                {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
              </View>
            ) : subtitle ? (
              <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
            ) : null}
            {children}
          </ScrollView>
        </Animated.View>
        {footer}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Auf dem iPhone/Android schiebt der native Stapel Unterseiten selbst herein; im Web gibt es das nicht. */
const NATIVE_STACK_SLIDES = Platform.OS !== 'web';

/**
 * Wie kam der Bildschirm in den Blick? Danach richtet sich die Bewegung (ScreenEnter):
 * - Unterseite geöffnet → gleitet von rechts herein (Web; nativ macht das der Stapel)
 * - zurück auf eine Seite → gleitet von links herein (Web; nativ macht das der Stapel)
 * - Tab gewechselt oder App gestartet → steigt 12 px auf und blendet ein (überall)
 * Beim App-Start wartet der erste Bildschirm, bis der Vorhang des Intros abgeht, und gleitet durch ihn herein.
 */
function useScreenEnter(isSubpage: boolean) {
  const navigation = useNavigation();
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  const seen = useRef(false);
  const lastPlay = useRef(0);
  // Beim Verlassen merken, ob eine Unterseite darübergeschoben wurde (Tab bleibt aktiv) oder der Tab gewechselt hat.
  const leftBy = useRef<'push' | 'tab'>('tab');

  useEffect(() => {
    const play = (kind: 'push' | 'back' | 'tab') => {
      if (reduced) return;
      if ((kind === 'push' || kind === 'back') && NATIVE_STACK_SLIDES) return;
      const fromX = kind === 'push' ? ScreenEnter.slideX : kind === 'back' ? -ScreenEnter.slideX : 0;
      const fromY = kind === 'tab' ? ScreenEnter.riseY : 0;
      // Startwert als eigener Schritt der Folge: ein direktes Setzen kurz vor der Animation geht im Web verloren.
      const jump = { duration: 0 };
      opacity.set(withSequence(withTiming(0, jump), withTiming(1, { duration: ScreenEnter.fadeMs, easing: Easing.out(Easing.cubic) })));
      x.set(withSequence(withTiming(fromX, jump), withSpring(0, ScreenEnter.spring)));
      y.set(withSequence(withTiming(fromY, jump), withSpring(0, ScreenEnter.spring)));
    };
    const focus = () => {
      // Beim Öffnen kommt das „focus“-Ereignis oft zusätzlich zum ersten Aufruf – nicht doppelt abspielen.
      if (Date.now() - lastPlay.current < 400) return;
      lastPlay.current = Date.now();
      if (!seen.current) {
        seen.current = true;
        const kind = isSubpage ? 'push' : 'tab';
        if (introRunning() && !reduced) {
          // Unter dem Vorhang schon in Startstellung warten, dann mit dem Abgang hereingleiten.
          opacity.set(0);
          return onIntroExit(() => play(kind));
        }
        play(kind);
        return;
      }
      play(leftBy.current === 'push' ? 'back' : 'tab');
    };
    const blur = () => {
      const parent = navigation.getParent();
      leftBy.current = parent && parent.isFocused() ? 'push' : 'tab';
    };
    let cancelIntro: (() => void) | void;
    const offFocus = navigation.addListener('focus', () => {
      cancelIntro = focus();
    });
    const offBlur = navigation.addListener('blur', blur);
    if (navigation.isFocused() && !seen.current) cancelIntro = focus();
    return () => {
      offFocus();
      offBlur();
      if (cancelIntro) cancelIntro();
    };
  }, [isSubpage, navigation, opacity, reduced, x, y]);

  return useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: x.value }, { translateY: y.value }] }));
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  head: { gap: Spacing.one, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
