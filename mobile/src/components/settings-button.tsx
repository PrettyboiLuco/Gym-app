import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Zahnrad oben rechts auf jedem Tab: führt zu den Einstellungen (früher Tab „Mehr“). Der Tab-Platz gehört seit dem
 * Coach-Tab dem Coach – auf dem iPhone passen nur fünf Tabs in die Leiste.
 */
export function SettingsButton() {
  const theme = useTheme();
  // Woher? „Zurück“ in den Einstellungen führt genau dorthin (Tabs haben untereinander keinen Verlauf).
  const from = usePathname();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('more.title')}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        router.navigate({ pathname: '/more', params: { from } });
      }}
      style={({ pressed }) => [styles.btn, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
      <Icon name="settings" color={theme.text} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
