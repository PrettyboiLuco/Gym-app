import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { Card } from '@/components/card';
import { Choice } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { canLock, unlock } from '@/data/app-lock';
import { loadAppLock, saveAppLock } from '@/data/reminders';
import { useDb } from '@/data/store-provider';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** App-Sperre mit Face ID bzw. Gerätecode (Register LAW-006/TECH-013-Umfeld, GOAL-008-Folgepunkt). */
export default function SecurityScreen() {
  const db = useDb();
  const theme = useTheme();
  const [on, setOn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAppLock(db).then((v) => {
      if (!cancelled) setOn(v);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  async function change(next: boolean) {
    setMessage(null);
    if (next) {
      if (!(await canLock())) {
        setMessage(t('security.noPasscode'));
        return;
      }
      // Einmal bestätigen, damit sich niemand aus Versehen aussperrt.
      if (!(await unlock(t('security.confirmPrompt')))) {
        setMessage(t('security.notConfirmed'));
        return;
      }
    }
    setOn(next);
    await saveAppLock(db, next);
    setMessage(next ? t('security.enabled') : t('security.disabled'));
  }

  return (
    <Screen withHeader>
      <Card>
        {Platform.OS === 'web' ? (
          <ThemedText>{t('security.webOnly')}</ThemedText>
        ) : (
          <Choice
            label={t('security.toggle')}
            options={['aus', 'an'] as const}
            value={on ? 'an' : 'aus'}
            onChange={(v) => change(v === 'an')}
            format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
          />
        )}
        <ThemedText type="small" themeColor="textSecondary">
          {t('security.hint')}
        </ThemedText>
        {message ? <ThemedText style={message === t('security.noPasscode') || message === t('security.notConfirmed') ? { color: theme.danger } : undefined}>{message}</ThemedText> : null}
      </Card>
    </Screen>
  );
}
