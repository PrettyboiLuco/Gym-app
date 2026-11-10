// Ernährungstagebuch (Ernährung neu, 04.11.2026): Lichtbühne oben, Mahlzeiten als Schiene aus Haarlinien-Zeilen,
// Getränke, darunter die Bereiche als Kacheln. Fenster („Platte federt auf“) für Optionen, Kopieren und Nährwerte.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { Button, Card } from '@/components/card';
import { HeroCard } from '@/components/day-hero';
import { DaySummary } from '@/components/day-summary';
import { DaySwitcher } from '@/components/day-switcher';
import { DiaryCopySheet } from '@/components/diary-copy-sheet';
import { DiaryDrinks } from '@/components/diary-drinks';
import { DiaryEntryRow } from '@/components/diary-entry-row';
import { useFreshEntries } from '@/components/diary-fresh';
import { feelingLine } from '@/components/diary-meal-feeling';
import { copyPreviousMeal, MealOptionsSheet, type MealOptionsNext } from '@/components/diary-meal-options';
import { DiaryTimeline, entrySubtitle, windowLine } from '@/components/diary-timeline';
import { Segmented } from '@/components/fields';
import { MealHead } from '@/components/meal-head';
import { Screen } from '@/components/screen';
import { SettingsButton } from '@/components/settings-button';
import { Rise } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { TileGrid, type Tile } from '@/components/tiles';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { currentFast, loadFastingSettings } from '@/data/fasting';
import { calorieGoalOn } from '@/data/goals';
import { loadDayFeelings, saveMealFeeling } from '@/data/meal-feeling';
import {
  copyDay,
  DEFAULT_SETTINGS,
  deleteEvent,
  listDay,
  loadNutritionSettings,
  loggedMeals,
  restoreEvent,
  type ConsumptionEvent,
  type DeletedEvent,
} from '@/data/nutrition';
import { loadDayTargets, type DayTargets } from '@/data/targets-settings';
import { parseMicros, sumMicros } from '@/domain/basis-foods';
import type { Macros } from '@/domain/coach';
import { shiftDay } from '@/domain/dates';
import { isPlannedDay, PLAN_AHEAD_DAYS } from '@/domain/diary';
import { DEFAULT_FASTING, fastingStatus, fastingVisible, splitDuration, type FastingPeriod } from '@/domain/fasting';
import { EMPTY_FEELING, feelingEmpty, type DayFeelings, type MealFeeling } from '@/domain/meal-feeling';
import { drinkTotals, MEALS, sumNutrients, type Meal } from '@/domain/nutrition';
import { ALL_BOOK_RECIPES } from '@/domain/recipe-book';
import { foodTitle } from '@/format/food-title';
import { useLoad } from '@/hooks/use-load';
import { useNow } from '@/hooks/use-now';
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
  // Mahlzeiten mit Einträgen am Vortag: nur dort gibt es im Kopf einer leeren Mahlzeit die Pille „Wie gestern“.
  const previous = shiftDay(day, -1);
  const previousMeals = await loggedMeals(db, previous, previous);
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
    fast,
    targets,
    previousMeals,
  };
}

type DiaryView = 'mahlzeiten' | 'zeitleiste';
const VIEWS: readonly DiaryView[] = ['mahlzeiten', 'zeitleiste'];
// Gewählte Ansicht für die Dauer der Sitzung merken (beim Zurückkommen gleich wieder da).
let lastView: DiaryView = 'mahlzeiten';

