import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Shimmer } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Ladezustand (taste-skill, app-screens §11): die spätere Anordnung mit grauen Flächen in echter Größe,
 * ohne Sprung beim Eintreffen der Daten. Verhindert, dass kurz ein falscher Inhalt
 * (z. B. „Noch kein Plan“) aufblitzt, bevor die Datenbank geantwortet hat.
 * `pulse` (N8): Wartet die App auf etwas Langsames (Netz), atmen die Flächen ruhig – kein wandernder Glanzstreifen.
 */
export function SkeletonBlocks({ blocks = [220, 104, 180], pulse = false }: { blocks?: number[]; pulse?: boolean }) {
  const theme = useTheme();
  const breathe = useBreathe(pulse);
  return (
    <Animated.View style={[styles.wrap, breathe]} accessibilityLabel="…" accessibilityState={{ busy: true }}>
      {blocks.map((h, i) => (
        <View key={i} style={[styles.block, { height: h, backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
          <View style={[styles.line, { width: '38%', backgroundColor: theme.backgroundSelected }]} />
          <View style={[styles.lineBig, { width: '62%', backgroundColor: theme.backgroundSelected }]} />
          {h > 140 ? <View style={[styles.line, { width: '80%', backgroundColor: theme.backgroundSelected }]} /> : null}
        </View>
      ))}
    </Animated.View>
  );
}

/**
 * Platzhalter-Karte beim Warten aufs Netz oder eine längere Rechnung (Barcode-Suche, Bericht, Rezept per Link, N8):
 * graue Zeilen in der späteren Breite, die ruhig atmen. `lines` = Breiten der Zeilen, `big` = Index der großen Zeile.
 * Für Bildschirmleser „Wird geladen …“ (busy).
 */
export function SkeletonCard({
  lines = ['40%', '70%', '55%'],
  big = 0,
  label,
}: {
  lines?: DimensionValue[];
  big?: number | null;
  /** Was geladen wird, für Bildschirmleser (sonst „Wird geladen …“). */
  label?: string;
}) {
  const theme = useTheme();
  const breathe = useBreathe(true);
  return (
    <Animated.View
      accessible
      accessibilityLabel={label ?? t('common.loading')}
      accessibilityState={{ busy: true }}
      style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }, breathe]}>
      {lines.map((width, i) => (
        <View key={i} style={[i === big ? styles.lineBig : styles.line, { width, backgroundColor: theme.backgroundSelected }]} />
      ))}
    </Animated.View>
  );
}

/** Ruhiges Atmen der Deckkraft (Shimmer); bei „Bewegung reduzieren“ oder ohne `on` steht die Fläche still. */
function useBreathe(on: boolean) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!on || reduced) {
      opacity.set(1);
      return;
    }
    opacity.set(withRepeat(withTiming(Shimmer.minOpacity, { duration: Shimmer.durationMs, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [on, reduced, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  block: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.four - 2, gap: Spacing.three },
  line: { height: 14, borderRadius: 7 },
  lineBig: { height: 28, borderRadius: 10 },
});
