import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, Field, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { expenditure, loadCheckinRules, saveCheckinRules, type ExpenditureData } from '@/data/adaptive';
import { checkinInput, deleteSleep, listCheckins, listSleep, loadCoachSetup, saveCheckin, saveSleep, type CheckinRecord, type SleepEntry } from '@/data/coach';
import type { Db } from '@/data/db';
import { buildReport, reportSections } from '@/data/report';
import { ADAPTIVE_RULES_VERSION, suggestV2 } from '@/domain/adaptive';
import { applyV2, weekDays, weeklyCheckin, type CheckinResult } from '@/domain/checkin';
import { needsRecalc } from '@/domain/coach';
import { shiftDay } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { timeZone, todayDay } from '@/domain/time';
import { parseDecimal } from '@/domain/units';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, formatWeight, t } from '@/i18n';
import { useProfile } from '@/providers/profile-provider';
import { formatKcal } from '@/services/nutrition-format';

const QUALITY = ['keine', '1', '2', '3', '4', '5'] as const;

async function loadCheckin(db: Db, profile: Profile) {
  // Die Woche endet gestern: Heute ist meist noch nicht vollständig erfasst.
  const weekEnd = shiftDay(todayDay(), -1);
  const [input, sleep, history, setup, energy, rules, month] = await Promise.all([
    checkinInput(db, weekEnd, profile, timeZone),
    listSleep(db, shiftDay(weekEnd, -13)),
    listCheckins(db),
    loadCoachSetup(db),
    expenditure(db, weekEnd),
    loadCheckinRules(db),
    buildReport(db, shiftDay(weekEnd, -27), weekEnd),
  ]);
  const v1 = weeklyCheckin(input);
  // Fassung 2 (A7.4) nur, wenn gewählt; ohne Schätzung bleibt Fassung 1.
  const result =
    rules === 2
      ? applyV2(
          v1,
          suggestV2({
            estimate: energy.estimate,
            delta: setup?.delta ?? null,
            currentGoal: input.currentGoal,
            weightKg: v1.summary.weightAvg,
            heightCm: profile.heightCm,
          })
        )
      : { ...v1, rulesVersion: 1 as const };
  const hideNumbers = input.sensitive || input.hideNumbers;
  // Schritte oder Gym-Tage deutlich anders als bei der Einrichtung → neu berechnen anbieten (C9).
  const recalc = setup !== null && needsRecalc(setup.steps, result.summary.stepsAvg, setup.gymDays, result.summary.workouts);
  return {
    weekEnd,
    result,
    sleep,
    history,
    recalc,
    energy,
    rules,
    hideNumbers,
    monthSections: reportSections(month).filter((sec) => !hideNumbers || sec.title !== t('report.nutrition')),
  };
}

