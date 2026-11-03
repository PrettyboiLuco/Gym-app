import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySummary } from '@/components/day-summary';
import { DaySwitcher } from '@/components/day-switcher';
import { DiaryCopySheet } from '@/components/diary-copy-sheet';
import { DiaryDrinks } from '@/components/diary-drinks';
import { DiaryEntryRow } from '@/components/diary-entry-row';
import { useFreshEntries } from '@/components/diary-fresh';
import { DiaryMealFeeling } from '@/components/diary-meal-feeling';
import { DiaryTimeline, entrySubtitle, windowLine } from '@/components/diary-timeline';
import { Field, ListRow, Segmented } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { DisplayFont, Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { currentFast, loadFastingSettings } from '@/data/fasting';
import { calorieGoalOn } from '@/data/goals';
import { loadDayFeelings, saveMealFeeling } from '@/data/meal-feeling';
import {
  copyDay,
  copyMeal,
  DEFAULT_SETTINGS,
  deleteEvent,
  listDay,
  loadNutritionSettings,
  saveTemplateFromMeal,
  type ConsumptionEvent,
} from '@/data/nutrition';
import { loadDayTargets, type DayTargets } from '@/data/targets-settings';
import { parseMicros, sumMicros } from '@/domain/basis-foods';
import type { Macros } from '@/domain/coach';
import { shiftDay } from '@/domain/dates';
import { isPlannedDay, PLAN_AHEAD_DAYS } from '@/domain/diary';
import { DEFAULT_FASTING, fastingStatus, fastingVisible, splitDuration, type FastingStatus } from '@/domain/fasting';
import { EMPTY_FEELING, type DayFeelings, type MealFeeling } from '@/domain/meal-feeling';
import { drinkTotals, MEALS, sumNutrients, type Meal } from '@/domain/nutrition';
import { ALL_BOOK_RECIPES } from '@/domain/recipe-book';
import { foodTitle } from '@/format/food-title';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useProfile, useUnits } from '@/providers/profile-provider';
import { syncMealReminders } from '@/services/alerts';
import { diaryToday, formatKcalSum, whenFor } from '@/services/nutrition-format';

async function loadDiary(db: Db, day: string) {
  const [events, settings, goal] = await Promise.all([listDay(db, day), loadNutritionSettings(db), calorieGoalOn(db, day)]);
  // Tagebuch-Ausbau (B1): Befinden je Mahlzeit, Fasten-Timer (Kann-Funktion); Mahlzeit-Erinnerungen nach jedem Laden
  // neu planen – so entfällt die heutige Mitteilung einer Mahlzeit, sobald etwas eingetragen ist.
  const [feelings, fasting, fast] = await Promise.all([loadDayFeelings(db, day), loadFastingSettings(db), currentFast(db)]);
  // Ziele und Nährstoffe (B2): Tagesziel aus dem Wochenbudget, Makros nach Ernährungsform, angeheftete Nährstoffe.
  const targets = await loadDayTargets(db, day);
  const fastStatus = fast ? fastingStatus(fast, Date.now()) : null;
  syncMealReminders(db, diaryToday()).catch(() => undefined);
  return {
    day,
    events,
    settings,
    goal: targets.kcal ?? goal?.kcal ?? null,
    macros: targets.macros ?? goal?.macros ?? null,
    estimated: goal?.source === 'rechner',
    feelings,
    fasting,
    fastStatus,
    targets,
  };
}

type DiaryView = 'mahlzeiten' | 'zeitleiste';
const VIEWS: readonly DiaryView[] = ['mahlzeiten', 'zeitleiste'];
// Gewählte Ansicht für die Dauer der Sitzung merken (beim Zurückkommen gleich wieder da).
let lastView: DiaryView = 'mahlzeiten';

