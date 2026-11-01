import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { shiftDay } from '@/domain/dates';
import { todayDay } from '@/domain/time';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { dayLabel } from '@/services/nutrition-format';

/**
 * ‹ Tag › als eine ruhige Leiste: runde Pfeil-Knöpfe, der Tag in der Mitte. In die Zukunft geht es nicht;
 * ist ein vergangener Tag gewählt, führt „Zu heute“ mit einem Tipp zurück.
 */
export function DaySwitcher({ day, onChange }: { day: string; onChange: (day: string) => void }) {
  const theme = useTheme();
  const today = todayDay();
  const canForward = day < today;
  const step = (delta: number) => {
    haptic.tap();
    onChange(shiftDay(day, delta));
  };
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundSelected }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('nutrition.prevDay')}
        onPress={() => step(-1)}
        style={({ pressed }) => [styles.arrow, { backgroundColor: pressed ? theme.backgroundElement : 'transparent' }]}>
        <View style={styles.flip}>
          <Icon name="chevron" color={theme.text} size={18} strokeWidth={2.2} />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole={canForward ? 'button' : undefined}
        accessibilityLabel={canForward ? `${dayLabel(day)}. ${t('nutrition.toToday')}` : dayLabel(day)}
        disabled={!canForward}
        onPress={() => {
          haptic.tap();
          onChange(today);
        }}
        style={styles.center}>
        <ThemedText type="smallBold" accessibilityRole="header">
          {dayLabel(day)}
        </ThemedText>
        {canForward ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {t('nutrition.toToday')}
          </ThemedText>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('nutrition.nextDay')}
        accessibilityState={{ disabled: !canForward }}
        disabled={!canForward}
        onPress={() => step(1)}
        style={({ pressed }) => [styles.arrow, { backgroundColor: pressed ? theme.backgroundElement : 'transparent', opacity: canForward ? 1 : 0.25 }]}>
        <Icon name="chevron" color={theme.text} size={18} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.pill, padding: 4, minHeight: 52 },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  hint: { fontSize: 12, lineHeight: 16 },
  flip: { transform: [{ scaleX: -1 }] },
});
