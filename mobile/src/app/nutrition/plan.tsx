import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, ItemTools, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { calorieGoalOn } from '@/data/goals';
import { addPlanEntries, cleanEatenLinks, deletePlanEntry, listPlan, logPlanEntry, planNutrients } from '@/data/meal-plan';
import { listRecipes, loadNutritionSettings, type RecipeSummary } from '@/data/nutrition';
import { shiftDay, weekDays, weekStart } from '@/domain/dates';
import { dayTotals, suggestWeek, type PlanEntry } from '@/domain/meal-plan';
import { MEALS, type Nutrients } from '@/domain/nutrition';
import { ALL_BOOK_RECIPES } from '@/domain/recipe-book';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';
import { diaryToday, formatKcal, whenFor } from '@/services/nutrition-format';

async function load(db: Db, monday: string) {
  await cleanEatenLinks(db);
  const days = weekDays(monday);
  const [entries, settings, goals, own] = await Promise.all([
    listPlan(db, days[0], days[6]),
    loadNutritionSettings(db),
    Promise.all(days.map((d) => calorieGoalOn(db, d))),
    listRecipes(db),
  ]);
  const nutrients = await planNutrients(db, entries);
  return { days, entries, settings, goals: goals.map((g) => ({ kcal: g?.kcal ?? null, protein: g?.macros?.protein ?? null })), nutrients, own };
}

