import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice } from '@/components/fields';
import { HeartLoop } from '@/components/heart-loop';
import { UnitFields } from '@/components/profile-fields';
import { Rise, RiseText } from '@/components/rise-text';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { saveCoachPending } from '@/data/coach';
import { loadNutritionSettings, saveNutritionSettings } from '@/data/nutrition';
import { parseProfileForm, profileToForm, type ProfileForm } from '@/domain/profile';
import { todayDay } from '@/domain/time';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useProfile } from '@/providers/profile-provider';
import { useDb } from '@/providers/store-provider';

const STEPS = ['adult', 'sensitive', 'units'] as const;
type Step = (typeof STEPS)[number];

/**
 * Erststart (Register UX-010, COACH-010): Volljährigkeit, sensible Situationen und Einheiten. Ziel, Körperdaten,
 * Alltag und Training fragt danach der Coach (Fahrplan „Coach“ C1) – direkt im Anschluss oder später.
 */
export function Onboarding() {
  const db = useDb();
  const theme = useTheme();
  const { profile, updateProfile, finishOnboarding } = useProfile();
  const [step, setStep] = useState<Step>('adult');
  const [adult, setAdult] = useState<boolean | null>(null);
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [hideNumbers, setHideNumbers] = useState(false);
  const [busy, setBusy] = useState(false);

  const index = STEPS.indexOf(step);
  const change = (c: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...c }));

  async function finish(withCoach: boolean) {
    const { profile: parsed } = parseProfileForm(form, profile, todayDay());
    setBusy(true);
    try {
      if (hideNumbers) {
        const settings = await loadNutritionSettings(db);
        await saveNutritionSettings(db, { ...settings, hideNumbers: true });
      }
      // „Heute“ öffnet die Coach-Einrichtung einmal von selbst.
      if (withCoach) await saveCoachPending(db, true);
      await updateProfile({ ...(parsed ?? profile), sensitive: form.sensitive, units: form.units, adult: true });
      await finishOnboarding();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {/* Erststart = einmaliger erster Eindruck (getlayers „revealChoreography“): das 3D-Herz pendelt, der Titel
          steigt Wort für Wort auf, die Karten folgen gestaffelt. Danach ist die App ruhig. */}
      <View style={styles.hero}>
        {step === 'adult' ? <HeartLoop size={128} /> : null}
        <RiseText key={step} text={step === 'adult' ? t('onboarding.welcomeTitle') : t(`onboarding.stepTitle.${step}`)} />
        <View style={styles.progress} accessible accessibilityLabel={t('onboarding.step', { step: index + 1, total: STEPS.length })}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.progressPill, { backgroundColor: i <= index ? theme.text : theme.backgroundSelected }]} />
          ))}
        </View>
      </View>
      {step === 'adult' ? (
        <>
          <Rise delay={260}>
            <Card>
              <ThemedText>{t('onboarding.welcome')}</ThemedText>
            </Card>
          </Rise>
          <Rise delay={380}>
            <Card title={t('onboarding.adultQuestion')}>
              <View style={styles.row}>
                <Button
                  label={t('onboarding.yes')}
                  onPress={() => {
                    setAdult(true);
                    setStep('sensitive');
                  }}
                />
                <Button label={t('onboarding.no')} variant="secondary" onPress={() => setAdult(false)} />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {t('onboarding.adultHint')}
              </ThemedText>
              {adult === false ? <ThemedText style={{ color: theme.danger }}>{t('onboarding.minor')}</ThemedText> : null}
            </Card>
          </Rise>
          <Rise delay={500}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.health}>
              {t('more.health')}
            </ThemedText>
          </Rise>
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
            onChange={(v) => change({ sensitive: v === 'ja' })}
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

      {step === 'units' ? (
        <>
          <UnitFields form={form} onChange={change} />
          <Card>
            <ThemedText type="small">{t('onboarding.coachHint')}</ThemedText>
          </Card>
        </>
      ) : null}

      {step !== 'adult' ? (
        <View style={styles.row}>
          <Button label={t('onboarding.back')} variant="secondary" onPress={() => setStep(STEPS[index - 1])} />
          {step === 'units' ? (
            <>
              <Button label={t('onboarding.skip')} variant="secondary" disabled={busy} onPress={() => finish(false)} />
              <Button label={t('onboarding.coach')} disabled={busy} onPress={() => finish(true)} />
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
  hero: { gap: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  progress: { flexDirection: 'row', gap: Spacing.one + 2 },
  progressPill: { flex: 1, height: 4, borderRadius: 2 },
  health: { paddingHorizontal: Spacing.one },
});
