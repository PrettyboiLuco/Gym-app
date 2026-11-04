// Lebensmittel bzw. Getränk hinzufügen: Suche (mit Barcode-Knopf im Feld), Mehrfachauswahl, Favoriten und
// „Zuletzt gegessen“ (ein Tipp = mit der Menge vom letzten Mal eintragen), Vorlagen und Rezepte.

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { Button, Card } from '@/components/card';
import { ConfirmButton, ListRow } from '@/components/fields';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Press } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
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
  logItems,
  recentEntries,
  removeEvents,
  saveFood,
  searchFoods,
  logTemplate,
  type EventKind,
  type Food,
  type LogItem,
  type MealTemplate,
  type RecentEntry,
  type RecipeSummary,
} from '@/data/nutrition';
import { searchProducts, type OffError } from '@/data/off';
import { dietCheck, needsAttention, type FoodFacts } from '@/domain/diet';
import type { FoodDraft } from '@/domain/nutrition';
import { foodTitle } from '@/format/food-title';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { formatAmount, formatKcal, readTarget, targetParams, whenFor, type TargetParams } from '@/services/nutrition-format';

/** Menge bei der Mehrfachauswahl: eine Portion, sonst 100 g/ml – danach im Tagebuch änderbar. */
const defaultAmount = (f: Food) => f.servingAmount ?? 100;

async function loadAdd(db: Db, query: string, kind: EventKind) {
  if (query.trim()) {
    return { results: await searchFoods(db, query), favorites: [], recent: [], templates: [], recipes: [], facts: {} };
  }
  const [favorites, recent, templates, recipes] = await Promise.all([listFavoriteFoods(db), recentEntries(db, kind), listTemplates(db), listRecipes(db)]);
  // Allergene von Vorlagen und Rezepten aus den Zutaten, für das Warnzeichen (COACH-009).
  const facts: Record<string, FoodFacts> = {};
  for (const tpl of templates)
    facts[tpl.id] = await factsForFoods(
      db,
      tpl.items.map((i) => i.foodId)
    );
  for (const r of recipes) facts[r.versionId] = await recipeFacts(db, r.versionId);
  return { results: [] as Food[], favorites, recent, templates, recipes, facts };
}

/** Ausgewählt in der Mehrfachauswahl: Lebensmittel (eine Portion bzw. 100 g/ml) oder früherer Eintrag (Menge von damals). */
type Picked = { key: string; name: string; item: LogItem };

/** Strichcode als Symbol für den Scan-Knopf im Suchfeld. */
function BarcodeGlyph({ color }: { color: string }) {
  const bars = [
    [3, 1.6],
    [6, 1],
    [8.4, 2.2],
    [12, 1],
    [14.2, 1.6],
    [17.2, 1],
    [19.4, 1.6],
  ];
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" {...HIDDEN}>
      {bars.map(([x, w]) => (
        <Rect key={x} x={x} y={5} width={w} height={14} rx={0.4} fill={color} />
      ))}
    </Svg>
  );
}

/** Web: kein Browser-Fokusrahmen im Suchfeld – den Fokus zeigt der Rahmen außen (Schriftfarbe). */
const NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;

const EMPTY = {
  results: [] as Food[],
  favorites: [] as Food[],
  recent: [] as RecentEntry[],
  templates: [] as MealTemplate[],
  recipes: [] as RecipeSummary[],
  facts: {} as Record<string, FoodFacts>,
};

