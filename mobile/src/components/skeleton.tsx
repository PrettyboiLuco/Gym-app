import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Ladezustand (taste-skill, app-screens §11): die spätere Anordnung mit grauen Flächen in echter Größe,
 * ohne Schimmer, ohne Sprung beim Eintreffen der Daten. Verhindert, dass kurz ein falscher Inhalt
 * (z. B. „Noch kein Plan“) aufblitzt, bevor die Datenbank geantwortet hat.
 */
export function SkeletonBlocks({ blocks = [220, 104, 180] }: { blocks?: number[] }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap} accessibilityLabel="…" accessibilityState={{ busy: true }}>
      {blocks.map((h, i) => (
        <View key={i} style={[styles.block, { height: h, backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
          <View style={[styles.line, { width: '38%', backgroundColor: theme.backgroundSelected }]} />
          <View style={[styles.lineBig, { width: '62%', backgroundColor: theme.backgroundSelected }]} />
          {h > 140 ? <View style={[styles.line, { width: '80%', backgroundColor: theme.backgroundSelected }]} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  block: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.four - 2, gap: Spacing.three },
  line: { height: 14, borderRadius: 7 },
  lineBig: { height: 28, borderRadius: 10 },
});