export default function DiaryScreen() {
  const theme = useTheme();
  const units = useUnits();
  const [day, setDay] = useState(diaryToday);
  // App über Mitternacht offen oder Tagesende geändert: Wer „Heute“ angesehen hat, sieht nach dem Zurückkehren (App im
  // Vordergrund oder Bildschirm wieder im Fokus) den neuen Tag.
  const shownToday = useRef(diaryToday());
  const syncToday = useCallback(() => {
    const now = diaryToday();
    if (now === shownToday.current) return;
    const previous = shownToday.current;
    shownToday.current = now;
    setDay((d) => (d === previous ? now : d));
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncToday();
    });
    return () => sub.remove();
  }, [syncToday]);
  useFocusEffect(syncToday);
  const { data, reload, db, loaded } = useLoad(
    (d) => loadDiary(d, day),
    {
      events: [] as ConsumptionEvent[],
      settings: DEFAULT_SETTINGS,
      goal: null as number | null,
      macros: null as Macros | null,
      estimated: false,
      day: '',
      feelings: {} as DayFeelings,
      fasting: DEFAULT_FASTING,
      fastStatus: null as FastingStatus | null,
      targets: null as DayTargets | null,
    },
    day
  );
  const { events, settings, goal, estimated } = data;
  const hide = settings.hideNumbers;
  const today = diaryToday();
  const planned = isPlannedDay(day, today);
  const { profile } = useProfile();
  const fresh = useFreshEntries(
    data.day,
    events.map((e) => e.id),
    loaded
  );
  const [view, setView] = useState<DiaryView>(lastView);
  const [copyFor, setCopyFor] = useState<{ ids: string[]; title: string } | null>(null);
  const windowText = windowLine(events);

  // Hinweise pro Mahlzeit (z. B. „3 Einträge kopiert“) und offenes Vorlagen-Formular.
  const [notice, setNotice] = useState<{ meal: Meal; text: string } | null>(null);
  const [templateFor, setTemplateFor] = useState<Meal | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [dayNotice, setDayNotice] = useState<string | null>(null);

  // Kalorienhaltige Getränke zählen bei den Kalorien mit – derselbe Eintrag, einmal gezählt (TIME-005).
  const sums = sumNutrients(events);
  const drinks = events.filter((e) => e.kind === 'getraenk');
  const { waterMl, allMl } = drinkTotals(drinks);
  const caffeineMg = events.reduce((sum, e) => sum + (e.caffeineMg ?? 0), 0);
  // Vitamine und Mineralstoffe (A4): nur aus Einträgen mit Angaben, Abdeckung wird dazugeschrieben.
  const microSum = sumMicros(events.filter((e) => e.kind === 'essen' || e.microsJson).map((e) => parseMicros(e.microsJson)));

  function changeDay(next: string) {
    setDay(next);
    setNotice(null);
    setTemplateFor(null);
  }

  async function copyFromPreviousDay(meal: Meal) {
    const count = await copyMeal(db, shiftDay(day, -1), meal, whenFor(day, meal));
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

  // Löschen per Wisch-Geste (B1, N3): die Zeile gleitet hinaus, danach wird neu geladen.
  async function removeEntry(id: string) {
    await deleteEvent(db, id);
    showToast(t('diary.deleted'));
    await reload();
  }

  async function changeFeeling(meal: Meal, next: MealFeeling) {
    await saveMealFeeling(db, day, meal, next);
    await reload();
  }

  const openEntry = (id: string) => router.push(`/nutrition/entry/${id}`);

  const entryRow = (e: ConsumptionEvent) => (
    <DiaryEntryRow
      key={e.id}
      title={foodTitle(e)}
      subtitle={entrySubtitle(e, hide, planned ? t('diary.planned') : undefined)}
      fresh={fresh.has(e.id)}
      onPress={() => openEntry(e.id)}
      onDelete={() => removeEntry(e.id)}
    />
  );

  const showFasting = !profile.sensitive;
  const fastStatus = fastingVisible(data.fasting, profile.sensitive) ? data.fastStatus : null;

  return (
    <Screen title={t('nutrition.title')}>
      <DaySwitcher day={day} onChange={changeDay} today={today} maxDay={shiftDay(today, PLAN_AHEAD_DAYS)} />
      {planned ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityRole="text">
          {t('diary.plannedDay')}
        </ThemedText>
      ) : null}

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
            <DaySummary totals={sums} goal={goal} macroGoals={data.macros} micros={microSum} targets={data.targets} day={day} />
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

      {/* Mahlzeiten oder Zeitleiste (B1, W6); darunter das Essensfenster als reine Anzeige. */}
      <Segmented
        label={t('diary.view.label')}
        options={VIEWS}
        value={view}
        onChange={(v) => {
          lastView = v;
          setView(v);
        }}
        format={(v) => t(`diary.view.${v}`)}
      />
      {windowText ? (
        <ThemedText type="small" themeColor="textSecondary">
          {windowText}
        </ThemedText>
      ) : null}

      {view === 'zeitleiste' ? (
        <Card title={t('diary.view.zeitleiste')}>
          <DiaryTimeline events={events} hide={hide} fresh={fresh} onOpen={openEntry} onDelete={removeEntry} />
          <View style={styles.links}>
            <Button
              label={t('nutrition.add')}
              size="compact"
              icon={<Icon name="plus" color={theme.onPrimary} size={16} strokeWidth={2.2} />}
              onPress={() => router.push({ pathname: '/nutrition/add', params: { day } })}
            />
          </View>
        </Card>
      ) : null}

      {(view === 'mahlzeiten' ? MEALS : []).map((meal) => {
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
              {items.length > 0 ? (
                <Button
                  label={t('diary.copy.open')}
                  variant="quiet"
                  size="compact"
                  onPress={() => setCopyFor({ ids: items.map((e) => e.id), title: t(`nutrition.meals.${meal}`) })}
                />
              ) : null}
              {items.some((e) => e.foodId) && templateFor !== meal ? (
                <Button label={t('nutrition.saveTemplate')} variant="quiet" size="compact" onPress={() => setTemplateFor(meal)} />
              ) : null}
            </View>
            {items.length > 0 && !planned ? (
              <DiaryMealFeeling feeling={data.feelings[meal] ?? EMPTY_FEELING} onChange={(next) => changeFeeling(meal, next)} />
            ) : null}
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
        {/* Wasserglas, vier zuletzt genutzte Getränke, der Rest hinter „Mehr …“ (B1, N10/O5). */}
        <DiaryDrinks
          day={day}
          settings={settings}
          units={units}
          allMl={allMl}
          waterMl={waterMl}
          caffeineMg={caffeineMg}
          rows={drinks.map(entryRow)}
          onChanged={reload}
        />
      </Card>

      {copyFor ? (
        <DiaryCopySheet visible sourceDay={day} eventIds={copyFor.ids} title={copyFor.title} onClose={() => setCopyFor(null)} onCopied={reload} />
      ) : null}

      <Card>
        <ListRow
          icon="calendar"
          title={t('nutrition.weekLink')}
          subtitle={t('nutrition.weekLinkSub')}
          accessory="›"
          onPress={() => router.push({ pathname: '/nutrition/week', params: { day } })}
        />
        <ListRow icon="calendar" title={t('mealPlan.title')} subtitle={t('mealPlan.linkSub')} accessory="›" onPress={() => router.push('/nutrition/plan')} />
        <ListRow
          icon="book"
          title={t('book.title')}
          subtitle={t('book.linkSub', { count: ALL_BOOK_RECIPES.length })}
          accessory="›"
          onPress={() => router.push('/nutrition/book')}
        />
        <ListRow icon="book" title={t('nutrition.recipesLink')} accessory="›" onPress={() => router.push('/nutrition/recipes')} />
        <ListRow icon="pill" title={t('supplements.link')} accessory="›" onPress={() => router.push('/nutrition/supplements')} />
        {/* Was fehlt mir heute? (B2, W3) – ohne Zahlen nur der Hinweis auf dem Bildschirm selbst. */}
        <ListRow
          icon="search"
          title={t('targets.gaps.title')}
          subtitle={t('targets.gaps.linkSub')}
          accessory="›"
          onPress={() => router.push({ pathname: '/nutrition/gaps', params: { day } })}
        />
        {/* Fasten-Timer (B1, E2): Kann-Funktion, bei „sensibler Situation“ komplett ausgeblendet. */}
        {showFasting ? (
          <ListRow
            icon="clock"
            title={t('fasting.link')}
            subtitle={
              fastStatus
                ? fastStatus.phase === 'erreicht'
                  ? t('fasting.linkReached')
                  : t('fasting.linkRunning', splitDuration(fastStatus.remainingMs))
                : data.fasting.enabled
                  ? t('fasting.linkOn')
                  : t('fasting.linkOff')
            }
            accessory="›"
            onPress={() => router.push('/nutrition/fasting')}
          />
        ) : null}
        <ListRow
          icon="target"
          title={t('nutrition.settingsLink')}
          subtitle={t('nutrition.settingsLinkSub')}
          accessory="›"
          onPress={() => router.push('/nutrition/settings')}
          last
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  moreRow: { flexDirection: 'row' },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  numbers: { flexDirection: 'row', gap: Spacing.two },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, flexWrap: 'wrap' },
  bigValue: { fontFamily: DisplayFont.bold, fontSize: 36, lineHeight: 42, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  num: { fontVariant: ['tabular-nums'] },
  stat: { flex: 1, gap: Spacing.half },
  templateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 160 },
});
