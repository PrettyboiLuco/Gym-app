import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { haptic } from '@/components/haptics';
import { FIGURE, OUTLINE, TOP_DOWN, VIEWBOX, type Region } from '@/components/muscle-figure';
import { ThemedText } from '@/components/themed-text';
import { MapFade } from '@/constants/motion';
import { MuscleRamp, Spacing } from '@/constants/theme';
import type { MuscleGroup } from '@/domain/exercises';
import { muscleLevel } from '@/domain/training-stats';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const STOPS = [0, 1, 2, 3, 4];
const EASE = Easing.bezier(...MapFade.easing);
// Im Browser setzt Reanimated animierte SVG-Farben (fill/stroke) nicht um – dort steht die Farbe direkt am Ziel.
// Auf iOS/Android gleitet sie (fill und stroke sind dort animierbare Farbeigenschaften).
const STATIC_COLOR = Platform.OS === 'web';

type Sets = Partial<Record<MuscleGroup, number>>;
/** change = steht beim Öffnen, gleitet bei neuen Werten · grow = füllt sich einmal auf (nur Abschluss-Bildschirm). */
type Mode = 'change' | 'grow';

/** Stufe einer Muskelgruppe als animierter Wert (0…4). Bei „Bewegung reduzieren“ springt er sofort ans Ziel. */
function useLevel(target: number, order: number, mode: Mode): SharedValue<number> {
  const reduced = useReducedMotion();
  const value = useSharedValue(mode === 'grow' && !reduced ? 0 : target);
  useEffect(() => {
    if (reduced) {
      value.set(target);
      return;
    }
    const grow = mode === 'grow';
    const delay = (grow ? MapFade.growDelayMs : 0) + order * MapFade.staggerMs;
    value.set(withDelay(delay, withTiming(target, { duration: grow ? MapFade.growMs : MapFade.durationMs, easing: EASE })));
  }, [mode, order, reduced, target, value]);
  return value;
}

function useRamp(): string[] {
  const dark = useColorScheme() === 'dark';
  return useMemo(() => [...(dark ? MuscleRamp.dark : MuscleRamp.light)], [dark]);
}

/** Eine Fläche; die Farbe folgt dem Wert der Gruppe. */
function MusclePath({
  d,
  level,
  target,
  ramp,
  base,
  gap,
  outline,
  onPress,
}: {
  d: string;
  level: SharedValue<number>;
  target: number;
  ramp: string[];
  base: string;
  gap: number;
  outline: string | null;
  onPress?: () => void;
}) {
  const animated = useAnimatedProps(() => ({ fill: interpolateColor(level.value, STOPS, ramp) }));
  return (
    <AnimatedPath
      d={d}
      {...(STATIC_COLOR ? { fill: ramp[target] } : { animatedProps: animated })}
      // Die Fugen sind eine Kontur in Körperfarbe: überall gleich breit, egal wie groß die Figur ist.
      stroke={outline ?? base}
      strokeWidth={outline ? gap * 1.1 : gap}
      strokeLinejoin="round"
      onPress={onPress}
    />
  );
}

function GroupPaths({
  region,
  target,
  mode,
  ramp,
  base,
  gap,
  outline,
  onPress,
}: {
  region: Region;
  target: number;
  mode: Mode;
  ramp: string[];
  base: string;
  gap: number;
  outline: string | null;
  onPress?: (g: MuscleGroup) => void;
}) {
  const level = useLevel(target, TOP_DOWN[region.group], mode);
  return (
    <>
      {region.paths.map((d, i) => (
        <MusclePath
          key={i}
          d={d}
          level={level}
          target={target}
          ramp={ramp}
          base={base}
          gap={gap}
          outline={outline}
          onPress={onPress ? () => onPress(region.group) : undefined}
        />
      ))}
    </>
  );
}

/** Umriss in der Datenfarbe = Ganzkörper-Übungen (sie gehören zu keinem einzelnen Muskel). */
function WholeBodyRing({ target, mode, ramp, base, gap }: { target: number; mode: Mode; ramp: string[]; base: string; gap: number }) {
  const level = useLevel(target, TOP_DOWN.ganzkoerper, mode);
  const colors = useMemo(() => [base, ...ramp.slice(1)], [base, ramp]);
  const animated = useAnimatedProps(() => ({ stroke: interpolateColor(level.value, STOPS, colors) }));
  return (
    <AnimatedPath
      d={OUTLINE}
      fill="none"
      {...(STATIC_COLOR ? { stroke: colors[target] } : { animatedProps: animated })}
      strokeWidth={gap * 1.2}
      strokeLinejoin="round"
    />
  );
}

/**
 * Eine Ansicht (vorne oder hinten): Umriss als ein Pfad, darüber die Muskeln beider Seiten in der Farbe ihrer Stufe,
 * zuletzt der Ganzkörper-Rand. `ready = false` zeigt nur den Umriss (Daten laden noch – keine falschen grauen Muskeln).
 */