export default function AddScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<TargetParams & { q?: string }>();
  const { day, target } = readTarget(params);
  const passOn = targetParams(day, target);
  const when = () => whenFor(day, target.kind === 'essen' ? target.meal : null);
  // Allergien/Ernährungsweise: Warnzeichen in den Listen (COACH-009).
  const { data: settings } = useLoad(loadNutritionSettings, DEFAULT_SETTINGS);
  const hide = settings.hideNumbers;
  const warn = (facts: Parameters<typeof dietCheck>[0]) => (needsAttention(dietCheck(facts, settings)) ? `${t('diet.attention')} ` : '');
  // `q`: Suchbegriff aus „In eigenen Worten“, wenn dort nichts gefunden wurde.
  const [query, setQuery] = useState(params.q ?? '');
  const [focused, setFocused] = useState(false);
  const { data, reload, db, loaded } = useLoad((d) => loadAdd(d, query, target.kind), EMPTY, `${query}|${target.kind}`);

  // Online-Suche nur auf ausdrücklichen Knopfdruck (FOOD-003, eigene Limits in data/off.ts).
  const [online, setOnline] = useState<{ query: string; drafts: FoodDraft[] } | null>(null);
  const [onlineError, setOnlineError] = useState<OffError | null>(null);
  const [searching, setSearching] = useState(false);

  // Mehrfachauswahl (B1, W5): Lebensmittel und zuletzt Gegessenes antippen sammelt sie, „Eintragen“ bucht alle auf einmal.
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [saving, setSaving] = useState(false);

  function togglePick(next: Picked) {
    setPicked((list) => (list.some((p) => p.key === next.key) ? list.filter((p) => p.key !== next.key) : [...list, next]));
  }

  async function logPicked() {
    if (picked.length === 0 || saving) return;
    setSaving(true);
    try {
      await logItems(
        db,
        picked.map((p) => p.item),
        target,
        when()
      );
      router.dismissTo('/nutrition');
    } finally {
      setSaving(false);
    }
  }

  // Ein Tipp auf „Zuletzt gegessen“: gleich eintragen (Menge vom letzten Mal); der Bildschirm bleibt offen für mehr.
  async function logAgain(r: RecentEntry) {
    try {
      const [id] = await logItems(db, [{ eventId: r.eventId }], target, when());
      showToast(
        t('nutrition.search.logged', { name: r.name }),
        id ? { label: t('diary.undo'), hint: t('nutrition.search.undoHint'), onPress: () => undoLog(id) } : undefined
      );
    } catch {
      showToast(t('common.saveFailed'));
    }
  }

  async function undoLog(id: string) {
    try {
      await removeEvents(db, [id]);
      showToast(t('nutrition.search.undone'));
    } catch {
      showToast(t('common.saveFailed'));
    }
  }

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
    await logTemplate(db, id, target.meal, whenFor(day, target.meal));
    router.dismissTo('/nutrition');
  }

  async function removeTemplate(id: string) {
    await deleteTemplate(db, id);
    await reload();
  }

  const checkMark = (isPicked: boolean) => (
    <View
      style={[styles.check, { borderColor: isPicked ? theme.primary : theme.border, backgroundColor: isPicked ? theme.primary : 'transparent' }]}
      accessibilityLabel={isPicked ? t('diary.multi.picked') : t('diary.multi.notPicked')}>
      {isPicked ? <Icon name="check" color={theme.onPrimary} size={14} strokeWidth={2.4} /> : null}
    </View>
  );

  const foodRow = (f: Food) => {
    const key = `f:${f.id}`;
    const amount = defaultAmount(f);
    return (
      <ListRow
        key={f.id}
        title={`${warn(foodFacts(f))}${foodTitle(f)}`}
        subtitle={
          multi
            ? [formatAmount(amount, f.basis), hide ? null : formatKcal(f.kcal === null ? null : (f.kcal * amount) / 100)].filter(Boolean).join(' · ')
            : hide
              ? undefined
              : `${formatKcal(f.kcal)} / 100 ${f.basis}`
        }
        accessory={multi ? undefined : f.favorite ? 'favorite' : '›'}
        trailing={multi ? checkMark(picked.some((p) => p.key === key)) : undefined}
        onPress={() => (multi ? togglePick({ key, name: f.name, item: { foodId: f.id, amount } }) : openFood(f.id))}
      />
    );
  };

  const recentRow = (r: RecentEntry, i: number, all: readonly RecentEntry[]) => {
    const key = `e:${r.eventId}`;
    const subtitle = [formatAmount(r.amount, r.unit), hide ? null : formatKcal(r.kcal)].filter(Boolean).join(' · ');
    return (
      <ListRow
        key={r.eventId}
        title={foodTitle(r)}
        subtitle={subtitle}
        last={i === all.length - 1}
        trailing={multi ? checkMark(picked.some((p) => p.key === key)) : <Icon name="plus" color={theme.textSecondary} size={18} strokeWidth={2} />}
        onPress={() => (multi ? togglePick({ key, name: r.name, item: { eventId: r.eventId } }) : logAgain(r))}
      />
    );
  };

  const showOnline = online && online.query === query.trim();
  const isEmptyStart = loaded && !query.trim() && data.favorites.length === 0 && data.recent.length === 0;
  const recentTitle = target.kind === 'getraenk' ? t('nutrition.search.recentDrink') : t('nutrition.search.recent');

  // Andere Wege einzutragen: Schnelleintrag, in eigenen Worten (nur Essen), neues Lebensmittel.
  const ways = (
    <View>
      {target.kind === 'essen' ? (
        <ListRow
          title={t('quick.open')}
          subtitle={t('quick.openHint')}
          accessory="›"
          onPress={() => router.push({ pathname: '/nutrition/quick', params: passOn })}
        />
      ) : null}
      {target.kind === 'essen' ? (
        <ListRow
          title={t('foodText.open')}
          subtitle={t('foodText.openHint')}
          accessory="›"
          onPress={() => router.push({ pathname: '/nutrition/text', params: passOn })}
        />
      ) : null}
      <ListRow
        title={t('nutrition.search.create')}
        accessory="›"
        last
        onPress={() => router.push({ pathname: '/nutrition/food-edit/[id]', params: { id: 'neu', name: query.trim(), ...passOn } })}
      />
    </View>
  );

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: target.kind === 'getraenk' ? t('nutrition.search.titleDrink') : t('nutrition.search.title') }} />
      <View style={[styles.search, { borderColor: focused ? theme.text : theme.border, backgroundColor: theme.background }]}>
        <Icon name="search" color={theme.textSecondary} size={18} />
        <TextInput
          accessibilityLabel={t('nutrition.search.label')}
          placeholder={t('nutrition.search.placeholder')}
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={searchOnline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.searchInput, NO_OUTLINE, { color: theme.text }]}
        />
        <PressableScale
          scaleTo={Press.button}
          accessibilityRole="button"
          accessibilityLabel={t('nutrition.search.scan')}
          hitSlop={4}
          onPress={() => router.push({ pathname: '/nutrition/scan', params: passOn })}
          style={({ pressed }) => [styles.scan, { backgroundColor: pressed ? theme.border : theme.backgroundSelected }]}>
          <BarcodeGlyph color={theme.text} />
        </PressableScale>
      </View>
      <View style={styles.row}>
        <PressableScale
          scaleTo={Press.button}
          accessibilityRole="switch"
          accessibilityState={{ checked: multi }}
          accessibilityLabel={t('diary.multi.on')}
          onPress={() => {
            haptic.tap();
            setMulti((m) => !m);
            setPicked([]);
          }}
          style={({ pressed }) => [
            styles.toggle,
            multi
              ? { backgroundColor: theme.primary, borderColor: theme.primary }
              : { backgroundColor: pressed ? theme.backgroundSelected : 'transparent', borderColor: theme.border },
          ]}>
          <View style={[styles.toggleBox, { borderColor: multi ? theme.onPrimary : theme.textSecondary }]}>
            {multi ? <Icon name="check" color={theme.onPrimary} size={12} strokeWidth={2.6} /> : null}
          </View>
          <ThemedText type="smallBold" style={{ color: multi ? theme.onPrimary : theme.text }}>
            {t('diary.multi.on')}
          </ThemedText>
        </PressableScale>
      </View>
      {multi ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {picked.length > 0 ? t('diary.multi.list', { names: picked.map((p) => p.name).join(', ') }) : t('diary.multi.hint')}
          </ThemedText>
          <Button
            label={picked.length > 0 ? t('diary.multi.log', { count: picked.length }) : t('diary.multi.pick')}
            disabled={picked.length === 0}
            loading={saving}
            onPress={logPicked}
          />
        </Card>
      ) : null}

      {query.trim() ? (
        <>
          <Card title={t('nutrition.search.local')}>
            {data.results.length === 0 ? <ThemedText themeColor="textSecondary">{t('nutrition.search.localEmpty')}</ThemedText> : data.results.map(foodRow)}
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
          {ways}
        </>
      ) : (
        <>
          {isEmptyStart ? <ThemedText themeColor="textSecondary">{t('nutrition.search.emptyStart')}</ThemedText> : null}
          {data.favorites.length > 0 ? <Card title={t('nutrition.search.favorites')}>{data.favorites.map(foodRow)}</Card> : null}
          {data.recent.length > 0 ? (
            <Card title={recentTitle}>
              {multi ? null : (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('nutrition.search.again')}
                </ThemedText>
              )}
              {data.recent.map(recentRow)}
            </Card>
          ) : null}
          {ways}
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
                  <ConfirmButton label={t('common.delete')} size="compact" onConfirm={() => removeTemplate(tpl.id)} />
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
            <Button label={t('nutrition.search.manageRecipes')} variant="secondary" onPress={() => router.push('/nutrition/recipes')} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: Radius.field,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one + 2,
  },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, fontSize: 16 },
  scan: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 40,
    paddingHorizontal: Spacing.three + Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  toggleBox: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  template: { gap: Spacing.one },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
