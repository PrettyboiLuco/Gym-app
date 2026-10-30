import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, Field, MultiChoice, Presets } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { calorieGoalOn, setCalorieGoal } from '@/data/goals';
import { DEFAULT_SETTINGS, loadNutritionSettings, saveNutritionSettings } from '@/data/nutrition';
import { useDb } from '@/data/store-provider';
import { ALLERGENS, DIETS, type Allergen, type Diet, type MealTimes } from '@/domain/diet';
import { parseSettingsForm, type SettingsForm, type SettingsProblem } from '@/domain/nutrition';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { t } from '@/i18n';

function toForm(s: typeof DEFAULT_SETTINGS, kcalGoal: number | null): SettingsForm {
  return {
    kcalGoal: kcalGoal === null ? '' : String(kcalGoal),
    drinkGoal: s.drinkGoalMl === null ? '' : String(s.drinkGoalMl),
    glassSizes: s.glassSizes,
    hideNumbers: s.hideNumbers,
  };
}

/** Allergien, Ernährungsweise, Essenszeiten (COACH-007/-009); Uhrzeiten als Text, leer = keine. */
type Extras = { allergies: Allergen[]; diet: Diet; times: Record<keyof MealTimes, string> };
const MAIN_MEALS = ['fruehstueck', 'mittag', 'abend'] as const;

function toExtras(s: typeof DEFAULT_SETTINGS): Extras {
  const text = (h: number | null) => (h === null ? '' : String(h));
  return {
    allergies: s.allergies,
    diet: s.diet,
    times: { fruehstueck: text(s.mealTimes.fruehstueck), mittag: text(s.mealTimes.mittag), abend: text(s.mealTimes.abend) },
  };
}

/** Volle Stunde 0–23; leer = diese Mahlzeit gibt es meist nicht; ungültig = undefined. */
function parseHour(text: string): number | null | undefined {
  const value = text.trim();
  if (value === '') return null;
  return /^\d{1,2}$/.test(value) && Number(value) <= 23 ? Number(value) : undefined;
}

