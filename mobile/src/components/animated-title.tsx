import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { WordRise } from '@/constants/motion';

/**
 * Bereichs-Überschrift mit „Word Rise“ (getlayers.ai): jedes Wort steigt einmal beim Öffnen auf.
 * Für Bildschirmleser bleibt es eine einzige Überschrift; bei „Bewegung reduzieren“ steht der Text sofort.
 */
export function AnimatedTitle({ text, type = 'subtitle' }: { text: string; type?: ThemedTextProps['type'] }) {
  const words = text.split(/\s+/).filter(Boolean);
  const fontSize = type === 'title' ? 48 : 32;
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={text}
      style={[styles.row, { columnGap: fontSize * 0.25 }]}>
      {words.map((word, index) => (
        <Word key={`${index}-${word}`} word={word} index={index} type={type} />
      ))}
    </View>
  );
}

function Word({ word, index, type }: { word: string; index: number; type: ThemedTextProps['type'] }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withDelay(index * WordRise.staggerMs, withSpring(1, WordRise.spring));
  }, [index, progress, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value, 1),
    transform: [{ translateY: (1 - progress.value) * WordRise.fromY }],
  }));

  return (
    <Animated.View style={style} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <ThemedText type={type}>{word}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
});