/** Offenes Fenster samt Inhalt: bleibt beim Schließen stehen, bis die Platte ruht; `key` hängt es zu jedem Öffnen neu ein. */
type CopyState = { ids: string[]; title: string; open: boolean; key: number };
type OptionsState = { meal: Meal; open: boolean; key: number };

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
      fast: null as FastingPeriod | null,
      targets: null as DayTargets | null,
      previousMeals: new Set<string>(),
    },
    day
  );
  const { events, settings, goal } = data;
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
  const [copy, setCopy] = useState<CopyState | null>(null);
  const [options, setOptions] = useState<OptionsState | null>(null);
  const windowText = windowLine(events);

  // Mahlzeiten-Blöcke steigen einmal je Bildschirmaufruf gestaffelt auf, sobald die Einträge geladen sind.
  const rise = useSharedValue(0);
  useEffect(() => {
    if (loaded && rise.get() === 0) rise.set(Date.now());
  }, [loaded, rise]);

  // Kalorienhaltige Getränke zählen bei den Kalorien mit – derselbe Eintrag, einmal gezählt (TIME-005).
  const sums = sumNutrients(events);
  const drinks = events.filter((e) => e.kind === 'getraenk');
  const { waterMl, allMl } = drinkTotals(drinks);
  const caffeineMg = events.reduce((sum, e) => sum + (e.caffeineMg ?? 0), 0);
  // Vitamine und Mineralstoffe (A4): nur aus Einträgen mit Angaben, Abdeckung wird dazugeschrieben.
  const microSum = sumMicros(events.filter((e) => e.kind === 'essen' || e.microsJson).map((e) => parseMicros(e.microsJson)));
  const mealItems = (meal: Meal) => events.filter((e) => e.kind === 'essen' && e.meal === meal);

  async function copyWholeDay() {
    const count = await copyDay(db, shiftDay(day, -1), whenFor(day));
    showToast(count > 0 ? t('nutrition.copiedDay', { count }) : t('nutrition.copyDayNone'));
    await reload();
  }

  // Löschen per Wisch-Geste (B1, N3): die Zeile gleitet hinaus, danach wird neu geladen. „Rückgängig“ in der Meldung
  // setzt den Eintrag unverändert (gleiche ID, alle Werte) wieder ein.
  async function removeEntry(id: string) {
    const deleted = await deleteEvent(db, id);
    showToast(t('diary.deleted'), deleted ? { label: t('diary.undo'), hint: t('diary.undoHint'), onPress: () => undoRemove(deleted) } : undefined);
    await reload();
  }

  async function undoRemove(deleted: DeletedEvent) {
    try {
      await restoreEvent(db, deleted);
      showToast(t('diary.restored'));
    } catch {
      showToast(t('common.saveFailed'));
    }
    await reload();
  }

  async function changeFeeling(meal: Meal, next: MealFeeling) {
    await saveMealFeeling(db, day, meal, next);
    await reload();
  }

  function closeOptions(next: MealOptionsNext) {
    const meal = options?.meal;
    setOptions((o) => (o ? { ...o, open: false } : o));
    if (next === 'copy' && meal) {
      setCopy((c) => ({ ids: mealItems(meal).map((e) => e.id), title: t(`nutrition.meals.${meal}`), open: true, key: (c?.key ?? 0) + 1 }));
    }
  }

  const openEntry = (id: string) => router.push(`/nutrition/entry/${id}`);
  const addFood = (meal?: Meal) => router.push({ pathname: '/nutrition/add', params: meal ? { day, meal } : { day } });

  const entryRow = (e: ConsumptionEvent, i: number, all: readonly ConsumptionEvent[]) => (
    <DiaryEntryRow
      key={e.id}
      last={i === all.length - 1}
      title={foodTitle(e)}
      subtitle={entrySubtitle(e, hide, planned ? t('diary.planned') : undefined)}
      fresh={fresh.has(e.id)}
      onPress={() => openEntry(e.id)}
      onDelete={() => removeEntry(e.id)}
    />
  );

  const showFasting = !profile.sensitive;
  // Restzeit in der Kachel läuft mit: minütlich neu, nur solange ein Fenster läuft (endet am geplanten Ende).
  const fast = fastingVisible(data.fasting, profile.sensitive) ? data.fast : null;
  const fastEnd = fast ? fastingStatus(fast, 0).endAtMs : null;
  const now = useNow(fast !== null, 60_000, fastEnd);
  const fastStatus = fast ? fastingStatus(fast, now) : null;

  // Leerer Tag: Hinweis und „Ganzen Vortag übernehmen“ (A3) – nur dann, damit nichts doppelt wird.
  const emptyDay =
    events.length === 0 ? (
      <>
        <ThemedText themeColor="textSecondary">{t('nutrition.summary.empty')}</ThemedText>
        <Button label={t('nutrition.copyDay')} variant="secondary" size="compact" onPress={copyWholeDay} />
      </>
    ) : undefined;

  const tiles: Tile[] = [
    {
      key: 'week',
      icon: 'week',
      title: t('nutrition.weekLink'),
      subtitle: t('nutrition.weekLinkSub'),
      onPress: () => router.push({ pathname: '/nutrition/week', params: { day } }),
    },
    { key: 'plan', icon: 'planner', title: t('mealPlan.title'), subtitle: t('mealPlan.linkSub'), onPress: () => router.push('/nutrition/plan') },
    {
      key: 'book',
      icon: 'book',
      title: t('book.title'),
      subtitle: t('book.linkSub', { count: ALL_BOOK_RECIPES.length }),
      onPress: () => router.push('/nutrition/book'),
    },
    {
      key: 'recipes',
      icon: 'recipe',
      title: t('nutrition.recipesLink'),
      subtitle: t('nutrition.recipesLinkSub'),
      onPress: () => router.push('/nutrition/recipes'),
    },
    {
      key: 'supplements',
      icon: 'pill',
      title: t('supplements.link'),
      subtitle: t('supplements.linkSub'),
      onPress: () => router.push('/nutrition/supplements'),
    },
    // Was fehlt mir heute? (B2, W3) – ohne Zahlen nur der Hinweis auf dem Bildschirm selbst.
    {
      key: 'gaps',
      icon: 'search',
      title: t('targets.gaps.title'),
      subtitle: t('targets.gaps.linkSub'),
      onPress: () => router.push({ pathname: '/nutrition/gaps', params: { day } }),
    },
    // Fasten-Timer (B1, E2): Kann-Funktion, bei „sensibler Situation“ komplett ausgeblendet.
    ...(showFasting
      ? [
          {
            key: 'fasting',
            icon: 'clock' as const,
            title: t('fasting.link'),
            subtitle: fastStatus
              ? fastStatus.phase === 'erreicht'
                ? t('fasting.linkReached')
                : t('fasting.linkRunning', splitDuration(fastStatus.remainingMs))
              : data.fasting.enabled
                ? t('fasting.linkOn')
                : t('fasting.linkOff'),
            onPress: () => router.push('/nutrition/fasting'),
          },
        ]
      : []),
    {
      key: 'settings',
      icon: 'target',
      title: t('nutrition.settingsLink'),
      subtitle: t('nutrition.settingsLinkSub'),
      onPress: () => router.push('/nutrition/settings'),
    },
  ];

  const optionsItems = options ? mealItems(options.meal) : [];

  return (
    <Screen title={t('nutrition.title')} trailing={<SettingsButton />}>
      <DaySwitcher day={day} onChange={setDay} today={today} maxDay={shiftDay(today, PLAN_AHEAD_DAYS)} />
      {planned ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityRole="text">
          {t('diary.plannedDay')}
        </ThemedText>
      ) : null}

      {hide ? (
        <HeroCard
          stage={
            <View style={styles.hidden}>
              <ThemedText style={styles.center}>
                {events.length === 0 ? t('nutrition.summary.empty') : t('nutrition.summary.hidden', { count: events.length })}
              </ThemedText>
              {events.length === 0 ? <Button label={t('nutrition.copyDay')} variant="secondary" size="compact" onPress={copyWholeDay} /> : null}
            </View>
          }
        />
      ) : (
        <DaySummary
          totals={sums}
          goal={goal}
          macroGoals={data.macros}
          micros={microSum}
          targets={data.targets}
          day={day}
          estimated={data.estimated}
          empty={emptyDay}
          water={{ ml: allMl, goalMl: settings.drinkGoalMl }}
        />
      )}

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
        <Card>
          <MealHead title={t('diary.view.zeitleiste')} addLabel={t('nutrition.add')} onAdd={() => addFood()} />
          <DiaryTimeline events={events} hide={hide} fresh={fresh} onOpen={openEntry} onDelete={removeEntry} />
        </Card>
      ) : (
        <Card>
          {MEALS.map((meal, i) => {
            const items = mealItems(meal);
            const name = t(`nutrition.meals.${meal}`);
            const feeling = data.feelings[meal] ?? EMPTY_FEELING;
            return (
              <Rise key={meal} index={i} gate={rise} style={[styles.block, i > 0 && [styles.blockLine, { borderColor: theme.backgroundSelected }]]}>
                <MealHead
                  index={i + 1}
                  title={name}
                  value={!hide && items.length > 0 ? formatKcalSum(sumNutrients(items)) : null}
                  addLabel={`${t('nutrition.add')}: ${name}`}
                  onAdd={() => addFood(meal)}
                  quick={
                    items.length === 0 && data.previousMeals.has(`${shiftDay(day, -1)}|${meal}`)
                      ? {
                          label: day === today ? t('diary.options.yesterdayShort') : t('diary.options.previousShort'),
                          accessibilityLabel: t('diary.options.yesterdayFor', { meal: name }),
                          onPress: () => copyPreviousMeal(db, day, meal, reload),
                        }
                      : null
                  }
                  moreLabel={t('diary.options.label', { meal: name })}
                  // Leere Mahlzeit: das Fenster hätte nur „Wie am Vortag“ – das steht dann als Pille im Kopf.
                  onMore={items.length > 0 ? () => setOptions((o) => ({ meal, open: true, key: (o?.key ?? 0) + 1 })) : undefined}
                />
                {items.map(entryRow)}
                {items.length > 0 && !planned && !feelingEmpty(feeling) ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {feelingLine(feeling)}
                  </ThemedText>
                ) : null}
              </Rise>
            );
          })}
        </Card>
      )}

      <Card>
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

      <TileGrid tiles={tiles} />

      {options ? (
        <MealOptionsSheet
          key={`options-${options.key}`}
          visible={options.open}
          meal={options.meal}
          day={day}
          planned={planned}
          items={optionsItems}
          feeling={data.feelings[options.meal] ?? EMPTY_FEELING}
          onFeeling={(next) => changeFeeling(options.meal, next)}
          onClose={closeOptions}
        />
      ) : null}
      {copy ? (
        <DiaryCopySheet
          key={`copy-${copy.key}`}
          visible={copy.open}
          sourceDay={day}
          eventIds={copy.ids}
          title={copy.title}
          onClose={() => setCopy((c) => (c ? { ...c, open: false } : c))}
          onCopied={reload}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.one },
  blockLine: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, marginTop: Spacing.one },
  hidden: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  center: { textAlign: 'center' },
});
