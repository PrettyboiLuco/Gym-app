// Kopf der Ernährung: eine große Zahl (übrig), dünner Balken, Makros – flach, ohne Ring und Lichtschein (Prüfung 08.11.).

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MeterBar } from '@/components/charts';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Spacing } from '@/constants/theme';
import type { Macros } from '@/domain/coach';
import type { NutrientTotals } from '@/domain/nutrition';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCountUp } from '@/hooks/use-count-up';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

type MacroKey = 'protein' | 'carbs' | 'fat';
const MACROS: MacroKey[] = ['protein', 'carbs', 'fat'];
/** Spaltenbreiten der Makro-Leiste: „Kohlenhydrate“ steht ausgeschrieben wie „Eiweiß“ und „Fett“ und braucht mehr Platz. */
const MACRO_FLEX: Record<MacroKey, number> = { protein: 1, carbs: 1.45, fat: 0.8 };
const KCAL_PER_G: Record<MacroKey, number> = { protein: 4, carbs: 4, fat: 9 };
const RADIUS = 28;

/** „≥ “ vor einer Summe, wenn bei manchen Einträgen der Wert fehlt (nie als 0 gezählt, TRACK-002). */
const atLeast = (totals: NutrientTotals, key: keyof NutrientTotals['values']) => (totals.unknown[key] > 0 ? '≥ ' : '');
const grams = (v: number) => formatNumber(v, v < 10 ? 1 : 0);

/** Farben auf der Bühne: dunkel feine helle Spur auf dem Schein, hell wie überall. */
function useStageColors() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  return {
    dark,
    data: dark ? theme.accent : theme.tint,
    track: dark ? 'rgba(255,255,255,0.10)' : theme.backgroundSelected,
    line: dark ? 'rgba(255,255,255,0.12)' : theme.backgroundSelected,
    // Drei Datenreihen: Eiweiß in der Datenfarbe, Kohlenhydrate hell, Fett grau (taste: höchstens drei Reihen).
    macro: { protein: dark ? theme.accent : theme.tint, carbs: dark ? '#E6E6E6' : '#3C3C3C', fat: dark ? '#6B6B6B' : '#A0A0A0' } as Record<MacroKey, string>,
  };
}

/**
 * Karte des Tagesüberblicks: oben die Bühne, darunter der übrige Inhalt mit eigenem Rand. Flach wie alle Karten
 * (Prüfung 08.11.: kein Lichtschein mehr – „true-black flat“).
 */
export function HeroCard({ stage, children }: { stage: ReactNode; children?: ReactNode }) {
  const theme = useTheme();
  const { line } = useStageColors();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <View style={styles.stage}>{stage}</View>
      {children ? <View style={[styles.below, { borderColor: line }]}>{children}</View> : null}
    </View>
  );
}

/**
 * Tagesübersicht (Prüfung 08.11.: vorher Ring + Gegessen + Übrig + Ziel – viermal dieselbe Aussage): eine große Zahl
 * „übrig“ (bzw. „drüber“ in Rot, ohne Ziel „gegessen“), ein dünner Balken und eine kleine Zeile mit Gegessen/Ziel/Prozent.
 * Darunter die Makro-Leiste. Leerer Tag (`empty`): Balken bei 0, darunter der mitgegebene Hinweis.
 */