function Figure({
  regions,
  width,
  height,
  gap,
  levels,
  whole,
  mode = 'change',
  ready = true,
  selected = null,
  onSelect,
}: {
  regions: readonly Region[];
  width: number;
  height: number;
  gap: number;
  levels: (g: MuscleGroup) => number;
  whole: number;
  mode?: Mode;
  ready?: boolean;
  selected?: MuscleGroup | null;
  onSelect?: (g: MuscleGroup | null) => void;
}) {
  const theme = useTheme();
  const ramp = useRamp();
  const base = theme.backgroundSelected;
  return (
    <Svg width={width} height={height} viewBox={VIEWBOX} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={OUTLINE} fill={base} onPress={onSelect ? () => onSelect(null) : undefined} />
      {ready
        ? regions.map((region) => (
            <GroupPaths
              key={region.group}
              region={region}
              target={levels(region.group)}
              mode={mode}
              ramp={ramp}
              base={base}
              gap={gap}
              outline={selected === region.group ? theme.text : null}
              onPress={onSelect}
            />
          ))
        : null}
      {ready ? <WholeBodyRing target={whole} mode={mode} ramp={ramp} base={base} gap={gap} /> : null}
    </Svg>
  );
}

/**
 * Muskel-Körperkarte (A8.5): Arbeitssätze der Woche je Muskelgruppe, vorne und hinten. Zeigt nur die Menge, keine
 * „Erholung in %“. Die Zahlen stehen zusätzlich als Liste daneben (nicht nur über Farbe). Antippen eines Muskels zeigt
 * seine Zahl; wechselt die Woche, gleiten die Farben zum neuen Wert.
 */
export function MuscleMap({ sets, ready = true }: { sets: Sets; ready?: boolean }) {
  const theme = useTheme();
  const ramp = useRamp();
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  const level = (g: MuscleGroup) => muscleLevel(sets[g] ?? 0);
  const whole = sets.ganzkoerper ?? 0;
  const select = (g: MuscleGroup | null) => {
    const next = g === selected ? null : g;
    if (next) haptic.tap();
    setSelected(next);
  };
  const figure = (regions: readonly Region[], label: string) => (
    <View style={styles.figure}>
      <Figure
        regions={regions}
        width={124}
        height={265}
        gap={1}
        levels={level}
        whole={muscleLevel(whole)}
        ready={ready}
        selected={selected}
        onSelect={select}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
  return (
    <View>
      <View style={styles.row}>
        {figure(FIGURE.front, t('stats.front'))}
        {figure(FIGURE.back, t('stats.back'))}
      </View>
      <ThemedText type="small" style={styles.picked} themeColor={selected ? 'text' : 'textSecondary'} accessibilityLiveRegion="polite">
        {selected ? t('stats.tapped', { muscle: t(`muscle.${selected}`), count: sets[selected] ?? 0 }) : t('stats.tapHint')}
      </ThemedText>
      <View style={styles.legend}>
        {[0, 1, 2, 3, 4].map((lv) => (
          <View key={lv} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: ramp[lv] }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {t(`stats.level.${lv}`)}
            </ThemedText>
          </View>
        ))}
      </View>
      {whole > 0 ? (
        <View style={[styles.legendItem, styles.wholeNote]}>
          <View style={[styles.swatch, styles.ring, { borderColor: ramp[muscleLevel(whole)], backgroundColor: theme.backgroundSelected }]} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('stats.wholeBody', { count: whole })}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/** Trainiert ja/nein: alles mit Sätzen in der vollen Datenfarbe (kleine Karten). */
const onOff = (sets: Sets) => (g: MuscleGroup) => ((sets[g] ?? 0) > 0 ? 4 : 0);

/**
 * Kleine Muskelkarte für die Karte auf „Heute“ (U4): vorne und hinten ohne Legende, vereinfachte Zeichnung (weniger,
 * größere Flächen), die Muskeln des heutigen Plantags in der Datenfarbe. Die Muskeln stehen im Text für VoiceOver.
 */
export function MuscleMapMini({ sets, label }: { sets: Sets; label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.mini}>
      {[FIGURE.frontMini, FIGURE.backMini].map((regions, i) => (
        <Figure key={i} regions={regions} width={54} height={116} gap={1.6} levels={onOff(sets)} whole={(sets.ganzkoerper ?? 0) > 0 ? 4 : 0} />
      ))}
    </View>
  );
}

/**
 * Abschluss-Bildschirm (U5): die heute trainierten Muskeln füllen sich einmal auf – Erfolgsmoment als Rückmeldung,
 * nicht als Auftritt. Bei „Bewegung reduzieren“ stehen sie sofort.
 */
export function MuscleMapDone({ sets, label }: { sets: Sets; label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.row}>
      {[FIGURE.front, FIGURE.back].map((regions, i) => (
        <Figure key={i} regions={regions} width={100} height={214} gap={1.2} levels={onOff(sets)} whole={(sets.ganzkoerper ?? 0) > 0 ? 4 : 0} mode="grow" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mini: { flexDirection: 'row', gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  figure: { alignItems: 'center', gap: Spacing.one },
  picked: { textAlign: 'center', marginTop: Spacing.two },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wholeNote: { justifyContent: 'center', marginTop: Spacing.one },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  ring: { borderWidth: 2 },
});
