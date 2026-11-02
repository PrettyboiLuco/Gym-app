import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice } from '@/components/fields';
import { haptic } from '@/components/haptics';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BREATH_PATTERNS, breathPhaseAt, type BreathPattern } from '@/domain/breathing';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

const MINUTES = ['1', '2', '4'] as const;

/**
 * Atemübung (A6.11): ruhiges Atmen oder 4-7-8 mit Kreis, der mit dem Atem wächst und schrumpft. Die Zeit wird aus dem
 * Startzeitpunkt berechnet (wie die anderen Timer), damit ein ruckelnder Bildschirm den Takt nicht verschiebt.
 */
export default function BreatheScreen() {
  const theme = useTheme();
  const [pattern, setPattern] = useState<BreathPattern>('ruhig');
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>('2');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [scale] = useState(() => new Animated.Value(0.6));
  const lastPhase = useRef<string | null>(null);

  const totalMs = Number(minutes) * 60_000;
  const elapsed = startedAt === null ? 0 : now - startedAt;
  const done = startedAt !== null && elapsed >= totalMs;
  const phase = startedAt === null || done ? null : breathPhaseAt(pattern, elapsed);

  useEffect(() => {
    if (startedAt === null || done) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, done]);

  useEffect(() => {
    if (!phase) return;
    const key = `${phase.cycle}-${phase.kind}`;
    if (lastPhase.current === key) return;
    lastPhase.current = key;
    haptic.tick();
    AccessibilityInfo.announceForAccessibility(t(`breathe.phase.${phase.kind}`));
    if (phase.kind === 'halten' || phase.kind === 'haltenLeer') return;
    Animated.timing(scale, {
      toValue: phase.kind === 'ein' ? 1 : 0.6,
      duration: phase.remainingMs,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }).start();
  }, [phase, scale]);

  useEffect(() => {
    if (done) haptic.success();
  }, [done]);

  return (
    <Screen withHeader>
      <Card>
        <ThemedText type="small">{t('breathe.intro')}</ThemedText>
        <Choice label={t('breathe.pattern')} options={BREATH_PATTERNS} value={pattern} onChange={setPattern} format={(p) => t(`breathe.patterns.${p}`)} />
        <Choice label={t('breathe.duration')} options={MINUTES} value={minutes} onChange={setMinutes} format={(m) => t('breathe.minutes', { count: m })} />
      </Card>
      <View style={styles.stage}>
        <Animated.View style={[styles.circle, { backgroundColor: theme.accent, transform: [{ scale }] }]} />
        <ThemedText type="subtitle" style={[styles.label, { backgroundColor: theme.accent, color: theme.onAccent }]} accessibilityLiveRegion="polite">
          {done ? t('breathe.done') : phase ? `${t(`breathe.phase.${phase.kind}`)} · ${Math.ceil(phase.remainingMs / 1000)}` : t('breathe.ready')}
        </ThemedText>
      </View>
      {startedAt === null || done ? (
        <Button
          label={done ? t('breathe.again') : t('breathe.start')}
          onPress={() => {
            lastPhase.current = null;
            scale.setValue(0.6);
            setNow(Date.now());
            setStartedAt(Date.now());
          }}
        />
      ) : (
        <Button label={t('breathe.stop')} variant="secondary" onPress={() => setStartedAt(null)} />
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {t('breathe.hint')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { height: 280, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.85 },
  // Eigene Lime-Fläche: bleibt lesbar, auch wenn der Kreis beim Ausatmen kleiner als der Text wird (Phase 1 Scan).
  label: { textAlign: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
});
