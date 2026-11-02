import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { MuscleGroup } from '@/domain/exercises';
import { muscleLevel } from '@/domain/training-stats';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

type Regions = Partial<Record<MuscleGroup, string[]>>;

// Anatomische Figur (Phase 1 Scan, neu gezeichnet): linke Körperhälfte als Pfade (viewBox 0 0 100 214), die rechte
// gespiegelt. Jeder Muskel ist eine eigene Fläche, getrennt durch schmale Fugen in der Körperfarbe.
const SILHOUETTE =
  'M50 22 L44.6 22.6 L44.2 28.6 C41.6 30.4 38 31.5 34 32.2 C27 32.8 21.5 35.5 20 42 C18.8 48 18.5 60 17.6 72 C16.6 84 14.6 96 13.8 106 C13 112 12.6 118 14 121 C15.6 123.5 18.4 122.5 19.2 119 C19.8 114 20 108 21 102 C22.4 92 24.6 82 25.6 72 C26.6 64 28.4 56 30.4 50 C31.4 56 32.6 64 33.4 72 C34.2 80 35.6 86 35.6 90 C34.2 96 33 104 33.2 114 C33.4 126 35 138 36.2 148 C35.2 160 34.4 172 35.6 184 C36.4 192 37.6 198 37.6 203 C35.8 205.5 33.2 207.5 33.6 209.5 C35 211.2 41.8 211.2 44.4 210 C45.4 207 44.6 203 44.6 199 C45.8 188 46.6 172 46.2 160 C46 154 46.6 150 47.2 146 C48.2 134 49 120 49.4 111 L50 110 Z';

const FRONT: Regions = {
  nacken: ['M45 29 C42 30.5 38 31.5 35 32.4 C39 32.8 43 32.6 46 32 Z'],
  schultern: ['M34.4 32.6 C27 32.6 22 36 21 43 C21 46 21.3 48 21.8 49 C23.5 45 26.5 41.5 30.5 40 C31.5 37 32.8 34.6 34.4 32.6 Z'],
  brust: ['M49 34.2 C43 33.6 38 33.8 35.4 34.6 C32.6 38 31.4 44 32.6 50.4 C37 54.6 44 55.4 49 53 Z'],
  arme: [
    'M22.8 51 C21.4 56 21 63 21.8 69.6 C23.8 70.4 25.8 69.4 26.8 66 C27.8 61 28.4 56 28 51.6 C27.4 48.6 26 47.2 24.6 47.4 C23.6 48.2 23.1 49.4 22.8 51 Z',
    'M21.2 74 C19.4 82 18.2 92 17.6 101 C18.6 102.6 20.2 102.6 21 101 C22.6 92 24.2 83 25.4 74.6 C24.2 72.6 22.4 72.4 21.2 74 Z',
  ],
  bauch: [
    'M43.6 56.6 h5.4 v7.4 h-5.4 Z',
    'M43.6 65.4 h5.4 v7.4 h-5.4 Z',
    'M43.8 74.2 h5.2 v7.6 h-5.2 Z',
    'M44.2 83.2 h4.8 v9.6 h-4.8 Z',
    'M41.6 57.8 C38.4 61 36.8 70 37.4 80 C38.2 86 39.8 90 42.4 93.6 L42.4 58 Z',
  ],
  huefte: ['M49.2 99.6 C46.6 102.6 44.6 108 44 116 C45.6 118 47.2 115.6 48.4 112 C49 108 49.3 104 49.2 99.6 Z'],
  beine: [
    'M40.4 98 C36.6 105 34.8 117 35.4 130 C35.8 138 37.8 144 40.8 146.4 C42.6 147 44.4 145 44.8 140 C46 128 45.8 113 44 103 C43 99.6 41.8 98 40.4 98 Z',
    'M47.6 112.4 C48.6 122 48.6 134 47.6 142 C46.8 146 44.8 147.4 43.8 145.8 C45.6 140 46.6 132 46.8 124 C47 120 47.2 116 47.6 112.4 Z',
  ],
  waden: ['M37.6 155 C35.8 161 35.6 170 36.8 178 C37.8 183 43.4 183 44.6 178 C45.8 170 45.6 161 43.6 155 C41.6 153.6 39.4 153.6 37.6 155 Z'],
};

