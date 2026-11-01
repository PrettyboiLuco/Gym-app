import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { niceTicks } from '@/domain/chart-ticks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

// Schrift der Achsenbeschriftung: auf dem Handy die Systemschrift, im Web ausdrücklich (sonst Serifenschrift).
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, sans-serif' : undefined;

/**
 * Zeitverlauf nach den Diagrammregeln des taste-skill:
 * - eine Datenfarbe (Lime dunkel, Grün hell), gerade Abschnitte (eine geglättete Kurve erfände Werte),
 *   schwache Fläche (≤ 14 %) nur unter der Hauptlinie
 * - 3–5 schwache Rasterlinien mit runden Schritten, Werte links in eigener Spalte, oberster Wert über dem Maximum
 * - Bezugslinie (Ziel) gestrichelt mit Beschriftung am Ende; Hochrechnung gestrichelt mit Endwert
 * - Markierungen (z. B. Bestleistung) als Punkt mit kurzer Beschriftung
 */
export type ChartPoint = { day: string; value: number };

export function TimeChart({
  days,
  line,
  dots = [],
  reference,
  projection,
  markers = [],
  format,
  height = 160,
  accessibilityLabel,
  spacing = 'time',
  dayLabel,
}: {
  /** Alle Tage der x-Achse, aufsteigend (YYYY-MM-DD). Die Hochrechnung darf darüber hinausgehen. */
  days: string[];
  line: ChartPoint[];
  dots?: ChartPoint[];
  reference?: { value: number; label: string };
  projection?: { to: ChartPoint; label: string };
  markers?: (ChartPoint & { label?: string })[];
  format: (value: number) => string;
  height?: number;
  accessibilityLabel: string;
  /** time = nach Datum · index = gleichmäßig je Eintrag (z. B. je Training; `day` ist dann ein eindeutiger Schlüssel). */
  spacing?: 'time' | 'index';
  /** Beschriftung von erstem und letztem Tag unter der Achse (nur bei spacing = time). */
  dayLabel?: (day: string) => string;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const data = dark ? theme.accent : theme.tint;
  const [width, setWidth] = useState(0);

  const allDays = projection && projection.to.day > days[days.length - 1] ? [...days, projection.to.day] : days;
  const start = Date.parse(`${allDays[0]}T12:00:00Z`);
  const end = Date.parse(`${allDays[allDays.length - 1]}T12:00:00Z`);
  const values = [...line, ...dots, ...markers].map((p) => p.value);
  if (reference) values.push(reference.value);
  if (projection) values.push(projection.to.value);
  if (values.length === 0) return null;
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];

  const LANE = 44;
  const TOP = 8;
  const BOTTOM = 8;
  const plotW = Math.max(width - LANE - 6, 1);
  const order = new Map(line.map((p, i) => [p.day, i]));
  const x = (day: string) =>
    spacing === 'index'
      ? LANE + ((order.get(day) ?? 0) / Math.max(line.length - 1, 1)) * plotW
      : LANE + ((Date.parse(`${day}T12:00:00Z`) - start) / Math.max(end - start, 1)) * plotW;
  const y = (v: number) => TOP + (1 - (v - lo) / Math.max(hi - lo, 1e-9)) * (height - TOP - BOTTOM);

  const path = line.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area =
    line.length > 1 ? `${path} L${x(line[line.length - 1].day).toFixed(1)} ${height - BOTTOM} L${x(line[0].day).toFixed(1)} ${height - BOTTOM} Z` : '';
  const last = line[line.length - 1];

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="timeArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={data} stopOpacity={0.14} />
                <Stop offset="1" stopColor={data} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((tv) => (
              <Line key={`g${tv}`} x1={LANE} x2={width} y1={y(tv)} y2={y(tv)} stroke={theme.backgroundSelected} strokeWidth={1} />
            ))}
            {ticks.map((tv) => (
              <SvgText key={`t${tv}`} x={LANE - 8} y={y(tv) + 4} fontSize={11} fontFamily={SVG_FONT} fill={theme.textSecondary} textAnchor="end">
                {format(tv)}
              </SvgText>
            ))}
            {reference ? (
              <>
                <Line
                  x1={LANE}
                  x2={width}
                  y1={y(reference.value)}
                  y2={y(reference.value)}
                  stroke={theme.text}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText x={width - 2} y={y(reference.value) - 6} fontSize={11} fontFamily={SVG_FONT} fill={theme.textSecondary} textAnchor="end">
                  {reference.label}
                </SvgText>
              </>
            ) : null}
            {area ? <Path d={area} fill="url(#timeArea)" /> : null}
            {dots.map((p) => (
              <Circle key={`d${p.day}`} cx={x(p.day)} cy={y(p.value)} r={2.5} fill={theme.textSecondary} />
            ))}
            {path ? <Path d={path} stroke={data} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
            {projection && last ? (
              <>
                <Line
                  x1={x(last.day)}
                  y1={y(last.value)}
                  x2={x(projection.to.day)}
                  y2={y(projection.to.value)}
                  stroke={data}
                  strokeWidth={2}
                  strokeDasharray="4 5"
                  strokeLinecap="round"
                />
                <Circle cx={x(projection.to.day)} cy={y(projection.to.value)} r={3.5} fill={theme.backgroundElement} stroke={data} strokeWidth={2} />
              </>
            ) : null}
            {markers.map((m) => (
              <Circle key={`m${m.day}`} cx={x(m.day)} cy={y(m.value)} r={5} fill={data} stroke={theme.backgroundElement} strokeWidth={2} />
            ))}
            {/* Letzter Wert als Ring – außer er ist selbst markiert (z. B. Bestleistung), dann bleibt der gefüllte Punkt sichtbar. */}
            {last && !markers.some((m) => m.day === last.day) ? (
              <Circle cx={x(last.day)} cy={y(last.value)} r={5} fill={theme.backgroundElement} stroke={data} strokeWidth={2.5} />
            ) : null}
          </Svg>
        ) : null}
      </View>
      {dayLabel && spacing === 'time' ? (
        <View style={styles.days}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.dayText}>
            {dayLabel(allDays[0])}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.dayText}>
            {dayLabel(allDays[allDays.length - 1])}
          </ThemedText>
        </View>
      ) : null}
      {projection ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {projection.label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 44 },
  dayText: { fontSize: 12, lineHeight: 16 },
  note: { paddingLeft: 44, fontSize: 12, lineHeight: 16 },
});
