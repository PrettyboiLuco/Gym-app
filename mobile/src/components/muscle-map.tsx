import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { Segmented } from '@/components/fields';
import { haptic } from '@/components/haptics';
import { BODIES, BODIES_LIST, hitTest, sidesOf, VIEWBOX, type Body, type BodySet, type Region } from '@/components/muscle-figure';
import { ThemedText } from '@/components/themed-text';
import { MapFade } from '@/constants/motion';
import { BodyDetail, BodyHair, MuscleRamp, Spacing } from '@/constants/theme';
import type { MuscleGroup } from '@/domain/exercises';
import { MAP_GROUP, muscleValue, tallyByGroup, type MapMuscle, type MuscleTally } from '@/domain/muscle-map';
import { muscleLevel } from '@/domain/training-stats';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const STOPS = [0, 1, 2, 3, 4];
const EASE = Easing.bezier(...MapFade.easing);
// Im Browser setzt Reanimated animierte SVG-Farben (fill/stroke) nicht um – dort steht die Farbe direkt am Ziel.
// Auf iOS/Android gleitet sie (fill und stroke sind dort animierbare Farbeigenschaften).
const STATIC_COLOR = Platform.OS === 'web';
const VB_W = 100;
const VB_H = 214;

/** change = steht beim Öffnen, gleitet bei neuen Werten · grow = füllt sich einmal auf (nur Abschluss-Bildschirm). */
type Mode = 'change' | 'grow';
export const MAP_VIEWS = ['beide', 'vorne', 'hinten'] as const;
export type MapView = (typeof MAP_VIEWS)[number];
type Side = 'front' | 'back';

/** Stufe einer Fläche als animierter Wert (0…4). Bei „Bewegung reduzieren“ springt er sofort ans Ziel. */
function useLevel(target: number, row: number, mode: Mode): SharedValue<number> {
  const reduced = useReducedMotion();
  const value = useSharedValue(mode === 'grow' && !reduced ? 0 : target);
  useEffect(() => {
    if (reduced) {
      value.set(target);
      return;
    }
    const grow = mode === 'grow';
    const delay = (grow ? MapFade.growDelayMs : 0) + row * MapFade.staggerMs;
    value.set(withDelay(delay, withTiming(target, { duration: grow ? MapFade.growMs : MapFade.durationMs, easing: EASE })));
  }, [mode, row, reduced, target, value]);
  return value;
}

/** Läuft einmal von 0 auf 1, wenn die Komponente erscheint (Markierung, Strichelung). */
function useOnce(durationMs: number): SharedValue<number> {
  const reduced = useReducedMotion();
  const value = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) value.set(withTiming(1, { duration: durationMs, easing: EASE }));
  }, [durationMs, reduced, value]);
  return value;
}

function useRamp(): string[] {
  const dark = useColorScheme() === 'dark';
  return useMemo(() => [...(dark ? MuscleRamp.dark : MuscleRamp.light)], [dark]);
}

/**
 * Eine Fläche; die Farbe folgt dem Wert ihrer Region. Ist ein anderer Muskel angetippt, tritt sie weich zurück
 * (`focus` 0 → 1 in 200 ms), der gewählte bleibt voll sichtbar.
 */
function MusclePath({
  d,
  level,
  target,
  ramp,
  base,
  gap,
  dim,
  focus,
  chosen,
  shade,
}: {
  d: string;
  level: SharedValue<number>;
  target: number;
  ramp: string[];
  base: string;
  gap: number;
  dim: boolean;
  focus: SharedValue<number>;
  chosen: boolean;
  /** Verlauf für die runde 3D-Wirkung (Licht von links oben, dunklerer Rand) – null = flach. */
  shade: string | null;
}) {
  const own = dim ? 0.5 : 1;
  const animated = useAnimatedProps((): { opacity: number; fill?: string } => {
    const opacity = own * (chosen ? 1 : 1 - 0.45 * focus.value);
    return STATIC_COLOR ? { opacity } : { opacity, fill: interpolateColor(level.value, STOPS, ramp) };
  });
  const shading = useAnimatedProps(() => ({ opacity: own * (chosen ? 1 : 1 - 0.45 * focus.value) }));
  return (
    <>
      <AnimatedPath
        d={d}
        {...(STATIC_COLOR ? { fill: ramp[Math.round(target)] } : {})}
        animatedProps={animated}
        // Die Fugen sind eine Kontur in Körperfarbe: überall gleich breit, egal wie groß die Figur ist.
        stroke={base}
        strokeWidth={gap}
        strokeLinejoin="round"
      />
      {shade ? <AnimatedPath d={d} fill={shade} animatedProps={shading} /> : null}
    </>
  );
}

