import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { ConfirmButton, Field, ListRow } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { routineMinutes, templateName, withMinutes } from '@/components/timed';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { useUnits } from '@/data/profile-provider';
import {
  addFlexibilityTest,
  deleteFlexibilityTest,
  listFlexibilityTests,
  listRoutines,
  type FlexibilityTest,
  type RoutineSummary,
} from '@/data/routines';
import { listExercises, type Exercise } from '@/data/training';
import { FLEX_RANGE } from '@/domain/goals';
import { STRETCH_TEMPLATES } from '@/domain/routines';
import { parseLengthIn } from '@/domain/units';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatLength, t } from '@/i18n';

async function loadStretch(db: Db) {
  const [list, exercises, tests] = await Promise.all([listRoutines(db, 'dehnen'), listExercises(db), listFlexibilityTests(db)]);
  const routines = await withMinutes(db, list, exercises);
  return { routines, exercises, tests };
}

/** Dehnen und Mobilität (Register STRETCH-001–008): Vorlagen, eigene Routinen, Beweglichkeitstest. */
export default function StretchScreen() {
  const theme = useTheme();
  const units = useUnits();
  const { data, reload, db } = useLoad(loadStretch, {
    routines: [] as (RoutineSummary & { minutes: number })[],
    exercises: [] as Exercise[],
    tests: [] as FlexibilityTest[],
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  async function saveTest() {
    const cm = parseLengthIn(input, units.length, FLEX_RANGE);
    if (cm === null) {
      setError(true);
      return;
    }
    setError(false);
    await addFlexibilityTest(db, todayDay(), Math.max(0, cm));
    setInput('');
    await reload();
  }

  return (
    <Screen withHeader>
      <Card title={t('stretch.introTitle')}>
        <ThemedText type="small">{t('stretch.intro')}</ThemedText>
      </Card>

      <Card title={t('stretch.templates')}>
        {STRETCH_TEMPLATES.map((tpl) => (
          <ListRow
            key={tpl.id}
            title={templateName(tpl)}
            subtitle={`${t(`templates.${tpl.id}.text`)}\n${t('stretch.summary', {
              count: tpl.items.length,
              minutes: routineMinutes(tpl, data.exercises),
            })}`}
            accessory="›"
            onPress={() => router.push({ pathname: '/training/routine/[id]', params: { id: 'neu', template: tpl.id } })}
          />
        ))}
      </Card>

      <Card title={t('stretch.own')}>
        {data.routines.length === 0 ? <ThemedText themeColor="textSecondary">{t('stretch.ownEmpty')}</ThemedText> : null}
        {data.routines.map((r) => (
          <ListRow
            key={r.routineId}
            title={r.name}
            subtitle={t('stretch.summary', { count: r.itemCount, minutes: r.minutes })}
            accessory="›"
            onPress={() => router.push({ pathname: '/training/routine/[id]', params: { id: r.routineId } })}
          />
        ))}
        <Button label={t('stretch.new')} onPress={() => router.push({ pathname: '/training/routine/[id]', params: { id: 'neu', kind: 'dehnen' } })} />
      </Card>

      <Card title={t('stretch.flexTitle')}>
        <ThemedText type="small">{t('stretch.flexHow')}</ThemedText>
        <View style={styles.row}>
          <Field
            label={t('stretch.flexInput', { unit: units.length })}
            value={input}
            onChangeText={setInput}
            keyboardType="decimal-pad"
            style={styles.flex}
          />
          <Button label={t('stretch.flexSave')} onPress={saveTest} />
        </View>
        {error ? (
          <ThemedText style={{ color: theme.danger }}>
            {t('stretch.flexInvalid', { max: formatLength(FLEX_RANGE.max, units.length) })}
          </ThemedText>
        ) : null}
        {data.tests.length > 0 ? (
          <>
            <ThemedText>
              {t('stretch.flexLatest', { value: formatLength(data.tests[0].cm, units.length), date: formatDay(data.tests[0].day) })}
            </ThemedText>
            {data.tests.slice(1, 6).map((test) => (
              <View key={test.id} style={styles.entry}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  {formatDay(test.day)} · {formatLength(test.cm, units.length)}
                </ThemedText>
                <ConfirmButton label={t('common.delete')} onConfirm={async () => { await deleteFlexibilityTest(db, test.id); await reload(); }} />
              </View>
            ))}
          </>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('stretch.flexGoalHint')}
        </ThemedText>
      </Card>

      <Card>
        <ListRow title={t('stretch.historyLink')} accessory="›" onPress={() => router.push('/training/history')} />
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        {t('exerciseHow.note')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
