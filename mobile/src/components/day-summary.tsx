// Tagesübersicht der Ernährung: Lichtbühne (DayHero), Zusätze aus den Zielen, Zeile „Nährwerte“ mit eigenem Fenster.

import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { DayHero } from '@/components/day-hero';
import { EntryRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { InsightInfo } from '@/components/insight-info';
import { PressableScale } from '@/components/pressable-scale';
import { Sheet, SheetRow } from '@/components/sheet';
import { TargetDayExtras } from '@/components/target-day-extras';
import { TargetMicroBar } from '@/components/target-micro-bar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DayTargets } from '@/data/targets-settings';
import { MICRO_KEYS, MICRO_UNITS, type Micros } from '@/domain/basis-foods';
import type { Macros } from '@/domain/coach';
import { MICRO_TARGETS_VERSION } from '@/domain/micro-targets';
import type { NutrientTotals } from '@/domain/nutrition';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

const EXTRAS = ['fiber', 'sugar', 'satFat', 'salt'] as const;
type MicroSums = { values: Micros; known: number; total: number };

/** „≥ “ vor einer Summe, wenn bei manchen Einträgen der Wert fehlt (nie als 0 gezählt, TRACK-002). */
const atLeast = (totals: NutrientTotals, key: keyof NutrientTotals['values']) => (totals.unknown[key] > 0 ? '≥ ' : '');
const grams = (v: number) => `${formatNumber(v, v < 10 ? 1 : 0)} g`;

/**
 * Tagesübersicht: Lichtbühne mit Ring, Gegessen/Übrig und Makro-Leiste. Darunter mit `targets` (B2) Wochenbudget,
 * Netto-Kohlenhydrate und angeheftete Nährstoffe, dann die Zeile „Nährwerte“ (Ballaststoffe, Zucker, gesättigte
 * Fettsäuren, Salz, Vitamine und Mineralstoffe im eigenen Fenster). Lange Hinweise sind hinter „i“ eingeklappt.
 * `empty`: leerer Tag – Ring bei 0 %, darunter Hinweis und „Ganzen Vortag übernehmen“.
 */
export function DaySummary({
  totals,
  goal,
  macroGoals,
  micros,
  targets = null,
  day,
  estimated = false,
  empty,
}: {
  totals: NutrientTotals;
  goal: number | null;
  macroGoals: Macros | null;
  micros: MicroSums;
  /** Ziele und Nährstoffe (B2); null = ohne Zusätze. */
  targets?: DayTargets | null;
  /** Tag der Übersicht (für die Nährstoff-Bildschirme). */
  day?: string;
  /** Ziel aus dem Kalorienrechner (Schätzung). */
  estimated?: boolean;
  empty?: ReactNode;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const [open, setOpen] = useState(false);
  const line = dark ? 'rgba(255,255,255,0.12)' : theme.backgroundSelected;

  const hints = (
    <View style={styles.hints}>
      {totals.unknown.kcal > 0 ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {t('nutrition.summary.incomplete', { count: totals.unknown.kcal })}
        </ThemedText>
      ) : null}
      {goal === null ? (
        <InsightInfo label={t('nutrition.summary.noGoalShort')} text={t('nutrition.summary.noGoal')} />
      ) : (
        <InsightInfo
          label={t('nutrition.summary.howCounted')}
          text={`${estimated ? `${t('nutrition.summary.estimated')} ` : ''}${t('nutrition.summary.training')}`}
        />
      )}
    </View>
  );

  if (empty) {
    return (
      <DayHero totals={totals} goal={goal} macroGoals={macroGoals} empty={empty}>
        {hints}
      </DayHero>
    );
  }

  const subtitle = t('nutrition.nutrients.sub');
  return (
    <DayHero totals={totals} goal={goal} macroGoals={macroGoals}>
      {targets && day ? <TargetDayExtras targets={targets} totals={totals} micros={micros.values} day={day} /> : null}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${t('nutrition.nutrients.title')}. ${subtitle}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.row, { borderColor: line, opacity: pressed ? 0.7 : 1 }]}>
        <View style={styles.flex}>
          <ThemedText style={styles.rowTitle}>{t('nutrition.nutrients.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
        <Icon name="chevron" color={theme.textSecondary} size={18} strokeWidth={2} />
      </PressableScale>
      {hints}
      <NutrientsSheet visible={open} onClose={() => setOpen(false)} totals={totals} micros={micros} targets={targets} day={day} />
    </DayHero>
  );
}

/**
 * Fenster „Nährwerte“ (getlayers vesper-faq): zuerst Ballaststoffe, Zucker, gesättigte Fettsäuren und Salz als Zeilen
 * mit Haarlinie (Wert rechtsbündig, gleich breite Ziffern), darunter Vitamine und Mineralstoffe – mit Zielen (B2) als
 * Balken, ohne Ziele (sensible Situation) nur die Summen. Fehlen alle Angaben, steht statt leerer Zeilen ein Satz.
 * Wie gezählt wird (nur Einträge mit Angaben, Quellen der Ziele, Fassung) liegt hinter „Wie wird gezählt?“.
 * Jede Zeile steigt nach der Leiter herein.
 */
function NutrientsSheet({
  visible,
  onClose,
  totals,
  micros,
  targets,
  day,
}: {
  visible: boolean;
  onClose: () => void;
  totals: NutrientTotals;
  micros: MicroSums;
  targets: DayTargets | null;
  day?: string;
}) {
  const withTargets = targets !== null && !targets.hidden;
  // Erst navigieren, wenn das Fenster zu ist (onClosed) – sonst öffnet sich der neue Bildschirm hinter dem noch offenen Fenster.
  const afterClose = useRef<{ pathname: '/nutrition/micros' | '/nutrition/nutrient'; params: Record<string, string> } | null>(null);
  const openDetails = (params: Record<string, string>, pathname: '/nutrition/micros' | '/nutrition/nutrient') => {
    afterClose.current = { pathname, params: day ? { ...params, day } : params };
    onClose();
  };
  const navigateAfterClose = () => {
    const next = afterClose.current;
    afterClose.current = null;
    if (next) router.push(next);
  };
  const keys = MICRO_KEYS.filter((k) => micros.values[k] != null && micros.values[k]! > 0);
  const missing = MICRO_KEYS.filter((k) => !keys.includes(k));
  // Kein Eintrag hat einen der vier Werte: ein Satz statt vier Zeilen mit „–“.
  const extrasNone = EXTRAS.every((k) => totals.values[k] === 0 && totals.unknown[k] > 0);
  const info = [
    withTargets ? null : t('micros.sumOnly'),
    t('targets.micros.onlyLogged'),
    withTargets ? t('targets.micros.sources', { version: MICRO_TARGETS_VERSION }) : null,
  ]
    .filter(Boolean)
    .join('\n\n');
  let i = 0;
  return (
    <Sheet visible={visible} title={t('nutrition.nutrients.title')} onClose={onClose} onClosed={navigateAfterClose}>
      {extrasNone ? (
        <SheetRow index={i++}>
          <ThemedText themeColor="textSecondary">{t('nutrition.nutrients.extrasNone')}</ThemedText>
        </SheetRow>
      ) : (
        EXTRAS.map((k, n) => {
          const value = totals.values[k] > 0 || totals.unknown[k] === 0 ? `${atLeast(totals, k)}${grams(totals.values[k])}` : '–';
          return (
            <SheetRow key={k} index={i++} divider={n > 0}>
              <View style={styles.extra} accessible accessibilityLabel={`${t(`nutrition.${k}`)} ${value === '–' ? t('nutrition.unknown') : value}`}>
                <ThemedText style={styles.flex}>{t(`nutrition.${k}`)}</ThemedText>
                <ThemedText style={styles.extraValue}>{value}</ThemedText>
              </View>
            </SheetRow>
          );
        })
      )}
      <SheetRow index={i++} divider style={styles.section}>
        <ThemedText style={styles.rowTitle} accessibilityRole="header">
          {t('micros.title')}
        </ThemedText>
        {keys.length === 0 ? <ThemedText themeColor="textSecondary">{t('micros.none')}</ThemedText> : null}
      </SheetRow>
      {withTargets
        ? keys.map((k) => (
            <SheetRow key={k} index={i++}>
              <TargetMicroBar
                name={t(`micros.${k}`)}
                value={micros.values[k]!}
                unit={MICRO_UNITS[k]}
                limits={targets!.refs[k]}
                onPress={() => openDetails({ key: k }, '/nutrition/nutrient')}
              />
            </SheetRow>
          ))
        : keys.map((k, n) => (
            <SheetRow key={k} index={i++}>
              <EntryRow
                title={t(`micros.${k}`)}
                value={`${formatNumber(micros.values[k]!, micros.values[k]! < 10 ? 1 : 0)} ${MICRO_UNITS[k]}`}
                last={n === keys.length - 1}
              />
            </SheetRow>
          ))}
      <SheetRow index={i++} style={styles.notes}>
        {keys.length > 0 && missing.length ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('micros.missing', { list: missing.map((k) => t(`micros.${k}`)).join(', ') })}
          </ThemedText>
        ) : null}
        {keys.length > 0 && micros.known < micros.total ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('micros.openHint', { known: micros.known, total: micros.total })}
          </ThemedText>
        ) : null}
        <InsightInfo label={t('nutrition.summary.howCounted')} text={info} />
      </SheetRow>
      <SheetRow index={i++} style={styles.notes}>
        {withTargets ? <Button label={t('targets.micros.open')} variant="secondary" onPress={() => openDetails({}, '/nutrition/micros')} /> : null}
        <Button label={t('common.close')} variant="secondary" onPress={onClose} />
      </SheetRow>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    minHeight: 48,
  },
  rowTitle: { fontWeight: 600 },
  hints: { gap: Spacing.one },
  extra: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 28 },
  extraValue: { fontWeight: 600, fontVariant: ['tabular-nums'], textAlign: 'right' },
  section: { gap: Spacing.one, paddingTop: Spacing.four },
  notes: { gap: Spacing.two },
});