function RegionPaths({
  region,
  target,
  mode,
  ramp,
  base,
  gap,
  dim,
  focus,
  chosen,
  shade,
}: {
  region: Region;
  target: number;
  mode: Mode;
  ramp: string[];
  base: string;
  gap: number;
  dim: boolean;
  focus: SharedValue<number>;
  chosen: boolean;
  shade: string | null;
}) {
  const level = useLevel(target, region.row, mode);
  return (
    <>
      {region.paths.map((d, i) => (
        <MusclePath key={i} d={d} level={level} target={target} ramp={ramp} base={base} gap={gap} dim={dim} focus={focus} chosen={chosen} shade={shade} />
      ))}
    </>
  );
}

/** Umriss in der Datenfarbe = Ganzkörper-Übungen (sie gehören zu keinem einzelnen Muskel). */
function WholeBodyRing({ outline, target, mode, ramp, base, gap }: { outline: string; target: number; mode: Mode; ramp: string[]; base: string; gap: number }) {
  const level = useLevel(target, 9, mode);
  const colors = useMemo(() => [base, ...ramp.slice(1)], [base, ramp]);
  const animated = useAnimatedProps(() => ({ stroke: interpolateColor(level.value, STOPS, colors) }));
  return (
    <AnimatedPath
      d={outline}
      fill="none"
      {...(STATIC_COLOR ? { stroke: colors[target] } : { animatedProps: animated })}
      strokeWidth={gap * 1.2}
      strokeLinejoin="round"
    />
  );
}

/** Markierung des angetippten Muskels: der Rand zeichnet sich in 160 ms ein (Punkt 4). */
function Highlight({ paths, color, gap }: { paths: string[]; color: string; gap: number }) {
  const p = useOnce(160);
  const animated = useAnimatedProps(() => ({ strokeWidth: gap * 1.5 * p.value, opacity: p.value }));
  return (
    <>
      {paths.map((d, i) => (
        <AnimatedPath key={i} d={d} fill="none" stroke={color} strokeLinejoin="round" animatedProps={animated} />
      ))}
    </>
  );
}

/** Geschonter Bereich: gestrichelter Rand in Warnfarbe, läuft beim Erscheinen einmal in 600 ms ein (Punkt 6). */
function SparedOutline({ paths, color, gap }: { paths: string[]; color: string; gap: number }) {
  const p = useOnce(600);
  const dash = gap * 2;
  const animated = useAnimatedProps(() => ({ strokeDashoffset: (1 - p.value) * dash * 12, opacity: Math.min(1, p.value * 2) }));
  return (
    <>
      {paths.map((d, i) => (
        <AnimatedPath
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={gap * 0.9}
          strokeDasharray={`${dash} ${dash * 0.8}`}
          strokeLinecap="round"
          animatedProps={animated}
        />
      ))}
    </>
  );
}

/**
 * Eine Ansicht: Umriss als ein Pfad, darüber die Flächen in der Farbe ihrer Stufe, dann Ganzkörper-Rand, geschonte
 * Bereiche und die Markierung. `ready = false` zeigt nur den Umriss (Daten laden noch – keine falschen grauen Muskeln).
 * Angetippt wird die ganze Figur; welche Fläche gemeint ist, rechnet `hitTest` aus (mit Fangradius).
 */
