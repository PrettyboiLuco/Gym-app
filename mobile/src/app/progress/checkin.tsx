import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, Field, ListRow } from '@/components/fields';
import { formatKcal, timeZone, todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { checkinInput, deleteSleep, listCheckins, listSleep, saveCheckin, saveSleep, type CheckinRecord, type SleepEntry } from '@/data/coach';
import type { Db } from '@/data/db';
import { useProfile } from '@/data/profile-provider';
import { CHECKIN_RULES_VERSION, weekDays, weeklyCheckin, type CheckinResult } from '@/domain/checkin';
import { shiftDay } from '@/domain/nutrition';
import type { Profile } from '@/domain/profile';
import { parseDecimal } from '@/domain/units';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, formatWeight, t } from '@/i18n';

const QUALITY = ['keine', '1', '2', '3', '4', '5'] as const;

async function loadCheckin(db: Db, profile: Profile) {
  // Die Woche endet gestern: Heute ist meist noch nicht vollständig erfasst.
  const weekEnd = shiftDay(todayDay(), -1);
  const [input, sleep, history] = await Promise.all([
    checkinInput(db, weekEnd, profile, timeZone),
    listSleep(db, shiftDay(weekEnd, -13)),
    listCheckins(db),
  ]);
  return { weekEnd, result: weeklyCheckin(input), sleep, history };
}

