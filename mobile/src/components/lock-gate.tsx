import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { unlock } from '@/data/app-lock';
import { loadAppLock } from '@/data/reminders';
import { useDb } from '@/data/store-provider';
import { t } from '@/i18n';

/** Nach so langer Zeit im Hintergrund wird wieder gesperrt. */
const RELOCK_MS = 60_000;

/** Zeigt die App erst nach Face ID bzw. Gerätecode, wenn die App-Sperre an ist. */
export function LockGate({ children }: { children: ReactNode }) {
  const db = useDb();
  const [state, setState] = useState<'pruefen' | 'gesperrt' | 'offen'>(Platform.OS === 'web' ? 'offen' : 'pruefen');
  const backgroundAt = useRef<number | null>(null);

  const tryUnlock = useCallback(async () => {
    if (await unlock(t('security.unlockPrompt'))) setState('offen');
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    loadAppLock(db).then((on) => {
      if (cancelled) return;
      setState(on ? 'gesperrt' : 'offen');
      if (on) tryUnlock();
    });
    const sub = AppState.addEventListener('change', async (next) => {
      if (next === 'background') backgroundAt.current = Date.now();
      if (next === 'active' && backgroundAt.current !== null && Date.now() - backgroundAt.current > RELOCK_MS) {
        backgroundAt.current = null;
        if (await loadAppLock(db)) {
          setState('gesperrt');
          tryUnlock();
        }
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [db, tryUnlock]);

  if (state === 'offen') return <>{children}</>;
  return (
    <ThemedView style={styles.root}>
      {state === 'gesperrt' ? (
        <View style={styles.box}>
          <ThemedText type="subtitle">{t('security.lockedTitle')}</ThemedText>
          <ThemedText themeColor="textSecondary">{t('security.lockedText')}</ThemedText>
          <Button label={t('security.unlock')} onPress={tryUnlock} />
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  box: { gap: Spacing.three, alignItems: 'center' },
});
