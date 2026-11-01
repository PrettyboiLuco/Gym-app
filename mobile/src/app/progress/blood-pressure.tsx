import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { ConfirmButton, Field } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addBloodPressure, deleteBloodPressure, listBloodPressure, type BloodPressure } from '@/data/blood-pressure';
import { bpAverage, parseBloodPressure, type BpProblem } from '@/domain/blood-pressure';
import { shiftDay } from '@/domain/dates';
import { localDay, timeZone, todayDay } from '@/domain/time';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';

/** Blutdruck-Tagebuch (Ausbauplan A10.4): Werte und Verlauf, ohne Bewertung oder Grenzwerte. */
export default function BloodPressureScreen() {
  const theme = useTheme();
  const { data: list, db, reload } = useLoad(listBloodPressure, [] as BloodPressure[]);
  const [form, setForm] = useState({ systolic: '', diastolic: '', pulse: '', note: '' });
  const [problems, setProblems] = useState<BpProblem[]>([]);
  const week = bpAverage(list.filter((m) => m.day >= shiftDay(todayDay(), -6)));
  const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  async function save() {
    const r = parseBloodPressure(form);
    setProblems(r.problems);
    if (!r.value) return;
    const now = new Date();
    await addBloodPressure(db, { ...r.value, day: localDay(now, timeZone), measuredAt: now.toISOString(), note: form.note });
    setForm({ systolic: '', diastolic: '', pulse: '', note: '' });
    await reload();
  }

  return (
    <Screen withHeader>
      <Card title={t('bloodPressure.add')}>
        <View style={styles.row}>
          <Field label={t('bloodPressure.systolic')} value={form.systolic} onChangeText={(systolic) => setForm({ ...form, systolic })} keyboardType="number-pad" style={styles.flex} />
          <Field label={t('bloodPressure.diastolic')} value={form.diastolic} onChangeText={(diastolic) => setForm({ ...form, diastolic })} keyboardType="number-pad" style={styles.flex} />
        </View>
        <Field label={t('bloodPressure.pulse')} value={form.pulse} onChangeText={(pulse) => setForm({ ...form, pulse })} keyboardType="number-pad" />
        <Field label={t('bloodPressure.note')} value={form.note} onChangeText={(note) => setForm({ ...form, note })} />
        {problems.map((p) => (
          <ThemedText key={p} style={{ color: theme.danger }}>
            {t(`bloodPressure.problems.${p}`)}
          </ThemedText>
        ))}
        <Button label={t('common.save')} onPress={save} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('bloodPressure.hint')}
        </ThemedText>
      </Card>
      {week ? (
        <Card title={t('bloodPressure.weekTitle')}>
          <ThemedText>{t('bloodPressure.average', { sys: week.systolic, dia: week.diastolic, count: week.count })}</ThemedText>
          {week.pulse !== null ? <ThemedText type="small">{t('bloodPressure.averagePulse', { pulse: week.pulse })}</ThemedText> : null}
        </Card>
      ) : null}
      <Card title={t('bloodPressure.history')}>
        {list.length === 0 ? <ThemedText type="small">{t('bloodPressure.empty')}</ThemedText> : null}
        {list.map((m) => (
          <View key={m.id} style={styles.entry}>
            <ThemedText style={styles.flex}>
              {`${formatDay(m.day)} ${time(m.measuredAt)} · ${m.systolic}/${m.diastolic} mmHg${m.pulse ? ` · ${t('bloodPressure.pulseShort', { pulse: m.pulse })}` : ''}${m.note ? ` · ${m.note}` : ''}`}
            </ThemedText>
            <ConfirmButton
              label={t('common.delete')}
              onConfirm={async () => {
                await deleteBloodPressure(db, m.id);
                await reload();
              }}
            />
          </View>
        ))}
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        {t('bloodPressure.disclaimer')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
