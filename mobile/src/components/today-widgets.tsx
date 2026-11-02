import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Button } from '@/components/card';
import { MuscleMapMini } from '@/components/muscle-map';
import { ThemedText } from '@/components/themed-text';
import { Spring } from '@/constants/motion';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import type { MuscleGroup } from '@/domain/exercises';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Bausteine für „Heute“, nach taste-skill (App-Bildschirme, Stil „True-black flat“):
 * - Die Frage des Bildschirms: „Was steht heute an, und bin ich auf Kurs?“ Der größte Block beantwortet sie:
 *   das Training mit der Trainingswoche – das Element, das nur diese App hat.
 * - Kennzahlen sind Schrift, keine Kacheln: ein Feld, durch 1-px-Linien geteilt, Beschriftung über dem Wert.
 * - Lime nur auf Daten (erledigte Tage, Balken); der Knopf ist die invertierte Pille.
 */

/** Ein Tag der Trainingswoche; mit Sätzen zeigt die Woche Balken statt Punkten (Satz-Woche, T1). */
export type WeekDay = { label: string; done: boolean; planned: boolean; today: boolean; doneSets?: number; plannedSets?: number };

export function TrainingBlock({
  label,
  title,
  meta,
  week,
  weekSummary,
  action,
  onPress,
  muscles,
  spared = [],
}: {
  label: string;
  title: string;
  meta?: string | null;
  week: WeekDay[];
  weekSummary: string;
  action: string;
  onPress: () => void;
  /** Geplante Sätze je Muskel des heutigen Plantags (U4); ohne = keine Karte. */
  muscles?: Partial<Record<MuscleGroup, number>> | null;
  /** Geschonte Bereiche (Status „verletzt“): gestrichelt auf der kleinen Karte, Hinweis bei Überschneidung. */
  spared?: readonly MuscleGroup[];
}) {
  const theme = useTheme();
  const groups = muscles ? (Object.keys(muscles) as MuscleGroup[]).filter((g) => (muscles[g] ?? 0) > 0) : [];
  const overlap = groups.filter((g) => spared.includes(g));
  return (
    <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <View style={styles.headRow}>
        <View style={[styles.head, styles.flex]}>
          <ThemedText themeColor="textSecondary" style={styles.label}>
            {label}
          </ThemedText>
          <ThemedText type="title" style={styles.answer} numberOfLines={2} accessibilityRole="header">
            {title}
          </ThemedText>
          {meta ? <ThemedText themeColor="textSecondary">{meta}</ThemedText> : null}
        </View>
        {groups.length ? (
          <MuscleMapMini sets={muscles!} spared={spared} label={t('today.musclesToday', { list: groups.map((g) => t(`muscle.${g}`)).join(', ') })} />
        ) : null}
      </View>
      {overlap.length ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {t('today.sparedHint', { list: overlap.map((g) => t(`muscle.${g}`)).join(', ') })}
        </ThemedText>
      ) : null}
      <WeekStrip days={week} summary={weekSummary} />
      <View style={styles.action}>
        <Button label={action} onPress={onPress} />
      </View>
    </View>
  );
}

/** Die sieben Tage der Satz-Woche aus den Wochendaten – eine Stelle für „Heute“, Training und Abschluss. */
export function weekDays(week: { done: boolean[]; planned: boolean[]; todayIndex: number; doneSets?: number[]; plannedSets?: number[] }): WeekDay[] {
  return [1, 2, 3, 4, 5, 6, 7].map((d, i) => ({
    label: t(`reminders.dayShort.${d}`),
    done: !!week.done[i],
    planned: !!week.planned[i],
    today: i === week.todayIndex,
    doneSets: week.doneSets?.[i] ?? 0,
    plannedSets: week.plannedSets?.[i] ?? 0,
  }));
}

/** Höhe der Balkenfläche in der Satz-Woche. */
const BAR_AREA = 56;

