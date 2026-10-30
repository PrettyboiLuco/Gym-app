import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, RadioList } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { CalculatorFields, UnitFields } from '@/components/profile-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { saveGoal } from '@/data/goals';
import { loadNutritionSettings, saveNutritionSettings } from '@/data/nutrition';
import { useProfile } from '@/data/profile-provider';
import { useDb } from '@/data/store-provider';
import { listWeights } from '@/data/weights';
import type { Goal } from '@/domain/energy';
import { DIRECTIONS } from '@/domain/goals';
import { parseProfileForm, profileToForm, type ProfileForm, type ProfileProblem } from '@/domain/profile';
import { HEIGHT_RANGE } from '@/domain/units';
import { weightTrend } from '@/domain/weight';
import { useTheme } from '@/hooks/use-theme';
import { formatLength, t } from '@/i18n';

const STEPS = ['adult', 'sensitive', 'units', 'goal', 'profile'] as const;
type Step = (typeof STEPS)[number];

/**
 * Erststart (Register UX-010, COACH-010): Volljährigkeit, sensible Situationen, Einheiten,
 * Gewichtsziel und freiwillige Angaben für den Rechner. Die Health-Freigabe folgt mit Apple Health (Phase 6).
 */
export function Onboarding() {
  const db = useDb();
  const theme = useTheme();
  const { profile, updateProfile, finishOnboarding } = useProfile();
  const [step, setStep] = useState<Step>('adult');
  const [adult, setAdult] = useState<boolean | null>(null);
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [hideNumbers, setHideNumbers] = useState(false);
  const [goal, setGoal] = useState<Goal | 'spaeter'>('spaeter');
  const [problems, setProblems] = useState<ProfileProblem[]>([]);
  const [busy, setBusy] = useState(false);

  const index = STEPS.indexOf(step);
  const change = (c: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...c }));

  async function finish(withProfile: boolean) {
    const today = todayDay();
    const source = withProfile ? form : { ...profileToForm(profile), sensitive: form.sensitive, units: form.units };
    const { profile: parsed, problems: found } = parseProfileForm(source, profile, today);
    if (!parsed) {
      setProblems(found);
      return;
    }
    setBusy(true);
    try {
      if (hideNumbers) {
        const settings = await loadNutritionSettings(db);
        await saveNutritionSettings(db, { ...settings, hideNumbers: true });
      }
      // Abnehmen wird bei sensibler Situation nicht angeboten (siehe Auswahl unten).
      if (goal !== 'spaeter') {
        const weights = await listWeights(db);
        const current = weightTrend(weights, today) ?? weights[0]?.kg ?? null;
        await saveGoal(db, null, { kind: 'gewicht', direction: goal, targetKg: null }, today, current);
      }
      await updateProfile({ ...parsed, adult: true });
      await finishOnboarding();
    } finally {
      setBusy(false);
    }
  }

  const directions = form.sensitive ? DIRECTIONS.filter((d) => d !== 'abnehmen') : DIRECTIONS;

  return (
    <Screen title={t('onboarding.welcomeTitle')} subtitle={t('onboarding.step', { step: index + 1, total: STEPS.length })}>
      {step === 'adult' ? (
        <>
          <Card>
            <ThemedText>{t('onboarding.welcome')}</ThemedText>
          </Card>
          <Card title={t('onboarding.adultQuestion')}>
            <View style={styles.row}>
              <Button label={t('onboarding.yes')} onPress={() => { setAdult(true); setStep('sensitive'); }} />
              <Button label={t('onboarding.no')} variant="danger" onPress={() => setAdult(false)} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {t('onboarding.adultHint')}
            </ThemedText>
            {adult === false ? <ThemedText style={{ color: theme.danger }}>{t('onboarding.minor')}</ThemedText> : null}
          </Card>
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {t('more.health')}
            </ThemedText>
          </Card>
        </>
      ) : null}

      {step === 'sensitive' ? (
        <Card title={t('onboarding.sensitiveTitle')}>
          <ThemedText>{t('onboarding.sensitiveIntro')}</ThemedText>
          <ThemedText>{t('onboarding.sensitiveList')}</ThemedText>
          <Choice
            label={t('onboarding.sensitiveIntro')}
            options={['nein', 'ja'] as const}
            value={form.sensitive ? 'ja' : 'nein'}
            onChange={(v) => {
              change({ sensitive: v === 'ja' });
              if (v === 'ja' && goal === 'abnehmen') setGoal('spaeter');
            }}
            format={(v) => (v === 'ja' ? t('onboarding.yes') : t('onboarding.no'))}
          />
          {form.sensitive ? (
            <>
              <ThemedText>{t('onboarding.sensitiveYes')}</ThemedText>
              <Choice
                label={t('onboarding.hideNumbers')}
                options={['aus', 'an'] as const}
                value={hideNumbers ? 'an' : 'aus'}
                onChange={(v) => setHideNumbers(v === 'an')}
                format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {t('onboarding.hideNumbersHint')}
              </ThemedText>
            </>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {t('onboarding.sensitivePrivacy')}
          </ThemedText>
        </Card>
      ) : null}

      {step === 'units' ? <UnitFields form={form} onChange={change} /> : null}

      {step === 'goal' ? (
        <Card title={t('onboarding.goalTitle')}>
          <RadioList
            label={t('onboarding.goalTitle')}
            options={[...directions, 'spaeter'] as readonly (Goal | 'spaeter')[]}
            value={goal}
            onChange={setGoal}
            format={(v) => (v === 'spaeter' ? t('onboarding.goalLater') : t(`goals.direction.${v}`))}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('onboarding.goalHint')}
          </ThemedText>
          {form.sensitive ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('goals.problems.sensitive')}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {step === 'profile' ? (
        <>
          <Card title={t('onboarding.profileTitle')}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('onboarding.profileHint')}
            </ThemedText>
          </Card>
          <CalculatorFields form={form} onChange={change} />
          {problems.length > 0 ? (
            <Card>
              {problems.map((p) => (
                <ThemedText key={p} style={{ color: theme.danger }}>
                  {t(`profile.problems.${p}`, {
                    min: formatLength(HEIGHT_RANGE.min, form.units.length),
                    max: formatLength(HEIGHT_RANGE.max, form.units.length),
                  })}
                </ThemedText>
              ))}
            </Card>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {t('onboarding.doneHint')}
          </ThemedText>
        </>
      ) : null}

      {step !== 'adult' ? (
        <View style={styles.row}>
          <Button label={t('onboarding.back')} variant="danger" onPress={() => setStep(STEPS[index - 1])} />
          {step === 'profile' ? (
            <>
              <Button label={t('onboarding.skip')} variant="danger" disabled={busy} onPress={() => finish(false)} />
              <Button label={t('onboarding.finish')} disabled={busy} onPress={() => finish(true)} />
            </>
          ) : (
            <Button label={t('onboarding.next')} onPress={() => setStep(STEPS[index + 1])} />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
