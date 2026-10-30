import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { applyReminders } from '@/components/alerts';
import { Button, Card } from '@/components/card';
import { Choice, Field, ListRow, MultiChoice, Presets } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { dayLabel, extraSecondsFor } from '@/components/planner-helpers';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { loadCoachSetup, saveCoachPending, saveCoachSetup, type CoachSetup } from '@/data/coach';
import { loadNutritionSettings } from '@/data/nutrition';
import { activeWeightGoal, saveGoal, setCalorieGoal } from '@/data/goals';
import { NOTIFICATIONS_SUPPORTED, notificationPermission } from '@/data/notifications';
import { useProfile } from '@/data/profile-provider';
import { loadReminders, saveReminders } from '@/data/reminders';
import { useDb } from '@/data/store-provider';
import { listActivePlans, listExercises, savePlan, type Exercise } from '@/data/training';
import { addWeight, listWeights } from '@/data/weights';
import {
  buildPlan,
  coachEnergy,
  COACH_RULES_VERSION,
  DEFAULT_DELTA,
  FAT_SHARE,
  MACRO_PROFILES,
  macroSettings,
  PROTEIN_G_PER_KG,
  STEPS_RANGE,
  type MacroChoice,
  type CoachEnergy,
} from '@/domain/coach';
import { DELTA_OPTIONS, type Goal } from '@/domain/energy';
import { EQUIPMENT, type Equipment, type Level } from '@/domain/exercises';
import { buildTemplate, LEVELS, MINUTE_PRESETS, type PlanProposal } from '@/domain/planner';
import { ageOn, parseProfileForm, profileToForm, type ProfileForm } from '@/domain/profile';
import { parseTime, WEEKDAYS } from '@/domain/reminders';
import { BODY_WEIGHT_RANGE, HEIGHT_RANGE, parseWeightIn, weightInputText } from '@/domain/units';
import { useTheme } from '@/hooks/use-theme';
import { formatLength, formatNumber, formatWeight, t } from '@/i18n';

const STEPS = ['ziel', 'koerper', 'alltag', 'ergebnis', 'training', 'anbindungen'] as const;
type Step = (typeof STEPS)[number];
type PlanChoice = 'vorlage' | 'eigen' | 'vorhanden' | 'spaeter';
const GOALS: readonly Goal[] = ['zunehmen', 'abnehmen', 'halten'];
const STEP_PRESETS = [4000, 6000, 8000, 10000, 12000] as const;
const GYM_DAYS = ['0', '1', '2', '3', '4', '5', '6', '7'] as const;
const PROTEIN_PRESETS = [1.6, 1.8, 2.0, 2.2, 2.5] as const;
const FAT_PRESETS = [0.2, 0.25, 0.3, 0.35, 0.4] as const;

/** Wochentage als Vorschlag für eine Anzahl Gym-Tage, mit Pausen dazwischen. */
function defaultWeekdays(count: number): number[] {
  const patterns: Record<number, number[]> = { 0: [], 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] };
  return patterns[Math.min(7, Math.max(0, count))];
}

/** Ziel für die Trainingsvorlage: Bulk und Cut erhalten bzw. bauen Muskeln auf, Erhalt eher allgemeine Fitness. */
const TEMPLATE_GOAL = { zunehmen: 'muskelaufbau', abnehmen: 'muskelaufbau', halten: 'fitness' } as const;