/** Wöchentlicher Check-in (Phase 9.2, COACH-006, -008, -010): Überblick, ein Vorschlag, du entscheidest. */
export default function CheckinScreen() {
  const theme = useTheme();
  const { profile } = useProfile();
  const { data, reload, db, loaded } = useLoad((d) => loadCheckin(d, profile), {
    weekEnd: '',
    result: null as (CheckinResult & { rulesVersion: 1 | 2 }) | null,
    sleep: [] as SleepEntry[],
    history: [] as CheckinRecord[],
    recalc: false,
    energy: null as ExpenditureData | null,
    rules: 1 as 1 | 2,
    hideNumbers: false,
    monthSections: [] as { title: string; lines: string[] }[],
  });
  const [showMonth, setShowMonth] = useState(false);
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
    await saveCheckin(db, { ...result, weekEnd, rulesVersion: result.rulesVersion }, decision, todayDay());
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
        {suggestion.kind !== 'ohneZahlen' && suggestion.kind !== 'sensibel' && s.proteinAvg !== null && s.proteinGoal !== null ? (
          <ThemedText>{t('checkin.protein', { avg: formatNumber(Math.round(s.proteinAvg), 0), goal: formatNumber(Math.round(s.proteinGoal), 0) })}</ThemedText>
        ) : null}
        {suggestion.kind !== 'ohneZahlen' && suggestion.kind !== 'sensibel' && s.fiberAvg !== null && s.fiberGoal !== null ? (
          <ThemedText>{t('checkin.fiber', { avg: formatNumber(Math.round(s.fiberAvg), 0), goal: formatNumber(Math.round(s.fiberGoal), 0) })}</ThemedText>
        ) : null}
      </Card>

      <Card title={t('checkin.suggestionTitle')}>
        <ThemedText>{suggestionText()}</ThemedText>
        {result.hints.map((hint) => (
          <ThemedText key={hint} type="small">
            {t(`checkin.hint.${hint}`)}
          </ThemedText>
        ))}
        {data.recalc ? (
          <>
            <ThemedText type="small">{t('coach.recalc')}</ThemedText>
            <Button label={t('coach.recalcOpen')} variant="secondary" onPress={() => router.push('/progress/coach-setup')} />
          </>
        ) : null}
        {result.hints.includes('trainingWeniger') ? (
          <Button label={t('checkin.openAssistant')} variant="secondary" onPress={() => router.push('/training/assistant')} />
        ) : null}
        {message ? <ThemedText style={{ color: theme.tint }}>{message}</ThemedText> : null}
        {!doneThisWeek && !message ? (
          suggestion.kind === 'kcal' ? (
            <>
              <Button label={t('checkin.accept')} onPress={() => decide('angenommen')} />
              <Button label={t('checkin.decline')} variant="secondary" onPress={() => decide('abgelehnt')} />
            </>
          ) : (
            <Button label={t('checkin.save')} onPress={() => decide('ohne')} />
          )
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('checkin.rules', { version: result.rulesVersion })}
        </ThemedText>
        {!data.hideNumbers ? (
          <Choice
            label={t('adaptive.rulesLabel')}
            options={['1', '2'] as const}
            value={String(data.rules) as '1' | '2'}
            onChange={async (v) => {
              await saveCheckinRules(db, v === '2' ? 2 : 1);
              await reload();
            }}
            format={(v) => t(`adaptive.rulesOption.${v}`)}
          />
        ) : null}
        {data.rules === 2 && result.rulesVersion === 1 && !data.hideNumbers ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('adaptive.fallbackV1')}
          </ThemedText>
        ) : null}
      </Card>

      {data.energy && !data.hideNumbers ? <ExpenditureCard data={data.energy} /> : null}

      <Card title={t('adaptive.monthTitle')}>
        {showMonth ? (
          <>
            {data.monthSections.map((sec) => (
              <ThemedText key={sec.title} type="small">
                <ThemedText type="smallBold">{sec.title}</ThemedText>
                {'\n'}
                {sec.lines.join('\n')}
              </ThemedText>
            ))}
            {data.energy?.estimate.kind === 'schaetzung' && !data.hideNumbers ? (
              <ThemedText type="small">
                {t('adaptive.monthExpenditure', { kcal: formatKcal(data.energy.estimate.kcal), pm: formatKcal(data.energy.estimate.plusMinus) })}
              </ThemedText>
            ) : null}
            <Button label={t('adaptive.monthPdf')} variant="secondary" onPress={() => router.push('/more/report')} />
          </>
        ) : (
          <Button label={t('adaptive.monthShow')} variant="secondary" onPress={() => setShowMonth(true)} />
        )}
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
        <Choice
          label={t('checkin.sleepQuality')}
          options={QUALITY}
          value={quality}
          onChange={setQuality}
          format={(v) => t(`checkin.sleepQualityOption.${v}`)}
        />
        {sleepError ? <ThemedText style={{ color: theme.danger }}>{t('checkin.sleepInvalid')}</ThemedText> : null}
        <Button label={t('checkin.sleepSave')} onPress={addSleep} />
        {data.sleep.slice(0, 7).map((entry) => (
          <ListRow
            key={entry.id}
            title={t('checkin.sleepEntry', { day: formatDay(entry.day), hours: formatNumber(entry.hours) })}
            subtitle={entry.quality ? `${t('checkin.sleepQuality')} ${entry.quality}` : undefined}
            accessory="remove"
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

/** Geschätzter Verbrauch mit Rechenweg und Wochenverlauf (A7.3). */
function ExpenditureCard({ data }: { data: ExpenditureData }) {
  const e = data.estimate;
  const kg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${formatNumber(Math.abs(v), 2)} kg`;
  return (
    <Card title={t('adaptive.title')}>
      {e.kind === 'schaetzung' ? (
        <>
          <ThemedText type="subtitle">{t('adaptive.value', { kcal: formatKcal(e.kcal), pm: formatKcal(e.plusMinus) })}</ThemedText>
          <ThemedText type="small">{t('adaptive.intake', { kcal: formatKcal(Math.round(e.intakeAvg)), days: e.completeDays })}</ThemedText>
          <ThemedText type="small">
            {t('adaptive.trend', { start: formatNumber(e.trendStart, 1), end: formatNumber(e.trendEnd, 1), change: kg(e.change), span: e.spanDays })}
          </ThemedText>
          <ThemedText type="small">
            {t('adaptive.formula', {
              intake: formatKcal(Math.round(e.intakeAvg)),
              change: formatNumber(e.change, 2),
              span: e.spanDays,
              kcal: formatKcal(e.kcal),
            })}
          </ThemedText>
        </>
      ) : (
        <ThemedText type="small">
          {t('adaptive.learning', { days: e.completeDays, needed: e.needed })}
          {!e.weightStart || !e.weightEnd ? ` ${t('adaptive.learningWeight')}` : ''}
        </ThemedText>
      )}
      {data.weeks.some((w) => w.completeDays > 0) ? <ThemedText type="smallBold">{t('adaptive.weeksTitle')}</ThemedText> : null}
      {data.weeks
        .filter(() => data.weeks.some((w) => w.completeDays > 0))
        .map((w) => (
          <ThemedText key={w.to} type="small">
            {t('adaptive.weekLine', {
              from: formatDay(w.from),
              to: formatDay(w.to),
              intake: w.intakeAvg === null ? '–' : formatKcal(Math.round(w.intakeAvg)),
              days: w.completeDays,
              out: w.expenditure === null ? '–' : formatKcal(w.expenditure),
            })}
          </ThemedText>
        ))}
      <ThemedText type="small" themeColor="textSecondary">
        {t('adaptive.hint', { version: ADAPTIVE_RULES_VERSION })}
      </ThemedText>
    </Card>
  );
}
