// Hunger, Sättigung und Stimmung je Mahlzeit (Ausbauplan B1, W10): freiwillig, ein Tipp je Angabe, ohne Bewertung.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { Presets } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { FEELING_KEYS, FEELING_LEVELS, feelingEmpty, toggleLevel, type MealFeeling } from '@/domain/meal-feeling';
import { t } from '@/i18n';

/** Kurzzeile, z. B. „Hunger: mittel · Stimmung: gut“ – nur die angegebenen Werte. */
export function feelingLine(f: MealFeeling): string {
  return FEELING_KEYS.filter((k) => f[k] !== null)
    .map((k) => `${t(`diary.feeling.${k}`)}: ${t(`diary.feeling.levels.${k}.${f[k]}`)}`)
    .join(' · ');
}

export function DiaryMealFeeling({ feeling, onChange }: { feeling: MealFeeling; onChange: (next: MealFeeling) => void }) {
  const [editing, setEditing] = useState(false);
  const empty = feelingEmpty(feeling);
  if (!editing)
    return (
      <View style={styles.row}>
        {!empty ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            {feelingLine(feeling)}
          </ThemedText>
        ) : null}
        <Button label={empty ? t('diary.feeling.add') : t('diary.feeling.edit')} variant="quiet" size="compact" onPress={() => setEditing(true)} />
      </View>
    );
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
      <View style={styles.row}>
        <Button label={t('diary.feeling.done')} variant="secondary" size="compact" onPress={() => setEditing(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 160 },
  editor: { gap: Spacing.two },
  group: { gap: Spacing.one },
});
