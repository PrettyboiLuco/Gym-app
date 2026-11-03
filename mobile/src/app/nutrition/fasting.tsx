import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { ProgressRing } from '@/components/charts';
import { ConfirmButton, EntryRow, Field, Segmented, Toggle } from '@/components/fields';
import { haptic } from '@/components/haptics';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { DisplayFont, Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { currentFast, deleteFast, listFasts, loadFastingSettings, saveFastingSettings, startFast, stopFast } from '@/data/fasting';
import { notificationPermission, NOTIFICATIONS_SUPPORTED } from '@/data/notifications';
import { shiftDay } from '@/domain/dates';
import { atTimeOnDay } from '@/domain/diary';
import {
  DEFAULT_FASTING,
  FASTING_TEMPLATES,
  fastingDurationMs,
  fastingStatus,
  fastingSummary,
  splitDuration,
  templateFor,
  type FastingPeriod,
  type FastingSettings,
  type FastingTemplateId,
} from '@/domain/fasting';
import { parseTime } from '@/domain/reminders';
import { localDay, timeZone } from '@/domain/time';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLoad } from '@/hooks/use-load';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';
import { useProfile } from '@/providers/profile-provider';
import { syncFastingAlert } from '@/services/alerts';
import { formatClock } from '@/services/nutrition-format';

async function loadFasting(db: Db) {
  const [settings, current, history] = await Promise.all([loadFastingSettings(db), currentFast(db), listFasts(db)]);
  return { settings, current, history };
}

const duration = (ms: number) => t('fasting.duration', splitDuration(ms));

