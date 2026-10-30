import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { DietNotice } from '@/components/diet-notice';
import { Choice, Field } from '@/components/fields';
import { foodTitle } from '@/components/food-title';
import { readTarget, targetParams, whenFor, type TargetParams } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import {
  DEFAULT_SETTINGS,
  factsForFoods,
  foodFacts,
  listRecipes,
  listTemplates,
  loadNutritionSettings,
  logFood,
  logRecipe,
  logTemplate,
  logWater,
  recipeFacts,
  searchFoods,
  type Food,
  type MealTemplate,
  type RecipeSummary,
} from '@/data/nutrition';
import { useDb } from '@/data/store-provider';
import type { FoodFacts } from '@/domain/diet';
import { guessDrinkType, isPlainWater, matchScore, MAX_FOOD_TEXT, parseFoodText, resolveAmount, type FoodTextItem } from '@/domain/food-text';
import { parseAmount } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

/** Was gebucht wird: Lebensmittel (Menge in g/ml), Rezept (Portionen oder g), Vorlage (komplett) oder Wasser (ml). */
type Candidate = {
  key: string;
  label: string;
  food: Food | null;
  recipe: RecipeSummary | null;
  template: MealTemplate | null;
  water: boolean;
  facts: FoodFacts | null;
};
type Row = { item: FoodTextItem; candidates: Candidate[]; choice: string; amount: string };

const SKIP = 'skip';
const WATER: Candidate = { key: 'wasser', label: '', food: null, recipe: null, template: null, water: true, facts: null };

/** Bis zu 3 passende eigene Lebensmittel, Rezepte oder Vorlagen je Teil, bester Treffer zuerst. */
async function findCandidates(db: Db, item: FoodTextItem, templates: MealTemplate[], recipes: RecipeSummary[]): Promise<Candidate[]> {
  if (isPlainWater(item.name)) return [{ ...WATER, label: t('foodText.water') }];
  const words = [item.name, ...item.name.split(' ').filter((w) => w.length >= 4)];
  const foods = new Map<string, Food>();
  for (const word of words) for (const f of await searchFoods(db, word, 10)) foods.set(f.id, f);
  const none = { food: null, recipe: null, template: null, water: false };
  const scored: { score: number; c: Candidate }[] = [
    ...[...foods.values()].map((f) => ({
      score: matchScore(item.name, f.name) + (f.favorite ? 0.5 : 0),
      c: { ...none, key: `food:${f.id}`, label: foodTitle(f), food: f, facts: foodFacts(f) },
    })),
    ...recipes.map((r) => ({
      score: matchScore(item.name, r.name) + 0.3,
      c: { ...none, key: `rez:${r.versionId}`, label: t('foodText.recipe', { name: r.name }), recipe: r, facts: null },
    })),
    ...templates.map((tpl) => ({
      score: matchScore(item.name, tpl.name) + 0.25,
      c: { ...none, key: `tpl:${tpl.id}`, label: t('foodText.template', { name: tpl.name }), template: tpl, facts: null },
    })),
  ]
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score || a.c.label.localeCompare(b.c.label));
  const best = scored.slice(0, 3).map((x) => x.c);
  // Allergene von Rezepten/Vorlagen aus den Zutaten (COACH-009).
  for (const c of best) {
    if (c.recipe) c.facts = await recipeFacts(db, c.recipe.versionId);
    if (c.template) c.facts = await factsForFoods(db, c.template.items.map((i) => i.foodId));
  }
  return best;
}

/** Einheit des Mengenfelds: g/ml beim Lebensmittel, Portionen oder g beim Rezept, ml beim Wasser. */
function amountUnit(c: Candidate): string | null {
  if (c.food) return c.food.basis;
  if (c.recipe) return c.recipe.portions ? t('foodText.portions') : 'g';
  if (c.water) return 'ml';
  return null;
}

function amountFor(item: FoodTextItem, c: Candidate | undefined): string {
  if (!c) return '';
  if (c.food) {
    const resolved = resolveAmount(item, c.food);
    return resolved === null ? '' : formatNumber(resolved);
  }
  if (c.recipe?.portions) {
    const fromText = item.amount !== null && (item.unit === null || item.unit === 'portion' || item.unit === 'stueck');
    return formatNumber(fromText ? (item.amount as number) : 1);
  }
  if (c.recipe) return item.unit === 'g' && item.amount ? formatNumber(item.amount) : '';
  if (c.water) return item.unit === 'ml' && item.amount ? formatNumber(item.amount) : '';
  return '';
}