function Figure({
  regions,
  outline,
  shadow = false,
  width,
  height,
  gap,
  level,
  whole,
  mode = 'change',
  ready = true,
  spared = [],
  selected = null,
  onSelect,
  details,
}: {
  regions: readonly Region[];
  /** Körperumriss der gewählten Körperform. */
  outline: string;
  /** Weicher Bodenschatten unter den Füßen (große Karten). */
  shadow?: boolean;
  width: number;
  height: number;
  gap: number;
  level: (r: Region) => number;
  whole: number;
  mode?: Mode;
  ready?: boolean;
  spared?: readonly MuscleGroup[];
  selected?: MapMuscle | null;
  onSelect?: (m: MapMuscle | null) => void;
  /** Feine Körperdetails und Frisur (nur große Karte). */
  details?: { fills: string[]; lines: string[]; hair: string[] };
}) {
  const theme = useTheme();
  const ramp = useRamp();
  const dark = useColorScheme() === 'dark';
  const reduced = useReducedMotion();
  const base = theme.backgroundSelected;
  const detail = dark ? BodyDetail.dark : BodyDetail.light;
  const hair = dark ? BodyHair.dark : BodyHair.light;
  // Eigene Kennungen je Figur für die Verläufe (mehrere Figuren auf einem Bildschirm)
  const id = `mm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // Fokus: ist ein Muskel angetippt, treten die anderen in 200 ms zurück
  const focus = useSharedValue(0);
  const hasSelection = !!selected && regions.some((r) => r.muscle === selected);
  useEffect(() => {
    focus.set(reduced ? Number(hasSelection) : withTiming(Number(hasSelection), { duration: 200, easing: EASE }));
  }, [focus, hasSelection, reduced]);
  const marked = selected ? regions.filter((r) => r.muscle === selected).flatMap((r) => r.paths) : [];
  const sparedPaths = regions.filter((r) => spared.includes(r.group)).flatMap((r) => r.paths);
  const svg = (
    <Svg width={width} height={height} viewBox={VIEWBOX}>
      {/* 3D-Wirkung: Licht von links oben. Muskeln wölben sich (hell oben links, dunkler Rand), der Körper wird nach
          rechts dunkler, unter den Füßen liegt ein weicher Schatten. Die Verläufe beziehen sich auf jede Fläche selbst. */}
      <Defs>
        <RadialGradient id={`${id}v`} cx="0.42" cy="0.36" r="0.72" fx="0.32" fy="0.22">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.34} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.06} />
          <Stop offset="0.78" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.3} />
        </RadialGradient>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0.15">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.08} />
          <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.24} />
        </LinearGradient>
        <RadialGradient id={`${id}s`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#000000" stopOpacity={dark ? 0.6 : 0.22} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {shadow ? <Ellipse cx={50} cy={210.4} rx={19} ry={2.6} fill={`url(#${id}s)`} /> : null}
      <Path d={outline} fill={base} />
      <Path d={outline} fill={`url(#${id}b)`} />
      {details?.fills.map((d, i) => (
        <Path key={`f${i}`} d={d} fill={detail} />
      ))}
      {details?.lines.map((d, i) => (
        <Path key={`l${i}`} d={d} fill="none" stroke={detail} strokeWidth={gap * 0.8} strokeLinecap="round" />
      ))}
      {details?.hair.map((d, i) => (
        <Path key={`h${i}`} d={d} fill={hair} />
      ))}
      {ready
        ? regions.map((r) => (
            <RegionPaths
              key={r.key}
              region={r}
              target={level(r)}
              mode={mode}
              ramp={ramp}
              base={base}
              gap={gap}
              dim={spared.includes(r.group)}
              focus={focus}
              chosen={r.muscle === selected}
              shade={`url(#${id}v)`}
            />
          ))
        : null}
      {ready ? <WholeBodyRing outline={outline} target={whole} mode={mode} ramp={ramp} base={base} gap={gap} /> : null}
      {ready && sparedPaths.length ? <SparedOutline key={spared.join()} paths={sparedPaths} color={theme.danger} gap={gap} /> : null}
      {marked.length ? <Highlight key={selected} paths={marked} color={theme.text} gap={gap} /> : null}
    </Svg>
  );
  if (!onSelect) return svg;
  const press = (e: GestureResponderEvent) => {
    let { locationX: x, locationY: y } = e.nativeEvent;
    // Im Browser liefert der Druck nur Bildschirm-Koordinaten: Abstand zur linken oberen Ecke der Figur selbst rechnen.
    const web = e.nativeEvent as unknown as { clientX?: number; clientY?: number };
    const box = (e.currentTarget as unknown as { getBoundingClientRect?: () => { left: number; top: number } }).getBoundingClientRect?.();
    if (Platform.OS === 'web' && box && web.clientX !== undefined && web.clientY !== undefined) {
      x = web.clientX - box.left;
      y = web.clientY - box.top;
    }
    onSelect(hitTest(regions, (x / width) * VB_W, (y / height) * VB_H)?.muscle ?? null);
  };
  // Für VoiceOver ausgeblendet: dieselben Zahlen stehen in der Liste darunter (die auch antippbar ist).
  return (
    <Pressable accessibilityRole="none" accessible={false} importantForAccessibility="no-hide-descendants" onPress={press}>
      {svg}
    </Pressable>
  );
}