export function DayHero({
  totals,
  goal,
  macroGoals,
  empty,
  children,
}: {
  totals: NutrientTotals;
  goal: number | null;
  macroGoals: Macros | null;
  empty?: ReactNode;
  /** Unter der Makro-Leiste: Wochenbudget, Nährwerte, Hinweise. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const colors = useStageColors();
  const eaten = totals.values.kcal;
  const left = goal === null ? null : goal - eaten;
  const over = left !== null && left < 0;
  const unknownKcal = totals.unknown.kcal > 0;
  const percent = goal ? Math.round((eaten / goal) * 100) : null;
  const shown = useCountUp(left === null ? eaten : Math.abs(left), !empty, true);
  const macroKcal = MACROS.reduce((s, k) => s + totals.values[k] * KCAL_PER_G[k], 0);
  const label = goal === null ? t('nutrition.summary.eaten') : over ? t('nutrition.summary.over') : t('nutrition.summary.left');
  const prefix = goal === null ? (unknownKcal ? '≥ ' : '') : unknownKcal && !over ? '≤ ' : '';
  const line =
    goal === null
      ? t('nutrition.summary.noGoalShort')
      : t('nutrition.summary.eatenOf', { eaten: `${unknownKcal ? '≥ ' : ''}${formatNumber(eaten, 0)}`, goal: formatNumber(goal, 0), percent: percent ?? 0 });

  const stage = (
    <View style={styles.stageInner} accessible accessibilityLabel={`${label} ${prefix}${formatNumber(left === null ? eaten : Math.abs(left), 0)} kcal. ${line}`}>
      <ThemedText type="small" style={{ color: over ? theme.danger : theme.textSecondary }}>
        {label}
      </ThemedText>
      <View style={styles.bigRow}>
        <ThemedText style={[styles.big, over && { color: theme.danger }]} numberOfLines={1} adjustsFontSizeToFit>
          {prefix}
          {formatNumber(Math.round(shown), 0)}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.bigUnit}>
          kcal
        </ThemedText>
      </View>
      <MeterBar growIn progress={goal ? Math.min(eaten / goal, 1) : 0} color={over ? theme.danger : colors.data} trackColor={colors.track} height={6} />
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {line}
      </ThemedText>
      {empty ? <View style={styles.empty}>{empty}</View> : null}
    </View>
  );

  if (empty) return <HeroCard stage={stage}>{children}</HeroCard>;

  return (
    <HeroCard stage={stage}>
      <View style={styles.macros}>
        {MACROS.map((k) => {
          const target = macroGoals ? macroGoals[k] : null;
          const share = macroKcal > 0 ? Math.round(((totals.values[k] * KCAL_PER_G[k]) / macroKcal) * 100) : 0;
          const sub = target ? t('nutrition.summary.ofGrams', { value: formatNumber(target, 0) }) : t('nutrition.summary.share', { value: share });
          return (
            <View
              key={k}
              style={[styles.macro, { flex: MACRO_FLEX[k] }]}
              accessible
              accessibilityLabel={`${t(`nutrition.${k}`)} ${atLeast(totals, k)}${grams(totals.values[k])} g, ${sub}`}>
              <View style={styles.macroHead}>
                <View style={[styles.macroDot, { backgroundColor: colors.macro[k] }]} />
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.macroName}>
                  {t(`nutrition.${k}`)}
                </ThemedText>
              </View>
              <ThemedText style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit>
                {atLeast(totals, k)}
                {grams(totals.values[k])}
                <ThemedText themeColor="textSecondary" style={styles.unit}>
                  {' g'}
                </ThemedText>
              </ThemedText>
              <MeterBar growIn progress={target ? totals.values[k] / target : share / 100} color={colors.macro[k]} trackColor={colors.track} height={4} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.macroSub} numberOfLines={1}>
                {sub}
              </ThemedText>
            </View>
          );
        })}
      </View>
      {children}
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, borderWidth: 1, overflow: 'hidden' },
  stage: { paddingTop: Spacing.four, paddingBottom: Spacing.four, paddingHorizontal: Spacing.four - 4 },
  stageInner: { gap: Spacing.two },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  big: { fontFamily: DisplayFont.bold, fontSize: 48, lineHeight: 54, letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 17, fontWeight: 600 },
  below: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four - 4,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four - 4,
    gap: Spacing.four - 4,
  },
  empty: { alignItems: 'center', gap: Spacing.three, alignSelf: 'stretch' },
  unit: { fontFamily: undefined, fontSize: 14, letterSpacing: 0, fontWeight: 500 },
  macros: { flexDirection: 'row', gap: Spacing.two + 4 },
  macro: { flex: 1, minWidth: 0, gap: Spacing.one + 2 },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 1 },
  macroName: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  macroDot: { width: 7, height: 7, borderRadius: 3.5 },
  macroValue: { fontFamily: DisplayFont.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  macroSub: { fontSize: 12, lineHeight: 16 },
});
