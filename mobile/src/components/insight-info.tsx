// Lange Hinweistexte (Durchschnitt, Datenschutz, Fachhinweise) eingeklappt hinter „Mehr erfahren“ (Review O6).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Kleines „i“ mit kurzer grauer Beschriftung; beim Antippen klappt der Text darunter auf (und wieder zu). Die Karte bleibt
 * so halb so hoch, der Fachtext ist einen Tipp entfernt. Bildschirmleser hören Beschriftung und Zustand (auf/zu).
 * Der Text blendet kurz ein – bei „Bewegung reduzieren“ steht er sofort.
 */
export function InsightInfo({ text, label }: { text: string; label?: string }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const title = label ?? t('insights.info.more');
  return (
    <View style={styles.wrap}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        hitSlop={6}
        onPress={() => {
          haptic.tap();
          setOpen((v) => !v);
        }}
        wrapStyle={styles.self}
        style={styles.row}>
        <Icon name="info" color={theme.textSecondary} size={16} />
        <ThemedText type="small" themeColor="textSecondary">
          {open ? t('insights.info.less') : title}
        </ThemedText>
      </PressableScale>
      {open ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(180)}>
          <ThemedText type="small" themeColor="textSecondary">
            {text}
          </ThemedText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  self: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2, minHeight: 36 },
});
