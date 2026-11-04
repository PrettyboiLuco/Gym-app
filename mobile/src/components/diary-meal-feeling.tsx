// Hunger, Sättigung und Stimmung je Mahlzeit (Ausbauplan B1, W10): freiwillig, ein Tipp je Angabe, ohne Bewertung.

import { StyleSheet, View } from 'react-native';

import { Presets } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { FEELING_KEYS, FEELING_LEVELS, toggleLevel, type MealFeeling } from '@/domain/meal-feeling';
import { t } from '@/i18n';

/** Kurzzeile, z. B. „Hunger: mittel · Stimmung: gut“ – nur die angegebenen Werte. */
export function feelingLine(f: MealFeeling): string {
  return FEELING_KEYS.filter((k) => f[k] !== null)
    .map((k) => `${t(`diary.feeling.${k}`)}: ${t(`diary.feeling.levels.${k}.${f[k]}`)}`)
    .join(' · ');
}

/** Drei Reihen Stufen (im Mahlzeiten-Fenster); nochmal tippen entfernt die Angabe. */
export function DiaryMealFeeling({ feeling, onChange }: { feeling: MealFeeling; onChange: (next: MealFeeling) => void }) {
  return (
    <View style={styles.editor}>
      {FEELING_KEYS.map((key) => (
        <View key={key} style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary">
            {t(`diary.feeling.${key}`)}
          </ThemedText>
          <Presets
            label={t(`diary.feeling.${key}`)}
            options={FEELING_LEVELS}
            value={feeling[key] ?? undefined}
            onChange={(level) => onChange(toggleLevel(feeling, key, level))}
            format={(level) => t(`diary.feeling.levels.${key}.${level}`)}
          />
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
});
