import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, Field, MultiChoice } from '@/components/fields';
import { readTarget, targetParams, type TargetParams } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { findFoodByBarcode, foodFacts, getFood, per100, saveFood } from '@/data/nutrition';
import { ALLERGENS } from '@/domain/diet';
import { useDb } from '@/data/store-provider';
import { foodToForm, parseFoodForm, PREPS, type FoodForm, type FoodProblem } from '@/domain/nutrition';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { t } from '@/i18n';

const EMPTY: FoodForm = {
  name: '',
  brand: '',
  barcode: '',
  basis: 'g',
  prep: 'keine',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  serving: '',
  allergens: null,
};

const NUTRIENT_FIELDS = ['kcal', 'protein', 'carbs', 'fat'] as const;

export default function FoodEditScreen() {
  const params = useLocalSearchParams<TargetParams & { id: string; name?: string; barcode?: string }>();
  const isNew = params.id === 'neu';
  const { day, target } = readTarget(params);
  const db = useDb();
  const theme = useTheme();
  // Neues Lebensmittel: Name aus der Suche bzw. Barcode aus dem Scanner übernehmen (FOOD-001).
  const [initial] = useState<FoodForm>(() => ({ ...EMPTY, name: params.name ?? '', barcode: params.barcode ?? '' }));
  const [form, setForm] = useState<FoodForm>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [problems, setProblems] = useState<(FoodProblem | 'barcodeExists')[]>([]);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    getFood(db, params.id).then((food) => {
      if (cancelled || !food) return;
      const loaded = foodToForm({ ...food, per100: per100(food), ...foodFacts(food) });
      setForm(loaded);
      setBaseline(JSON.stringify(loaded));
    });
    return () => {
      cancelled = true;
    };
  }, [db, params.id, isNew]);

  const allowLeave = useUnsavedGuard(JSON.stringify(form) !== baseline);

  function set<K extends keyof FoodForm>(key: K, value: FoodForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    const { draft, problems: found } = parseFoodForm(form);
    if (!draft) {
      setProblems(found);
      return;
    }
    // Gleicher Barcode = dasselbe Produkt: nicht doppelt anlegen (FOOD-018).
    if (draft.barcode) {
      const existing = await findFoodByBarcode(db, draft.barcode);
      if (existing && existing.id !== params.id) {
        setProblems(['barcodeExists']);
        return;
      }
    }
    const id = await saveFood(db, isNew ? null : params.id, draft);
    allowLeave();
    if (isNew) router.replace({ pathname: '/nutrition/food/[id]', params: { id, ...targetParams(day, target) } });
    else router.back();
  }

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: isNew ? t('nutrition.edit.titleNew') : t('nutrition.edit.titleEdit') }} />
      <Card>
        <Field
          label={t('nutrition.edit.name')}
          placeholder={t('nutrition.edit.namePlaceholder')}
          value={form.name}
          onChangeText={(v) => set('name', v)}
        />
        <Field label={t('nutrition.edit.brand')} value={form.brand} onChangeText={(v) => set('brand', v)} />
        <Choice
          label={t('nutrition.edit.prep')}
          options={['keine', ...PREPS] as const}
          value={form.prep}
          onChange={(v) => set('prep', v)}
          format={(v) => (v === 'keine' ? t('nutrition.edit.prepNone') : t(`nutrition.food.prep.${v}`))}
        />
        <Field
          label={t('nutrition.edit.barcode')}
          value={form.barcode}
          onChangeText={(v) => set('barcode', v.replace(/\D/g, ''))}
          keyboardType="number-pad"
        />
      </Card>

      <Card>
        <Choice
          label={t('nutrition.edit.basis')}
          options={['g', 'ml'] as const}
          value={form.basis}
          onChange={(v) => set('basis', v)}
          format={(v) => t(`nutrition.edit.basisOption.${v}`)}
        />
        <View style={styles.grid}>
          {NUTRIENT_FIELDS.map((key) => (
            <Field
              key={key}
              label={key === 'kcal' ? 'kcal' : `${t(`nutrition.${key}`)} (g)`}
              value={form[key]}
              onChangeText={(v) => set(key, v)}
              keyboardType="decimal-pad"
              placeholder={t('nutrition.unknown')}
              style={styles.cell}
            />
          ))}
        </View>
        <Field
          label={`${t('nutrition.edit.serving')} (${form.basis})`}
          value={form.serving}
          onChangeText={(v) => set('serving', v)}
          keyboardType="decimal-pad"
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.edit.hint')}
        </ThemedText>
      </Card>

      <Card>
        <Choice
          label={t('diet.foodAllergens')}
          options={['unbekannt', 'angegeben'] as const}
          value={form.allergens === null ? 'unbekannt' : 'angegeben'}
          onChange={(v) => set('allergens', v === 'unbekannt' ? null : (form.allergens ?? []))}
          format={(v) => t(`diet.foodAllergensOption.${v}`)}
        />
        {form.allergens !== null ? (
          <MultiChoice
            label={t('diet.foodAllergensHint')}
            options={ALLERGENS}
            value={form.allergens}
            onChange={(v) => set('allergens', v)}
            format={(v) => t(`diet.allergen.${v}`)}
          />
        ) : null}
      </Card>

      {problems.length > 0 ? (
        <Card>
          {problems.map((p) => (
            <ThemedText key={p} style={{ color: theme.danger }}>
              {t(`nutrition.edit.problems.${p}`)}
            </ThemedText>
          ))}
        </Card>
      ) : null}
      <Button label={t('common.save')} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cell: { flexBasis: '45%', flexGrow: 1, minWidth: 0 },
});
