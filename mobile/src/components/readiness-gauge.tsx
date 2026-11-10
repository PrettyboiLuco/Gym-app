// Bereitschaft als Halbkreis (Idee aus fin, 10.11.2026), aber ehrlich: drei Bereiche (ruhiger · mittel · gut) statt
// einer erfundenen Zahl 0–100 – unsere Ampel beruht auf drei Selbstangaben und der Trainingslast, nicht auf Messwerten.
// Der aktive Bereich ist in seiner Farbe, die anderen gedämpft; ein Punkt markiert die Stelle.

import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { levelColor } from '@/components/readiness';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont } from '@/constants/theme';
import type { Level } from '@/domain/readiness';
import { useTheme } from '@/hooks/use-theme';

const W = 220;
const R = 92;
const STROKE = 14;
const CX = W / 2;
const CY = R + STROKE;

/** Punkt auf dem Halbkreis: 0 = links, 1 = rechts. */
const at = (p: number) => {
  const a = Math.PI * (1 - p);
  return [CX + R * Math.cos(a), CY - R * Math.sin(a)] as const;
};
const arc = (from: number, to: number) => {
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
};

const SEGMENTS: { level: Level; from: number; to: number; mark: number }[] = [
  { level: 'rot', from: 0, to: 0.31, mark: 0.155 },
  { level: 'gelb', from: 0.345, to: 0.655, mark: 0.5 },
  { level: 'gruen', from: 0.69, to: 1, mark: 0.845 },
];

export function ReadinessGauge({ level, title }: { level: Level | null; title: string }) {
  const theme = useTheme();
  const active = SEGMENTS.find((s) => s.level === level) ?? null;
  const mark = active ? at(active.mark) : null;
  return (
    <View style={styles.wrap}>
      <Svg width={W} height={CY + 4} {...HIDDEN}>
        {SEGMENTS.map((s) => (
          <Path
            key={s.level}
            d={arc(s.from, s.to)}
            stroke={s.level === level ? levelColor(s.level, theme) : theme.backgroundSelected}
            strokeWidth={STROKE}
            // Gerade Enden, damit die drei Bereiche getrennt bleiben (runde Enden liefen ineinander).
            strokeLinecap="butt"
            fill="none"
          />
        ))}
        {mark ? <Circle cx={mark[0]} cy={mark[1]} r={STROKE / 2 + 2} fill={theme.text} stroke={theme.backgroundElement} strokeWidth={3} /> : null}
      </Svg>
      <ThemedText style={[styles.title, active && { color: level === 'gruen' ? theme.text : levelColor(active.level, theme) }]} numberOfLines={2}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  title: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, textAlign: 'center', marginTop: -36, maxWidth: 170 },
});
