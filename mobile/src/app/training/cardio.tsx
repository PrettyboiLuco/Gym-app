import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { Choice, ConfirmButton, Field } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { DisplayFont, Spacing } from '@/constants/theme';
import { addCardio, completeCardio, deleteCardio, getCardio, setCardioTimer, type CardioEntry } from '@/data/cardio';
import {
  CARDIO_ACTIVITIES,
  CARDIO_INFO,
  elapsedMinutes,
  pace,
  parseCardioForm,
  type CardioActivity,
  type CardioForm,
  type CardioProblem,
} from '@/domain/cardio';
import { formatClock } from '@/domain/training';
import { useLoad } from '@/hooks/use-load';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

const EFFORTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

/**
 * Cardio eintragen (A2): Aktivität, Minuten (von Hand oder per Stoppuhr), optional Strecke, Ø-Puls, Anstrengung,
 * Stufe/Steigung und Notiz. Mit `id` wird ein vorhandener Eintrag ausgefüllt oder geändert (z. B. aus dem Training).
 */
export default function CardioScreen() {
  const params = useLocalSearchParams<{ id?: string; activity?: string; session?: string }>();
  const theme = useTheme();
  const [entryId, setEntryId] = useState<string | null>(params.id ?? null);
  const { data: loaded, db, reload } = useLoad(async (d) => (entryId ? await getCardio(d, entryId) : null), null as CardioEntry | null, entryId ?? '');
  const [activityChoice, setActivity] = useState<CardioActivity | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);
  const [dayChoice, setDay] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CardioForm>>({});
  const [problems, setProblems] = useState<CardioProblem[]>([]);
  const [busy, setBusy] = useState(false);

  const entry = loaded;
  const activity: CardioActivity = activityChoice ?? entry?.activity ?? ((params.activity as CardioActivity) || 'laufband');
  const info = CARDIO_INFO[activity];
  const day = dayChoice ?? entry?.day ?? todayDay();
  const value = (key: keyof CardioForm, fallback: string) => (form[key] as string | undefined) ?? fallback;
  const current: CardioForm = {
    minutes: value('minutes', entry?.minutes != null ? formatNumber(entry.minutes, 1) : entry?.plannedMinutes != null ? String(entry.plannedMinutes) : ''),
    distance: value('distance', entry?.distanceKm != null ? formatNumber(entry.distanceKm, 2) : ''),
    avgHr: value('avgHr', entry?.avgHr != null ? String(entry.avgHr) : ''),
    effort: form.effort !== undefined ? form.effort : (entry?.effort ?? null),
    level: value('level', entry?.level ?? ''),
    note: value('note', entry?.note ?? ''),
  };
  const running = entry?.timerStartedAt ?? null;
  const now = useNow(running !== null, 1000);
  const parsed = parseCardioForm(current);
  const speed = parsed.values ? pace(parsed.values.minutes, parsed.values.distanceKm) : null;

  async function ensureEntry() {
    if (entryId) return entryId;
    const id = await addCardio(db, { activity, customName, day, sessionId: params.session ?? null });
    setEntryId(id);
    return id;
  }

  async function toggleTimer() {
    const id = await ensureEntry();
    if (running) {
      // Stoppuhr anhalten: Minuten übernehmen, gespeichert wird erst mit „Speichern“.
      setForm((f) => ({ ...f, minutes: formatNumber(elapsedMinutes(running, Date.now()), 1) }));
      await setCardioTimer(db, id, false);
    } else {
      await setCardioTimer(db, id, true);
    }
    // Neu angelegter Eintrag: der Wechsel der ID lädt von selbst neu.
    if (entryId === id) await reload();
  }

  async function save() {
    const result = parseCardioForm(current);
    setProblems(result.problems);
    if (!result.values) return;
    setBusy(true);
    try {
      const id = await ensureEntry();
      await completeCardio(db, id, result.values, { activity, customName: activity === 'sonstiges' ? (customName ?? entry?.customName ?? '') : null, day });
      showToast(t('cardio.saved'));
      router.back();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (entryId) await deleteCardio(db, entryId);
    router.back();
  }

  const set = (key: keyof CardioForm) => (text: string) => setForm((f) => ({ ...f, [key]: text }));
  const inSession = entry?.sessionId != null || !!params.session;

  return (
    <Screen withHeader>
      {!inSession ? <DaySwitcher day={day} onChange={setDay} /> : null}
      <Card>
        <Choice chips label={t('cardio.activity')} options={CARDIO_ACTIVITIES} value={activity} onChange={setActivity} format={(a) => t(`cardio.activities.${a}`)} />
        {activity === 'sonstiges' ? (
          <Field label={t('cardio.customName')} value={customName ?? entry?.customName ?? ''} onChangeText={setCustomName} placeholder={t('cardio.customPlaceholder')} />
        ) : null}
      </Card>

      <Card title={t('cardio.duration')}>
        {running ? (
          <View style={styles.timer} accessibilityLiveRegion="polite">
            <ThemedText style={styles.clock}>{formatClock(now - Date.parse(running))}</ThemedText>
          </View>
        ) : null}
        <Button label={running ? t('cardio.timerStop') : t('cardio.timerStart')} variant={running ? 'primary' : 'secondary'} onPress={toggleTimer} />
        <Field label={t('cardio.minutes')} value={current.minutes} onChangeText={set('minutes')} keyboardType="decimal-pad" placeholder="20" />
        {entry?.plannedMinutes ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('cardio.planned', { minutes: entry.plannedMinutes })}
          </ThemedText>
        ) : null}
        {problems.includes('minutes') ? <ThemedText style={{ color: theme.danger }}>{t('cardio.problem.minutes')}</ThemedText> : null}
      </Card>

      <Card title={t('cardio.details')}>
        {info.distance ? (
          <Field label={t('cardio.distance')} value={current.distance} onChangeText={set('distance')} keyboardType="decimal-pad" placeholder="3,5" />
        ) : null}
        {problems.includes('distance') ? <ThemedText style={{ color: theme.danger }}>{t('cardio.problem.distance')}</ThemedText> : null}
        {speed ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('cardio.pace', { pace: formatClock(speed.minPerKm * 60_000), kmh: formatNumber(speed.kmh, 1) })}
          </ThemedText>
        ) : null}
        {info.level ? <Field label={t(`cardio.level.${info.level}`)} value={current.level} onChangeText={set('level')} placeholder={info.level === 'steigung' ? '5 %' : '8'} /> : null}
        <Field label={t('cardio.avgHr')} value={current.avgHr} onChangeText={set('avgHr')} keyboardType="number-pad" placeholder="135" />
        {problems.includes('hr') ? <ThemedText style={{ color: theme.danger }}>{t('cardio.problem.hr')}</ThemedText> : null}
        <Choice
          chips
          label={t('cardio.effort')}
          options={EFFORTS}
          value={current.effort === null ? null : (String(current.effort) as (typeof EFFORTS)[number])}
          onChange={(v) => setForm((f) => ({ ...f, effort: Number(v) }))}
          format={(v) => v}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('cardio.effortHint')}
        </ThemedText>
        <Field label={t('cardio.note')} value={current.note} onChangeText={set('note')} placeholder={t('cardio.notePlaceholder')} multiline />
      </Card>

      <Button label={t('cardio.save')} loading={busy} onPress={save} />
      {entryId ? <ConfirmButton label={t('cardio.delete')} confirmLabel={t('cardio.deleteConfirm')} onConfirm={remove} /> : null}
      <ThemedText type="small" themeColor="textSecondary">
        {t('cardio.noCredit')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: { alignItems: 'center', paddingVertical: Spacing.two },
  clock: { fontFamily: DisplayFont.bold, fontSize: 48, lineHeight: 56, fontVariant: ['tabular-nums'] },
});
