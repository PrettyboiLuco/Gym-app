import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HIDDEN } from '@/components/a11y';
import { HeartLoop } from '@/components/heart-loop';
import { introExiting } from '@/components/intro-state';
import { Intro, RiseSettle } from '@/constants/motion';
import { DisplayFont } from '@/constants/theme';

// Gleiche Farbe und Bildgröße wie der native Startbildschirm in app.json (expo-splash-screen), damit der Übergang
// nahtlos ist: Erst steht dasselbe Bild, dann übernimmt das sich drehende 3D-Herz.
const SPLASH_BACKGROUND = '#000000';
const SPLASH_IMAGE_WIDTH = 160;
const WORD = 'Myhealth';

/**
 * Start-Intro (getlayers „Reveal choreography“, vereinfacht für eine App, die man oft öffnet – rund 1,7 s):
 * 1. Das Startbild wird zum sich drehenden 3D-Herz (dein Logo) und schlägt einmal.
 * 2. „Myhealth“ steigt Buchstabe für Buchstabe auf (getlayers „Rise & Settle“).
 * 3. Abgang: Der Vorhang wird durchsichtig, das Herz wächst leicht – und schon beim Start des Abgangs gleitet der erste
 *    Bildschirm herein (`introExiting`), nicht erst danach.
 * Bei „Bewegung reduzieren“ nur ein kurzes Ausblenden. Rein dekorativ: für VoiceOver ausgeblendet.
 */
export function AnimatedSplashOverlay() {
  const [phase, setPhase] = useState<'native' | 'intro' | 'done'>('native');
  if (phase === 'done') return null;
  if (phase === 'native')
    return (
      <View
        onLayout={() => {
          SplashScreen.hideAsync()
            .catch(() => {})
            .finally(() => setPhase('intro'));
        }}
        style={styles.overlay}
        pointerEvents="none">
        <Image style={styles.image} source={require('@/assets/images/splash-icon.png')} {...HIDDEN} />
      </View>
    );
  return <IntroCurtain onDone={() => setPhase('done')} />;
}

function IntroCurtain({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const curtain = useSharedValue(1);
  const still = useSharedValue(1); // Startbild über dem Herz, blendet in das sich drehende Herz über
  const heart = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    const finish = () => onDone();
    const exit = () => {
      introExiting();
      curtain.set(
        withTiming(0, { duration: reduced ? 200 : Intro.exitMs, easing: Easing.out(Easing.cubic) }, (ok) => {
          if (ok) scheduleOnRN(finish);
        })
      );
      if (!reduced) heart.set(withTiming(1.12, { duration: Intro.exitMs, easing: Easing.out(Easing.cubic) }));
    };
    if (reduced) {
      const id = setTimeout(exit, 150);
      return () => clearTimeout(id);
    }
    still.set(withTiming(0, { duration: 180 }));
    // Ein Herzschlag: kurz größer, federnd zurück.
    heart.set(withDelay(120, withSequence(withSpring(1.08, { stiffness: 520, damping: 18 }), withSpring(1, { stiffness: 300, damping: 12 }))));
    // Platz für den Schriftzug: Herz rückt nach oben.
    lift.set(withDelay(Intro.wordDelayMs - 60, withSpring(1, RiseSettle.spring)));
    const id = setTimeout(exit, Intro.holdMs);
    return () => clearTimeout(id);
  }, [curtain, heart, lift, onDone, reduced, still]);

  const curtainStyle = useAnimatedStyle(() => ({ opacity: curtain.value }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * 28 }, { scale: heart.value }] }));
  const stillStyle = useAnimatedStyle(() => ({ opacity: still.value }));
  const wordStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * 12 }] }));

  return (
    <Animated.View style={[styles.overlay, curtainStyle]} pointerEvents="none" {...HIDDEN}>
      <Animated.View style={heartStyle}>
        <HeartLoop size={SPLASH_IMAGE_WIDTH} scheme="dark" />
        <Animated.View style={[StyleSheet.absoluteFill, stillStyle]}>
          <Image style={styles.image} source={require('@/assets/images/splash-icon.png')} />
        </Animated.View>
      </Animated.View>
      {reduced ? null : (
        <Animated.View style={[styles.word, wordStyle]}>
          {[...WORD].map((letter, i) => (
            <Letter key={i} letter={letter} delay={Intro.wordDelayMs + i * RiseSettle.staggerMs} />
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** Ein Buchstabe hinter einer Maske: steigt aus 24 px auf und federt ein (Rise & Settle). */
function Letter({ letter, delay }: { letter: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withSpring(1, RiseSettle.spring)));
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(p.value * 1.6, 1), transform: [{ translateY: (1 - p.value) * RiseSettle.fromY }] }));
  return (
    <View style={styles.mask}>
      <Animated.View style={style}>
        <Text style={styles.letter}>{letter}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: SPLASH_IMAGE_WIDTH,
    height: SPLASH_IMAGE_WIDTH,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  word: { position: 'absolute', top: '50%', marginTop: SPLASH_IMAGE_WIDTH / 2 - 8, flexDirection: 'row' },
  // Maske: Buchstaben steigen von unten hinter der Wortkante auf; Platz für Unterlängen (getlayers: .12–.15 em).
  mask: { overflow: 'hidden', paddingBottom: 5, marginBottom: -5 },
  letter: { color: '#FFFFFF', fontFamily: DisplayFont.bold, fontSize: 30, lineHeight: 38, letterSpacing: -0.6 },
});
