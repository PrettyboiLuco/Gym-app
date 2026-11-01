import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { Choice, Field } from '@/components/fields';
import { Icon } from '@/components/icon';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { pickBackup } from '@/data/backup-files';
import { applyPlanImport } from '@/data/plan-import';
import { findProgram } from '@/data/programs';
import lucsPlan from '@/data/presets/lucs-training.myhealth.json';
import { listExercises, type Exercise } from '@/data/training';
import { CUSTOM_PREFIX, parsePlanFile, type PlanFileResult } from '@/domain/plan-file';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

const WEEKDAY_KEYS = ['', 'mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'] as const;
type YesNo = 'ja' | 'nein';

/**
 * Plan übernehmen: aus einer Plan-Datei (z. B. aus der Dateien-App), als eingefügter Text oder der
 * mitgelieferte Plan. Übernimmt Plan, Dehn-Abläufe, eigene Übungen und – nach Bestätigung – Tagesziele.
 * Auf Wunsch werden die bisherigen Pläne archiviert; Trainings, Sätze und Gewichte bleiben im Verlauf.
 */
export default function ImportPlanScreen() {
  const theme = useTheme();
  const { data: exercises, db } = useLoad((d) => listExercises(d), [] as Exercise[]);
  // Aus „Programm-Vorlagen“ (A8.1): die gewählte Vorlage ist schon eingesetzt.
  const { preset } = useLocalSearchParams<{ preset?: string }>();
  const [text, setText] = useState(() => {
    const program = findProgram(preset);
    return program ? JSON.stringify(program.file) : '';
  });
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState<YesNo>('ja');
  const [goals, setGoals] = useState<YesNo>('ja');
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const result: PlanFileResult | null = text.trim() ? parsePlanFile(text, new Set(byId.keys())) : null;
  const customNames = new Map(result?.ok ? result.customExercises.map((c) => [`${CUSTOM_PREFIX}${c.key}`, c.name]) : []);
  const nameOf = (id: string) => customNames.get(id) ?? exerciseName(byId.get(id));
  const hasGoals = result?.ok ? result.goals.kcal !== null || result.goals.drinkMl !== null : false;

  async function pickFile() {
    const content = await pickBackup().catch(() => null);
    if (content) setText(content);
  }

  async function save() {
    if (!result?.ok) return;
    setBusy(true);
    try {
      const done = await applyPlanImport(db, result, { replace: replace === 'ja', goals: hasGoals && goals === 'ja' }, todayDay());
      showToast(
        done.archivedPlans > 0 ? t('planImport.savedReplaced', { count: done.archivedPlans }) : t('planImport.saved')
      );
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
  const yesNo = (v: YesNo) => t(`planImport.${v}`);

  return (
    <Screen withHeader>
      <Card title={t('planImport.title')}>
        <ThemedText themeColor="textSecondary">{t('planImport.intro')}</ThemedText>
        <Button
          label={t('planImport.preset', { name: lucsPlan.name })}
          icon={<Icon name="dumbbell" color={theme.onPrimary} size={18} />}
          onPress={() => setText(JSON.stringify(lucsPlan))}
        />
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
            <ThemedText type="small" themeColor="textSecondary">
              {t('planImport.summary', {
                days: result.draft.days.length,
                sets: result.draft.days.reduce((n, d) => n + d.items.reduce((m, i) => m + i.sets, 0), 0),
              })}
              {result.weekdays ? ` · ${result.weekdays.map((d) => t(`planImport.weekday.${WEEKDAY_KEYS[d]}`)).join(', ')}` : ''}
            </ThemedText>
            {result.note ? <ThemedText themeColor="textSecondary">{result.note}</ThemedText> : null}
          </Card>
          {result.draft.days.map((day) => (
            <Card
              key={day.name}
              title={day.name}
              trailing={
                <ThemedText type="small" themeColor="textSecondary">
                  {t('planImport.daySets', { count: day.items.reduce((m, i) => m + i.sets, 0) })}
                </ThemedText>
              }>
              {day.items.map((item, i) => (
                <View key={`${item.exerciseId}-${i}`} style={styles.item}>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <ThemedText>{item.label || nameOf(item.exerciseId)}</ThemedText>
                      {item.label && item.label !== nameOf(item.exerciseId) ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {nameOf(item.exerciseId)}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText themeColor="textSecondary" style={styles.num}>
                      {item.targetSeconds != null
                        ? t('planImport.timed', { sets: item.sets, seconds: item.targetSeconds })
                        : t('planImport.reps', { sets: item.sets, min: item.repsMin, max: item.repsMax })}
                      {item.rir ? ` · RIR ${item.rir}` : ''}
                    </ThemedText>
                  </View>
                  {item.note ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.note}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </Card>
          ))}
          {result.routines.map((r) => (
            <Card
              key={r.name}
              title={r.name}
              trailing={
                <ThemedText type="small" themeColor="textSecondary">
                  {t('planImport.routineLength', {
                    count: r.items.length,
                    min: Math.max(1, Math.round(r.items.reduce((s, i) => s + i.seconds, 0) / 60)),
                  })}
                </ThemedText>
              }>
              {r.items.map((item, i) => (
                <View key={`${item.exerciseId}-${i}`} style={styles.row}>
                  <ThemedText style={styles.flex}>{nameOf(item.exerciseId)}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.num}>
                    {t('planImport.seconds', { seconds: item.seconds })}
                  </ThemedText>
                </View>
              ))}
            </Card>
          ))}

          <Card title={t('planImport.optionsTitle')}>
            <Choice label={t('planImport.replace')} options={['ja', 'nein'] as const} value={replace} onChange={setReplace} format={yesNo} />
            <ThemedText type="small" themeColor="textSecondary">
              {replace === 'ja' ? t('planImport.replaceYes') : t('planImport.replaceNo')}
            </ThemedText>
            {hasGoals ? (
              <>
                <Choice
                  label={t('planImport.goals', {
                    list: [
                      result.goals.kcal !== null ? t('planImport.goalKcal', { kcal: result.goals.kcal.toLocaleString('de-DE') }) : null,
                      result.goals.drinkMl !== null
                        ? t('planImport.goalDrink', { liters: (result.goals.drinkMl / 1000).toLocaleString('de-DE') })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(', '),
                  })}
                  options={['ja', 'nein'] as const}
                  value={goals}
                  onChange={setGoals}
                  format={yesNo}
                />
              </>
            ) : null}
          </Card>
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
  item: { paddingVertical: Spacing.one, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 32 },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
