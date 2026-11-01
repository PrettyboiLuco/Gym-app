import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { MuscleGroup } from '@/domain/exercises';
import { muscleLevel } from '@/domain/training-stats';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

type Shape = { kind: 'e'; cx: number; cy: number; rx: number; ry: number } | { kind: 'r'; x: number; y: number; w: number; h: number; r: number };
type Region = { group: MuscleGroup | null; shapes: Shape[] };

// Vereinfachte Figur (Ansicht 100 × 210). Jede Region spiegelt sich links/rechts; null = nur Umriss.
const e = (cx: number, cy: number, rx: number, ry: number): Shape => ({ kind: 'e', cx, cy, rx, ry });
const r = (x: number, y: number, w: number, h: number, rr = 6): Shape => ({ kind: 'r', x, y, w, h, r: rr });
const pair = (s: Shape): Shape[] => (s.kind === 'e' ? [s, { ...s, cx: 100 - s.cx }] : [s, { ...s, x: 100 - s.x - s.w }]);

const OUTLINE: Shape[] = [e(50, 14, 10, 12), r(44, 24, 12, 8, 3), r(30, 30, 40, 62, 12), ...pair(r(17, 34, 11, 52, 6)), ...pair(r(31, 90, 17, 110, 8))];

const FRONT: Region[] = [
  { group: 'nacken', shapes: [r(44, 25, 12, 7, 3)] },
  { group: 'schultern', shapes: pair(e(30, 37, 8, 7)) },
  { group: 'brust', shapes: pair(r(33, 36, 16, 16, 6)) },
  { group: 'arme', shapes: pair(r(18, 46, 9, 20, 5)) },
  { group: 'bauch', shapes: [r(39, 54, 22, 32, 6)] },
  { group: 'huefte', shapes: pair(r(32, 88, 10, 12, 5)) },
  { group: 'beine', shapes: pair(r(32, 100, 15, 50, 7)) },
  { group: 'waden', shapes: pair(r(33, 158, 12, 34, 6)) },
];

const BACK: Region[] = [
  { group: 'nacken', shapes: [r(41, 26, 18, 10, 4)] },
  { group: 'schultern', shapes: pair(e(30, 37, 8, 7)) },
  { group: 'ruecken', shapes: [r(34, 38, 32, 44, 10)] },
  { group: 'arme', shapes: pair(r(18, 46, 9, 20, 5)) },
  { group: 'gesaess', shapes: pair(r(32, 86, 17, 16, 7)) },
  { group: 'beine', shapes: pair(r(32, 104, 15, 46, 7)) },
  { group: 'waden', shapes: pair(r(33, 156, 12, 36, 7)) },
];

function draw(s: Shape, fill: string, key: string) {
  return s.kind === 'e' ? (
    <Ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={fill} />
  ) : (
    <Rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={fill} />
  );
}

/**
 * Muskel-Körperkarte (A8.5): Arbeitssätze der Woche je Muskelgruppe, vorne und hinten. Zeigt nur die Menge, keine
 * „Erholung in %“. Die Zahlen stehen zusätzlich als Liste daneben (nicht nur über Farbe).
 */
export function MuscleMap({ sets }: { sets: Partial<Record<MuscleGroup, number>> }) {
  const theme = useTheme();
  const shade = (group: MuscleGroup | null) => {
    const level = group ? muscleLevel(sets[group] ?? 0) : 0;
    return level === 0 ? theme.backgroundSelected : theme.accent;
  };
  const opacity = (group: MuscleGroup | null) => [1, 0.35, 0.55, 0.78, 1][group ? muscleLevel(sets[group] ?? 0) : 0];
  const figure = (regions: Region[], label: string) => (
    <View style={styles.figure}>
      <Svg width={120} height={252} viewBox="0 0 100 210" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <G opacity={0.35}>{OUTLINE.map((s, i) => draw(s, theme.backgroundSelected, `o${i}`))}</G>
        {regions.map((reg, i) => (
          <G key={i} opacity={opacity(reg.group)}>
            {reg.shapes.map((s, j) => draw(s, shade(reg.group), `${i}-${j}`))}
          </G>
        ))}
      </Svg>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
  return (
    <View>
      <View style={styles.row}>
        {figure(FRONT, t('stats.front'))}
        {figure(BACK, t('stats.back'))}
      </View>
      <View style={styles.legend}>
        {[0, 1, 2, 3, 4].map((level) => (
          <View key={level} style={styles.legendItem}>
            <View
              style={[styles.swatch, { backgroundColor: level === 0 ? theme.backgroundSelected : theme.accent, opacity: [1, 0.35, 0.55, 0.78, 1][level] }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {t(`stats.level.${level}`)}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  figure: { alignItems: 'center', gap: Spacing.one },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
