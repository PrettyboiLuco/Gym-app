// Kopf der Ernährung „Lichtbühne“ (getlayers altitude-stats + Verlauf firmament-004): Ring auf dem Lichtschein, Zahlen, Makros.

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MeterBar, ProgressRing } from '@/components/charts';
import { FIRMAMENT_DARK } from '@/components/firmament';
import { FirmamentGlow } from '@/components/firmament-glow';
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
 * Karte der Lichtbühne (Radius 28): oben die Bühne mit dem Lichtschein (Grund `bgColor` des Rolls, hell die Kartenfarbe
 * mit feiner Kante), darunter der übrige Inhalt mit eigenem Rand. Der Schein endet an der Haarlinie – dem Horizont.
 */
export function HeroCard({ stage, children }: { stage: ReactNode; children?: ReactNode }) {
  const theme = useTheme();
  const { dark, line } = useStageColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: dark ? FIRMAMENT_DARK.bgColor : theme.backgroundElement, borderColor: dark ? 'rgba(255,255,255,0.06)' : theme.hairline },
      ]}>
      <View style={styles.stage}>
        <FirmamentGlow id="day-hero" />
        {stage}
      </View>
      {children ? <View style={[styles.below, { borderColor: line }]}>{children}</View> : null}
    </View>
  );
}

/**
 * Tagesübersicht nach altitude-stats (schmale Fassung): oben mittig der Ring mit Prozent vom Ziel (ohne Ziel die
 * gegessenen kcal), unter der Haarlinie links „Gegessen“ (zählt hoch), rechts „Übrig“ bzw. „Drüber“ (Rot), in der Mitte
 * Punkt und Ziel. Darunter die Makro-Leiste (Wert, dünner Balken, Ziel bzw. Anteil) – ohne graue Kacheln.
 * Leerer Tag (`empty`): Ring bei 0 %, darunter der mitgegebene Hinweis statt der Zahlen.
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
  const counted = useCountUp(eaten, !empty, true);
  const left = goal === null ? null : goal - eaten;
  const over = left !== null && left < 0;
  const unknownKcal = totals.unknown.kcal > 0;
  const percent = goal ? Math.round((eaten / goal) * 100) : null;
  const macroKcal = MACROS.reduce((s, k) => s + totals.values[k] * KCAL_PER_G[k], 0);
  const ringLabel = `${t('nutrition.summary.eaten')} ${unknownKcal ? '≥ ' : ''}${formatNumber(eaten, 0)} kcal${
    goal !== null
      ? `, ${t('nutrition.summary.goalLine', { value: formatNumber(goal, 0) })}, ${t('nutrition.summary.percent', { value: percent ?? 0 })} ${t('nutrition.summary.ofGoal')}`
      : ''
  }`;

  const stage = (
    <View style={styles.stageInner}>
      <ProgressRing growIn progress={goal ? eaten / goal : 0} size={168} stroke={12} color={over ? theme.danger : colors.data} trackColor={colors.track}>
        <View style={styles.ringCenter} accessible accessibilityLabel={ringLabel}>
          <ThemedText style={styles.ringValue} numberOfLines={1} adjustsFontSizeToFit>
            {goal ? t('nutrition.summary.percent', { value: formatNumber(percent ?? 0, 0) }) : formatNumber(eaten, 0)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {goal ? t('nutrition.summary.ofGoal') : unknownKcal ? '≥ kcal' : 'kcal'}
          </ThemedText>
        </View>
      </ProgressRing>
      {empty ? <View style={styles.empty}>{empty}</View> : null}
    </View>
  );

  if (empty) return <HeroCard stage={stage}>{children}</HeroCard>;

  return (
    <HeroCard stage={stage}>
      <View style={styles.stats}>
        <View style={styles.stat} accessible accessibilityLabel={`${t('nutrition.summary.eaten')} ${unknownKcal ? '≥ ' : ''}${formatNumber(eaten, 0)} kcal`}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('nutrition.summary.eaten')}
          </ThemedText>
          <ThemedText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {unknownKcal ? '≥ ' : ''}
            {formatNumber(Math.round(counted), 0)}
            <ThemedText themeColor="textSecondary" style={styles.unit}>
              {' kcal'}
            </ThemedText>
          </ThemedText>
        </View>
        <View
          style={styles.middle}
          accessible
          accessibilityLabel={goal === null ? t('nutrition.summary.noGoalShort') : t('nutrition.summary.goalLine', { value: formatNumber(goal, 0) })}>
          <View style={[styles.dot, { backgroundColor: over ? theme.danger : colors.data }]} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.middleText}>
            {goal === null ? t('nutrition.summary.noGoalShort') : t('nutrition.summary.goalLine', { value: formatNumber(goal, 0) })}
          </ThemedText>
        </View>
        <View
          style={[styles.stat, styles.statRight]}
          accessible
          accessibilityLabel={`${over ? t('nutrition.summary.over') : t('nutrition.summary.left')} ${left === null ? '–' : `${formatNumber(Math.abs(left), 0)} kcal`}`}>
          <ThemedText type="small" style={{ color: over ? theme.danger : theme.textSecondary }}>
            {over ? t('nutrition.summary.over') : t('nutrition.summary.left')}
          </ThemedText>
          <ThemedText style={[styles.statValue, over && { color: theme.danger }]} numberOfLines={1} adjustsFontSizeToFit>
            {left === null ? '–' : `${unknownKcal && !over ? '≤ ' : ''}${formatNumber(Math.abs(left), 0)}`}
            <ThemedText themeColor="textSecondary" style={styles.unit}>
              {left === null ? '' : ' kcal'}
            </ThemedText>
          </ThemedText>
        </View>
      </View>

      <View style={styles.macros}>
        {MACROS.map((k) => {
          const target = macroGoals ? macroGoals[k] : null;
          const share = macroKcal > 0 ? Math.round(((totals.values[k] * KCAL_PER_G[k]) / macroKcal) * 100) : 0;
          const sub = target ? t('nutrition.summary.ofGrams', { value: formatNumber(target, 0) }) : t('nutrition.summary.share', { value: share });
          return (
            <View
              key={k}
              style={styles.macro}
              accessible
              accessibilityLabel={`${t(`nutrition.${k}`)} ${atLeast(totals, k)}${grams(totals.values[k])} g, ${sub}`}>
              <View style={styles.macroHead}>
                <View style={[styles.macroDot, { backgroundColor: colors.macro[k] }]} />
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
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
  stageInner: { alignItems: 'center', gap: Spacing.three },
  below: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four - 4,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four - 4,
    gap: Spacing.four - 4,
  },
  ringCenter: { alignItems: 'center', paddingHorizontal: Spacing.three },
  ringValue: { fontFamily: DisplayFont.bold, fontSize: 34, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: Spacing.three, alignSelf: 'stretch' },
  stats: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  stat: { flex: 1, minWidth: 0, gap: Spacing.half },
  statRight: { alignItems: 'flex-end' },
  statValue: { fontFamily: DisplayFont.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: undefined, fontSize: 14, letterSpacing: 0, fontWeight: 500 },
  middle: { alignItems: 'center', gap: Spacing.two + 2, paddingTop: 7 },
  middleText: { fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3 },
  macros: { flexDirection: 'row', gap: Spacing.three },
  macro: { flex: 1, minWidth: 0, gap: Spacing.one + 2 },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  macroDot: { width: 7, height: 7, borderRadius: 3.5 },
  macroValue: { fontFamily: DisplayFont.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  macroSub: { fontSize: 12, lineHeight: 16 },
});
