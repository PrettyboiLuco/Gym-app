import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

// Web-Vorschau: gleiche fünf Bereiche wie auf dem Handy, unten als Leiste.
const TABS = [
  { name: 'index', href: '/', label: 'tabs.today' },
  { name: 'training', href: '/training', label: 'tabs.training' },
  { name: 'nutrition', href: '/nutrition', label: 'tabs.nutrition' },
  { name: 'progress', href: '/progress', label: 'tabs.progress' },
  { name: 'more', href: '/more', label: 'tabs.more' },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        {/* Die Tabs müssen direkte Kinder dieses Elements sein, sonst werden sie nicht erkannt. */}
        <TabBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.name}>{t(tab.label)}</TabButton>
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

function TabBar(props: TabListProps) {
  return (
    <View {...props} style={styles.bar}>
      <ThemedView type="backgroundElement" style={styles.inner}>
        {props.children}
      </ThemedView>
    </View>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: TabIconName }) {
  const theme = useTheme();
  const color = isFocused ? theme.tint : theme.textSecondary;
  // TabTrigger braucht ref und onPress; die ref-Typen von expo-router/ui und Pressable weichen ab.
  return (
    <Pressable {...(props as PressableProps)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedView type={isFocused ? 'backgroundSelected' : 'backgroundElement'} style={styles.buttonInner}>
        <TabIcon name={icon} color={color} contrastColor={theme.backgroundSelected} selected={!!isFocused} />
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'} numberOfLines={1} style={styles.label}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.two,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.one,
    borderRadius: Radius.card,
    gap: Spacing.one,
  },
  button: { flex: 1 },
  buttonInner: {
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.field + Spacing.one,
    alignItems: 'center',
    gap: Spacing.half,
  },
  label: { fontSize: 11, lineHeight: 14 },
  pressed: { opacity: 0.7 },
});
