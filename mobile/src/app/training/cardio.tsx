import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/components/activity-picker';
import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { Choice, ConfirmButton, Field, ListRow } from '@/components/fields';
import { NumberInput } from '@/components/number-picker';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { DisplayFont, Spacing } from '@/constants/theme';
import { addCardio, completeCardio, deleteCardio, getCardio, setCardioTimer, type CardioEntry } from '@/data/cardio';
import {
  CARDIO_INFO,
  defaultCardioMinutes,
  elapsedMinutes,
  pace,
  parseCardioForm,
  type CardioActivity,
  type CardioForm,
  type CardioProblem,
} from '@/domain/cardio';
import { nowMs, todayDay } from '@/domain/time';
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
  const [picking, setPicking] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);
  const [dayChoice, setDay] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CardioForm>>({});
  const [problems, setProblems] = useState<CardioProblem[]>([]);
  const [busy, setBusy] = useState(false);

  const entry = loaded;
  const activity: CardioActivity = activityChoice ?? entry?.activity ?? ((params.activity as CardioActivity) || 'laufband');
  const info = CARDIO_INFO[activity];
  const day = dayChoice ?? entry?.day ?? todayDay();
  // Im Training gibt es keine Tageswahl: der Eintrag zählt am Starttag des Trainings (data/cardio.ts), auch nach Mitternacht.
  const inSession = entry?.sessionId != null || !!params.session;
  const running = entry?.timerStartedAt ?? null;
  const now = useNow(running !== null, 1000);
  const value = (key: keyof CardioForm, fallback: string) => (form[key] as string | undefined) ?? fallback;
  // Nichts getippt: laufende Stoppuhr, sonst gespeicherte, sonst geplante Minuten. Getipptes hat immer Vorrang.
  const minutesAt = (atMs: number) => {
    const minutes = defaultCardioMinutes(entry, atMs);
    return value('minutes', minutes === null ? '' : formatNumber(minutes, 1));
  };
  const current: CardioForm = {
    minutes: minutesAt(now),
    distance: value('distance', entry?.distanceKm != null ? formatNumber(entry.distanceKm, 2) : ''),
    avgHr: value('avgHr', entry?.avgHr != null ? String(entry.avgHr) : ''),
    effort: form.effort !== undefined ? form.effort : (entry?.effort ?? null),
    level: value('level', entry?.level ?? ''),
    note: value('note', entry?.note ?? ''),
  };
  const parsed = parseCardioForm(current);
  const speed = parsed.values ? pace(parsed.values.minutes, parsed.values.distanceKm) : null;

  async function ensureEntry() {
    if (entryId) return entryId;
    const id = await addCardio(db, { activity, customName, day: inSession ? undefined : day, sessionId: params.session ?? null });
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
    // Läuft die Stoppuhr, zählt die gemessene Zeit bis jetzt (nicht die vom letzten Sekundentakt).
    const result = parseCardioForm({ ...current, minutes: minutesAt(nowMs()) });
    setProblems(result.problems);
    if (!result.values) return;
    setBusy(true);
    try {
      const id = await ensureEntry();
      await completeCardio(db, id, result.values, {
        activity,
        customName: activity === 'sonstiges' ? (customName ?? entry?.customName ?? '') : null,
        ...(inSession ? {} : { day }),
      });
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

  return (
    <Screen withHeader>
      {!inSession ? <DaySwitcher day={day} onChange={setDay} /> : null}
      <Card>
        {/* Gewählt: eine Zeile mit „Ändern“; sonst die Auswahl mit Suche und Gruppen. */}
        {picking ? (
          <ActivityPicker
            value={activity}
            onPick={(a) => {
              setActivity(a);
              setPicking(false);
            }}
          />
        ) : (
          <ListRow
            title={t(`cardio.activities.${activity}`)}
            subtitle={t('cardio.activity')}
            value={t('cardio.change')}
            accessory="›"
            last
            onPress={() => setPicking(true)}
          />
        )}
        {activity === 'sonstiges' ? (
          <Field
            label={t('cardio.customName')}
            value={customName ?? entry?.customName ?? ''}
            onChangeText={setCustomName}
            placeholder={t('cardio.customPlaceholder')}
          />
        ) : null}
      </Card>

      <Card title={t('cardio.duration')}>
        {running ? (
          <View style={styles.timer} accessibilityLiveRegion="polite">
            <ThemedText style={styles.clock}>{formatClock(now - Date.parse(running))}</ThemedText>
          </View>
        ) : null}
        <Button label={running ? t('cardio.timerStop') : t('cardio.timerStart')} variant={running ? 'primary' : 'secondary'} onPress={toggleTimer} />
        <NumberInput label={t('cardio.minutes')} value={current.minutes} onChange={set('minutes')} placeholder="20" spec={{ min: 0, max: 600, step: 1, decimals: 1, major: 5, unit: 'min' }} />
        {entry?.plannedMinutes ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('cardio.planned', { minutes: entry.plannedMinutes })}
          </ThemedText>
        ) : null}
        {problems.includes('minutes') ? <ThemedText style={{ color: theme.danger }}>{t('cardio.problem.minutes')}</ThemedText> : null}
      </Card>

      <Card title={t('cardio.details')}>
        {info.distance ? (
          <NumberInput
            label={t('cardio.distance')}
            value={current.distance}
            onChange={set('distance')}
            placeholder="3,5"
            spec={{ min: 0, max: 100, step: 0.1, decimals: 2, major: 10, unit: 'km' }}
          />
        ) : null}
        {problems.includes('distance') ? <ThemedText style={{ color: theme.danger }}>{t('cardio.problem.distance')}</ThemedText> : null}
        {speed ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('cardio.pace', { pace: formatClock(speed.minPerKm * 60_000), kmh: formatNumber(speed.kmh, 1) })}
          </ThemedText>
        ) : null}
        {info.level ? (
          <Field
            label={t(`cardio.level.${info.level}`)}
            value={current.level}
            onChangeText={set('level')}
            placeholder={info.level === 'steigung' ? '5 %' : '8'}
          />
        ) : null}
        <NumberInput label={t('cardio.avgHr')} value={current.avgHr} onChange={set('avgHr')} placeholder="135" spec={{ min: 40, max: 220, step: 1, major: 10, unit: 'bpm' }} />
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
