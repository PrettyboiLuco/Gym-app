import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/constants/motion';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Tile = { key: string; icon: IconName; title: string; subtitle?: string; onPress: () => void };

/**
 * Raster aus antippbaren Kacheln (2 Spalten): Symbol oben, Titel, kurze graue Zeile. Für Ziele, die man selten braucht –
 * statt einer langen Liste gleich aussehender Zeilen. Kacheln federn beim Drücken. Untertitel: höchstens zwei Zeilen
 * (Texte kurz halten – was nicht passt, fällt am Zeilenende weg, ohne „…“ mitten im Wort).
 */
export function TileGrid({ tiles }: { tiles: Tile[] }) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <PressableScale
          key={tile.key}
          scaleTo={Press.button}
          wrapStyle={styles.cell}
          accessibilityRole="button"
          accessibilityLabel={[tile.title, tile.subtitle].filter(Boolean).join(', ')}
          onPress={tile.onPress}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.hairline },
          ]}>
          <Icon name={tile.icon} color={theme.text} size={22} />
          <View style={styles.text}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {tile.title}
            </ThemedText>
            {/* Untertitel einheitlich: höchstens zwei Zeilen, abgeschnitten wird am Zeilenende – kein „…“ mitten im Wort. */}
            {tile.subtitle ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} ellipsizeMode="clip">
                {tile.subtitle}
              </ThemedText>
            ) : null}
          </View>
        </PressableScale>
      ))}
    </View>
  );
}

export type DayCard = { key: string; title: string; meta: string; badge?: string; icon?: IconName; onPress: () => void };

/** Waagrecht wischbare Reihe von Karten (z. B. Plantage zum Starten). Die markierte Karte bekommt eine Datenfarbe-Marke. */
export function CardRow({ cards, accent }: { cards: DayCard[]; accent: string }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.rowOuter}>
      {cards.map((c) => (
        <PressableScale
          key={c.key}
          scaleTo={Press.button}
          accessibilityRole="button"
          accessibilityLabel={[c.title, c.meta, c.badge].filter(Boolean).join(', ')}
          onPress={c.onPress}
          style={({ pressed }) => [styles.card, { backgroundColor: pressed ? theme.border : theme.backgroundSelected }]}>
          <View style={styles.cardTop}>
            <Icon name={c.icon ?? 'play'} color={theme.text} size={18} />
            {c.badge ? (
              <View style={[styles.badge, { backgroundColor: accent }]}>
                <ThemedText style={[styles.badgeText, { color: theme.onAccent }]}>{c.badge}</ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {c.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {c.meta}
          </ThemedText>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

/** Kennzahl-Kachel: kleine graue Beschriftung, große Zahl, optional Einheit. */
export function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundSelected }]} accessible accessibilityLabel={`${label} ${value}${unit ? ` ${unit}` : ''}`}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <View style={styles.statValueRow}>
        <ThemedText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </ThemedText>
        {unit ? (
          <ThemedText type="small" themeColor="textSecondary">
            {unit}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cell: { width: '48.5%', flexGrow: 1 },
  tile: { minHeight: 112, borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three, gap: Spacing.three, justifyContent: 'space-between' },
  text: { gap: Spacing.half },
  title: { fontWeight: 600 },
  rowOuter: { marginHorizontal: -Spacing.three - Spacing.one },
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three + Spacing.one },
  card: { width: 150, minHeight: 116, borderRadius: Radius.field + 4, padding: Spacing.three, gap: Spacing.one, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: 700 },
  cardTitle: { fontFamily: DisplayFont.semiBold, fontSize: 16, lineHeight: 21 },
  stat: { flex: 1, minWidth: 0, borderRadius: Radius.field + 4, paddingVertical: Spacing.three - 2, paddingHorizontal: Spacing.three - 2, gap: Spacing.half },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  statValue: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
});
