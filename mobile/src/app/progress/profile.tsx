import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, Field, MultiChoice, Toggle } from '@/components/fields';
import { CalculatorFields, UnitFields } from '@/components/profile-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { loadMapPrefs, saveMapPrefs, type MapPrefs } from '@/data/training-week';
import { EQUIPMENT } from '@/domain/exercises';
import { GOALS, LEVELS } from '@/domain/planner';
import { parseProfileForm, profileToForm, type ProfileForm, type ProfileProblem } from '@/domain/profile';
import { todayDay } from '@/domain/time';
import { HEIGHT_RANGE } from '@/domain/units';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatLength, t } from '@/i18n';
import { useProfile } from '@/providers/profile-provider';
import { useDb } from '@/providers/store-provider';

/** Profil und Einheiten bearbeiten (Register COACH-001, UX-003, COACH-010). */
export default function ProfileScreen() {
  const theme = useTheme();
  const db = useDb();
  const { profile, updateProfile } = useProfile();
  // Figur der Muskelkarte (Statistik, „Heute“): gespeichert bei den Karten-Einstellungen, gewählt hier im Profil.
  const [mapPrefs, setMapPrefs] = useState<MapPrefs | null>(null);
  const [body, setBody] = useState<MapPrefs['body'] | null>(null);
  useEffect(() => {
    loadMapPrefs(db).then(setMapPrefs);
  }, [db]);
  const shownBody = body ?? mapPrefs?.body ?? 'm';
  const [baseline] = useState(() => JSON.stringify(profileToForm(profile)));
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [problems, setProblems] = useState<ProfileProblem[]>([]);
  const change = (c: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...c }));
  const allowLeave = useUnsavedGuard(JSON.stringify(form) !== baseline || (body !== null && body !== mapPrefs?.body));

  async function save() {
    const { profile: parsed, problems: found } = parseProfileForm(form, profile, todayDay());
    if (!parsed) {
      setProblems(found);
      return;
    }
    await updateProfile(parsed);
    if (body !== null && mapPrefs && body !== mapPrefs.body) await saveMapPrefs(db, { ...mapPrefs, body });
    allowLeave();
    router.back();
  }

  return (
    <Screen withHeader>
      <UnitFields form={form} onChange={change} />
      <CalculatorFields form={form} onChange={change} />
      <Card>
        <Toggle label={t('profile.sensitive')} hint={t('profile.sensitiveHint')} value={form.sensitive} onChange={(on) => change({ sensitive: on })} />
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
        <Choice label={t('stats.body')} options={['m', 'w'] as const} value={shownBody} onChange={setBody} format={(b) => t(`stats.bodies.${b}`)} />
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
