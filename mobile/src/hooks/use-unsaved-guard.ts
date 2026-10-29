import { usePreventRemove } from 'expo-router';
import { Alert, Platform } from 'react-native';

import { t } from '@/i18n';

/** Fragt vor dem Wegnavigieren nach, solange `dirty` wahr ist (Register UX-012). */
export function useUnsavedGuard(dirty: boolean) {
  // Liefert eine Funktion, mit der man die Sperre nach dem Speichern aufhebt.
  return usePreventRemove(dirty, ({ repeat }) => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('common.unsavedMessage'))) repeat();
      return;
    }
    Alert.alert(t('common.unsavedTitle'), t('common.unsavedMessage'), [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: repeat },
    ]);
  });
}