/**
 * Satz-Woche (Phase 1 Scan, T1 – nach Lucs eigenem Plan „Balken: Sätze pro Training“): je Tag ein Balken, so hoch wie
 * die geplanten Sätze (dunkle Fläche), erledigte Sätze in der Datenfarbe darüber. Ruhetag = kurze Linie, heute = feine
 * Linie in der Datenfarbe. Oben die Sätze der Woche, darunter die Tage in Worten. Lime nur auf Daten (taste-skill).
 */
export function WeekStrip({ days, summary, celebrateToday = false }: { days: WeekDay[]; summary: string; celebrateToday?: boolean }) {
  const theme = useTheme();
  // Datenfarbe: dunkel Lime, hell das dunklere Grün (Lime auf Weiß hätte unter 3:1 Kontrast).
  const doneColor = useColorScheme() === 'dark' ? theme.accent : theme.tint;
  const planned = days.reduce((n, d) => n + (d.plannedSets ?? 0), 0);
  const done = days.reduce((n, d) => n + (d.doneSets ?? 0), 0);
  const max = Math.max(1, ...days.map((d) => Math.max(d.plannedSets ?? 0, d.doneSets ?? 0)));
  const headline = planned > 0 ? t('today.weekSets', { done, planned }) : t('today.weekSetsDone', { count: done });
  const description = days
    .map((d) =>
      (d.plannedSets ?? 0) > 0 || (d.doneSets ?? 0) > 0
        ? t('today.weekDaySets', { day: d.label, done: d.doneSets ?? 0, planned: d.plannedSets ?? 0 })
        : d.done
          ? t('today.weekDayDone', { day: d.label })
          : t('today.weekDayRest', { day: d.label })
    )
    .join(', ');
  return (
    <View accessible accessibilityLabel={`${headline}. ${summary}. ${description}`} style={styles.weekWrap}>
      <ThemedText type="smallBold" style={styles.weekHeadline}>
        {headline}
      </ThemedText>
      <View style={styles.week}>
        {days.map((d, i) => {
          const plan = d.plannedSets ?? 0;
          const did = d.doneSets ?? 0;
          // Cardio ohne Sätze zählt als Trainingstag: kleiner Balken in der Datenfarbe.
          const doneHeight = did > 0 ? Math.max(6, (BAR_AREA * did) / max) : d.done ? 6 : 0;
          const planHeight = plan > 0 ? Math.max(8, (BAR_AREA * plan) / max) : d.planned ? BAR_AREA / 2 : 0;
          const figure = did > 0 ? String(did) : plan > 0 ? String(plan) : '';
          return (
            <View key={i} style={styles.day}>
              <ThemedText type="small" themeColor={d.today ? 'text' : 'textSecondary'} style={[styles.dayLabel, d.today && styles.dayLabelToday]}>
                {d.label}
              </ThemedText>
              <View style={styles.barArea}>
                {planHeight > 0 ? (
                  <View style={[styles.bar, { height: planHeight, backgroundColor: theme.backgroundSelected }]} />
                ) : doneHeight === 0 ? (
                  <View style={[styles.rest, { backgroundColor: theme.backgroundSelected }]} />
                ) : null}
                {doneHeight > 0 ? <DoneBar height={doneHeight} color={doneColor} grow={celebrateToday && d.today} /> : null}
              </View>
              <ThemedText type="small" themeColor={did > 0 ? 'text' : 'textSecondary'} style={styles.dayFigure}>
                {figure}
              </ThemedText>
              <View style={[styles.todayMark, { backgroundColor: d.today ? doneColor : 'transparent' }]} />
            </View>
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {summary}
      </ThemedText>
    </View>
  );
}

/** Erledigte Sätze eines Tages; `grow` lässt den heutigen Balken einmal auffedern (Abschluss-Bildschirm, U5). */
function DoneBar({ height, color, grow }: { height: number; color: string; grow: boolean }) {
  const reduced = useReducedMotion();
  const h = useSharedValue(grow && !reduced ? 0 : height);
  useEffect(() => {
    h.set(grow && !reduced ? withDelay(250, withSpring(height, { ...Spring, stiffness: 260, damping: 12 })) : height);
  }, [grow, reduced, height, h]);
  const animated = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[styles.bar, styles.doneBar, { backgroundColor: color }, animated]} />;
}

export type Figure = {
  label: string;
  /** null = noch kein Wert → grauer Strich in kleiner Größe. */
  value: string | null;
  unit?: string;
  sub?: string | null;
  accessibilityLabel: string;
  onPress: () => void;
};

/** Kennzahlen als Schrift: ein Feld, gleich breite Spalten, 1-px-Trenner, Wert in Manrope mit Tabellenziffern. */
export function FigureStrip({ figures }: { figures: Figure[] }) {
  const theme = useTheme();
  // Vier Werte als 2 × 2 statt vier enger Spalten (taste-skill, Handy); sonst eine Reihe.
  const rows = figures.length === 4 ? [figures.slice(0, 2), figures.slice(2)] : [figures];
  return (
    <View style={[styles.stripBox, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.strip, r > 0 && { borderTopWidth: 1, borderTopColor: theme.backgroundSelected }]}>
          {row.map((f, i) => (
            <FigureCell key={f.label} figure={f} divider={i > 0 ? theme.backgroundSelected : null} />
          ))}
        </View>
      ))}
    </View>
  );
}