/** Wochenplan (Ausbauplan A9.1/A9.2/A9.5): Mahlzeiten auf Tage legen, Vorschlag, Tagessumme gegen Ziel, eintragen. */
export default function PlanScreen() {
  const theme = useTheme();
  // Sonntags plant man meist die kommende Woche.
  const [monday, setMonday] = useState(() => {
    const thisWeek = weekStart(diaryToday());
    return new Date(`${diaryToday()}T12:00:00Z`).getUTCDay() === 0 ? shiftDay(thisWeek, 7) : thisWeek;
  });
  const [snacks, setSnacks] = useState<'ja' | 'nein'>('nein');
  // Eigenes Rezept (z. B. per Link übernommen) auf einen Tag legen
  const [ownFor, setOwnFor] = useState<string | null>(null);
  const [ownMeal, setOwnMeal] = useState<(typeof MEALS)[number]>('mittag');
  const { data, db, loaded, reload } = useLoad(
    (d) => load(d, monday),
    {
      days: [] as string[],
      entries: [] as PlanEntry[],
      settings: null as Awaited<ReturnType<typeof loadNutritionSettings>> | null,
      goals: [] as { kcal: number | null; protein: number | null }[],
      nutrients: new Map<string, Nutrients | null>(),
      own: [] as RecipeSummary[],
    },
    monday
  );
  const hide = data.settings?.hideNumbers ?? false;
  const totals = dayTotals(data.entries, (e) => data.nutrients.get(e.id) ?? null);
  const today = diaryToday();

  async function suggest() {
    if (!data.settings) return;
    const goal = data.goals.find((g) => g.kcal !== null) ?? { kcal: null, protein: null };
    const added = suggestWeek({
      days: data.days.filter((d) => d >= today),
      recipes: ALL_BOOK_RECIPES,
      prefs: { diet: data.settings.diet, allergies: data.settings.allergies },
      goalKcal: goal.kcal,
      goalProtein: goal.protein,
      existing: data.entries,
      snacks: snacks === 'ja',
    });
    await addPlanEntries(db, added);
    showToast(added.length ? t('mealPlan.suggested', { count: added.length }) : t('mealPlan.suggestedNone'));
    await reload();
  }

  async function eat(entry: PlanEntry) {
    try {
      await logPlanEntry(db, entry, whenFor(entry.day));
      showToast(t('mealPlan.logged'));
      await reload();
    } catch {
      showToast(t('mealPlan.logFailed'));
    }
  }

  // Tage mit Einträgen (oder gerade geöffnetem „Eigenes Rezept“) als eigene Karte; freie Tage gesammelt in einer Liste
  // statt sieben gleicher Karten mit „Noch nichts geplant“.
  const isOpenDay = (day: string) => data.entries.some((e) => e.day === day) || ownFor === day;
  const freeDays = data.days.filter((day) => day >= today && !isOpenDay(day));

  function renderDay(day: string, i: number) {
    const list = data.entries.filter((e) => e.day === day);
    // Vergangene Tage ohne Plan nicht zeigen
    if (day < today && list.length === 0) return null;
    const total = totals.get(day);
    const goal = data.goals[i];
    return (
      <Card key={day} title={`${t(`reminders.day.${i + 1}`)}, ${formatDay(day)}`}>
        {MEALS.map((meal) =>
          list
            .filter((e) => e.meal === meal)
            .map((e) => {
              const n = data.nutrients.get(e.id);
              const facts =
                !hide && n?.kcal != null
                  ? ` · ${formatKcal(n.kcal * e.portions)} · ${formatNumber((n.protein ?? 0) * e.portions, 0)} g ${t('mealPlan.protein')}`
                  : '';
              return (
                <View key={e.id} style={styles.entry}>
                  <ThemedText type="small" style={styles.flex}>
                    {`${t(`nutrition.meals.${meal}`)}: ${e.name} (${t('mealPlan.portions', { value: formatNumber(e.portions, 1) })})${facts}`}
                  </ThemedText>
                  {e.eatenEventId ? (
                    <ThemedText type="small" style={{ color: theme.tint }}>
                      {t('mealPlan.eaten')}
                    </ThemedText>
                  ) : (
                    <>
                      {e.day <= today ? <Button label={t('mealPlan.eat')} size="compact" onPress={() => eat(e)} /> : null}
                      <ItemTools
                        name={e.name}
                        reorder={false}
                        onRemove={async () => {
                          await deletePlanEntry(db, e.id);
                          await reload();
                        }}
                      />
                    </>
                  )}
                </View>
              );
            })
        )}
        {list.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('mealPlan.empty')}
          </ThemedText>
        ) : null}
        {!hide && total ? (
          <ThemedText type="small" themeColor="textSecondary">
            {goal.kcal !== null
              ? t('mealPlan.totalGoal', {
                  kcal: formatKcal(Math.round(total.kcal)),
                  goal: formatKcal(goal.kcal),
                  protein: formatNumber(total.protein, 0),
                })
              : t('mealPlan.total', { kcal: formatKcal(Math.round(total.kcal)), protein: formatNumber(total.protein, 0) })}
            {total.unknown ? ` ${t('mealPlan.unknown', { count: total.unknown })}` : ''}
          </ThemedText>
        ) : null}
        <View style={styles.row}>
          <Button
            label={t('mealPlan.add')}
            variant="secondary"
            size="compact"
            onPress={() => router.push({ pathname: '/nutrition/book', params: { planDay: day } })}
          />
          {data.own.length ? (
            <Button label={t('mealPlan.addOwn')} variant="secondary" size="compact" onPress={() => setOwnFor(ownFor === day ? null : day)} />
          ) : null}
        </View>
        {ownFor === day ? (
          <>
            <Choice label={t('nutrition.meal')} options={MEALS} value={ownMeal} onChange={setOwnMeal} format={(m) => t(`book.mealShort.${m}`)} />
            {data.own.map((r) => (
              <ListRow
                key={r.recipeId}
                title={r.name}
                subtitle={r.portions ? t('mealPlan.ownPortions', { count: r.portions }) : t('mealPlan.ownNoPortions')}
                accessory="+"
                onPress={async () => {
                  await addPlanEntries(db, [{ day, meal: ownMeal, source: 'eigen', ref: r.recipeId, name: r.name, portions: 1 }]);
                  setOwnFor(null);
                  await reload();
                }}
              />
            ))}
          </>
        ) : null}
      </Card>
    );
  }

  return (
    <Screen withHeader>
      <Card>
        <View style={styles.row}>
          <Button label="‹" accessibilityLabel={t('mealPlan.prevWeek')} variant="secondary" size="compact" onPress={() => setMonday((m) => shiftDay(m, -7))} />
          <ThemedText type="smallBold" style={styles.flex}>
            {t('mealPlan.week', { from: formatDay(data.days[0] ?? monday), to: formatDay(data.days[6] ?? monday) })}
          </ThemedText>
          <Button label="›" accessibilityLabel={t('mealPlan.nextWeek')} variant="secondary" size="compact" onPress={() => setMonday((m) => shiftDay(m, 7))} />
        </View>
        <Choice
          label={t('mealPlan.snacks')}
          options={['nein', 'ja'] as const}
          value={snacks}
          onChange={setSnacks}
          format={(v) => t(`mealPlan.snacksOption.${v}`)}
        />
        <Button label={t('mealPlan.suggest')} onPress={suggest} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('mealPlan.suggestHint')}
        </ThemedText>
        <ListRow
          icon="list"
          title={t('mealPlan.shopping')}
          accessory="›"
          onPress={() => router.push({ pathname: '/nutrition/shopping', params: { week: monday } })}
        />
        <ListRow
          icon="globe"
          title={t('recipeImport.title')}
          subtitle={t('recipeImport.subtitle')}
          accessory="›"
          last
          onPress={() => router.push('/nutrition/import-recipe')}
        />
      </Card>

      {loaded ? data.days.map((day, i) => (isOpenDay(day) ? renderDay(day, i) : null)) : null}
      {loaded && freeDays.length > 0 ? (
        <Card title={t('mealPlan.freeTitle')}>
          {freeDays.map((day, k) => (
            <View key={day} style={[styles.freeRow, { borderColor: k === freeDays.length - 1 ? 'transparent' : theme.backgroundSelected }]}>
              <ThemedText style={styles.flex}>{`${t(`reminders.day.${data.days.indexOf(day) + 1}`)}, ${formatDay(day)}`}</ThemedText>
              {data.own.length ? <Button label={t('mealPlan.addOwn')} variant="quiet" size="compact" onPress={() => setOwnFor(day)} /> : null}
              <Button
                label={t('mealPlan.add')}
                variant="secondary"
                size="compact"
                onPress={() => router.push({ pathname: '/nutrition/book', params: { planDay: day } })}
              />
            </View>
          ))}
        </Card>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {t('mealPlan.hint')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
});
