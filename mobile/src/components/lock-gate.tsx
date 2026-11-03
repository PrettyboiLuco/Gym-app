import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { HIDDEN_FROM_A11Y } from '@/components/a11y-hidden';
import { Button } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { unlock } from '@/data/app-lock';
import { loadAppLock } from '@/data/reminders';
import { t } from '@/i18n';
import { useDb } from '@/providers/store-provider';

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

  // Gesperrt wird mit einer deckenden Ebene ÜBER der App, nicht durch Aushängen: Ein laufendes Training,
  // getippte Satzwerte und Timer bleiben erhalten (Phase 1 Scan, F1). Dahinter ist nichts sicht- oder bedienbar.
  const locked = state !== 'offen';
  return (
    <View style={styles.fill}>
      <View style={styles.fill} {...(locked ? HIDDEN_FROM_A11Y : null)} pointerEvents={locked ? 'none' : 'auto'}>
        {children}
      </View>
      {locked ? (
        <ThemedView style={[StyleSheet.absoluteFill, styles.root]}>
          {state === 'gesperrt' ? (
            <View style={styles.box}>
              <ThemedText type="subtitle">{t('security.lockedTitle')}</ThemedText>
              <ThemedText themeColor="textSecondary">{t('security.lockedText')}</ThemedText>
              <Button label={t('security.unlock')} onPress={tryUnlock} />
            </View>
          ) : null}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  box: { gap: Spacing.three, alignItems: 'center' },
});