function FigureCell({ figure, divider }: { figure: Figure; divider: string | null }) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.cellWrap, divider ? { borderLeftWidth: 1, borderLeftColor: divider } : null, pressStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={figure.accessibilityLabel}
        onPress={figure.onPress}
        onPressIn={() => scale.set(withSpring(0.96, Spring))}
        onPressOut={() => scale.set(withSpring(1, Spring))}
        style={styles.cell}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {figure.label}
        </ThemedText>
        {figure.value === null ? (
          <ThemedText themeColor="textSecondary" style={styles.missing}>
            –
          </ThemedText>
        ) : (
          <View style={styles.valueRow}>
            <ThemedText style={styles.value} numberOfLines={1}>
              {figure.value}
            </ThemedText>
            {figure.unit ? (
              <ThemedText type="small" themeColor="textSecondary">
                {figure.unit}
              </ThemedText>
            ) : null}
          </View>
        )}
        {figure.sub ? (
          <ThemedText themeColor="textSecondary" style={styles.sub} numberOfLines={2}>
            {figure.sub}
          </ThemedText>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.four - 2, gap: Spacing.four },
  head: { gap: Spacing.one },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1 },
  label: { fontSize: 14, lineHeight: 20 },
  answer: { marginTop: Spacing.half },
  weekWrap: { gap: Spacing.two },
  weekHeadline: { fontVariant: ['tabular-nums'] },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: Spacing.one, minWidth: 36 },
  dayLabel: { fontSize: 12, lineHeight: 16 },
  dayLabelToday: { fontWeight: 600 },
  barArea: { height: BAR_AREA, width: 22, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 22, borderRadius: 5 },
  doneBar: { position: 'absolute', bottom: 0 },
  rest: { width: 14, height: 3, borderRadius: 2 },
  dayFigure: { fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'], minHeight: 14 },
  todayMark: { width: 22, height: 2, borderRadius: 1 },
  action: { alignItems: 'flex-start' },
  stripBox: { borderRadius: Radius.card, borderWidth: 1 },
  strip: { flexDirection: 'row', paddingVertical: Spacing.three },
  cellWrap: { flex: 1 },
  cell: { paddingHorizontal: Spacing.three - 2, gap: Spacing.one, minHeight: 44 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, flexWrap: 'wrap' },
  value: { fontFamily: DisplayFont.semiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  missing: { fontSize: 16, lineHeight: 30 },
  sub: { fontSize: 12, lineHeight: 16 },
});
