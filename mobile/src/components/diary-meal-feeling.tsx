// Hunger, Sättigung und Stimmung je Mahlzeit (Ausbauplan B1, W10): freiwillig, ein Tipp je Angabe, ohne Bewertung.

import { StyleSheet, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { FEELING_KEYS, FEELING_LEVELS, toggleLevel, type MealFeeling } from '@/domain/meal-feeling';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Kurzzeile, z. B. „Hunger: mittel · Stimmung: gut“ – nur die angegebenen Werte. */
export function feelingLine(f: MealFeeling): string {
  return FEELING_KEYS.filter((k) => f[k] !== null)
    .map((k) => `${t(`diary.feeling.${k}`)}: ${t(`diary.feeling.levels.${k}.${f[k]}`)}`)
    .join(' · ');
}

/**
 * Drei Reihen mit je fünf Stufen (im Mahlzeiten-Fenster): jede Reihe eine Leiste aus fünf gleich breiten Feldern, damit
 * die Stufen nicht 4 + 1 umbrechen. Gewählt = weiß gefüllt. Nochmal tippen entfernt die Angabe.
 */
export function DiaryMealFeeling({ feeling, onChange }: { feeling: MealFeeling; onChange: (next: MealFeeling) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.editor}>
      {FEELING_KEYS.map((key) => (
        <View key={key} style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary">
            {t(`diary.feeling.${key}`)}
          </ThemedText>
          <View style={styles.levels} accessibilityRole="radiogroup" accessibilityLabel={t(`diary.feeling.${key}`)}>
            {FEELING_LEVELS.map((level) => {
              const selected = feeling[key] === level;
              const label = t(`diary.feeling.levels.${key}.${level}`);
              return (
                <PressableScale
                  key={level}
                  scaleTo={Press.button}
                  wrapStyle={styles.cell}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${t(`diary.feeling.${key}`)}: ${label}`}
                  onPress={() => {
                    haptic.tap();
                    onChange(toggleLevel(feeling, key, level));
                  }}
                  style={({ pressed }) => [styles.level, { backgroundColor: selected ? theme.primary : pressed ? theme.border : theme.backgroundSelected }]}>
                  <ThemedText
                    type="small"
                    numberOfLines={2}
                    style={[styles.levelText, { color: selected ? theme.onPrimary : theme.text, fontWeight: selected ? 600 : 500 }]}>
                    {label}
                  </ThemedText>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        {t('diary.feeling.hint')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: Spacing.three },
  group: { gap: Spacing.two },
  levels: { flexDirection: 'row', gap: Spacing.one },
  cell: { flex: 1, minWidth: 0 },
  level: { minHeight: 44, borderRadius: Radius.field, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: Spacing.one },
  levelText: { textAlign: 'center', fontSize: 13, lineHeight: 16 },
});
