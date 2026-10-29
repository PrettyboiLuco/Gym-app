import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, Field, Presets } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { DEFAULT_SETTINGS, loadNutritionSettings, saveNutritionSettings } from '@/data/nutrition';
import { useDb } from '@/data/store-provider';
import { parseSettingsForm, type SettingsForm, type SettingsProblem } from '@/domain/nutrition';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { t } from '@/i18n';

function toForm(s: typeof DEFAULT_SETTINGS): SettingsForm {
  return {
    kcalGoal: s.kcalGoal === null ? '' : String(s.kcalGoal),
    drinkGoal: s.drinkGoalMl === null ? '' : String(s.drinkGoalMl),
    glassSizes: s.glassSizes,
    hideNumbers: s.hideNumbers,
  };
}

export default function NutritionSettingsScreen() {
  const db = useDb();
  const theme = useTheme();
  const [form, setForm] = useState<SettingsForm>(() => toForm(DEFAULT_SETTINGS));
  const [baseline, setBaseline] = useState('');
  const [newGlass, setNewGlass] = useState('');
  const [problems, setProblems] = useState<SettingsProblem[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadNutritionSettings(db).then((s) => {
      if (cancelled) return;
      const loaded = toForm(s);
      setForm(loaded);
      setBaseline(JSON.stringify(loaded));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const allowLeave = useUnsavedGuard(baseline !== '' && JSON.stringify(form) !== baseline);

  function addGlass() {
    const ml = Number(newGlass.trim());
    if (!Number.isInteger(ml) || ml < 50 || ml > 2000 || form.glassSizes.length >= 8) {
      setProblems(['glass']);
      return;
    }
    setProblems([]);
    setForm((f) => ({ ...f, glassSizes: [...new Set([...f.glassSizes, ml])].sort((a, b) => a - b) }));
    setNewGlass('');
  }

  async function save() {
    const { settings, problems: found } = parseSettingsForm(form);
    if (!settings) {
      setProblems(found);
      return;
    }
    await saveNutritionSettings(db, settings);
    allowLeave();
    router.back();
  }

  return (
    <Screen withHeader>
      <Card>
        <Field
          label={t('nutrition.settings.kcalGoal')}
          value={form.kcalGoal}
          onChangeText={(kcalGoal) => setForm((f) => ({ ...f, kcalGoal }))}
          keyboardType="number-pad"
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.settings.kcalGoalHint')}
        </ThemedText>
      </Card>
      <Card>
        <Field
          label={t('nutrition.settings.drinkGoal')}
          value={form.drinkGoal}
          onChangeText={(drinkGoal) => setForm((f) => ({ ...f, drinkGoal }))}
          keyboardType="number-pad"
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.settings.drinkGoalHint')} {t('nutrition.drinks.basis')}
        </ThemedText>
      </Card>
      <Card title={t('nutrition.settings.glasses')}>
        <Presets
          label={t('common.remove')}
          options={form.glassSizes}
          onChange={(ml) => setForm((f) => ({ ...f, glassSizes: f.glassSizes.filter((g) => g !== ml) }))}
          format={(ml) => `${ml} ml ✕`}
        />
        <View style={styles.row}>
          <Field label="ml" value={newGlass} onChangeText={setNewGlass} keyboardType="number-pad" style={styles.flex} />
          <Button label={t('nutrition.settings.glassAdd')} onPress={addGlass} />
        </View>
      </Card>
      <Card>
        <Choice
          label={t('nutrition.settings.hideNumbers')}
          options={['aus', 'an'] as const}
          value={form.hideNumbers ? 'an' : 'aus'}
          onChange={(v) => setForm((f) => ({ ...f, hideNumbers: v === 'an' }))}
          format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.settings.hideNumbersHint')}
        </ThemedText>
      </Card>
      {problems.length > 0 ? (
        <Card>
          {problems.map((p) => (
            <ThemedText key={p} style={{ color: theme.danger }}>
              {p === 'glass' ? t('nutrition.settings.glassInvalid') : t(`nutrition.settings.problems.${p}`)}
            </ThemedText>
          ))}
        </Card>
      ) : null}
      <Button label={t('common.save')} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
});
