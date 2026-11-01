import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Button } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spring } from '@/constants/motion';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
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

/** Ein Tag der Trainingswoche. */
export type WeekDay = { label: string; done: boolean; planned: boolean; today: boolean };

export function TrainingBlock({
  label,
  title,
  meta,
  week,
  weekSummary,
  action,
  onPress,
}: {
  label: string;
  title: string;
  meta?: string | null;
  week: WeekDay[];
  weekSummary: string;
  action: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <View style={styles.head}>
        <ThemedText themeColor="textSecondary" style={styles.label}>
          {label}
        </ThemedText>
        <ThemedText type="title" style={styles.answer} numberOfLines={2} accessibilityRole="header">
          {title}
        </ThemedText>
        {meta ? <ThemedText themeColor="textSecondary">{meta}</ThemedText> : null}
      </View>
      <WeekStrip days={week} summary={weekSummary} />
      <View style={styles.action}>
        <Button label={action} onPress={onPress} />
      </View>
    </View>
  );
}

/**
 * Mo–So: gefüllt (Lime) = Training abgeschlossen, Ring = geplanter Trainingstag laut Coach,
 * heute in voller Schrift und mit kräftigerem Ring. Die Zusammenfassung trägt die Zahl in Worten.
 */
export function WeekStrip({ days, summary, celebrateToday = false }: { days: WeekDay[]; summary: string; celebrateToday?: boolean }) {
  const theme = useTheme();
  // Datenfarbe: dunkel Lime, hell das dunklere Grün (Lime auf Weiß hätte unter 3:1 Kontrast).
  const doneColor = useColorScheme() === 'dark' ? theme.accent : theme.tint;
  const description = days.map((d) => `${d.label}: ${d.done ? t('today.weekDone') : d.planned ? t('today.weekPlanned') : t('today.weekFree')}`).join(', ');
  return (
    <View accessible accessibilityLabel={`${summary}. ${description}`} style={styles.weekWrap}>
      <View style={styles.week}>
        {days.map((d, i) => (
          <View key={i} style={styles.day}>
            <ThemedText type="small" themeColor={d.today ? 'text' : 'textSecondary'} style={[styles.dayLabel, d.today && styles.dayLabelToday]}>
              {d.label}
            </ThemedText>
            <DayDot
              pop={celebrateToday && d.today && d.done}
              style={[
                styles.dot,
                d.done
                  ? { backgroundColor: doneColor, borderColor: doneColor }
                  : {
                      backgroundColor: theme.backgroundSelected,
                      borderColor: d.today ? theme.text : d.planned ? theme.textSecondary : 'transparent',
                      borderWidth: d.today ? 2 : 1.5,
                    },
              ]}
            />
          </View>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {summary}
      </ThemedText>
    </View>
  );
}

/** Ein Tagespunkt; `pop` lässt ihn einmal auffedern (Abschluss-Bildschirm: der heute verdiente Punkt). */
function DayDot({ pop, style }: { pop: boolean; style: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(pop && !reduced ? 0.3 : 1);
  useEffect(() => {
    if (pop && !reduced) scale.set(withDelay(250, withSpring(1, { ...Spring, stiffness: 260, damping: 12 })));
  }, [pop, reduced, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animated]} />;
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
  return (
    <View style={[styles.strip, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      {figures.map((f, i) => (
        <FigureCell key={f.label} figure={f} divider={i > 0 ? theme.backgroundSelected : null} />
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
  label: { fontSize: 14, lineHeight: 20 },
  answer: { marginTop: Spacing.half },
  weekWrap: { gap: Spacing.two },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: Spacing.two, minWidth: 36 },
  dayLabel: { fontSize: 12, lineHeight: 16 },
  dayLabelToday: { fontWeight: 600 },
  dot: { width: 30, height: 30, borderRadius: 15 },
  action: { alignItems: 'flex-start' },
  strip: { flexDirection: 'row', borderRadius: Radius.card, borderWidth: 1, paddingVertical: Spacing.three },
  cellWrap: { flex: 1 },
  cell: { paddingHorizontal: Spacing.three - 2, gap: Spacing.one, minHeight: 44 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, flexWrap: 'wrap' },
  value: { fontFamily: DisplayFont.semiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  missing: { fontSize: 16, lineHeight: 30 },
  sub: { fontSize: 12, lineHeight: 16 },
});