/** Wöchentlicher Check-in (Phase 9.2, COACH-006, -008, -010): Überblick, ein Vorschlag, du entscheidest. */
export default function CheckinScreen() {
  const theme = useTheme();
  const { profile } = useProfile();
  const { data, reload, db, loaded } = useLoad((d) => loadCheckin(d, profile), {
    weekEnd: '',
    result: null as CheckinResult | null,
    sleep: [] as SleepEntry[],
    history: [] as CheckinRecord[],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [sleepDay, setSleepDay] = useState(todayDay());
  const [hours, setHours] = useState('');
  const [quality, setQuality] = useState<(typeof QUALITY)[number]>('keine');
  const [sleepError, setSleepError] = useState(false);

  const { weekEnd, result } = data;
  if (!loaded || !result) return <Screen withHeader>{null}</Screen>;
  const s = result.summary;
  const days = weekDays(weekEnd);
  const weight = (kg: number) => formatWeight(kg, profile.units.weight);
  const suggestion = result.suggestion;
  const doneThisWeek = data.history.some((h) => h.weekEnd === weekEnd);

  async function decide(decision: CheckinRecord['decision']) {
    if (!result) return;
    await saveCheckin(db, { ...result, weekEnd, rulesVersion: CHECKIN_RULES_VERSION }, decision, todayDay());
    setMessage(decision === 'angenommen' ? t('checkin.accepted') : decision === 'abgelehnt' ? t('checkin.declined') : t('checkin.saved'));
    await reload();
  }

  async function addSleep() {
    const value = parseDecimal(hours, 1);
    if (value === null || value < 1 || value > 16) {
      setSleepError(true);
      return;
    }
    setSleepError(false);
    await saveSleep(db, sleepDay, value, quality === 'keine' ? null : Number(quality));
    setHours('');
    setQuality('keine');
    await reload();
  }

  const suggestionText = () => {
    switch (suggestion.kind) {
      case 'kcal':
        return t('checkin.suggestion.kcal', { from: suggestion.from, to: suggestion.to, reason: t(`checkin.reason.${suggestion.reason}`) });
      case 'zielEinhalten':
        return t('checkin.suggestion.zielEinhalten', { over: suggestion.over });
      case 'mehrDaten':
        return t('checkin.suggestion.mehrDaten', { list: suggestion.missing.map((m) => t(`checkin.missing.${m}`)).join(', ') });
      default:
        return t(`checkin.suggestion.${suggestion.kind}`);
    }
  };

  return (
    <Screen withHeader>
      <Card title={t('checkin.week', { from: formatDay(days[0]), to: formatDay(weekEnd) })}>
        {s.weightAvg !== null ? (
          <>
            <ThemedText>{t('checkin.weight', { value: weight(s.weightAvg) })}</ThemedText>
            {s.change !== null ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('checkin.weightChange', { value: `${s.change > 0 ? '+' : ''}${weight(s.change)}` })}
              </ThemedText>
            ) : null}
          </>
        ) : (
          <ThemedText themeColor="textSecondary">{t('checkin.weightNone')}</ThemedText>
        )}
        {suggestion.kind === 'ohneZahlen' ? (
          <ThemedText>{t('checkin.foodDays', { days: s.completeDays })}</ThemedText>
        ) : s.kcalAvg !== null ? (
          <ThemedText>
            {s.goalAvg !== null
              ? t('checkin.food', { kcal: formatKcal(s.kcalAvg), days: s.completeDays, goal: formatKcal(s.goalAvg) })
              : t('checkin.foodNoGoal', { kcal: formatKcal(s.kcalAvg), days: s.completeDays })}
          </ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">{t('checkin.foodNone')}</ThemedText>
        )}
        {s.incompleteDays > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('checkin.foodIncomplete', { count: s.incompleteDays })}
          </ThemedText>
        ) : null}
        <ThemedText>
          {s.plannedPerWeek !== null
            ? t('checkin.training', { done: s.workouts, planned: s.plannedPerWeek })
            : t('checkin.trainingNoPlan', { done: s.workouts })}
        </ThemedText>
        {s.stepsAvg !== null ? <ThemedText>{t('checkin.steps', { value: formatNumber(Math.round(s.stepsAvg), 0) })}</ThemedText> : null}
        {s.sleepAvg !== null ? <ThemedText>{t('checkin.sleep', { value: formatNumber(s.sleepAvg), days: s.sleepDays })}</ThemedText> : null}
      </Card>

      <Card title={t('checkin.suggestionTitle')}>
        <ThemedText>{suggestionText()}</ThemedText>
        {result.hints.map((hint) => (
          <ThemedText key={hint} type="small">
            {t(`checkin.hint.${hint}`)}
          </ThemedText>
        ))}
        {result.hints.includes('trainingWeniger') ? (
          <Button label={t('checkin.openAssistant')} variant="danger" onPress={() => router.push('/training/assistant')} />
        ) : null}
        {message ? <ThemedText style={{ color: theme.tint }}>{message}</ThemedText> : null}
        {!doneThisWeek && !message ? (
          suggestion.kind === 'kcal' ? (
            <>
              <Button label={t('checkin.accept')} onPress={() => decide('angenommen')} />
              <Button label={t('checkin.decline')} variant="danger" onPress={() => decide('abgelehnt')} />
            </>
          ) : (
            <Button label={t('checkin.save')} onPress={() => decide('ohne')} />
          )
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('checkin.rules', { version: CHECKIN_RULES_VERSION })}
        </ThemedText>
      </Card>

      <Card title={t('checkin.sleepTitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('checkin.sleepHint')}
        </ThemedText>
        <Choice
          label={t('checkin.sleepDay')}
          options={[todayDay(), shiftDay(todayDay(), -1)]}
          value={sleepDay}
          onChange={setSleepDay}
          format={(d) => formatDay(d)}
        />
        <Field label={t('checkin.sleepHours')} value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="7,5" />
        <Choice label={t('checkin.sleepQuality')} options={QUALITY} value={quality} onChange={setQuality} format={(v) => t(`checkin.sleepQualityOption.${v}`)} />
        {sleepError ? <ThemedText style={{ color: theme.danger }}>{t('checkin.sleepInvalid')}</ThemedText> : null}
        <Button label={t('checkin.sleepSave')} onPress={addSleep} />
        {data.sleep.slice(0, 7).map((entry) => (
          <ListRow
            key={entry.id}
            title={t('checkin.sleepEntry', { day: formatDay(entry.day), hours: formatNumber(entry.hours) })}
            subtitle={entry.quality ? `${t('checkin.sleepQuality')} ${entry.quality}` : undefined}
            accessory="✕"
            onPress={async () => {
              await deleteSleep(db, entry.id);
              await reload();
            }}
          />
        ))}
      </Card>

      {data.history.length > 0 ? (
        <Card title={t('checkin.historyTitle')}>
          {data.history.map((h) => (
            <ListRow key={h.id} title={formatDay(h.weekEnd)} subtitle={t(`checkin.decision.${h.decision}`)} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
