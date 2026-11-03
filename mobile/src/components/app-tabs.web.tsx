import { usePathname } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { createContext, useContext, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, type SharedValue } from 'react-native-reanimated';

import { MiniPlayer, TRAINING_SCREENS } from '@/components/mini-player';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Press, TabPill } from '@/constants/motion';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useLiveTraining } from '@/providers/live-training';
import { useModules } from '@/providers/profile-provider';

// Web-Vorschau: gleiche fünf Bereiche wie auf dem Handy, unten als Leiste.
const TABS = [
  { name: 'index', href: '/', label: 'tabs.today' },
  { name: 'training', href: '/training', label: 'tabs.training' },
  { name: 'nutrition', href: '/nutrition', label: 'tabs.nutrition' },
  { name: 'progress', href: '/progress', label: 'tabs.progress' },
  { name: 'more', href: '/more', label: 'tabs.more' },
] as const;

export default function AppTabs() {
  const modules = useModules();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        {/* Die Tabs müssen direkte Kinder dieses Elements sein, sonst werden sie nicht erkannt. */}
        <TabBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              {/* Ausgeschaltetes Modul (A11.1): Trigger bleibt (Route muss bekannt sein), Knopf ist unsichtbar. */}
              <TabButton icon={tab.name} hidden={tab.name === 'nutrition' && !modules.ernaehrung}>
                {t(tab.label)}
              </TabButton>
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

/**
 * N7: Eine helle Pille hinter dem gewählten Tab, die beim Wechsel zum neuen Tab gleitet (Feder ohne Überschwingen) statt
 * umzuspringen. Jeder Tab meldet seine Lage; der gewählte schiebt die Pille dorthin. Beim ersten Mal und bei „Bewegung
 * reduzieren“ steht sie sofort. (Auf dem iPhone zeichnet die native Tab-Leiste ihre Auswahl selbst.)
 */
type Pill = { x: SharedValue<number>; width: SharedValue<number>; placed: SharedValue<number> };
const PillContext = createContext<Pill | null>(null);

function TabBar(props: TabListProps) {
  const theme = useTheme();
  const pill: Pill = { x: useSharedValue(0), width: useSharedValue(0), placed: useSharedValue(0) };
  const pillStyle = useAnimatedStyle(() => ({ opacity: pill.placed.value, width: pill.width.value, transform: [{ translateX: pill.x.value }] }));
  const live = useLiveTraining();
  const pathname = usePathname();
  // Im Training selbst blendet sich der Mini-Player aus – dann auch kein leeres Feld über der Tab-Leiste.
  const running = (!!live.session || !!live.timedTitle) && !TRAINING_SCREENS.some((p) => pathname.startsWith(p));
  return (
    <View {...props} style={styles.bar}>
      {running ? (
        <ThemedView type="backgroundElement" style={styles.player}>
          <MiniPlayer live={live} />
        </ThemedView>
      ) : null}
      <ThemedView type="backgroundElement" style={styles.inner}>
        <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: theme.backgroundSelected }, pillStyle]} />
        <PillContext value={pill}>{props.children}</PillContext>
      </ThemedView>
    </View>
  );
}

function TabButton({ children, isFocused, icon, hidden, ...props }: TabTriggerSlotProps & { icon: TabIconName; hidden?: boolean }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const color = isFocused ? theme.text : theme.textSecondary;
  // Gewählter Tab: Symbol hüpft einmal kurz (wie die Leiste auf dem iPhone), Knopf federt beim Drücken.
  const pop = useSharedValue(1);
  const press = useSharedValue(1);
  useEffect(() => {
    if (isFocused && !reduced) pop.set(withSequence(withSpring(1.18, Press.in), withSpring(1, Press.out)));
  }, [isFocused, pop, reduced]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  // Lage dieses Tabs in der Leiste; ist er gewählt, gleitet die Pille hierher.
  const pill = useContext(PillContext);
  const frame = useRef<{ x: number; width: number } | null>(null);
  const movePill = () => {
    const f = frame.current;
    if (!pill || !f || !isFocused) return;
    const jump = reduced || pill.placed.get() === 0;
    pill.x.set(jump ? f.x : withSpring(f.x, TabPill.spring));
    pill.width.set(jump ? f.width : withSpring(f.width, TabPill.spring));
    pill.placed.set(1);
  };
  useEffect(movePill);
  const onLayout = (e: LayoutChangeEvent) => {
    frame.current = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
    movePill();
  };
  // TabTrigger braucht ref und onPress; die ref-Typen von expo-router/ui und Pressable weichen ab.
  return (
    <Pressable
      {...(props as PressableProps)}
      onPressIn={() => !reduced && press.set(withSpring(0.92, Press.in))}
      onPressOut={() => !reduced && press.set(withSpring(1, Press.out))}
      onLayout={onLayout}
      style={[styles.button, hidden && styles.hidden]}>
      <Animated.View style={pressStyle}>
        <View style={styles.buttonInner}>
          <Animated.View style={iconStyle}>
            <TabIcon name={icon} color={color} contrastColor={theme.backgroundSelected} selected={!!isFocused} />
          </Animated.View>
          <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'} numberOfLines={1} style={styles.label}>
            {children}
          </ThemedText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  bar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  player: { width: '100%', maxWidth: MaxContentWidth, borderRadius: Radius.card, overflow: 'hidden' },
  inner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.one,
    borderRadius: Radius.card,
    gap: Spacing.one,
  },
  button: { flex: 1 },
  pill: { position: 'absolute', top: Spacing.one, bottom: Spacing.one, left: 0, borderRadius: Radius.field + Spacing.one },
  buttonInner: {
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.field + Spacing.one,
    alignItems: 'center',
    gap: Spacing.half,
  },
  label: { fontSize: 11, lineHeight: 14 },
});