/** Coach-Einrichtung (Fahrplan „Coach“ C1–C7): Ziel → Körper → Alltag → Ergebnis → Training → Anbindungen. */
export default function CoachSetupScreen() {
  const db = useDb();
  const theme = useTheme();
  const { profile, updateProfile } = useProfile();
  const today = todayDay();
  const [step, setStep] = useState<Step>('ziel');
  const [goal, setGoal] = useState<Goal>('zunehmen');
  const [delta, setDelta] = useState(DEFAULT_DELTA.zunehmen);
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [weightText, setWeightText] = useState('');
  const [weightStart, setWeightStart] = useState('');
  const [stepsText, setStepsText] = useState('8000');
  const [gymDays, setGymDays] = useState(3);
  const [sleepText, setSleepText] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>(defaultWeekdays(3));
  const [split, setSplit] = useState(true);
  // Makro-Ausrichtung: Standard, Lean (Bodybuilding) oder eigene Werte.
  const [macroChoice, setMacroChoice] = useState<MacroChoice>({ profile: 'standard', proteinPerKg: PROTEIN_G_PER_KG.training, fatShare: FAT_SHARE });
  const [planChoice, setPlanChoice] = useState<PlanChoice>('vorlage');
  const [experience, setExperience] = useState<Level>(profile.experience ?? 'einsteiger');
  const [available, setAvailable] = useState<Equipment[]>(profile.equipment ?? [...EQUIPMENT]);
  const [minutes, setMinutes] = useState(profile.sessionMinutes ?? 60);
  const [reminder, setReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [hasPlans, setHasPlans] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Modus „ohne Zahlen“ (TRACK-006): Ziel wird gespeichert, aber keine Kalorien/Makros angezeigt.
  const [hideNumbers, setHideNumbers] = useState(false);

  // Bisherige Angaben übernehmen (neu einrichten bzw. Ziel ändern).
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCoachSetup(db), listWeights(db), listExercises(db), listActivePlans(db), loadReminders(db), activeWeightGoal(db), loadNutritionSettings(db)]).then(
      ([setup, weights, all, plans, reminders, weightGoal, settings]) => {
        if (cancelled) return;
        setHideNumbers(settings.hideNumbers);
        const latest = weights[0] ? weightInputText(weights[0].kg, profile.units.weight) : '';
        setWeightText(latest);
        setWeightStart(latest);
        setExercises(all);
        setHasPlans(plans.length > 0);
        if (plans.length > 0) setPlanChoice('vorhanden');
        setReminderTime(reminders.training.time);
        const g = setup?.goal ?? weightGoal?.direction ?? 'zunehmen';
        setGoal(profile.sensitive && g === 'abnehmen' ? 'halten' : g);
        if (setup) {
          setDelta(setup.delta);
          setStepsText(String(setup.steps));
          setGymDays(setup.gymDays);
          setSleepText(setup.sleepHours === null ? '' : formatNumber(setup.sleepHours));
          setWeekdays(setup.trainingWeekdays);
          setSplit(setup.split);
          if (setup.macros) setMacroChoice(setup.macros);
        } else setDelta(DEFAULT_DELTA[g]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [db, profile.units.weight, profile.sensitive]);

  const index = STEPS.indexOf(step);
  const goals = profile.sensitive ? GOALS.filter((g) => g !== 'abnehmen') : GOALS;
  const steps = /^\d{1,5}$/.test(stepsText.trim()) ? Number(stepsText.trim()) : null;
  const kg = parseWeightIn(weightText, profile.units.weight, BODY_WEIGHT_RANGE);
  const parsed = parseProfileForm(form, profile, today);
  const body = parsed.profile;
  const sleep = sleepText.trim() === '' ? null : Number(sleepText.replace(',', '.'));
  const energy: CoachEnergy = coachEnergy({
    weightKg: kg,
    heightCm: body?.heightCm ?? null,
    age: body?.birthMonth ? ageOn(body.birthMonth, today) : null,
    term: body?.formulaTerm ?? null,
    steps: steps !== null && steps <= STEPS_RANGE.max ? steps : null,
    gymDays,
    goal,
    delta: DELTA_OPTIONS[goal].includes(delta) ? delta : DEFAULT_DELTA[goal],
    sensitive: profile.sensitive,
  });
  const macroSet = kg !== null ? macroSettings(macroChoice, kg, goal, gymDays) : null;
  const plan =
    energy.status === 'ok' && macroSet !== null
      ? buildPlan(energy.kcal, macroSet.protein, weekdays, energy.floor, split, macroSet.fatShare)
      : null;

  const template: PlanProposal | null =
    planChoice === 'vorlage' && weekdays.length >= 2 && weekdays.length <= 6
      ? buildTemplate({
          exercises,
          days: weekdays.length,
          minutes,
          split: 'auto',
          goal: TEMPLATE_GOAL[goal],
          experience,
          available,
          blockedEquipment: [],
          blockedExercises: [],
          dayName: dayLabel,
          planName: t('coach.planName', { goal: t(`coach.goal.${goal}`) }),
          extraSeconds: extraSecondsFor(exercises),
        })
      : null;

  function chooseGoal(g: Goal) {
    setGoal(g);
    setDelta(DEFAULT_DELTA[g]);
  }

  function chooseGymDays(count: number) {
    setGymDays(count);
    setWeekdays(defaultWeekdays(count));
  }

  /** Prüft den aktuellen Schritt, bevor es weitergeht. */
  function next() {
    setProblem(null);
    if (step === 'koerper') {
      if (kg === null && !profile.sensitive) return setProblem(t('coach.problems.weight', { min: formatWeight(BODY_WEIGHT_RANGE.min, profile.units.weight, 0), max: formatWeight(BODY_WEIGHT_RANGE.max, profile.units.weight, 0) }));
      if (!body) {
        const range = { min: formatLength(HEIGHT_RANGE.min, form.units.length), max: formatLength(HEIGHT_RANGE.max, form.units.length) };
        return setProblem(parsed.problems.map((p) => t(`profile.problems.${p}`, range)).join(' '));
      }
    }
    if (step === 'alltag') {
      if (steps === null || steps > STEPS_RANGE.max) return setProblem(t('coach.problems.steps'));
      if (sleep !== null && (Number.isNaN(sleep) || sleep < 1 || sleep > 16)) return setProblem(t('checkin.sleepInvalid'));
    }
    if (step === 'training' && reminder && weekdays.length === 0) return setProblem(t('coach.problems.weekdays'));
    setStep(STEPS[index + 1]);
  }

  async function finish() {
    if (reminder && parseTime(reminderTime) === null) {
      setProblem(t('coach.problems.time'));
      return;
    }
    setBusy(true);
    try {
      if (body) {
        await updateProfile({
          ...body,
          experience,
          trainingGoal: TEMPLATE_GOAL[goal],
          equipment: EQUIPMENT.every((e) => e === 'koerpergewicht' || available.includes(e)) ? null : [...new Set([...available, 'koerpergewicht' as const])],
          sessionMinutes: minutes,
        });
      }
      if (kg !== null && weightText !== weightStart) await addWeight(db, today, kg);
      const weightGoal = await activeWeightGoal(db);
      if (!weightGoal || weightGoal.direction !== goal) {
        await saveGoal(db, weightGoal?.goalId ?? null, { kind: 'gewicht', direction: goal, targetKg: weightGoal?.targetKg ?? null }, today, kg);
      }
      if (plan && energy.status === 'ok') {
        await setCalorieGoal(
          db,
          plan.kcal,
          today,
          'coach',
          { rulesVersion: COACH_RULES_VERSION, steps, gymDays, delta, maintenance: energy.maintenance, pal: energy.pal, macros: macroChoice },
          plan
        );
      }
      if (template && planChoice === 'vorlage' && template.conflicts.length === 0) {
        await savePlan(db, null, template.draft, { note: t('coach.planNote') });
      }
      if (reminder && weekdays.length > 0) {
        const current = await loadReminders(db);
        const next = { ...current, training: { enabled: true, weekdays, time: reminderTime.trim() } };
        await saveReminders(db, next);
        if (NOTIFICATIONS_SUPPORTED && (await notificationPermission(true)) === 'granted') await applyReminders(next);
      }
      const setup: CoachSetup = {
        doneAt: today,
        goal,
        delta,
        steps: steps ?? 0,
        gymDays,
        sleepHours: sleep,
        trainingWeekdays: weekdays,
        split,
        macros: macroChoice,
      };
      await saveCoachSetup(db, setup);
      await saveCoachPending(db, false);
      router.replace(planChoice === 'eigen' ? '/training/plan/neu' : '/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen withHeader subtitle={t('coach.step', { step: index + 1, total: STEPS.length })}>
      {step === 'ziel' ? (
        <Card title={t('coach.goalTitle')}>
          <Choice label={t('coach.goalTitle')} options={goals} value={goal} onChange={chooseGoal} format={(g) => t(`coach.goal.${g}`)} />
          <ThemedText type="small" themeColor="textSecondary">
            {t(`coach.goalText.${goal}`)}
          </ThemedText>
          {profile.sensitive ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('coach.sensitiveGoal')}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {step === 'koerper' ? (
        <Card title={t('coach.bodyTitle')}>
          <Field label={t('coach.weight', { unit: profile.units.weight })} value={weightText} onChangeText={setWeightText} keyboardType="decimal-pad" />
          <Field label={t('profile.height', { unit: form.units.length })} value={form.height} onChangeText={(height) => setForm((f) => ({ ...f, height }))} keyboardType="decimal-pad" />
          <Field
            label={t('profile.birth')}
            placeholder={t('profile.birthPlaceholder')}
            value={form.birth}
            onChangeText={(birth) => setForm((f) => ({ ...f, birth }))}
            keyboardType="numbers-and-punctuation"
          />
          <Choice
            label={t('profile.formula')}
            options={['+5', '-161', 'keine'] as const}
            value={form.formulaTerm}
            onChange={(formulaTerm) => setForm((f) => ({ ...f, formulaTerm }))}
            format={(v) => t(`profile.formulaOption.${v}`)}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('profile.formulaHint')}
          </ThemedText>
        </Card>
      ) : null}

      {step === 'alltag' ? (
        <Card title={t('coach.dayTitle')}>
          <Field label={t('coach.steps')} value={stepsText} onChangeText={setStepsText} keyboardType="number-pad" />
          <Presets label={t('coach.steps')} options={STEP_PRESETS} value={steps ?? undefined} format={(v) => formatNumber(v, 0)} onChange={(v) => setStepsText(String(v))} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('coach.stepsHint')}
          </ThemedText>
          <Choice label={t('coach.gymDays')} options={GYM_DAYS} value={String(gymDays) as (typeof GYM_DAYS)[number]} onChange={(v) => chooseGymDays(Number(v))} format={(v) => v} />
          <Field label={t('coach.sleep')} value={sleepText} onChangeText={setSleepText} keyboardType="decimal-pad" placeholder="7,5" />
          <ThemedText type="small" themeColor="textSecondary">
            {t('coach.sleepHint')}
          </ThemedText>
        </Card>
      ) : null}

      {step === 'ergebnis' ? (
        <Card title={t('coach.resultTitle')}>
          {energy.status === 'ok' && hideNumbers ? (
            <ThemedText>{t('coach.hiddenNumbers')}</ThemedText>
          ) : energy.status === 'ok' ? (
            <>
              <ThemedText>{t('coach.maintenance', { kcal: energy.maintenance })}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('coach.calcWay', {
                  resting: energy.resting,
                  stepPal: formatNumber(energy.stepPal, 2),
                  gymPal: formatNumber(energy.gymPal, 3),
                  pal: formatNumber(energy.pal, 3),
                })}
              </ThemedText>
              <Choice
                label={t('coach.tempo')}
                options={DELTA_OPTIONS[goal].map(String)}
                value={String(delta)}
                onChange={(v) => setDelta(Number(v))}
                format={(v) => `${Number(v) > 0 ? '+' : ''}${v} kcal${Number(v) === DEFAULT_DELTA[goal] ? ` (${t('coach.suggested')})` : ''}`}
              />
              <ThemedText type="subtitle">{t('coach.target', { goal: t(`coach.goal.${goal}`), kcal: energy.kcal })}</ThemedText>
              {energy.floorApplied ? <ThemedText type="small">{t('coach.floor', { kcal: energy.floor })}</ThemedText> : null}
              <Choice
                label={t('coach.macroProfile')}
                options={MACRO_PROFILES}
                value={macroChoice.profile}
                onChange={(profile) => setMacroChoice((c) => ({ ...c, profile }))}
                format={(v) => t(`coach.macroProfileOption.${v}`)}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {t(`coach.macroProfileText.${macroChoice.profile}`)}
              </ThemedText>
              {macroChoice.profile === 'eigen' ? (
                <>
                  <ThemedText type="small">{t('coach.proteinPerKg')}</ThemedText>
                  <Presets
                    label={t('coach.proteinPerKg')}
                    options={PROTEIN_PRESETS}
                    value={macroChoice.proteinPerKg}
                    format={(v) => `${formatNumber(v)} g/kg`}
                    onChange={(proteinPerKg) => setMacroChoice((c) => ({ ...c, proteinPerKg }))}
                  />
                  <ThemedText type="small">{t('coach.fatShare')}</ThemedText>
                  <Presets
                    label={t('coach.fatShare')}
                    options={FAT_PRESETS}
                    value={macroChoice.fatShare}
                    format={(v) => `${Math.round(v * 100)} %`}
                    onChange={(fatShare) => setMacroChoice((c) => ({ ...c, fatShare }))}
                  />
                </>
              ) : null}
              {plan?.macros ? (
                <ThemedText>{t('coach.macros', { ...plan.macros })}</ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {t('coach.resultHint')}
              </ThemedText>
            </>
          ) : energy.status === 'fehlt' ? (
            <ThemedText>{t('coach.missing', { list: energy.missing.map((m) => t(`coach.missingItem.${m}`)).join(', ') })}</ThemedText>
          ) : (
            <ThemedText>{t(`coach.status.${energy.status}`)}</ThemedText>
          )}
        </Card>
      ) : null}

      {step === 'training' ? (
        <>
          <Card title={t('coach.trainingTitle')}>
            <MultiChoice
              label={t('coach.weekdays', { count: weekdays.length })}
              options={WEEKDAYS.map(String)}
              value={weekdays.map(String)}
              onChange={(v) => setWeekdays(v.map(Number).sort((x, y) => x - y))}
              format={(d) => t(`reminders.dayShort.${d}`)}
            />
            {plan?.trainingKcal && !hideNumbers ? (
              <ThemedText type="small">{t('coach.splitText', { training: plan.trainingKcal, rest: plan.restKcal })}</ThemedText>
            ) : null}
            {energy.status === 'ok' ? (
              <Choice
                label={t('coach.split')}
                options={['an', 'aus'] as const}
                value={split ? 'an' : 'aus'}
                onChange={(v) => setSplit(v === 'an')}
                format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
              />
            ) : null}
          </Card>
          <Card title={t('coach.planTitle')}>
            <Choice
              label={t('coach.planTitle')}
              options={(hasPlans ? ['vorhanden', 'vorlage', 'eigen', 'spaeter'] : ['vorlage', 'eigen', 'spaeter']) as PlanChoice[]}
              value={planChoice}
              onChange={setPlanChoice}
              format={(v) => t(`coach.planChoice.${v}`)}
            />
            {planChoice === 'vorlage' ? (
              <>
                <Choice label={t('assistant.experience')} options={LEVELS} value={experience} onChange={setExperience} format={(v) => t(`exercises.levelOption.${v}`)} />
                <MultiChoice label={t('assistant.available')} options={EQUIPMENT} value={available} onChange={setAvailable} format={(v) => t(`equipment.${v}`)} />
                <Presets label={t('assistant.minutes')} options={MINUTE_PRESETS} value={minutes} format={(m) => t('common.minutes', { value: m })} onChange={setMinutes} />
                {weekdays.length < 2 || weekdays.length > 6 ? (
                  <ThemedText type="small">{t('coach.templateDays')}</ThemedText>
                ) : template ? (
                  <>
                    {template.draft.days.map((d, i) => (
                      <ListRow key={i} title={d.name} subtitle={t('coach.templateDay', { count: d.items.length, minutes: template.dayMinutes[i] })} />
                    ))}
                    {template.conflicts.length > 0 ? <ThemedText style={{ color: theme.danger }}>{t('coach.templateConflict')}</ThemedText> : null}
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('assistant.disclaimer')}
                    </ThemedText>
                  </>
                ) : null}
              </>
            ) : null}
            {planChoice === 'eigen' ? <ThemedText type="small">{t('coach.ownPlan')}</ThemedText> : null}
          </Card>
        </>
      ) : null}

      {step === 'anbindungen' ? (
        <>
          <Card title={t('coach.remindTitle')}>
            <Choice
              label={t('coach.remind', { days: weekdays.map((d) => t(`reminders.dayShort.${d}`)).join(', ') || '–' })}
              options={['an', 'aus'] as const}
              value={reminder ? 'an' : 'aus'}
              onChange={(v) => setReminder(v === 'an')}
              format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
            />
            {reminder ? <Field label={t('coach.remindTime')} value={reminderTime} onChangeText={setReminderTime} keyboardType="numbers-and-punctuation" /> : null}
            <ThemedText type="small" themeColor="textSecondary">
              {t('coach.remindHint')}
            </ThemedText>
          </Card>
          <Card title={t('coach.healthTitle')}>
            {(['schritte', 'schlaf', 'kalorien', 'wasser', 'makros'] as const).map((k) => (
              <ListRow key={k} title={t(`coach.health.${k}`)} accessory={t('coach.healthSoon')} />
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              {t('coach.healthHint')}
            </ThemedText>
          </Card>
        </>
      ) : null}

      {problem ? <ThemedText style={{ color: theme.danger }}>{problem}</ThemedText> : null}
      <View style={styles.row}>
        {index > 0 ? <Button label={t('onboarding.back')} variant="danger" onPress={() => setStep(STEPS[index - 1])} /> : null}
        {step === 'anbindungen' ? (
          <Button label={t('coach.finish')} disabled={busy} onPress={finish} />
        ) : (
          <Button label={t('onboarding.next')} onPress={next} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
