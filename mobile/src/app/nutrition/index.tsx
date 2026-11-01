import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { MeterBar } from '@/components/charts';
import { DaySwitcher } from '@/components/day-switcher';
import { Icon } from '@/components/icon';
import { Choice, Field, ListRow, Presets } from '@/components/fields';
import { foodTitle } from '@/format/food-title';
import { diaryToday, extraSumLine, formatAmount, formatKcal, formatKcalSum, macroSumLine, microLine, whenFor } from '@/components/nutrition-format';
import { parseMicros, sumMicros } from '@/domain/basis-foods';
import { showToast } from '@/components/toast';
import { CAFFEINE_DRINKS, type CaffeineDrink } from '@/domain/caffeine';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { calorieGoalOn } from '@/data/goals';
import {
  copyDay,
  isDayIncomplete,
  setDayIncomplete,
  copyMeal,
  DEFAULT_SETTINGS,
  listDay,
  loadNutritionSettings,
  logCaffeineDrink,
  logWater,
  saveTemplateFromMeal,
  type ConsumptionEvent,
} from '@/data/nutrition';
import { shiftDay } from '@/domain/dates';
import { drinkTotals, MEALS, sumNutrients, type Meal } from '@/domain/nutrition';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ALL_BOOK_RECIPES } from '@/domain/recipe-book';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useUnits } from '@/providers/profile-provider';
import { formatNumber, formatVolume, t } from '@/i18n';

async function loadDiary(db: Db, day: string) {
  const [events, settings, goal, incomplete] = await Promise.all([listDay(db, day), loadNutritionSettings(db), calorieGoalOn(db, day), isDayIncomplete(db, day)]);
  return { events, settings, goal: goal?.kcal ?? null, estimated: goal?.source === 'rechner', incomplete };
}

