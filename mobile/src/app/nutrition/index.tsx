import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { Field, ListRow, Presets } from '@/components/fields';
import { foodTitle } from '@/components/food-title';
import { formatAmount, formatKcal, formatKcalSum, macroSumLine, todayDay, whenFor } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { calorieGoalOn } from '@/data/goals';
import {
  copyMeal,
  DEFAULT_SETTINGS,
  listDay,
  loadNutritionSettings,
  logWater,
  saveTemplateFromMeal,
  type ConsumptionEvent,
} from '@/data/nutrition';
import { drinkTotals, MEALS, shiftDay, sumNutrients, type Meal } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

async function loadDiary(db: Db, day: string) {
  const [events, settings, goal] = await Promise.all([listDay(db, day), loadNutritionSettings(db), calorieGoalOn(db, day)]);
  return { events, settings, goal: goal?.kcal ?? null, estimated: goal?.source === 'rechner' };
}

export default function DiaryScreen() {
  const theme = useTheme();
  const [day, setDay] = useState(todayDay);
  // App über Mitternacht offen: Wer „Heute“ angesehen hat, sieht nach dem Zurückkehren den neuen Tag.
  const shownToday = useRef(todayDay());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const now = todayDay();
      if (state !== 'active' || now === shownToday.current) return;
      const previous = shownToday.current;
      shownToday.current = now;
      setDay((d) => (d === previous ? now : d));
    });
    return () => sub.remove();
  }, []);
  const { data, reload, db } = useLoad((d) => loadDiary(d, day), { events: [] as ConsumptionEvent[], settings: DEFAULT_SETTINGS, goal: null as number | null, estimated: false }, day);
  const { events, settings, goal, estimated } = data;
  const hide = settings.hideNumbers;

  // Hinweise pro Mahlzeit (z. B. „3 Einträge kopiert“) und offenes Vorlagen-Formular.
  const [notice, setNotice] = useState<{ meal: Meal; text: string } | null>(null);
  const [templateFor, setTemplateFor] = useState<Meal | null>(null);
  const [templateName, setTemplateName] = useState('');

  // Kalorienhaltige Getränke zählen bei den Kalorien mit – derselbe Eintrag, einmal gezählt (TIME-005).
  const sums = sumNutrients(events);
  const drinks = events.filter((e) => e.kind === 'getraenk');
  const { waterMl, allMl } = drinkTotals(drinks);
  const left = goal === null ? null : goal - sums.values.kcal;

  function changeDay(next: string) {
    setDay(next);
    setNotice(null);
    setTemplateFor(null);
  }

  async function copyFromPreviousDay(meal: Meal) {
    const count = await copyMeal(db, shiftDay(day, -1), meal, whenFor(day));
    setNotice({ meal, text: count > 0 ? t('nutrition.copied', { count }) : t('nutrition.copyNone') });
    await reload();
  }

  async function saveTemplate(meal: Meal) {
    if (!templateName.trim()) return;
    await saveTemplateFromMeal(db, templateName, day, meal);
    setTemplateFor(null);
    setTemplateName('');
    setNotice({ meal, text: t('nutrition.templateSaved') });
  }

  async function addWater(ml: number) {
    await logWater(db, ml, whenFor(day), t('nutrition.water'));
    await reload();
  }

  const entryRow = (e: ConsumptionEvent) => (
    <ListRow
      key={e.id}
      title={foodTitle(e)}
      subtitle={hide ? formatAmount(e.amount, e.unit) : `${formatAmount(e.amount, e.unit)} · ${formatKcal(e.kcal)}`}
      accessory="›"
      onPress={() => router.push(`/nutrition/entry/${e.id}`)}
    />
  );

  return (
    <Screen title={t('nutrition.title')}>
      <DaySwitcher day={day} onChange={changeDay} />
      <View style={styles.links}>
        <Button label={t('nutrition.weekLink')} variant="danger" onPress={() => router.push({ pathname: '/nutrition/week', params: { day } })} />
        <Button label={t('nutrition.recipesLink')} variant="danger" onPress={() => router.push('/nutrition/recipes')} />
        <Button label={t('nutrition.settingsLink')} variant="danger" onPress={() => router.push('/nutrition/settings')} />
      </View>

      <Card title={t('nutrition.summary.title')}>
        {events.length === 0 ? (
          <ThemedText themeColor="textSecondary">{t('nutrition.summary.empty')}</ThemedText>
        ) : hide ? (
          <ThemedText>{t('nutrition.summary.hidden', { count: events.length })}</ThemedText>
        ) : (
          <>
            <View style={styles.numbers}>
              <Stat label={t('nutrition.summary.eaten')} value={formatKcalSum(sums)} />
              <Stat label={t('nutrition.summary.goal')} value={goal === null ? '–' : formatKcal(goal)} />
              {/* Fehlen Werte, ist „übrig“ höchstens so viel (≤). */}
              <Stat
                label={left !== null && left < 0 ? t('nutrition.summary.over') : t('nutrition.summary.left')}
                value={left === null ? '–' : `${sums.unknown.kcal > 0 && left >= 0 ? '≤ ' : sums.unknown.kcal > 0 ? '≥ ' : ''}${formatKcal(Math.abs(left))}`}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {macroSumLine(sums)}
            </ThemedText>
          </>
        )}
        {sums.unknown.kcal > 0 ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {t('nutrition.summary.incomplete', { count: sums.unknown.kcal })}
          </ThemedText>
        ) : null}
        {!hide && goal === null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('nutrition.summary.noGoal')}
          </ThemedText>
        ) : null}
        {!hide && goal !== null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {estimated ? `${t('nutrition.summary.estimated')} ` : ''}
            {t('nutrition.summary.training')}
          </ThemedText>
        ) : null}
      </Card>

      {MEALS.map((meal) => {
        const items = events.filter((e) => e.kind === 'essen' && e.meal === meal);
        const mealKcal = sumNutrients(items);
        const title =
          hide || items.length === 0
            ? t(`nutrition.meals.${meal}`)
            : `${t(`nutrition.meals.${meal}`)} · ${formatKcalSum(mealKcal)}`;
        return (
          <Card key={meal} title={title}>
            {items.map(entryRow)}
            <View style={styles.links}>
              <Button label={t('nutrition.add')} onPress={() => router.push({ pathname: '/nutrition/add', params: { day, meal } })} />
              {items.length === 0 ? (
                <Button label={t('nutrition.copyYesterday')} variant="danger" onPress={() => copyFromPreviousDay(meal)} />
              ) : null}
              {items.some((e) => e.foodId) && templateFor !== meal ? (
                <Button label={t('nutrition.saveTemplate')} variant="danger" onPress={() => setTemplateFor(meal)} />
              ) : null}
            </View>
            {templateFor === meal ? (
              <View style={styles.templateRow}>
                <Field
                  label={t('nutrition.templateName')}
                  placeholder={t('nutrition.templatePlaceholder')}
                  value={templateName}
                  onChangeText={setTemplateName}
                  style={styles.flex}
                />
                <Button label={t('common.save')} onPress={() => saveTemplate(meal)} />
                <Button label={t('common.cancel')} variant="danger" onPress={() => setTemplateFor(null)} />
              </View>
            ) : null}
            {notice?.meal === meal ? <ThemedText type="small">{notice.text}</ThemedText> : null}
          </Card>
        );
      })}

      <Card title={t('nutrition.drinks.title')}>
        <ThemedText>
          {settings.drinkGoalMl
            ? t('nutrition.drinks.progress', { all: formatNumber(allMl, 0), goal: formatNumber(settings.drinkGoalMl, 0) })
            : t('nutrition.drinks.progressNoGoal', { all: formatNumber(allMl, 0) })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.drinks.water', { water: formatNumber(waterMl, 0) })}
        </ThemedText>
        {/* Ziel erreicht: nur feststellen, nicht zum Weitertrinken auffordern (TIME-012). */}
        {settings.drinkGoalMl && allMl >= settings.drinkGoalMl ? <ThemedText type="smallBold">{t('nutrition.drinks.reached')}</ThemedText> : null}
        {drinks.map(entryRow)}
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.drinks.quick')}
        </ThemedText>
        <Presets
          label={t('nutrition.water')}
          options={settings.glassSizes}
          onChange={addWater}
          format={(ml) => t('nutrition.drinks.addGlass', { ml })}
        />
        <Button
          label={t('nutrition.drinks.other')}
          variant="danger"
          onPress={() => router.push({ pathname: '/nutrition/add', params: { day, drink: 'sonstiges' } })}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.drinks.basis')}
        </ThemedText>
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  numbers: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, gap: Spacing.half },
  templateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 160 },
});
