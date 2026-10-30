import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, ListRow } from '@/components/fields';
import { formatKcal, todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { activeWeightGoal, adjustCalorieGoal, listCalorieGoals, type CalorieGoal } from '@/data/goals';
import { useProfile } from '@/data/profile-provider';
import { listWeights } from '@/data/weights';
import { calculate, DELTA_OPTIONS, type CalculatorInput, type Goal } from '@/domain/energy';
import { DIRECTIONS } from '@/domain/goals';
import { ageOn } from '@/domain/profile';
import { weightTrend } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatLength, formatNumber, formatWeight, t } from '@/i18n';

async function loadCalc(db: Db) {
  const today = todayDay();
  const [weights, goal, history] = await Promise.all([listWeights(db), activeWeightGoal(db), listCalorieGoals(db)]);
  const trend = weightTrend(weights, today);
  const last = weights[0] ?? null;
  return {
    weight: trend !== null ? { kg: trend, from: 'trend' as const, day: today } : last ? { kg: last.kg, from: 'last' as const, day: last.day } : null,
    goalDirection: goal?.direction ?? null,
    history,
  };
}

const fromLabel = (day: string) => (day === '0001-01-01' ? t('calculator.fromStart') : formatDay(day));

/** Kalorienrechner (Register CALC-001–005, COACH-002/003/005, COACH-010). */
export default function CalculatorScreen() {
  const { profile } = useProfile();
  const units = profile.units;
  const { data, reload, db, loaded } = useLoad(loadCalc, {
    weight: null as { kg: number; from: 'trend' | 'last'; day: string } | null,
    goalDirection: null as Goal | null,
    history: [] as CalorieGoal[],
  });
  const [chosenGoal, setChosenGoal] = useState<Goal | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const today = todayDay();
  const goal: Goal = chosenGoal ?? data.goalDirection ?? 'halten';
  const deltaValue = delta !== null && DELTA_OPTIONS[goal].includes(delta) ? delta : DELTA_OPTIONS[goal][0];
  const age = profile.birthMonth ? ageOn(profile.birthMonth, today) : null;
  const input: CalculatorInput = {
    weightKg: data.weight?.kg ?? null,
    heightCm: profile.heightCm,
    age,
    term: profile.formulaTerm,
    activity: profile.activity,
    sport: profile.sport,
    goal,
    delta: deltaValue,
    sensitive: profile.sensitive,
  };
  const result = calculate(input);

  async function apply() {
    if (result.status !== 'vorschlag') return;
    // Hat der Coach Makros und Trainings-/Ruhetage gesetzt, werden sie für den neuen Wert neu berechnet (C9).
    await adjustCalorieGoal(db, result.kcal, today, 'rechner', {
      ...input,
      resting: result.resting,
      factor: result.factor,
      estimate: result.estimate,
      method: 'mifflin-st-jeor+dge-pal (vorläufig)',
    });
    setApplied(true);
    await reload();
  }

  const goalDirections = profile.sensitive ? DIRECTIONS.filter((d) => d !== 'abnehmen') : DIRECTIONS;

  return (
    <Screen withHeader>
      {data.history[0]?.source === 'coach' ? (
        <Card>
          <ThemedText type="small">{t('coach.calculatorHint')}</ThemedText>
        </Card>
      ) : null}
      <Card>
        <ThemedText>{t('calculator.intro')}</ThemedText>
      </Card>

      <Card title={t('calculator.inputs')}>
        <ThemedText>
          {data.weight
            ? `${t('calculator.weight', { kg: formatWeight(data.weight.kg, units.weight) })} ${
                data.weight.from === 'trend'
                  ? t('calculator.weightSourceTrend')
                  : t('calculator.weightSourceLast', { date: formatDay(data.weight.day) })
              }`
            : loaded
              ? t('calculator.weightMissing')
              : ''}
        </ThemedText>
        {profile.heightCm !== null ? <ThemedText>{t('calculator.height', { value: formatLength(profile.heightCm, units.length) })}</ThemedText> : null}
        {age !== null ? <ThemedText>{t('calculator.age', { age })}</ThemedText> : null}
        {profile.formulaTerm ? <ThemedText>{t('calculator.formula', { value: t(`profile.formulaOption.${profile.formulaTerm}`) })}</ThemedText> : null}
        {profile.activity ? <ThemedText>{t('calculator.activity', { value: t(`profile.activityOption.${profile.activity}`) })}</ThemedText> : null}
        <ThemedText>{t('calculator.sport', { value: profile.sport ? t('calculator.sportYes') : t('calculator.sportNo') })}</ThemedText>
        <Button label={t('calculator.editProfile')} variant="danger" onPress={() => router.push('/progress/profile')} />
      </Card>

      {result.status !== 'sensibel' ? (
        <Card title={t('calculator.goal')}>
          <Choice
            label={t('calculator.goal')}
            options={goalDirections}
            value={goal}
            onChange={(g: Goal) => {
              setChosenGoal(g);
              setApplied(false);
            }}
            format={(g) => t(`goals.direction.${g}`)}
          />
          {data.goalDirection && chosenGoal === null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('calculator.goalFromGoals')}
            </ThemedText>
          ) : null}
          {DELTA_OPTIONS[goal].length > 1 ? (
            <Choice
              label={t('calculator.delta')}
              options={DELTA_OPTIONS[goal].map(String)}
              value={String(deltaValue)}
              onChange={(v) => {
                setDelta(Number(v));
                setApplied(false);
              }}
              format={(v) => t('calculator.deltaOption', { value: Number(v) > 0 ? `+${v}` : v.replace('-', '−') })}
            />
          ) : null}
        </Card>
      ) : null}

      <Card title={t('calculator.resultTitle')}>
        {result.status === 'fehlt' ? (
          <ThemedText>
            {t('calculator.missing', { list: result.missing.map((m) => t(`calculator.missingItem.${m}`)).join(', ') })}
          </ThemedText>
        ) : null}
        {result.status === 'sensibel' ? <ThemedText>{t('calculator.sensitive')}</ThemedText> : null}
        {result.status === 'alter' ? <ThemedText>{t('calculator.ageOutside')}</ThemedText> : null}
        {result.status === 'untergewicht' ? <ThemedText>{t('calculator.underweight')}</ThemedText> : null}
        {result.status === 'fachpruefung' || result.status === 'vorschlag' ? (
          <>
            <ThemedText>{t('calculator.resting', { kcal: formatKcal(result.resting) })}</ThemedText>
            <ThemedText>
              {t('calculator.estimate', { factor: formatNumber(result.factor, 2), kcal: formatKcal(result.estimate) })}
            </ThemedText>
          </>
        ) : null}
        {result.status === 'fachpruefung' ? <ThemedText>{t('calculator.floor')}</ThemedText> : null}
        {result.status === 'vorschlag' ? (
          <>
            <ThemedText type="smallBold">{t('calculator.target', { kcal: formatKcal(result.kcal) })}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('calculator.targetHint')}
            </ThemedText>
            <ThemedText>
              {result.protein.min === result.protein.max
                ? t('calculator.proteinSingle', { min: formatNumber(result.protein.min, 0) })
                : t('calculator.protein', { min: formatNumber(result.protein.min, 0), max: formatNumber(result.protein.max, 0) })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('calculator.proteinHint', { perKg: profile.sport ? '1,2–2,0' : '0,8' })}
            </ThemedText>
            {result.lowBmi ? <ThemedText>{t('calculator.lowBmi')}</ThemedText> : null}
            <Button label={t('calculator.apply')} onPress={apply} />
            {applied ? <ThemedText type="smallBold">{t('calculator.applied')}</ThemedText> : null}
            <ThemedText type="small" themeColor="textSecondary">
              {t('calculator.adjustHint')}
            </ThemedText>
          </>
        ) : null}
      </Card>

      <Card title={t('calculator.method')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('calculator.methodText')}
        </ThemedText>
      </Card>

      {data.history.length > 0 ? (
        <Card title={t('calculator.history')}>
          {data.history.map((g) => (
            <ListRow
              key={g.id}
              title={
                g.kcal === null
                  ? t('calculator.historyNone', { date: fromLabel(g.validFrom) })
                  : t('calculator.historyItem', {
                      kcal: formatKcal(g.kcal),
                      date: fromLabel(g.validFrom),
                      source: t(`calculator.sourceOption.${g.source}`),
                    })
              }
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
