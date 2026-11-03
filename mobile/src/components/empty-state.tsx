// Leerer Zustand einer Karte: kleines Symbol, ein kurzer Satz, eine Aktion (Review O8).
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Statt „Noch nichts eingetragen …“ als Absatz mit großem Knopf: links ein kleines Symbol im ruhigen Kreis, daneben ein
 * kurzer Satz, rechts höchstens eine kleine Aktion. Ohne Aktion bleibt es bei Symbol und Satz.
 */
export function EmptyState({ icon, title, action }: { icon: IconName; title: string; action?: { label: string; onPress: () => void } }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
        <Icon name={icon} color={theme.textSecondary} size={20} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {title}
      </ThemedText>
      {action ? <Button label={action.label} variant="secondary" size="compact" onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
});
