import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Einfacher Schieber 0–1 (für die Foto-Überblendung, A10.1): Tippen oder Ziehen auf der Spur. Für VoiceOver
 * „anpassbar“ mit Schritten von 10 %.
 */
export function Slider({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const theme = useTheme();
  const [width, setWidth] = useState(1);
  const set = (e: GestureResponderEvent) => onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / width)));
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100), text: `${Math.round(value * 100)} %` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(1, value + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))))}
      onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={set}
      onResponderMove={set}
      style={styles.hit}>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { width: `${value * 100}%`, backgroundColor: theme.accent }]} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: value * width - 12, backgroundColor: theme.text }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6 },
  thumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, top: 10 },
});
