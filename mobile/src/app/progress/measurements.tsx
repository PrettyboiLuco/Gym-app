import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { ConfirmButton, EntryRow, Field } from '@/components/fields';
import { InsightInfo } from '@/components/insight-info';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { addMeasurements, deleteMeasurement, listMeasurements, loadMeasureGoals, saveMeasureGoals } from '@/data/goals';
import { latestBySite, MEASURE_SITES, type Measurement, type MeasureSite } from '@/domain/body';
import { todayDay } from '@/domain/time';
import { lengthInputText, MEASURE_RANGE, parseLengthIn } from '@/domain/units';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatDay, formatLength, t } from '@/i18n';
import { useUnits } from '@/providers/profile-provider';

const EMPTY = Object.fromEntries(MEASURE_SITES.map((s) => [s, ''])) as Record<MeasureSite, string>;

/** Körpermaße eintragen, mit Anleitung und Verlauf (Register GOAL-004). */
export default function MeasurementsScreen() {
  const theme = useTheme();
  const units = useUnits();
  const { data, reload, db } = useLoad(async (d) => ({ list: await listMeasurements(d), goals: await loadMeasureGoals(d) }), {
    list: [] as Measurement[],
    goals: {} as Partial<Record<MeasureSite, number>>,
  });
  const { list, goals } = data;
  const [goalForm, setGoalForm] = useState<Record<MeasureSite, string> | null>(null);
  const [goalProblem, setGoalProblem] = useState(false);
  const [day, setDay] = useState(todayDay);
  const [form, setForm] = useState(EMPTY);
  const [problem, setProblem] = useState<'invalid' | 'none' | null>(null);
  const [saved, setSaved] = useState(false);
  const allowLeave = useUnsavedGuard(Object.values(form).some((v) => v.trim() !== ''));
  const latest = latestBySite(list);

  async function save() {
    const values: Partial<Record<MeasureSite, number>> = {};
    for (const site of MEASURE_SITES) {
      const text = form[site].trim();
      if (text === '') continue;
      const cm = parseLengthIn(text, units.length, MEASURE_RANGE);
      if (cm === null) {
        setProblem('invalid');
        return;
      }
      values[site] = cm;
    }
    if (Object.keys(values).length === 0) {
      setProblem('none');
      return;
    }
    setProblem(null);
    await addMeasurements(db, day, values);
    allowLeave();
    setForm(EMPTY);
    setSaved(true);
    await reload();
  }

  const signed = (cm: number) => {
    const text = formatLength(Math.abs(cm), units.length);
    return cm > 0.05 ? `+${text}` : cm < -0.05 ? `−${text}` : text;
  };

  return (
    <Screen withHeader>
      <Card>
        <DaySwitcher day={day} onChange={setDay} />
        {MEASURE_SITES.map((site) => {
          const last = latest[site];
          return (
            <View key={site}>
              <Field
                label={t('measure.input', { site: t(`measure.sites.${site}`), unit: units.length })}
                value={form[site]}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, [site]: v }));
                  setSaved(false);
                }}
                keyboardType="decimal-pad"
              />
              {goals[site] ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {!last
                    ? t('measure.goal', { value: formatLength(goals[site]!, units.length) })
                    : Math.abs(last.latest.cm - goals[site]!) < 0.25
                      ? t('measure.goalReached', { value: formatLength(goals[site]!, units.length) })
                      : t('measure.goalLeft', {
                          value: formatLength(goals[site]!, units.length),
                          left: formatLength(Math.abs(last.latest.cm - goals[site]!), units.length),
                        })}
                </ThemedText>
              ) : null}
              {last ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('measure.latest', { value: formatLength(last.latest.cm, units.length), date: formatDay(last.latest.day) })}{' '}
                  {last.previous
                    ? t('measure.previousChange', {
                        change: signed(last.latest.cm - last.previous.cm),
                        date: formatDay(last.previous.day),
                      })
                    : ''}
                </ThemedText>
              ) : null}
            </View>
          );
        })}
        {problem ? (
          <ThemedText style={{ color: theme.danger }}>
            {problem === 'none'
              ? t('measure.none')
              : t('measure.invalid', {
                  min: formatLength(MEASURE_RANGE.min, units.length),
                  max: formatLength(MEASURE_RANGE.max, units.length),
                })}
          </ThemedText>
        ) : null}
        <Button label={t('measure.save')} onPress={save} />
        {saved ? <ThemedText type="smallBold">{t('measure.saved')}</ThemedText> : null}
      </Card>

      <Card title={t('measure.goalsTitle')}>
        <InsightInfo text={t('measure.goalsHint')} />
        {goalForm ? (
          <>
            {MEASURE_SITES.map((site) => (
              <Field
                key={site}
                label={t('measure.goalInput', { site: t(`measure.sites.${site}`), unit: units.length })}
                value={goalForm[site]}
                onChangeText={(v) => setGoalForm({ ...goalForm, [site]: v })}
                keyboardType="decimal-pad"
              />
            ))}
            {goalProblem ? (
              <ThemedText style={{ color: theme.danger }}>
                {t('measure.invalid', { min: formatLength(MEASURE_RANGE.min, units.length), max: formatLength(MEASURE_RANGE.max, units.length) })}
              </ThemedText>
            ) : null}
            <Button
              label={t('measure.goalsSave')}
              onPress={async () => {
                const next: Partial<Record<MeasureSite, number>> = {};
                for (const site of MEASURE_SITES) {
                  if (!goalForm[site].trim()) continue;
                  const cm = parseLengthIn(goalForm[site], units.length, MEASURE_RANGE);
                  if (cm === null) return setGoalProblem(true);
                  next[site] = cm;
                }
                setGoalProblem(false);
                await saveMeasureGoals(db, next);
                setGoalForm(null);
                await reload();
              }}
            />
          </>
        ) : (
          <Button
            label={t('measure.goalsTitle')}
            variant="secondary"
            onPress={() =>
              setGoalForm(
                Object.fromEntries(MEASURE_SITES.map((s) => [s, goals[s] ? lengthInputText(goals[s]!, units.length) : ''])) as Record<MeasureSite, string>
              )
            }
          />
        )}
      </Card>

      <Card title={t('measure.guideTitle')}>
        <ThemedText type="small">{t('measure.guide')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('measure.guideNote')}
        </ThemedText>
      </Card>

      {list.length > 0 ? (
        <Card title={t('measure.history')}>
          {list.map((m) => (
            <EntryRow
              key={m.id}
              title={t(`measure.sites.${m.site}`)}
              subtitle={formatDay(m.day)}
              value={formatLength(m.cm, units.length)}
              action={
                <ConfirmButton
                  label={t('common.delete')}
                  size="compact"
                  onConfirm={async () => {
                    await deleteMeasurement(db, m.id);
                    await reload();
                  }}
                />
              }
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
