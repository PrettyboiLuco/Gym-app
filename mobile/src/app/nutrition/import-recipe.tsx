import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, Field } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { fetchPage, saveImportedRecipe } from '@/data/meal-plan';
import { searchFoods, type Food } from '@/data/nutrition';
import { parsePortions } from '@/domain/basis-foods';
import { parseAmount } from '@/domain/nutrition';
import { extractRecipe, lineGrams, parseIngredientLine, type IngredientLine } from '@/domain/recipe-import';
import { foodTitle } from '@/format/food-title';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';
import { useDb } from '@/providers/store-provider';

const SKIP = 'weglassen';
type Row = { line: IngredientLine; candidates: Food[]; choice: string; amount: string };

/** Rezept-Import per Link (Ausbauplan A9.4): schema.org-Rezept lesen, Zutaten abgleichen, unklare selbst wählen. */
export default function ImportRecipeScreen() {
  const db = useDb();
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [paste, setPaste] = useState('');
  const [name, setName] = useState('');
  const [portions, setPortions] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function prepare(lines: string[]) {
    const out: Row[] = [];
    for (const raw of lines) {
      const line = parseIngredientLine(raw);
      const candidates = line.name.length >= 2 ? (await searchFoods(db, line.name, 10)).slice(0, 3) : [];
      const first = candidates[0];
      const grams = first ? lineGrams(line, parsePortions(first.portionsJson), first.servingAmount) : null;
      out.push({ line, candidates, choice: first ? first.id : SKIP, amount: grams === null ? '' : formatNumber(grams, 0) });
    }
    setRows(out);
  }

  async function loadLink() {
    setProblem(null);
    setBusy(true);
    try {
      const html = await fetchPage(url.trim());
      const recipe = extractRecipe(html, url.trim());
      if (!recipe) return setProblem(t('recipeImport.noRecipe'));
      setName(recipe.name);
      setPortions(recipe.portions ? String(recipe.portions) : '');
      setSteps(recipe.steps);
      await prepare(recipe.ingredients);
    } catch {
      setProblem(t('recipeImport.loadFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function loadPaste() {
    setProblem(null);
    const lines = paste
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return setProblem(t('recipeImport.pasteEmpty'));
    setSteps([]);
    await prepare(lines);
  }

  function choose(i: number, choice: string) {
    if (!rows) return;
    const row = rows[i];
    const food = row.candidates.find((c) => c.id === choice);
    const grams = food ? lineGrams(row.line, parsePortions(food.portionsJson), food.servingAmount) : null;
    const next = [...rows];
    next[i] = { ...row, choice, amount: grams === null ? row.amount : formatNumber(grams, 0) };
    setRows(next);
  }

  async function save() {
    if (!rows) return;
    const ingredients: { foodId: string; amount: number }[] = [];
    for (const r of rows) {
      if (r.choice === SKIP) continue;
      const amount = parseAmount(r.amount);
      if (amount === null || amount <= 0) return setProblem(t('recipeImport.amountMissing', { line: r.line.raw }));
      ingredients.push({ foodId: r.choice, amount });
    }
    if (!ingredients.length) return setProblem(t('recipeImport.nothingChosen'));
    const p = portions.trim() ? parseAmount(portions) : null;
    setBusy(true);
    try {
      const id = await saveImportedRecipe(db, name, p && p > 0 ? p : null, ingredients);
      showToast(t('recipeImport.saved'));
      router.replace({ pathname: '/nutrition/recipe/[id]', params: { id } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen withHeader>
      <Card title={t('recipeImport.linkTitle')}>
        <Field
          label={t('recipeImport.url')}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://…"
        />
        <Button label={t('recipeImport.load')} disabled={busy || !/^https?:\/\//.test(url.trim())} onPress={loadLink} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('recipeImport.linkHint')}
        </ThemedText>
      </Card>
      <Card title={t('recipeImport.pasteTitle')}>
        <Field label={t('recipeImport.pasteLabel')} value={paste} onChangeText={setPaste} multiline placeholder={'200 g Haferflocken\n2 EL Honig\n1 Banane'} />
        <Button label={t('recipeImport.pasteRead')} variant="secondary" onPress={loadPaste} />
      </Card>
      {problem ? <ThemedText style={{ color: theme.danger }}>{problem}</ThemedText> : null}

      {rows ? (
        <>
          <Card title={t('recipeImport.recipeTitle')}>
            <Field label={t('recipeImport.name')} value={name} onChangeText={setName} />
            <Field label={t('recipeImport.portions')} value={portions} onChangeText={setPortions} keyboardType="decimal-pad" />
            {steps.length ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('recipeImport.stepsFound', { count: steps.length })}
              </ThemedText>
            ) : null}
          </Card>
          <Card title={t('recipeImport.ingredients')}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('recipeImport.matchHint')}
            </ThemedText>
            {rows.map((r, i) => (
              <View key={i} style={styles.row}>
                <ThemedText type="smallBold">{r.line.raw}</ThemedText>
                <Choice
                  label={t('recipeImport.food')}
                  options={[...r.candidates.map((c) => c.id), SKIP]}
                  value={r.choice}
                  onChange={(v) => choose(i, v)}
                  format={(id) => (id === SKIP ? t('recipeImport.skip') : foodTitle(r.candidates.find((c) => c.id === id)!))}
                  chips
                />
                {r.choice !== SKIP ? (
                  <Field
                    label={t('recipeImport.amount', { unit: r.candidates.find((c) => c.id === r.choice)?.basis ?? 'g' })}
                    value={r.amount}
                    onChangeText={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: v } : x)))}
                    keyboardType="decimal-pad"
                  />
                ) : null}
                {r.candidates.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('recipeImport.noMatch')}
                  </ThemedText>
                ) : null}
              </View>
            ))}
          </Card>
          <Button label={t('recipeImport.save')} disabled={busy} onPress={save} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one, paddingVertical: Spacing.two },
});