/** Essen in eigenen Worten (Phase 9.5, FOOD-014): erkennen, prüfen, erst dann buchen. */
export default function FoodTextScreen() {
  const params = useLocalSearchParams<TargetParams>();
  const { day, target } = readTarget(params);
  const db = useDb();
  const theme = useTheme();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Allergien/Ernährungsweise: Hinweis auch hier, bevor gebucht wird (COACH-009).
  const { data: settings } = useLoad(loadNutritionSettings, DEFAULT_SETTINGS);
  const meal = target.kind === 'essen' ? target.meal : 'snack';

  async function read() {
    const items = parseFoodText(text);
    setProblem(null);
    if (items.length === 0) {
      setRows([]);
      return;
    }
    const [templates, recipes] = await Promise.all([listTemplates(db), listRecipes(db)]);
    const next: Row[] = [];
    for (const item of items) {
      const candidates = await findCandidates(db, item, templates, recipes);
      next.push({ item, candidates, choice: candidates[0]?.key ?? SKIP, amount: amountFor(item, candidates[0]) });
    }
    setRows(next);
  }

  function update(index: number, change: Partial<Row>) {
    setProblem(null);
    setRows((r) => (r ? r.map((row, i) => (i === index ? { ...row, ...change } : row)) : r));
  }

  const chosen = (rows ?? []).filter((r) => r.choice !== SKIP);
  const candidateOf = (row: Row) => row.candidates.find((c) => c.key === row.choice);

  async function confirm() {
    if (!rows) return;
    // Erst alles prüfen, dann buchen – keine halben Buchungen bei einem Tippfehler.
    for (const row of chosen) {
      const c = candidateOf(row);
      if (c && amountUnit(c) !== null && (parseAmount(row.amount) ?? 0) <= 0) {
        setProblem(t('foodText.invalidAmount'));
        return;
      }
    }
    const when = whenFor(day);
    for (const row of chosen) {
      const c = candidateOf(row);
      const amount = parseAmount(row.amount) ?? 0;
      if (c?.food) {
        // Getränke (pro 100 ml) zählen auch in der Trinkübersicht – ein Eintrag für beide Ansichten (TIME-005).
        const drinkTarget = c.food.basis === 'ml' ? ({ kind: 'getraenk', drinkType: guessDrinkType(c.food.name) } as const) : null;
        await logFood(db, c.food.id, amount, drinkTarget ?? { kind: 'essen', meal }, when);
      } else if (c?.recipe) {
        await logRecipe(db, c.recipe.versionId, c.recipe.portions ? { portions: amount } : { grams: amount }, meal, when);
      } else if (c?.template) {
        await logTemplate(db, c.template.id, meal, when);
      } else if (c?.water) {
        await logWater(db, amount, when, t('foodText.water'));
      }
    }
    router.dismissTo('/nutrition');
  }

  return (
    <Screen withHeader>
      <Card>
        <Field
          label={t('foodText.label')}
          placeholder={t('foodText.placeholder')}
          value={text}
          onChangeText={(v) => {
            setText(v);
            setRows(null);
          }}
          maxLength={MAX_FOOD_TEXT}
          multiline
          autoFocus
        />
        <Button label={t('foodText.read')} onPress={read} disabled={!text.trim()} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('foodText.hint')}
        </ThemedText>
      </Card>

      {rows && rows.length === 0 ? <ThemedText>{t('foodText.nothing')}</ThemedText> : null}

      {(rows ?? []).map((row, index) => {
        const candidate = candidateOf(row);
        const unit = candidate ? amountUnit(candidate) : null;
        const typed = row.item.unit ? t(`foodText.units.${row.item.unit}`) : null;
        return (
          <Card key={index} title={t('foodText.item', { raw: row.item.raw })}>
            {row.candidates.length === 0 ? (
              <>
                <ThemedText type="small">{t('foodText.noMatch')}</ThemedText>
                <Button
                  label={t('foodText.search')}
                  variant="danger"
                  onPress={() => router.push({ pathname: '/nutrition/add', params: { ...targetParams(day, target), q: row.item.name } })}
                />
              </>
            ) : (
              <Choice
                label={t('foodText.use')}
                options={[...row.candidates.map((c) => c.key), SKIP]}
                value={row.choice}
                onChange={(choice) => update(index, { choice, amount: amountFor(row.item, row.candidates.find((c) => c.key === choice)) })}
                format={(key) => (key === SKIP ? t('foodText.skip') : (row.candidates.find((c) => c.key === key)?.label ?? key))}
              />
            )}
            {candidate?.facts ? <DietNotice facts={candidate.facts} prefs={settings} /> : null}
            {candidate?.food?.basis === 'ml' ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('foodText.asDrink')}
              </ThemedText>
            ) : null}
            {unit ? (
              <>
                <Field
                  label={t('foodText.amount', { unit })}
                  value={row.amount}
                  onChangeText={(amount) => update(index, { amount })}
                  keyboardType="decimal-pad"
                />
                {row.amount === '' && typed ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('foodText.amountNeeded', { unit: typed })}
                  </ThemedText>
                ) : null}
              </>
            ) : null}
          </Card>
        );
      })}

      {problem ? <ThemedText style={{ color: theme.danger }}>{problem}</ThemedText> : null}
      {rows && chosen.length > 0 ? <Button label={t('foodText.confirm', { count: chosen.length })} onPress={confirm} /> : null}
    </Screen>
  );
}
