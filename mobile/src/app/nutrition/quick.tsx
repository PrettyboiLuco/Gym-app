import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, Field } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { logQuick } from '@/data/nutrition';
import { MEALS, parseMealKcal, parseNutrient, type Meal } from '@/domain/nutrition';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { dayLabel, diaryToday, readTarget, whenFor, type TargetParams } from '@/services/nutrition-format';

/**
 * Schnelleintrag (A3): nur Kalorien, Makros freiwillig – für Kantine, Restaurant oder „ungefähr“. Ohne Lebensmittel,
 * daher auch ohne Allergene; im Tagebuch wie jeder andere Eintrag änderbar.
 */
export default function QuickEntryScreen() {
  const params = useLocalSearchParams<TargetParams>();
  const { day, target } = readTarget(params);
  const db = useDb();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [meal, setMeal] = useState<Meal>(target.kind === 'essen' ? target.meal : 'snack');
  const [error, setError] = useState(false);

  async function save() {
    // Makros je Mahlzeit bis 1000 g; kcal bis 10 000 (vorher galt auch hier die 1000er-Grenze pro 100 g).
    const values = [parseMealKcal(kcal), ...[protein, carbs, fat].map((v) => parseNutrient(v))];
    const k = values[0];
    if (k === null || k === 'invalid' || values.includes('invalid')) {
      setError(true);
      return;
    }
    const [, p, c, f] = values as (number | null)[];
    await logQuick(db, { name: name.trim() || t('quick.defaultName'), kcal: k, protein: p, carbs: c, fat: f }, meal, whenFor(day, meal));
    showToast(t('quick.saved', { meal: t(`nutrition.meals.${meal}`) }));
    router.dismissTo('/nutrition');
  }

  return (
    <Screen withHeader>
      <ThemedText themeColor="textSecondary">{dayLabel(day, diaryToday())}</ThemedText>
      <Card>
        <Field label={t('quick.kcal')} value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" placeholder="650" autoFocus />
        <View style={styles.row}>
          <Field
            label={`${t('nutrition.protein')} (g)`}
            value={protein}
            onChangeText={setProtein}
            keyboardType="decimal-pad"
            placeholder="–"
            style={styles.cell}
          />
          <Field label={`${t('nutrition.carbs')} (g)`} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" placeholder="–" style={styles.cell} />
          <Field label={`${t('nutrition.fat')} (g)`} value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="–" style={styles.cell} />
        </View>
        <Field label={t('quick.name')} value={name} onChangeText={setName} placeholder={t('quick.namePlaceholder')} />
        <Choice label={t('nutrition.meal')} options={MEALS} value={meal} onChange={setMeal} format={(m) => t(`book.mealShort.${m}`)} />
        {error ? <ThemedText style={{ color: theme.danger }}>{t('quick.invalid')}</ThemedText> : null}
      </Card>
      <Button label={t('quick.save')} onPress={save} />
      <ThemedText type="small" themeColor="textSecondary">
        {t('quick.hint')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  cell: { flex: 1, minWidth: 0 },
});
