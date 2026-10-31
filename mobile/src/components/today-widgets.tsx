import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spring, WordRise } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Bausteine für „Heute“. Aufbau nach getlayers.ai-Kompositionen:
 * - Trainings-Panel nach „lumora-stats“ (eingerücktes, farblich umgekehrtes Panel, Aussage oben links, große Zahl/Name)
 * - Kacheln nach „stride-stats“ (Bento-Raster, große Zahlen, Inhalt an der Kachelunterkante)
 * Gleiche Feder wie überall (constants/motion), Eingang nur auf dem Handy (siehe card.tsx).
 */

const entering = (index: number) =>
  Platform.OS === 'web'
    ? undefined
    : FadeInDown.delay(index * WordRise.staggerMs)
        .springify()
        .stiffness(Spring.stiffness)
        .damping(Spring.damping)
        .mass(Spring.mass)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 16 }] });

/** Leicht einfedern beim Drücken, wie die Knöpfe. */
function usePress() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => scale.set(withSpring(0.97, Spring)),
    onPressOut: () => scale.set(withSpring(1, Spring)),
  };
}

/** Großes Lime-Panel oben: worum es heute geht und ein Knopf, der direkt dorthin führt. */
export function HeroPanel({
  eyebrow,
  title,
  text,
  action,
  onPress,
}: {
  eyebrow: string;
  title: string;
  text?: string | null;
  action: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const press = usePress();
  return (
    <Animated.View entering={entering(0)} style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[eyebrow, title, text, action].filter(Boolean).join('. ')}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[styles.hero, { backgroundColor: theme.accent }]}>
        <HeroRings color={theme.onAccent} />
        <View style={styles.eyebrowRow}>
          <View style={[styles.dot, { backgroundColor: theme.onAccent }]} />
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            {eyebrow}
          </ThemedText>
        </View>
        <ThemedText type="title" style={[styles.heroTitle, { color: theme.onAccent }]} numberOfLines={2}>
          {title}
        </ThemedText>
        {text ? (
          <ThemedText type="small" style={[styles.heroText, { color: theme.onAccent }]}>
            {text}
          </ThemedText>
        ) : null}
        <View style={[styles.heroAction, { backgroundColor: theme.onAccent }]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            {action}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            →
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Dezente Kreisbögen oben rechts – geben dem Panel Tiefe, ohne Inhalt zu tragen. */
function HeroRings({ color }: { color: string }) {
  return (
    <View style={styles.rings} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={220} height={220}>
        {[50, 80, 110].map((r, i) => (
          <Circle key={r} cx={170} cy={50} r={r} stroke={color} strokeOpacity={0.1 - i * 0.025} strokeWidth={14} fill="none" />
        ))}
      </Svg>
    </View>
  );
}

/** Kachel mit großer Zahl. `visual` sitzt oben rechts (Ring) oder unten (Balken, Kurve, Punkte). */
export function StatTile({
  index,
  label,
  value,
  unit,
  caption,
  corner,
  footer,
  accessibilityLabel,
  onPress,
}: {
  index: number;
  label: string;
  value: string;
  unit?: string;
  caption?: string | null;
  corner?: ReactNode;
  footer?: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const press = usePress();
  return (
    <Animated.View entering={entering(index)} style={[styles.tileWrap, press.style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.tileHead}>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
          {corner}
        </View>
        <View style={styles.tileBody}>
          <View style={styles.valueRow}>
            <ThemedText type="subtitle" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
              {value}
            </ThemedText>
            {unit ? (
              <ThemedText type="smallBold" themeColor="textSecondary">
                {unit}
              </ThemedText>
            ) : null}
          </View>
          {caption ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {caption}
            </ThemedText>
          ) : null}
          {footer}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Mini-Verlauf (z. B. Gewicht der letzten Messungen), ohne Achsen. */
export function Sparkline({ values, color, width = 120, height = 28 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(Math.max(...values) - min, 0.5);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 6) + 3, 3 + (1 - (v - min) / span) * (height - 6)] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts.at(-1)!;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={lx} cy={ly} r={3} fill={color} />
    </Svg>
  );
}

/** Sieben Punkte Mo–So: gefüllt = trainiert, Ring = heute. */
export function WeekDots({ done, todayIndex, labels }: { done: boolean[]; todayIndex: number; labels: string[] }) {
  const theme = useTheme();
  return (
    <View style={styles.week} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {done.map((d, i) => (
        <View key={i} style={styles.weekDay}>
          <View
            style={[
              styles.weekDot,
              {
                backgroundColor: d ? theme.accent : theme.backgroundSelected,
                borderColor: i === todayIndex ? theme.text : 'transparent',
              },
            ]}
          />
          <ThemedText type="small" themeColor={i === todayIndex ? 'text' : 'textSecondary'} style={styles.weekLabel}>
            {labels[i]}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.card + Spacing.one,
    padding: Spacing.four,
    paddingTop: Spacing.three + Spacing.one,
    gap: Spacing.two,
    overflow: 'hidden',
    minHeight: 220,
  },
  rings: { position: 'absolute', top: 0, right: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  heroTitle: { fontSize: 44, lineHeight: 50, letterSpacing: -1.2, marginTop: Spacing.two },
  heroText: { opacity: 0.75, maxWidth: 280 },
  heroAction: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    minHeight: 48,
    alignItems: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tileWrap: { flexBasis: '45%', flexGrow: 1 },
  tile: { borderRadius: Radius.card, padding: Spacing.three, minHeight: 156, justifyContent: 'space-between', gap: Spacing.two },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  tileBody: { gap: Spacing.one },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  value: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8, fontVariant: ['tabular-nums'], flexShrink: 1 },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.one },
  weekDay: { alignItems: 'center', gap: 2 },
  weekDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  weekLabel: { fontSize: 10, lineHeight: 12 },
});