/** „3:07“ (Stunden:Minuten) für die Mitte des Rings. */
function clock(ms: number) {
  const { hours, minutes } = splitDuration(ms);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Fasten-Timer (Ausbauplan B1, Entscheidung E2): Kann-Funktion, standardmäßig aus, bei „sensibler Situation“ komplett
 * ausgeblendet. Misst nur die Zeit – keine Empfehlung, keine Bewertung, keine Serie.
 */
export default function FastingScreen() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const { profile } = useProfile();
  const { data, reload, db, loaded } = useLoad(loadFasting, { settings: DEFAULT_FASTING, current: null as FastingPeriod | null, history: [] as FastingPeriod[] });
  const { settings, current, history } = data;
  const [startText, setStartText] = useState('');
  const [startError, setStartError] = useState(false);
  const now = useNow(current !== null, 1000);
  const live = current ? fastingStatus(current, now) : null;

  if (profile.sensitive) {
    return (
      <Screen withHeader>
        <Card>
          <ThemedText>{t('fasting.sensitive')}</ThemedText>
        </Card>
      </Screen>
    );
  }

  async function save(next: FastingSettings) {
    await saveFastingSettings(db, next);
    await reload();
    await syncFastingAlert(db);
  }

  async function toggleEnabled(enabled: boolean) {
    // Ausschalten beendet ein laufendes Fenster nicht stillschweigend: es bleibt im Verlauf und läuft weiter, bis es
    // gestoppt wird – die Mitteilung entfällt aber.
    await save({ ...settings, enabled });
  }

  async function start() {
    let at = new Date();
    if (startText.trim()) {
      const minutes = parseTime(startText);
      if (minutes === null) {
        setStartError(true);
        return;
      }
      // Eine Uhrzeit nach jetzt meint gestern (z. B. „20:00“ am Morgen eingetragen).
      const today = localDay(at, timeZone);
      at = atTimeOnDay(today, minutes);
      if (at.getTime() > Date.now()) at = atTimeOnDay(shiftDay(today, -1), minutes);
    }
    setStartError(false);
    setStartText('');
    if (settings.notify && NOTIFICATIONS_SUPPORTED) await notificationPermission(true);
    await startFast(db, settings.hours, at);
    haptic.success();
    await reload();
    await syncFastingAlert(db);
  }

  async function stop() {
    if (!current) return;
    await stopFast(db, current.id);
    showToast(t('fasting.stopped'));
    await reload();
    await syncFastingAlert(db);
  }

  async function remove(id: string) {
    await deleteFast(db, id);
    await reload();
  }

  const summary = fastingSummary(history, now);
  const template = templateFor(settings.hours);
  const dataColor = dark ? theme.accent : theme.tint;

  return (
    <Screen withHeader>
      <Card>
        <Toggle label={t('fasting.enable')} hint={t('fasting.enableHint')} value={settings.enabled} onChange={toggleEnabled} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('fasting.about')}
        </ThemedText>
      </Card>

      {loaded && settings.enabled ? (
        <>
          <Card title={t('fasting.templateTitle')}>
            <Segmented
              label={t('fasting.templateTitle')}
              options={FASTING_TEMPLATES.map((tpl) => tpl.id)}
              value={template}
              onChange={(id: FastingTemplateId) => save({ ...settings, hours: FASTING_TEMPLATES.find((tpl) => tpl.id === id)!.fastHours })}
              format={(id) => id}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {t('fasting.templateHint', { fast: settings.hours, eat: Math.max(0, 24 - settings.hours) })}
            </ThemedText>
            {current ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('fasting.templateRunning')}
              </ThemedText>
            ) : null}
          </Card>

          <Card title={t('fasting.timerTitle')}>
            {current && live ? (
              <>
                <View style={styles.ringRow}>
                  <ProgressRing progress={live.progress} size={168} stroke={12} color={dataColor} trackColor={theme.backgroundSelected} follow="tick">
                    <ThemedText style={styles.big} accessibilityLabel={live.phase === 'erreicht' ? t('fasting.reached') : duration(live.remainingMs)}>
                      {live.phase === 'erreicht' ? clock(live.elapsedMs) : clock(live.remainingMs)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {live.phase === 'erreicht' ? t('fasting.since') : t('fasting.left')}
                    </ThemedText>
                  </ProgressRing>
                </View>
                <ThemedText style={styles.center}>
                  {live.phase === 'erreicht' ? t('fasting.reachedLine', { hours: formatNumber(current.plannedHours, 1) }) : t('fasting.runningLine', { hours: formatNumber(current.plannedHours, 1) })}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  {t('fasting.window', { start: formatClock(current.startedAt), end: formatClock(new Date(live.endAtMs).toISOString()) })}
                </ThemedText>
                <Button label={t('fasting.stop')} onPress={stop} />
              </>
            ) : (
              <>
                <ThemedText themeColor="textSecondary">{t('fasting.idle', { hours: settings.hours })}</ThemedText>
                <Field
                  label={t('fasting.startAt')}
                  placeholder={t('fasting.startNow')}
                  value={startText}
                  onChangeText={(v) => {
                    setStartText(v);
                    setStartError(false);
                  }}
                  keyboardType="numbers-and-punctuation"
                />
                {startError ? <ThemedText style={{ color: theme.danger }}>{t('fasting.startInvalid')}</ThemedText> : null}
                <Button label={t('fasting.start')} onPress={start} />
              </>
            )}
            {NOTIFICATIONS_SUPPORTED ? (
              <Toggle label={t('fasting.notify')} hint={t('fasting.notifyHint')} value={settings.notify} onChange={(notify) => save({ ...settings, notify })} />
            ) : null}
          </Card>

          <Card title={t('fasting.historyTitle')}>
            {summary.count > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('fasting.summary', { count: summary.count, reached: summary.reached, avg: duration(summary.averageMs ?? 0) })}
              </ThemedText>
            ) : null}
            {history.length === 0 ? <ThemedText themeColor="textSecondary">{t('fasting.historyEmpty')}</ThemedText> : null}
            {history.map((p, i) => (
              <EntryRow
                key={p.id}
                title={formatDay(localDay(new Date(p.startedAt), timeZone))}
                subtitle={t('fasting.historyLine', { start: formatClock(p.startedAt), end: formatClock(p.endedAt!), planned: formatNumber(p.plannedHours, 1) })}
                value={duration(fastingDurationMs(p))}
                action={<ConfirmButton label={t('common.delete')} size="compact" onConfirm={() => remove(p.id)} />}
                last={i === history.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ringRow: { alignItems: 'center', paddingVertical: Spacing.two },
  big: { fontFamily: DisplayFont.bold, fontSize: 34, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
});
