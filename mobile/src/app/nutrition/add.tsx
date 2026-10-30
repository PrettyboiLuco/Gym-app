import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { ConfirmButton, Field, ListRow } from '@/components/fields';
import { foodTitle } from '@/components/food-title';
import { formatKcal, readTarget, targetParams, whenFor, type TargetParams } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import {
  DEFAULT_SETTINGS,
  deleteTemplate,
  factsForFoods,
  findFoodByBarcode,
  foodFacts,
  recipeFacts,
  loadNutritionSettings,
  listFavoriteFoods,
  listRecipes,
  listTemplates,
  recentFoods,
  saveFood,
  searchFoods,
  logTemplate,
  type Food,
  type MealTemplate,
  type RecipeSummary,
} from '@/data/nutrition';
import { searchProducts, type OffError } from '@/data/off';
import { dietCheck, needsAttention, type FoodFacts } from '@/domain/diet';
import type { FoodDraft } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

async function loadAdd(db: Db, query: string) {
  if (query.trim()) {
    return { results: await searchFoods(db, query), favorites: [], recent: [], templates: [], recipes: [], facts: {} };
  }
  const [favorites, recent, templates, recipes] = await Promise.all([
    listFavoriteFoods(db),
    recentFoods(db),
    listTemplates(db),
    listRecipes(db),
  ]);
  // Allergene von Vorlagen und Rezepten aus den Zutaten, für das Warnzeichen (COACH-009).
  const facts: Record<string, FoodFacts> = {};
  for (const tpl of templates) facts[tpl.id] = await factsForFoods(db, tpl.items.map((i) => i.foodId));
  for (const r of recipes) facts[r.versionId] = await recipeFacts(db, r.versionId);
  return { results: [] as Food[], favorites, recent, templates, recipes, facts };
}

const EMPTY = {
  results: [] as Food[],
  favorites: [] as Food[],
  recent: [] as Food[],
  templates: [] as MealTemplate[],
  recipes: [] as RecipeSummary[],
  facts: {} as Record<string, FoodFacts>,
};

