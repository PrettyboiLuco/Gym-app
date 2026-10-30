import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { cancelRunAlerts, syncIntervalAlerts } from '@/components/alerts';
import { Button, Card } from '@/components/card';
import { Field } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDb } from '@/data/store-provider';
import { loadIntervalRun, saveIntervalRun } from '@/data/training';
import {
  formatClock,
  intervalState,
  intervalTotalSeconds,
  parseWholeNumber,
  type IntervalConfig,
} from '@/domain/training';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

function parseConfig(work: string, rest: string, rounds: string): IntervalConfig | null {
  const w = parseWholeNumber(work);
  const r = parseWholeNumber(rest);
  const n = parseWholeNumber(rounds);
  if (w === null || r === null || n === null) return null;
  if (w < 5 || w > 600 || r > 600 || n < 1 || n > 50) return null;
  return { workSeconds: w, restSeconds: r, rounds: n };
}

// Startzeit wird im Event-Handler gesetzt, nicht beim Rendern.
const nowMs = () => Date.now();

function KeepAwake() {
  useKeepAwake();
  return null;
}

/** Intervall-Timer (HEALTH-010). Phase und Runde werden aus der Startzeit berechnet. */
export default function IntervalScreen() {
  const theme = useTheme();
  const db = useDb();
  const [work, setWork] = useState('40');
  const [rest, setRest] = useState('20');
  const [rounds, setRounds] = useState('8');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [running, setRunning] = useState<IntervalConfig | null>(null);
  const now = useNow(startedAt !== null);
  const lastSignal = useRef('');

  // Ein laufender Intervall-Timer übersteht das Schließen der App (HEALTH-011).
  useEffect(() => {
    let cancelled = false;
    loadIntervalRun(db).then((run) => {
      if (cancelled || !run) return;
      setRunning(run.config);
      setStartedAt(run.startedAtMs);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const config = parseConfig(work, rest, rounds);
  const state = running && startedAt !== null ? intervalState(running, now - startedAt) : null;

  // Kurzes Signal bei jedem Phasenwechsel.
  useEffect(() => {
    if (!state) return;
    const key = `${state.phase}-${state.round}`;
    if (key !== lastSignal.current) {
      lastSignal.current = key;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [state]);

  const phaseColor = state?.phase === 'arbeit' ? theme.tint : theme.textSecondary;

  return (
    <Screen withHeader>
      {state && state.phase !== 'fertig' && Platform.OS !== 'web' ? <KeepAwake /> : null}
      {state ? (
        <Card>
          <ThemedText type="subtitle" style={{ color: phaseColor }} accessibilityLiveRegion="polite">
            {t(`interval.phase.${state.phase}`)}
          </ThemedText>
          {state.phase !== 'fertig' ? (
            <ThemedText style={styles.clock}>{formatClock(state.remainingMs)}</ThemedText>
          ) : null}
          <ThemedText themeColor="textSecondary">
            {t('interval.round', { round: state.round, rounds: running?.rounds })}
          </ThemedText>
          <Button
            label={state.phase === 'fertig' ? t('common.ok') : t('interval.stop')}
            variant="danger"
            onPress={() => {
              setStartedAt(null);
              setRunning(null);
              saveIntervalRun(db, null);
              cancelRunAlerts().catch(() => undefined);
            }}
          />
        </Card>
      ) : (
        <Card>
          <View style={styles.row}>
            <Field label={t('interval.work')} value={work} style={styles.field} onChangeText={setWork} keyboardType="number-pad" />
            <Field label={t('interval.rest')} value={rest} style={styles.field} onChangeText={setRest} keyboardType="number-pad" />
            <Field label={t('interval.rounds')} value={rounds} style={styles.field} onChangeText={setRounds} keyboardType="number-pad" />
          </View>
          {config ? (
            <ThemedText themeColor="textSecondary">
              {t('interval.total', {
                value: formatClock(intervalTotalSeconds(config) * 1000),
              })}
            </ThemedText>
          ) : (
            <ThemedText style={{ color: theme.danger }}>{t('interval.invalid')}</ThemedText>
          )}
          <Button
            label={t('interval.start')}
            disabled={!config}
            onPress={() => {
              if (!config) return;
              lastSignal.current = '';
              const startedAtMs = nowMs();
              setRunning(config);
              setStartedAt(startedAtMs);
              saveIntervalRun(db, { config, startedAtMs });
              syncIntervalAlerts(db, config, startedAtMs).catch(() => undefined);
            }}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  field: { flex: 1, minWidth: 0 },
  clock: { fontSize: 72, lineHeight: 80, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
