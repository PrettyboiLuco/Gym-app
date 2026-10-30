import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, Field } from '@/components/fields';
import { foodTitle } from '@/components/food-title';
import { readTarget, targetParams, whenFor, type TargetParams } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { DietNotice } from '@/components/diet-notice';
import {
  DEFAULT_SETTINGS,
  foodFacts,
  listTemplates,
  loadNutritionSettings,
  logFood,
  logTemplate,
  searchFoods,
  type Food,
  type MealTemplate,
} from '@/data/nutrition';
import { useDb } from '@/data/store-provider';
import { matchScore, MAX_FOOD_TEXT, parseFoodText, resolveAmount, type FoodTextItem } from '@/domain/food-text';
import { formatNumber, t } from '@/i18n';
import { parseAmount } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';

type Candidate = { key: string; label: string; food: Food | null; template: MealTemplate | null };
type Row = { item: FoodTextItem; candidates: Candidate[]; choice: string; amount: string };

const SKIP = 'skip';

/** Bis zu 3 passende eigene Lebensmittel oder Vorlagen je Teil, bester Treffer zuerst. */
async function findCandidates(db: Db, item: FoodTextItem, templates: MealTemplate[]): Promise<Candidate[]> {
  const words = [item.name, ...item.name.split(' ').filter((w) => w.length >= 4)];
  const foods = new Map<string, Food>();
  for (const word of words) for (const f of await searchFoods(db, word, 10)) foods.set(f.id, f);
  const scored = [
    ...[...foods.values()].map((f) => ({ score: matchScore(item.name, f.name) + (f.favorite ? 0.5 : 0), c: { key: `food:${f.id}`, label: foodTitle(f), food: f, template: null } })),
    ...templates.map((tpl) => ({ score: matchScore(item.name, tpl.name) + 0.25, c: { key: `tpl:${tpl.id}`, label: t('foodText.template', { name: tpl.name }), food: null, template: tpl } })),
  ]
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score || a.c.label.localeCompare(b.c.label));
  return scored.slice(0, 3).map((x) => x.c);
}

function amountFor(row: Pick<Row, 'item'>, candidate: Candidate | undefined): string {
  if (!candidate?.food) return '';
  const resolved = resolveAmount(row.item, candidate.food);
  return resolved === null ? '' : formatNumber(resolved);
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

  async function read() {
    const items = parseFoodText(text);
    setProblem(null);
    if (items.length === 0) {
      setRows([]);
      return;
    }
    const templates = await listTemplates(db);
    const next: Row[] = [];
    for (const item of items) {
      const candidates = await findCandidates(db, item, templates);
      const choice = candidates[0]?.key ?? SKIP;
      next.push({ item, candidates, choice, amount: amountFor({ item }, candidates[0]) });
    }
    setRows(next);
  }

  function update(index: number, change: Partial<Row>) {
    setProblem(null);
    setRows((r) => (r ? r.map((row, i) => (i === index ? { ...row, ...change } : row)) : r));
  }

  const chosen = (rows ?? []).filter((r) => r.choice !== SKIP);

  async function confirm() {
    if (!rows || target.kind !== 'essen') return;
    // Erst alles prüfen, dann buchen – keine halben Buchungen bei einem Tippfehler.
    for (const row of chosen) {
      const candidate = row.candidates.find((c) => c.key === row.choice);
      if (candidate?.food && (parseAmount(row.amount) ?? 0) <= 0) {
        setProblem(t('foodText.invalidAmount'));
        return;
      }
    }
    const when = whenFor(day);
    for (const row of chosen) {
      const candidate = row.candidates.find((c) => c.key === row.choice);
      if (candidate?.food) await logFood(db, candidate.food.id, parseAmount(row.amount)!, target, when);
      else if (candidate?.template) await logTemplate(db, candidate.template.id, target.meal, when);
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
        const candidate = row.candidates.find((c) => c.key === row.choice);
        const unit = row.item.unit ? t(`foodText.units.${row.item.unit}`) : null;
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
                onChange={(choice) =>
                  update(index, { choice, amount: amountFor(row, row.candidates.find((c) => c.key === choice)) })
                }
                format={(key) => (key === SKIP ? t('foodText.skip') : (row.candidates.find((c) => c.key === key)?.label ?? key))}
              />
            )}
            {candidate?.food ? (
              <>
                <DietNotice facts={foodFacts(candidate.food)} prefs={settings} />
                <Field
                  label={t('foodText.amount', { unit: candidate.food.basis })}
                  value={row.amount}
                  onChangeText={(amount) => update(index, { amount })}
                  keyboardType="decimal-pad"
                />
                {row.amount === '' && unit ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('foodText.amountNeeded', { unit })}
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