export default function NutritionSettingsScreen() {
  const db = useDb();
  const theme = useTheme();
  const [form, setForm] = useState<SettingsForm>(() => toForm(DEFAULT_SETTINGS, null));
  const [savedGoal, setSavedGoal] = useState<number | null>(null);
  const [baseline, setBaseline] = useState('');
  const [newGlass, setNewGlass] = useState('');
  const [problems, setProblems] = useState<(SettingsProblem | 'mealTime')[]>([]);
  const [extras, setExtras] = useState<Extras>(() => toExtras(DEFAULT_SETTINGS));

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadNutritionSettings(db), calorieGoalOn(db, todayDay())]).then(([s, goal]) => {
      if (cancelled) return;
      setSavedGoal(goal?.kcal ?? null);
      const loaded = toForm(s, goal?.kcal ?? null);
      const loadedExtras = toExtras(s);
      setForm(loaded);
      setExtras(loadedExtras);
      setBaseline(JSON.stringify([loaded, loadedExtras]));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const allowLeave = useUnsavedGuard(baseline !== '' && JSON.stringify([form, extras]) !== baseline);

  function addGlass() {
    const ml = Number(newGlass.trim());
    if (!Number.isInteger(ml) || ml < 50 || ml > 2000 || form.glassSizes.length >= 8) {
      setProblems(['glass']);
      return;
    }
    setProblems([]);
    setForm((f) => ({ ...f, glassSizes: [...new Set([...f.glassSizes, ml])].sort((a, b) => a - b) }));
    setNewGlass('');
  }

  async function save() {
    const { settings, kcalGoal, problems: found } = parseSettingsForm(form);
    const hours = MAIN_MEALS.map((meal) => parseHour(extras.times[meal]));
    if (!settings || hours.includes(undefined)) {
      setProblems([...found, ...(hours.includes(undefined) ? (['mealTime'] as const) : [])]);
      return;
    }
    const [fruehstueck, mittag, abend] = hours as (number | null)[];
    await saveNutritionSettings(db, {
      ...settings,
      allergies: extras.allergies,
      diet: extras.diet,
      mealTimes: { fruehstueck, mittag, abend },
    });
    // Neues Ziel gilt ab heute; frühere Tage behalten ihr Ziel (GOAL-002).
    if (kcalGoal !== savedGoal) await setCalorieGoal(db, kcalGoal, todayDay());
    allowLeave();
    router.back();
  }

  return (
    <Screen withHeader>
      <Card>
        <Field
          label={t('nutrition.settings.kcalGoal')}
          value={form.kcalGoal}
          onChangeText={(kcalGoal) => setForm((f) => ({ ...f, kcalGoal }))}
          keyboardType="number-pad"
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.settings.kcalGoalHint')}
        </ThemedText>
        <Button label={t('nutrition.settings.calculator')} variant="danger" onPress={() => router.push('/progress/calculator')} />
      </Card>
      <Card>
        <Field
          label={t('nutrition.settings.drinkGoal')}
          value={form.drinkGoal}
          onChangeText={(drinkGoal) => setForm((f) => ({ ...f, drinkGoal }))}
          keyboardType="number-pad"
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.settings.drinkGoalHint')} {t('nutrition.drinks.basis')}
        </ThemedText>
      </Card>
      <Card title={t('nutrition.settings.glasses')}>
        <Presets
          label={t('common.remove')}
          options={form.glassSizes}
          onChange={(ml) => setForm((f) => ({ ...f, glassSizes: f.glassSizes.filter((g) => g !== ml) }))}
          format={(ml) => `${ml} ml ✕`}
        />
        <View style={styles.row}>
          <Field label="ml" value={newGlass} onChangeText={setNewGlass} keyboardType="number-pad" style={styles.flex} />
          <Button label={t('nutrition.settings.glassAdd')} onPress={addGlass} />
        </View>
      </Card>
      <Card>
        <Choice
          label={t('nutrition.settings.hideNumbers')}
          options={['aus', 'an'] as const}
          value={form.hideNumbers ? 'an' : 'aus'}
          onChange={(v) => setForm((f) => ({ ...f, hideNumbers: v === 'an' }))}
          format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.settings.hideNumbersHint')}
        </ThemedText>
      </Card>
      <Card title={t('diet.mealTimesTitle')}>
        <View style={styles.row}>
          {MAIN_MEALS.map((meal) => (
            <Field
              key={meal}
              label={`${t(`nutrition.meals.${meal}`)} (${t('diet.hour')})`}
              value={extras.times[meal]}
              onChangeText={(v) => setExtras((e) => ({ ...e, times: { ...e.times, [meal]: v } }))}
              keyboardType="number-pad"
              style={styles.flex}
            />
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {t('diet.mealTimesHint')}
        </ThemedText>
      </Card>
      <Card title={t('diet.title')}>
        <Choice
          label={t('diet.diet')}
          options={DIETS}
          value={extras.diet}
          onChange={(diet) => setExtras((e) => ({ ...e, diet }))}
          format={(v) => t(`diet.dietOption.${v}`)}
        />
        <MultiChoice
          label={t('diet.allergies')}
          options={ALLERGENS}
          value={extras.allergies}
          onChange={(allergies) => setExtras((e) => ({ ...e, allergies }))}
          format={(v) => t(`diet.allergen.${v}`)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('diet.hint')}
        </ThemedText>
      </Card>
      {problems.length > 0 ? (
        <Card>
          {problems.map((p) => (
            <ThemedText key={p} style={{ color: theme.danger }}>
              {p === 'glass' ? t('nutrition.settings.glassInvalid') : p === 'mealTime' ? t('diet.mealTimeInvalid') : t(`nutrition.settings.problems.${p}`)}
            </ThemedText>
          ))}
        </Card>
      ) : null}
      <Button label={t('common.save')} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
});