export default function AddScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<TargetParams & { q?: string }>();
  const { day, target } = readTarget(params);
  const passOn = targetParams(day, target);
  // Allergien/Ernährungsweise: Warnzeichen in den Listen (COACH-009).
  const { data: settings } = useLoad(loadNutritionSettings, DEFAULT_SETTINGS);
  const warn = (facts: Parameters<typeof dietCheck>[0]) => (needsAttention(dietCheck(facts, settings)) ? `${t('diet.attention')} ` : '');
  // `q`: Suchbegriff aus „In eigenen Worten“, wenn dort nichts gefunden wurde.
  const [query, setQuery] = useState(params.q ?? '');
  const { data, reload, db, loaded } = useLoad((d) => loadAdd(d, query), EMPTY, query);

  // Online-Suche nur auf ausdrücklichen Knopfdruck (FOOD-003, eigene Limits in data/off.ts).
  const [online, setOnline] = useState<{ query: string; drafts: FoodDraft[] } | null>(null);
  const [onlineError, setOnlineError] = useState<OffError | null>(null);
  const [searching, setSearching] = useState(false);

  function openFood(id: string) {
    router.push({ pathname: '/nutrition/food/[id]', params: { id, ...passOn } });
  }

  async function searchOnline() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setOnlineError(null);
    const res = await searchProducts(q);
    setSearching(false);
    if (res.ok) setOnline({ query: q, drafts: res.value });
    else setOnlineError(res.error);
  }

  async function pickOnline(draft: FoodDraft) {
    // Gleicher Barcode = gleiches Produkt; gleicher Name allein nicht (FOOD-018).
    const existing = draft.barcode ? await findFoodByBarcode(db, draft.barcode) : null;
    openFood(existing ? existing.id : await saveFood(db, null, draft, 'off'));
  }

  async function applyTemplate(id: string) {
    if (target.kind !== 'essen') return;
    await logTemplate(db, id, target.meal, whenFor(day));
    router.dismissTo('/nutrition');
  }

  async function removeTemplate(id: string) {
    await deleteTemplate(db, id);
    await reload();
  }

  const foodRow = (f: Food) => (
    <ListRow
      key={f.id}
      title={`${warn(foodFacts(f))}${foodTitle(f)}`}
      subtitle={`${formatKcal(f.kcal)} / 100 ${f.basis}`}
      accessory={f.favorite ? '★' : '›'}
      onPress={() => openFood(f.id)}
    />
  );

  const showOnline = online && online.query === query.trim();
  const isEmptyStart = loaded && !query.trim() && data.favorites.length === 0 && data.recent.length === 0;

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: target.kind === 'getraenk' ? t('nutrition.search.titleDrink') : t('nutrition.search.title') }} />
      <Field
        label={t('nutrition.search.label')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={searchOnline}
      />
      <View style={styles.row}>
        <Button label={t('nutrition.search.scan')} onPress={() => router.push({ pathname: '/nutrition/scan', params: passOn })} />
        <Button
          label={t('nutrition.search.create')}
          variant="danger"
          onPress={() => router.push({ pathname: '/nutrition/food-edit/[id]', params: { id: 'neu', name: query.trim(), ...passOn } })}
        />
      </View>

      {target.kind === 'essen' ? (
        <ListRow
          title={t('foodText.open')}
          subtitle={t('foodText.openHint')}
          accessory="›"
          onPress={() => router.push({ pathname: '/nutrition/text', params: passOn })}
        />
      ) : null}

      {query.trim() ? (
        <>
          <Card title={t('nutrition.search.local')}>
            {data.results.length === 0 ? (
              <ThemedText themeColor="textSecondary">{t('nutrition.search.localEmpty')}</ThemedText>
            ) : (
              data.results.map(foodRow)
            )}
          </Card>
          <Card>
            <Button label={searching ? '…' : t('nutrition.search.online')} onPress={searchOnline} disabled={searching} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('nutrition.search.onlineHint')}
            </ThemedText>
            {onlineError ? <ThemedText style={{ color: theme.danger }}>{t(`nutrition.errors.${onlineError}`)}</ThemedText> : null}
          </Card>
          {showOnline ? (
            <Card title={t('nutrition.search.onlineResults')}>
              {online.drafts.length === 0 ? (
                <ThemedText themeColor="textSecondary">{t('nutrition.search.onlineEmpty')}</ThemedText>
              ) : (
                online.drafts.map((d, i) => (
                  <ListRow
                    key={`${d.barcode}-${i}`}
                    title={`${warn({ allergens: d.allergens ?? null, traces: d.traces ?? null, diet: d.diet ?? null })}${foodTitle(d)}`}
                    subtitle={`${formatKcal(d.per100.kcal)} / 100 ${d.basis}`}
                    accessory="›"
                    onPress={() => pickOnline(d)}
                  />
                ))
              )}
            </Card>
          ) : null}
        </>
      ) : (
        <>
          {isEmptyStart ? <ThemedText themeColor="textSecondary">{t('nutrition.search.emptyStart')}</ThemedText> : null}
          {data.favorites.length > 0 ? <Card title={t('nutrition.search.favorites')}>{data.favorites.map(foodRow)}</Card> : null}
          {data.recent.length > 0 ? <Card title={t('nutrition.search.recent')}>{data.recent.map(foodRow)}</Card> : null}
          {target.kind === 'essen' && data.templates.length > 0 ? (
            <Card title={t('nutrition.search.templates')}>
              {data.templates.map((tpl) => (
                <View key={tpl.id} style={styles.template}>
                  <ListRow
                    title={`${data.facts[tpl.id] ? warn(data.facts[tpl.id]) : ''}${tpl.name}`}
                    subtitle={tpl.items.map((i) => i.name).join(', ')}
                    accessory={t('nutrition.add')}
                    onPress={() => applyTemplate(tpl.id)}
                  />
                  <ConfirmButton label={t('common.delete')} onConfirm={() => removeTemplate(tpl.id)} />
                </View>
              ))}
            </Card>
          ) : null}
          {target.kind === 'essen' && data.recipes.length > 0 ? (
            <Card title={t('nutrition.search.recipes')}>
              {data.recipes.map((r) => (
                <ListRow
                  key={r.versionId}
                  title={`${data.facts[r.versionId] ? warn(data.facts[r.versionId]) : ''}${r.name}`}
                  subtitle={t('nutrition.recipe.summary', { kcal: formatKcal(r.total.kcal) })}
                  accessory="›"
                  onPress={() => router.push({ pathname: '/nutrition/recipe-log/[id]', params: { id: r.versionId, ...passOn } })}
                />
              ))}
            </Card>
          ) : null}
          {target.kind === 'essen' ? (
            <Button label={t('nutrition.search.manageRecipes')} variant="danger" onPress={() => router.push('/nutrition/recipes')} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  template: { gap: Spacing.one },
});
