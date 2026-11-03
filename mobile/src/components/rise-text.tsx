import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { HIDDEN_FROM_A11Y } from '@/components/a11y-hidden';
import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { PopScale, WordRise } from '@/constants/motion';

/**
 * getlayers.ai Text Animations „Word Rise“: Wörter steigen gestaffelt aus 28 px auf (Feder 180/22, 70 ms Versatz).
 * Nur für den einmaligen Auftritt im Erststart; im Alltag bekommt nichts einen Auftritt (taste-skill).
 * Für Bildschirmleser eine einzige Überschrift; bei „Bewegung reduzieren“ steht der Text sofort.
 */
export function RiseText({ text, type = 'title', delayMs = 0 }: { text: string; type?: ThemedTextProps['type']; delayMs?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  const size = type === 'title' ? 32 : 28;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} style={[styles.row, { columnGap: size * 0.28 }]}>
      {words.map((word, i) => (
        <Word key={`${i}-${word}`} word={word} delay={delayMs + i * WordRise.staggerMs} type={type} />
      ))}
    </View>
  );
}

function Word({ word, delay, type }: { word: string; delay: number; type: ThemedTextProps['type'] }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.set(withDelay(delay, withSpring(1, WordRise.spring)));
  }, [delay, p, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(p.value, 1), transform: [{ translateY: (1 - p.value) * WordRise.fromY }] }));
  return (
    <Animated.View style={style} {...HIDDEN_FROM_A11Y}>
      <ThemedText type={type}>{word}</ThemedText>
    </Animated.View>
  );
}

/** Ein Block, der nach `delay` weich aufsteigt (gleiche Feder) – für die Karten im Erststart. */
export function Rise({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.set(withDelay(delay, withSpring(1, WordRise.spring)));
  }, [delay, p, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(p.value, 1), transform: [{ translateY: (1 - p.value) * 16 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * getlayers.ai „Pop Scale“: jeder Buchstabe springt mit Überschwingen auf (U5, Abschluss-Bildschirm). Für Bildschirmleser
 * eine Überschrift; bei „Bewegung reduzieren“ steht der Text sofort. Leerzeichen bleiben als Wortabstand erhalten.
 */
export function PopText({ text, type = 'title' }: { text: string; type?: ThemedTextProps['type'] }) {
  const words = text.split(/\s+/).filter(Boolean);
  const size = type === 'title' ? 32 : 28;
  let index = 0;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} style={[styles.row, { columnGap: size * 0.28 }]}>
      {words.map((word, w) => (
        <View key={`${w}-${word}`} style={styles.word}>
          {[...word].map((letter, i) => (
            <Letter key={i} letter={letter} delay={index++ * PopScale.staggerMs} type={type} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Letter({ letter, delay, type }: { letter: string; delay: number; type: ThemedTextProps['type'] }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.set(withDelay(delay, withSpring(1, PopScale.spring)));
  }, [delay, p, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(Math.max(p.value, 0), 1), transform: [{ scale: p.value }] }));
  return (
    <Animated.View style={style} {...HIDDEN_FROM_A11Y}>
      <ThemedText type={type}>{letter}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  word: { flexDirection: 'row' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
});
