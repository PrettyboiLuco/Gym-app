import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, Field, MultiChoice } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { CalculatorFields, UnitFields } from '@/components/profile-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useProfile } from '@/data/profile-provider';
import { parseProfileForm, profileToForm, type ProfileForm, type ProfileProblem } from '@/domain/profile';
import { EQUIPMENT } from '@/domain/exercises';
import { GOALS, LEVELS } from '@/domain/planner';
import { HEIGHT_RANGE } from '@/domain/units';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatLength, t } from '@/i18n';

/** Profil und Einheiten bearbeiten (Register COACH-001, UX-003, COACH-010). */
export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, updateProfile } = useProfile();
  const [baseline] = useState(() => JSON.stringify(profileToForm(profile)));
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [problems, setProblems] = useState<ProfileProblem[]>([]);
  const change = (c: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...c }));
  const allowLeave = useUnsavedGuard(JSON.stringify(form) !== baseline);

  async function save() {
    const { profile: parsed, problems: found } = parseProfileForm(form, profile, todayDay());
    if (!parsed) {
      setProblems(found);
      return;
    }
    await updateProfile(parsed);
    allowLeave();
    router.back();
  }

  return (
    <Screen withHeader>
      <UnitFields form={form} onChange={change} />
      <CalculatorFields form={form} onChange={change} />
      <Card>
        <Choice
          label={t('profile.sensitive')}
          options={['aus', 'an'] as const}
          value={form.sensitive ? 'an' : 'aus'}
          onChange={(v) => change({ sensitive: v === 'an' })}
          format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('profile.sensitiveHint')}
        </ThemedText>
      </Card>
      <Card title={t('profile.trainingTitle')}>
        <Choice
          label={t('profile.experience')}
          options={['keine', ...LEVELS] as const}
          value={form.experience}
          onChange={(experience) => change({ experience })}
          format={(v) => (v === 'keine' ? t('profile.none') : t(`exercises.levelOption.${v}`))}
        />
        <Choice
          label={t('profile.trainingGoal')}
          options={['keine', ...GOALS] as const}
          value={form.trainingGoal}
          onChange={(trainingGoal) => change({ trainingGoal })}
          format={(v) => (v === 'keine' ? t('profile.none') : t(`trainingGoal.${v}`))}
        />
        <MultiChoice
          label={t('profile.equipment')}
          options={EQUIPMENT.filter((e) => e !== 'koerpergewicht')}
          value={form.equipment}
          onChange={(equipment) => change({ equipment })}
          format={(v) => t(`equipment.${v}`)}
        />
        <Field label={t('profile.minutes')} value={form.minutes} onChangeText={(minutes) => change({ minutes })} keyboardType="number-pad" />
        <ThemedText type="small" themeColor="textSecondary">
          {t('profile.trainingHint')}
        </ThemedText>
      </Card>
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
        {t('profile.privacy')}
      </ThemedText>
      <Button label={t('common.save')} onPress={save} />
    </Screen>
  );
}
