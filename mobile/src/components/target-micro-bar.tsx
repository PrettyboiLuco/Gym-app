// Balken für einen Nährstoff mit Untergrenze, Ziel und Obergrenze (Ausbauplan B2, W2) – Balken statt Ring, ohne Wertung.

import { StyleSheet, View } from 'react-native';

import { HIDDEN } from '@/components/a11y';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { microBar, microZone, type MicroRef } from '@/domain/micro-targets';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

const num = (v: number) => formatNumber(v, v < 10 ? 1 : 0);

/**
 * Eine Zeile: Name und „Wert von Ziel“, darunter der Balken mit feinen Marken (Untergrenze grau, Ziel in Textfarbe,
 * Obergrenze grau gestrichelt) und eine beschreibende Zeile. `value = null` = keine Angaben (nicht 0).
 */
export function TargetMicroBar({
  name,
  value,
  unit,
  limits,
  onPress,
}: {
  name: string;
  value: number | null;
  unit: string;
  limits: MicroRef;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const data = dark ? theme.accent : theme.tint;
  const bar = microBar(value ?? 0, limits);
  const zone = value === null ? null : microZone(value, limits);
  const scale = [
    limits.lower !== null ? t('targets.micros.lower', { value: num(limits.lower) }) : null,
    t('targets.micros.target', { value: num(limits.target) }),
    limits.upper !== null ? t('targets.micros.upper', { value: num(limits.upper) }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const valueText = value === null ? t('targets.micros.noData') : t('targets.micros.value', { value: num(value), target: num(limits.target), unit });
  const label = `${name}: ${valueText}${zone ? `, ${t(`targets.micros.zone.${zone}`)}` : ''}. ${scale} ${unit}`;

  const body = (
    <>
      <View style={styles.head}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText type="small" themeColor={value === null ? 'textSecondary' : 'text'} style={styles.num}>
          {valueText}
        </ThemedText>
        {onPress ? <Icon name="chevron" color={theme.textSecondary} size={16} strokeWidth={2} /> : null}
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]} {...HIDDEN}>
        <View style={[styles.fill, { width: `${bar.fill * 100}%`, backgroundColor: value === null ? 'transparent' : data }]} />
        {bar.lower !== null ? <View style={[styles.mark, { left: `${bar.lower * 100}%`, backgroundColor: theme.textSecondary }]} /> : null}
        <View style={[styles.mark, styles.markTarget, { left: `${bar.target * 100}%`, backgroundColor: theme.text }]} />
        {bar.upper !== null ? <View style={[styles.mark, styles.markUpper, { left: `${bar.upper * 100}%`, borderColor: theme.textSecondary }]} /> : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
        {zone ? `${t(`targets.micros.zone.${zone}`)} · ` : ''}
        {scale} {unit}
      </ThemedText>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.row}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one + 2, paddingVertical: Spacing.two },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flex: 1, minWidth: 0, fontWeight: 600 },
  num: { fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, overflow: 'visible', position: 'relative' },
  fill: { height: 8, borderRadius: 4 },
  mark: { position: 'absolute', top: -2, width: 2, height: 12, marginLeft: -1, borderRadius: 1 },
  markTarget: { top: -3, height: 14 },
  markUpper: { backgroundColor: 'transparent', borderLeftWidth: 2, borderStyle: 'dashed', width: 0 },
  sub: { fontSize: 12, lineHeight: 16 },
});
