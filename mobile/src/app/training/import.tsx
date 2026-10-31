import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { Field } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { pickBackup } from '@/data/backup-files';
import { listExercises, savePlan, type Exercise } from '@/data/training';
import { parsePlanFile, type PlanFileResult } from '@/domain/plan-file';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Plan übernehmen: aus einer Plan-Datei (z. B. aus der Dateien-App) oder als eingefügter Text.
 * Fügt nur einen neuen Plan hinzu – Tagebuch, Trainings und andere Pläne bleiben unverändert.
 * Vor dem Speichern zeigt die App alle Tage und Übungen zur Kontrolle.
 */
export default function ImportPlanScreen() {
  const theme = useTheme();
  const { data: exercises, db } = useLoad((d) => listExercises(d), [] as Exercise[]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const result: PlanFileResult | null = text.trim() ? parsePlanFile(text, new Set(byId.keys())) : null;

  async function pickFile() {
    const content = await pickBackup().catch(() => null);
    if (content) setText(content);
  }

  async function save() {
    if (!result?.ok) return;
    setBusy(true);
    try {
      await savePlan(db, null, result.draft, { note: result.note ?? undefined });
      showToast(t('planImport.saved'));
      router.dismissTo('/training');
    } finally {
      setBusy(false);
    }
  }

  const error =
    result && !result.ok
      ? result.error === 'unknownExercises'
        ? t('planImport.errorUnknown', { list: (result.unknown ?? []).join(', ') })
        : t(`planImport.error.${result.error}`)
      : null;

  return (
    <Screen withHeader>
      <Card title={t('planImport.title')}>
        <ThemedText themeColor="textSecondary">{t('planImport.intro')}</ThemedText>
        <Button
          label={t('planImport.pickFile')}
          variant="secondary"
          icon={<Icon name="book" color={theme.text} size={18} />}
          onPress={pickFile}
        />
        <Field
          label={t('planImport.pasteLabel')}
          value={text}
          onChangeText={setText}
          placeholder={t('planImport.pastePlaceholder')}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.paste}
        />
        {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}
      </Card>

      {result?.ok ? (
        <>
          <Card title={result.draft.name}>
            {result.note ? <ThemedText themeColor="textSecondary">{result.note}</ThemedText> : null}
            <ThemedText type="small" themeColor="textSecondary">
              {t('planImport.summary', {
                days: result.draft.days.length,
                sets: result.draft.days.reduce((n, d) => n + d.items.reduce((m, i) => m + i.sets, 0), 0),
              })}
            </ThemedText>
          </Card>
          {result.draft.days.map((day) => (
            <Card key={day.name} title={day.name} trailing={<ThemedText type="small" themeColor="textSecondary">{t('planImport.daySets', { count: day.items.reduce((m, i) => m + i.sets, 0) })}</ThemedText>}>
              {day.items.map((item, i) => (
                <View key={`${item.exerciseId}-${i}`} style={styles.row}>
                  <ThemedText style={styles.flex}>{exerciseName(byId.get(item.exerciseId))}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.num}>
                    {item.targetSeconds != null
                      ? t('planImport.timed', { sets: item.sets, seconds: item.targetSeconds })
                      : t('planImport.reps', { sets: item.sets, min: item.repsMin, max: item.repsMax })}
                  </ThemedText>
                </View>
              ))}
            </Card>
          ))}
          <Button label={t('planImport.save')} loading={busy} onPress={save} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('planImport.hint')}
          </ThemedText>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  paste: { minHeight: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 40 },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
