import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { dayLabel, todayDay } from '@/components/nutrition-format';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { shiftDay } from '@/domain/nutrition';
import { t } from '@/i18n';

/** ‹ Tag › – zum Nachtragen vergangener Tage. In die Zukunft geht es nicht. */
export function DaySwitcher({ day, onChange }: { day: string; onChange: (day: string) => void }) {
  const canForward = day < todayDay();
  return (
    <View style={styles.row}>
      <Button label="‹" accessibilityLabel={t('nutrition.prevDay')} variant="danger" onPress={() => onChange(shiftDay(day, -1))} />
      <ThemedText type="smallBold" style={styles.label} accessibilityRole="header">
        {dayLabel(day)}
      </ThemedText>
      <View style={{ opacity: canForward ? 1 : 0.3 }}>
        <Button
          label="›"
          accessibilityLabel={t('nutrition.nextDay')}
          variant="danger"
          disabled={!canForward}
          onPress={() => onChange(shiftDay(day, 1))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { flex: 1, textAlign: 'center' },
});