export default function DiaryScreen() {
  const theme = useTheme();
  const units = useUnits();
  const dark = useColorScheme() === 'dark';
  const dataColor = dark ? theme.accent : theme.tint;
  const [day, setDay] = useState(diaryToday);
  // App über Mitternacht offen: Wer „Heute“ angesehen hat, sieht nach dem Zurückkehren den neuen Tag.
  const shownToday = useRef(diaryToday());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const now = diaryToday();
      if (state !== 'active' || now === shownToday.current) return;
      const previous = shownToday.current;
      shownToday.current = now;
      setDay((d) => (d === previous ? now : d));
    });
    return () => sub.remove();
  }, []);
  const { data, reload, db } = useLoad((d) => loadDiary(d, day), { events: [] as ConsumptionEvent[], settings: DEFAULT_SETTINGS, goal: null as number | null, estimated: false, incomplete: false }, day);
  const { events, settings, goal, estimated } = data;
  const hide = settings.hideNumbers;

  // Hinweise pro Mahlzeit (z. B. „3 Einträge kopiert“) und offenes Vorlagen-Formular.
  const [notice, setNotice] = useState<{ meal: Meal; text: string } | null>(null);
  const [templateFor, setTemplateFor] = useState<Meal | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [dayNotice, setDayNotice] = useState<string | null>(null);

  // Kalorienhaltige Getränke zählen bei den Kalorien mit – derselbe Eintrag, einmal gezählt (TIME-005).
  const sums = sumNutrients(events);
  const drinks = events.filter((e) => e.kind === 'getraenk');
  const { waterMl, allMl } = drinkTotals(drinks);
  const left = goal === null ? null : goal - sums.values.kcal;
  const caffeineMg = events.reduce((sum, e) => sum + (e.caffeineMg ?? 0), 0);
  // Vitamine und Mineralstoffe (A4): nur aus Einträgen mit Angaben, Abdeckung wird dazugeschrieben.
  const microSum = sumMicros(events.filter((e) => e.kind === 'essen' || e.microsJson).map((e) => parseMicros(e.microsJson)));
  const [showMicros, setShowMicros] = useState(false);

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

  async function copyWholeDay() {
    const count = await copyDay(db, shiftDay(day, -1), whenFor(day));
    setDayNotice(count > 0 ? t('nutrition.copiedDay', { count }) : t('nutrition.copyDayNone'));
    await reload();
  }

  async function addCaffeine(drink: CaffeineDrink) {
    const name = t(`caffeine.drinks.${drink.id}`);
    await logCaffeineDrink(db, { ...drink, name }, whenFor(day));
    showToast(t('caffeine.saved', { name }));
    await reload();
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

      <Card title={t('nutrition.summary.title')}>
        {events.length === 0 ? (
          <>
            <ThemedText themeColor="textSecondary">{t('nutrition.summary.empty')}</ThemedText>
            {/* Ganzen Vortag übernehmen (A3) – nur für einen leeren Tag, damit nichts doppelt wird. */}
            <Button label={t('nutrition.copyDay')} variant="secondary" onPress={copyWholeDay} />
            {dayNotice ? <ThemedText type="small">{dayNotice}</ThemedText> : null}
          </>
        ) : hide ? (
          <ThemedText>{t('nutrition.summary.hidden', { count: events.length })}</ThemedText>
        ) : (
          <>
            {/* Leitfrage „Wie viel habe ich gegessen, was ist noch offen?“: die gegessene Menge groß,
                darunter der Balken als echter Anteil am Ziel (beide Enden beschriftet). */}
            <View style={styles.big} accessible accessibilityLabel={`${t('nutrition.summary.eaten')} ${formatKcalSum(sums)}${goal !== null ? `, ${t('nutrition.summary.goal')} ${formatKcal(goal)}` : ''}`}>
              <ThemedText style={styles.bigValue}>{formatNumber(sums.values.kcal, 0)}</ThemedText>
              <ThemedText themeColor="textSecondary">{goal !== null ? t('nutrition.summary.ofGoal', { goal: formatNumber(goal, 0) }) : 'kcal'}</ThemedText>
            </View>
            {goal !== null && goal > 0 ? (
              <MeterBar progress={sums.values.kcal / goal} color={left !== null && left < 0 ? theme.danger : dataColor} trackColor={theme.backgroundSelected} height={10} />
            ) : null}
            <View style={styles.numbers}>
              {/* Fehlen Werte, ist „übrig“ höchstens so viel (≤). */}
              <Stat
                label={left !== null && left < 0 ? t('nutrition.summary.over') : t('nutrition.summary.left')}
                value={left === null ? '–' : `${sums.unknown.kcal > 0 && left >= 0 ? '≤ ' : sums.unknown.kcal > 0 ? '≥ ' : ''}${formatKcal(Math.abs(left))}`}
              />
              <Stat label={t('nutrition.summary.goal')} value={goal === null ? '–' : formatKcal(goal)} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {macroSumLine(sums)}
              {extraSumLine(sums) ? `\n${extraSumLine(sums)}` : ''}
            </ThemedText>
            {microSum.known > 0 ? (
              showMicros ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {microLine(microSum.values)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('micros.coverage', { known: microSum.known, total: microSum.total })}
                  </ThemedText>
                  <Button label={t('micros.hide')} variant="secondary" size="compact" onPress={() => setShowMicros(false)} />
                </>
              ) : (
                <Button label={t('micros.show')} variant="secondary" size="compact" onPress={() => setShowMicros(true)} />
              )
            ) : null}
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
        {events.length > 0 ? (
          <Choice
            label={t('adaptive.dayComplete')}
            options={['ja', 'nein'] as const}
            value={data.incomplete ? 'nein' : 'ja'}
            onChange={async (v) => {
              await setDayIncomplete(db, day, v === 'nein');
              await reload();
            }}
            format={(v) => t(`adaptive.dayCompleteOption.${v}`)}
          />
        ) : null}
        {data.incomplete ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('adaptive.dayIncompleteHint')}
          </ThemedText>
        ) : null}
      </Card>

      {MEALS.map((meal) => {
        const items = events.filter((e) => e.kind === 'essen' && e.meal === meal);
        const mealKcal = sumNutrients(items);
        return (
          <Card
            key={meal}
            title={t(`nutrition.meals.${meal}`)}
            trailing={
              !hide && items.length > 0 ? (
                <ThemedText themeColor="textSecondary" style={styles.num}>
                  {formatKcalSum(mealKcal)}
                </ThemedText>
              ) : null
            }>
            {items.map(entryRow)}
            <View style={styles.links}>
              <Button
                label={t('nutrition.add')}
                size="compact"
                icon={<Icon name="plus" color={theme.onPrimary} size={16} strokeWidth={2.2} />}
                onPress={() => router.push({ pathname: '/nutrition/add', params: { day, meal } })}
              />
              {items.length === 0 ? (
                <Button label={t('nutrition.copyYesterday')} variant="secondary" size="compact" onPress={() => copyFromPreviousDay(meal)} />
              ) : null}
              {items.some((e) => e.foodId) && templateFor !== meal ? (
                <Button label={t('nutrition.saveTemplate')} variant="secondary" size="compact" onPress={() => setTemplateFor(meal)} />
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
                <Button label={t('common.cancel')} variant="secondary" onPress={() => setTemplateFor(null)} />
              </View>
            ) : null}
            {notice?.meal === meal ? <ThemedText type="small">{notice.text}</ThemedText> : null}
          </Card>
        );
      })}

      <Card title={t('nutrition.drinks.title')}>
        <ThemedText>
          {settings.drinkGoalMl
            ? t('nutrition.drinks.progress', { all: formatVolume(allMl, units.volume), goal: formatVolume(settings.drinkGoalMl, units.volume) })
            : t('nutrition.drinks.progressNoGoal', { all: formatVolume(allMl, units.volume) })}
        </ThemedText>
        {settings.drinkGoalMl ? (
          <MeterBar progress={allMl / settings.drinkGoalMl} color={dataColor} trackColor={theme.backgroundSelected} height={8} />
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.drinks.water', { water: formatVolume(waterMl, units.volume) })}
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
          format={(ml) => t('nutrition.drinks.addGlass', { ml: formatVolume(ml, units.volume) })}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('caffeine.title')}
        </ThemedText>
        <Presets
          label={t('caffeine.title')}
          options={CAFFEINE_DRINKS.map((d) => d.id)}
          onChange={(id) => addCaffeine(CAFFEINE_DRINKS.find((d) => d.id === id)!)}
          format={(id) => t('caffeine.chip', { name: t(`caffeine.drinks.${id}`), ml: CAFFEINE_DRINKS.find((d) => d.id === id)!.ml })}
        />
        {caffeineMg > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('caffeine.today', { mg: formatNumber(caffeineMg, 0) })} · {t('caffeine.reference')}
          </ThemedText>
        ) : null}
        <Button
          label={t('nutrition.drinks.other')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/nutrition/add', params: { day, drink: 'sonstiges' } })}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.drinks.basis')}
        </ThemedText>
      </Card>

      <Card>
        <ListRow icon="calendar" title={t('nutrition.weekLink')} subtitle={t('nutrition.weekLinkSub')} accessory="›" onPress={() => router.push({ pathname: '/nutrition/week', params: { day } })} />
        <ListRow icon="calendar" title={t('mealPlan.title')} subtitle={t('mealPlan.linkSub')} accessory="›" onPress={() => router.push('/nutrition/plan')} />
        <ListRow icon="book" title={t('book.title')} subtitle={t('book.linkSub', { count: ALL_BOOK_RECIPES.length })} accessory="›" onPress={() => router.push('/nutrition/book')} />
        <ListRow icon="book" title={t('nutrition.recipesLink')} accessory="›" onPress={() => router.push('/nutrition/recipes')} />
        <ListRow icon="pill" title={t('supplements.link')} accessory="›" onPress={() => router.push('/nutrition/supplements')} />
        <ListRow icon="target" title={t('nutrition.settingsLink')} subtitle={t('nutrition.settingsLinkSub')} accessory="›" onPress={() => router.push('/nutrition/settings')} last />
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
  big: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, flexWrap: 'wrap' },
  bigValue: { fontFamily: DisplayFont.bold, fontSize: 36, lineHeight: 42, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  num: { fontVariant: ['tabular-nums'] },
  stat: { flex: 1, gap: Spacing.half },
  templateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 160 },
});
