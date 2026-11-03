// Blatt von unten (wie ein iPhone-Sheet) für das Tagebuch: „Kopieren auf …“, „Mehr Getränke“.

import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { useAppLocked } from '@/components/lock-gate';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Schließt per Knopf, Wischen nach unten (iPhone) oder Zurück (Android); bei gesperrter App nie sichtbar. */
export function DiarySheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Unten fest stehende Aktion (z. B. „Kopieren“). */
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const locked = useAppLocked();
  return (
    <Modal visible={visible && !locked} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.sheet, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.head}>
          <ThemedText type="subtitle" accessibilityRole="header" style={styles.flex}>
            {title}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            hitSlop={8}
            style={[styles.close, { backgroundColor: theme.backgroundSelected }]}>
            <Icon name="close" color={theme.text} size={18} strokeWidth={2} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, paddingBottom: Spacing.two },
  flex: { flex: 1 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { padding: Spacing.three, gap: Spacing.three },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two },
});
