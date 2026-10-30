import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { ConfirmButton, Field } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addSteps, deleteSteps, listSteps } from '@/data/steps';
import { shiftDay } from '@/domain/nutrition';
import { parseSteps, stepsAverage, stepsForDay, type StepEntry } from '@/domain/steps';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';

/**
 * Schritte (Register HEALTH-001–007). Jetzt als eigener Tagesstand; Apple Health folgt mit dem
 * Development Build. Schritte werden nie zum Kalorienziel addiert (HEALTH-007).
 */
export default function StepsScreen() {
  const theme = useTheme();
  const { data: entries, reload, db } = useLoad((d) => listSteps(d), [] as StepEntry[]);
  const [day, setDay] = useState(todayDay);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const today = todayDay();
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(today, -i));
  const average = stepsAverage(entries, week);
  const current = stepsForDay(entries, day);

  async function save() {
    const steps = parseSteps(input);
    if (steps === null) {
      setError(true);
      return;
    }
    setError(false);
    await addSteps(db, day, steps);
    setInput('');
    await reload();
  }

  return (
    <Screen withHeader>
      <Card>
        <DaySwitcher day={day} onChange={setDay} />
        <ThemedText>
          {current ? t('steps.current', { steps: formatNumber(current.steps, 0), source: t(`steps.source.${current.source}`) }) : t('steps.none')}
        </ThemedText>
        <View style={styles.row}>
          <Field label={t('steps.input')} value={input} onChangeText={setInput} keyboardType="number-pad" style={styles.flex} />
          <Button label={t('common.save')} onPress={save} />
        </View>
        {error ? <ThemedText style={{ color: theme.danger }}>{t('steps.invalid')}</ThemedText> : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('steps.manualHint')}
        </ThemedText>
      </Card>
      <Card title={t('steps.weekTitle')}>
        <ThemedText>{average === null ? t('steps.averageNone') : t('steps.average', { steps: formatNumber(average, 0) })}</ThemedText>
        {week.map((d) => {
          const v = stepsForDay(entries, d);
          return (
            <ThemedText key={d} type="small" themeColor={v ? 'text' : 'textSecondary'}>
              {formatDay(d)} · {v ? formatNumber(v.steps, 0) : t('steps.empty')}
            </ThemedText>
          );
        })}
        <ThemedText type="small" themeColor="textSecondary">
          {t('steps.noCredit')}
        </ThemedText>
      </Card>
      <Card title={t('steps.healthTitle')}>
        <ThemedText type="small">{t('steps.health')}</ThemedText>
      </Card>
      {entries.length > 0 ? (
        <Card title={t('steps.history')}>
          {entries.slice(0, 20).map((e) => (
            <View key={e.id} style={styles.entry}>
              <ThemedText style={styles.flex}>
                {formatDay(e.day)} · {formatNumber(e.steps, 0)} · {t(`steps.source.${e.source}`)}
              </ThemedText>
              <ConfirmButton label={t('common.delete')} onConfirm={async () => { await deleteSteps(db, e.id); await reload(); }} />
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