const BACK: Regions = {
  nacken: ['M50 23.6 L46.6 25 C45.6 28 41 30.6 35 32.6 C40 35 44.6 38.4 46.8 44 C48.2 48 49.2 52 50 54 Z'],
  schultern: ['M34.4 32.6 C27 32.6 22 36 21 43 C21 46 21.3 48 21.8 49 C24 45 27.6 41.8 32 40.6 C33 37.6 33.6 35 34.4 32.6 Z'],
  ruecken: [
    'M33.6 41.4 C32.4 48 33 57 35.6 65 C38.4 72 43.2 78 49.2 80.6 L49.2 60 C47.6 52 44.6 46 40 42.6 C37.6 41.2 35.4 40.8 33.6 41.4 Z',
    'M45.2 82 C44.6 86 44.6 90 45 93.4 L49.2 93.4 L49.2 82.8 C47.8 82.2 46.4 81.8 45.2 82 Z',
  ],
  arme: [
    'M22.6 50.6 C21.2 56 21 63 21.8 69.6 C23.8 70.6 26 69.4 27.2 65.6 C28.2 60.6 28.4 55.4 27.6 51 C26.6 48.2 25 47.4 24 48 C23.3 48.6 22.9 49.4 22.6 50.6 Z',
    'M21.2 74 C19.4 82 18.2 92 17.6 101 C18.6 102.6 20.2 102.6 21 101 C22.6 92 24.2 83 25.4 74.6 C24.2 72.6 22.4 72.4 21.2 74 Z',
  ],
  huefte: ['M36.4 90.8 C34.8 94.4 34.4 98.6 35 102.6 C37 98.4 40.4 95.6 44 94.2 C41.4 92.8 38.8 91.6 36.4 90.8 Z'],
  gesaess: ['M49.2 95.2 C43 94.6 37.4 97.6 35.6 104.4 C35 111 38.6 116.4 44 117.6 C46.2 117.8 48 117.2 49.2 116.2 Z'],
  beine: [
    'M37 120.4 C35.4 128 35.6 138 38.4 146 C40.4 148.4 42.6 148 43 145 C43.4 137 42.8 128 41.4 121.4 C40.2 119.6 38.4 119.4 37 120.4 Z',
    'M43.4 120.6 C44.8 128 45.4 137 45.2 145 C46.4 147.4 47.6 146.6 48 143.6 C48.8 136 49 127 48.8 120.4 C47 119.4 45 119.6 43.4 120.6 Z',
  ],
  waden: ['M37.2 154 C35.2 160 35.2 168 37.2 175 C38.8 178.6 41.4 178.8 42.6 176 C44.4 170 44.8 162 43.6 155.6 C42 152.6 38.8 152.4 37.2 154 Z'],
};

const VIEWBOX = '0 0 100 214';

/** Eine Ansicht (vorne oder hinten): Silhouette, Kopf, dann die Muskeln beider Seiten in ihrer Farbe. */
function BodyView({
  regions,
  base,
  fill,
  opacity,
}: {
  regions: Regions;
  base: string;
  fill: (g: MuscleGroup) => string;
  opacity?: (g: MuscleGroup) => number;
}) {
  const half = (Object.entries(regions) as [MuscleGroup, string[]][]).map(([group, paths]) =>
    paths.map((d, i) => <Path key={`${group}-${i}`} d={d} fill={fill(group)} opacity={opacity?.(group) ?? 1} />)
  );
  return (
    <>
      <Path d={SILHOUETTE} fill={base} />
      <G transform="translate(100,0) scale(-1,1)">
        <Path d={SILHOUETTE} fill={base} />
        {half}
      </G>
      {half}
      <Ellipse cx={50} cy={12} rx={8.6} ry={10.2} fill={base} />
    </>
  );
}

/**
 * Muskel-Körperkarte (A8.5): Arbeitssätze der Woche je Muskelgruppe, vorne und hinten. Zeigt nur die Menge, keine
 * „Erholung in %“. Die Zahlen stehen zusätzlich als Liste daneben (nicht nur über Farbe).
 */
export function MuscleMap({ sets }: { sets: Partial<Record<MuscleGroup, number>> }) {
  const theme = useTheme();
  // Datenfarbe: dunkel Lime, hell das dunklere Grün (Lime auf Weiß ist zu blass).
  const on = useColorScheme() === 'dark' ? theme.accent : theme.tint;
  const level = (g: MuscleGroup) => muscleLevel(sets[g] ?? 0);
  const fill = (g: MuscleGroup) => (level(g) === 0 ? theme.border : on);
  const opacity = (g: MuscleGroup) => [1, 0.4, 0.6, 0.8, 1][level(g)];
  const figure = (regions: Regions, label: string) => (
    <View style={styles.figure}>
      <Svg width={124} height={265} viewBox={VIEWBOX} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <BodyView regions={regions} base={theme.backgroundSelected} fill={fill} opacity={opacity} />
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
        {[0, 1, 2, 3, 4].map((lv) => (
          <View key={lv} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: lv === 0 ? theme.border : on, opacity: [1, 0.4, 0.6, 0.8, 1][lv] }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {t(`stats.level.${lv}`)}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Kleine Muskelkarte für die Karte auf „Heute“ (U4): vorne und hinten ohne Legende, die Muskeln des heutigen Plantags in
 * der Datenfarbe (dunkel Lime, hell das dunklere Grün). Die Muskeln stehen im Text für VoiceOver.
 */
export function MuscleMapMini({ sets, label }: { sets: Partial<Record<MuscleGroup, number>>; label: string }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const on = scheme === 'dark' ? theme.accent : theme.tint;
  const fill = (g: MuscleGroup) => ((sets[g] ?? 0) > 0 ? on : theme.border);
  return (
    <View accessible accessibilityLabel={label} style={styles.mini}>
      {[FRONT, BACK].map((regions, i) => (
        <Svg key={i} width={54} height={116} viewBox={VIEWBOX}>
          <BodyView regions={regions} base={theme.backgroundSelected} fill={fill} />
        </Svg>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mini: { flexDirection: 'row', gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  figure: { alignItems: 'center', gap: Spacing.one },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