const fmt = (n: number) => formatNumber(n, 1);
const muscleLabel = (m: MapMuscle) => t(`mapMuscle.${m}`);

/**
 * Muskel-Körperkarte (A8.5, Ausbau docs/Muskelkarte_Ausbau.md): Arbeitssätze der Woche je Zielmuskel, vorne und
 * hinten oder einzeln (größer, mit Drehung beim Wechsel). Mitbeteiligte Muskeln zählen auf Wunsch halb. Antippen der
 * Figur oder eines Eintrags in der Liste markiert einen Muskel und zeigt seine Zahl. Geschonte Bereiche (Status
 * „verletzt“) sind gestrichelt. Zeigt nur die Menge, keine „Erholung in %“; alle Zahlen stehen auch als Text da.
 */
export function MuscleMap({
  tally,
  ready = true,
  halfSecondary,
  onHalfSecondary,
  view,
  onView,
  spared = [],
  sparedSince = null,
  body = 'm',
  onBody,
}: {
  tally: MuscleTally;
  ready?: boolean;
  halfSecondary: boolean;
  onHalfSecondary: (value: boolean) => void;
  view: MapView;
  onView: (view: MapView) => void;
  spared?: readonly MuscleGroup[];
  sparedSince?: string | null;
  /** Körperform der Figur (männlich / weiblich), wählbar. */
  body?: Body;
  onBody?: (body: Body) => void;
}) {
  const theme = useTheme();
  const ramp = useRamp();
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<MapMuscle | null>(null);
  const [shown, setShown] = useState<Side>(view === 'hinten' ? 'back' : 'front');
  const turn = useSharedValue(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  /** Drehung zur anderen Seite (Punkt 5.3): schmal werden, Seite wechseln, wieder breit – je 140 ms. */
  function turnTo(side: Side) {
    if (reduced) {
      setShown(side);
      return;
    }
    turn.set(withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setShown(side);
      turn.set(withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }));
    }, 140);
  }

  // Neue Ansicht: nach einem Wechsel vorne ↔ hinten dreht sich die Figur, sonst (z. B. gespeicherte Ansicht nach dem
  // Laden, Wechsel aus „Beide“) steht die Seite sofort.
  const animateTurn = useRef(false);
  useEffect(() => {
    if (view === 'beide') return;
    const side: Side = view === 'vorne' ? 'front' : 'back';
    if (animateTurn.current) turnTo(side);
    else setShown(side);
    animateTurn.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  const turnStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: turn.value }] }));

  const value = (m: MapMuscle) => muscleValue(tally, m, halfSecondary);
  const level = (r: Region) => (r.muscle ? muscleLevel(value(r.muscle)) : 0);
  const whole = muscleLevel(tally.whole);

  function changeView(next: MapView) {
    animateTurn.current = view !== 'beide' && next !== 'beide';
    onView(next);
  }

  function select(m: MapMuscle | null, fromList = false) {
    const next = m === selected ? null : m;
    if (next) haptic.tap();
    setSelected(next);
    // Aus der Liste gewählt: in der Einzelansicht zur Seite drehen, auf der der Muskel liegt (Punkt 5.5).
    if (next && fromList && view !== 'beide') {
      const sides = sidesOf(next);
      if (!sides.includes(shown)) changeView(sides[0] === 'front' ? 'vorne' : 'hinten');
    }
  }

  const set = BODIES[body];
  const figure = (side: Side, w: number, h: number) => (
    <Figure
      regions={side === 'front' ? set.front : set.back}
      outline={set.outline}
      details={set.details[side]}
      shadow
      width={w}
      height={h}
      gap={w > 150 ? 0.8 : 1}
      level={level}
      whole={whole}
      ready={ready}
      spared={spared}
      selected={selected}
      onSelect={select}
    />
  );

  const groups = tallyByGroup(tally, halfSecondary);
  const sec = selected ? (tally.secondary[selected] ?? 0) : 0;
  const info = selected
    ? t('stats.tapped', { muscle: muscleLabel(selected), group: t(`muscle.${MAP_GROUP[selected]}`), value: fmt(value(selected)), count: value(selected) }) +
      (sec > 0 ? t(halfSecondary ? 'stats.tappedHalf' : 'stats.tappedIgnored', { secondary: fmt(sec) }) : '')
    : t('stats.tapHint');

  return (
    <View style={styles.wrap}>
      <Segmented label={t('stats.view')} options={MAP_VIEWS} value={view} onChange={changeView} format={(v) => t(`stats.views.${v}`)} />
      {onBody ? <Segmented label={t('stats.body')} options={BODIES_LIST} value={body} onChange={onBody} format={(b) => t(`stats.bodies.${b}`)} /> : null}
      {view === 'beide' ? (
        <View style={styles.row}>
          <View style={styles.figure}>
            {figure('front', 124, 265)}
            <ThemedText type="small" themeColor="textSecondary">
              {t('stats.front')}
            </ThemedText>
          </View>
          <View style={styles.figure}>
            {figure('back', 124, 265)}
            <ThemedText type="small" themeColor="textSecondary">
              {t('stats.back')}
            </ThemedText>
          </View>
        </View>
      ) : (
        <View style={styles.figure}>
          <Animated.View style={turnStyle}>{figure(shown, 174, 372)}</Animated.View>
          <ThemedText type="small" themeColor="textSecondary">
            {shown === 'front' ? t('stats.front') : t('stats.back')}
          </ThemedText>
        </View>
      )}

      <ThemedText type="small" style={styles.center} themeColor={selected ? 'text' : 'textSecondary'} accessibilityLiveRegion="polite">
        {info}
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
      {tally.whole > 0 ? (
        <View style={[styles.legendItem, styles.note]}>
          <View style={[styles.swatch, styles.ring, { borderColor: ramp[whole], backgroundColor: theme.backgroundSelected }]} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('stats.wholeBody', { count: tally.whole })}
          </ThemedText>
        </View>
      ) : null}
      {spared.length ? (
        <View style={[styles.legendItem, styles.note]}>
          <View style={[styles.swatch, styles.dashed, { borderColor: theme.danger }]} />
          <ThemedText type="small" themeColor="textSecondary">
            {sparedSince
              ? t('stats.sparedSince', { list: spared.map((g) => t(`muscle.${g}`)).join(', '), date: formatDay(sparedSince) })
              : t('stats.spared', { list: spared.map((g) => t(`muscle.${g}`)).join(', ') })}
          </ThemedText>
        </View>
      ) : null}

      <Segmented
        label={t('stats.secondary')}
        options={['halb', 'aus'] as const}
        value={halfSecondary ? 'halb' : 'aus'}
        onChange={(v) => onHalfSecondary(v === 'halb')}
        format={(v) => t(`stats.secondaryOption.${v}`)}
      />

      {groups.length ? (
        <View style={styles.list}>
          {groups.map((g) => (
            <View key={g.group} style={styles.groupRow}>
              <ThemedText type="small" style={styles.groupName}>
                {`${t(`muscle.${g.group}`)} ${fmt(g.value)}`}
              </ThemedText>
              <View style={styles.chips}>
                {g.muscles.map(({ muscle, value: v }) => {
                  const on = muscle === selected;
                  return (
                    <Pressable
                      key={muscle}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${muscleLabel(muscle)}: ${fmt(v)}`}
                      onPress={() => select(muscle, true)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          borderColor: on ? theme.text : theme.border,
                          backgroundColor: on ? theme.backgroundSelected : 'transparent',
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}>
                      <ThemedText type="small">{`${muscleLabel(muscle)} ${fmt(v)}`}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ThemedText type="small">{t('stats.noSets')}</ThemedText>
      )}
    </View>
  );
}

/**
 * Kleine Muskelkarte für die Karte auf „Heute“ (U4): vorne und hinten ohne Legende, vereinfachte Zeichnung je
 * Muskelgruppe, die Gruppen des heutigen Plantags in der Datenfarbe, geschonte Bereiche gestrichelt. Die Muskeln
 * stehen im Text für VoiceOver.
 */
export function MuscleMapMini({
  sets,
  label,
  spared = [],
  body = 'm',
}: {
  sets: Partial<Record<MuscleGroup, number>>;
  label: string;
  spared?: readonly MuscleGroup[];
  body?: Body;
}) {
  const level = (r: Region) => ((sets[r.group] ?? 0) > 0 ? 4 : 0);
  const set: BodySet = BODIES[body];
  return (
    <View accessible accessibilityLabel={label} style={styles.mini}>
      {[set.frontMini, set.backMini].map((regions, i) => (
        <Figure
          key={i}
          regions={regions}
          outline={set.outline}
          width={54}
          height={116}
          gap={1.6}
          level={level}
          whole={(sets.ganzkoerper ?? 0) > 0 ? 4 : 0}
          spared={spared}
        />
      ))}
    </View>
  );
}

/**
 * Abschluss-Bildschirm (U5): die heute trainierten Muskeln füllen sich einmal auf – Hauptmuskeln in der vollen
 * Datenfarbe, nur mitbeteiligte heller. Erfolgsmoment als Rückmeldung, nicht als Auftritt; bei „Bewegung reduzieren“
 * stehen sie sofort.
 */
export function MuscleMapDone({ tally, label, body = 'm' }: { tally: MuscleTally; label: string; body?: Body }) {
  const set = BODIES[body];
  const level = (r: Region) => (!r.muscle ? 0 : (tally.primary[r.muscle] ?? 0) > 0 ? 4 : (tally.secondary[r.muscle] ?? 0) > 0 ? 2 : 0);
  return (
    <View accessible accessibilityLabel={label} style={styles.row}>
      {[set.front, set.back].map((regions, i) => (
        <Figure
          key={i}
          regions={regions}
          outline={set.outline}
          details={i === 0 ? set.details.front : set.details.back}
          shadow
          width={100}
          height={214}
          gap={1.2}
          level={level}
          whole={tally.whole > 0 ? 4 : 0}
          mode="grow"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  mini: { flexDirection: 'row', gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  figure: { alignItems: 'center', gap: Spacing.one },
  center: { textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  note: { justifyContent: 'center' },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  ring: { borderWidth: 2 },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed' },
  list: { gap: Spacing.two },
  groupRow: { gap: 4 },
  groupName: { fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
