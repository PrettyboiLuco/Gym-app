import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Glyph, type GlyphName } from '@/components/glyph';
import { ThemedText } from '@/components/themed-text';
import { Spring, WordRise } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

/**
 * Panel oben: worum es heute geht und ein Knopf, der direkt dorthin führt.
 * Dunkle (bzw. weiße) Fläche mit weichem Lime-Schein in der Ecke; Lime selbst nur auf dem Knopf –
 * der Akzent wird sparsam eingesetzt (getlayers-Regel „the accent is rationed“).
 */
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
  const scheme = useColorScheme();
  const press = usePress();
  return (
    <Animated.View entering={entering(0)} style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[eyebrow, title, text, action].filter(Boolean).join('. ')}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[styles.hero, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
        <Glow color={theme.accent} strength={scheme === 'dark' ? 0.32 : 0.55} />
        <View style={styles.eyebrowRow}>
          <View style={[styles.dot, { backgroundColor: scheme === 'dark' ? theme.accent : theme.tint, shadowColor: theme.accent }]} />
          <ThemedText type="eyebrow" style={{ color: theme.tint }}>
            {eyebrow}
          </ThemedText>
        </View>
        <ThemedText type="title" style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit>
          {title}
        </ThemedText>
        {text ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.heroText}>
            {text}
          </ThemedText>
        ) : null}
        <View style={[styles.heroAction, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            {action}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            →
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Weicher Lichtschein oben rechts (radialer Verlauf), trägt keinen Inhalt. */
function Glow({ color, strength }: { color: string; strength: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="heroGlow" cx="92%" cy="0%" rx="75%" ry="95%" fx="92%" fy="0%">
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="0.55" stopColor={color} stopOpacity={strength * 0.25} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGlow)" />
      </Svg>
    </View>
  );
}

/** Kachel mit großer Zahl. `visual` sitzt oben rechts (Ring) oder unten (Balken, Kurve, Punkte). */
export function StatTile({
  index,
  icon,
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
  icon: GlyphName;
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
        style={[styles.tile, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
        <View style={styles.tileHead}>
          <View style={styles.tileLabel}>
            <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
              <Glyph name={icon} color={theme.text} size={15} />
            </View>
            <ThemedText type="eyebrow" themeColor="textSecondary" numberOfLines={1} style={styles.tileLabelText}>
              {label}
            </ThemedText>
          </View>
          {corner}
        </View>
        <View style={styles.tileBody}>
          <View style={styles.valueRow}>
            <ThemedText type="subtitle" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
              {value}
            </ThemedText>
            {unit ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.unit}>
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
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
    minHeight: 236,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 7, height: 7, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  heroTitle: { fontSize: 40, lineHeight: 46, letterSpacing: -1.2, marginTop: Spacing.three },
  heroText: { maxWidth: 300 },
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
  tile: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: Spacing.three,
    minHeight: 164,
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 30, gap: Spacing.one },
  tileLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
  tileLabelText: { flexShrink: 1, fontSize: 11, letterSpacing: 0.9 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  unit: { fontWeight: 600 },
  tileBody: { gap: Spacing.one },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  value: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8, fontVariant: ['tabular-nums'], flexShrink: 1 },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.one },
  weekDay: { alignItems: 'center', gap: 2 },
  weekDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  weekLabel: { fontSize: 10, lineHeight: 12 },
});
