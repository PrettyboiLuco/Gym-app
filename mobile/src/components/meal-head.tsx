// Kopfzeile eines Mahlzeiten-Blocks (getlayers lumora-services): Index, Name, Summe, runder „+“- und „…“-Knopf.

import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/constants/motion';
import { DisplayFont, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Eine Zeile: kleine Index-Zahl („01“), Name (Manrope 18), rechts die Summe in gleich breiten Ziffern, dann der runde
 * weiße „+“-Knopf (wie der Hauptknopf) und optional der runde „…“-Knopf für die Optionen. Knöpfe 40 px, federn beim Drücken.
 */
export function MealHead({
  index,
  title,
  value,
  valueLabel,
  addLabel,
  onAdd,
  moreLabel,
  onMore,
}: {
  index?: number;
  title: string;
  value?: string | null;
  /** Summe für Bildschirmleser ausgeschrieben (z. B. „950 ml von 2,5 l getrunken“). */
  valueLabel?: string;
  addLabel: string;
  onAdd: () => void;
  moreLabel?: string;
  onMore?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.name} accessible accessibilityRole="header" accessibilityLabel={[title, valueLabel ?? value].filter(Boolean).join(', ')}>
        {index !== undefined ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.index}>
            {String(index).padStart(2, '0')}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        <View style={styles.flex} />
        {value ? (
          <ThemedText themeColor="textSecondary" style={styles.value} numberOfLines={1}>
            {value}
          </ThemedText>
        ) : null}
      </View>
      <PressableScale
        scaleTo={Press.button}
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        hitSlop={4}
        onPress={onAdd}
        style={({ pressed }) => [styles.round, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}>
        <Icon name="plus" color={theme.onPrimary} size={18} strokeWidth={2.4} />
      </PressableScale>
      {onMore ? (
        <PressableScale
          scaleTo={Press.button}
          accessibilityRole="button"
          accessibilityLabel={moreLabel}
          hitSlop={4}
          onPress={onMore}
          style={({ pressed }) => [styles.round, { backgroundColor: pressed ? theme.border : theme.backgroundSelected }]}>
          <Icon name="more" color={theme.text} size={18} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  name: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two + 2 },
  index: { fontVariant: ['tabular-nums'], fontSize: 13, letterSpacing: 0.4 },
  title: { fontFamily: DisplayFont.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, flexShrink: 1 },
  flex: { flex: 1 },
  value: { fontVariant: ['tabular-nums'], fontSize: 15 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
