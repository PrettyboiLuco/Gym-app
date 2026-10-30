import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { ConfirmButton, Field } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addMeasurements, deleteMeasurement, listMeasurements } from '@/data/goals';
import { useUnits } from '@/data/profile-provider';
import { latestBySite, MEASURE_SITES, type Measurement, type MeasureSite } from '@/domain/body';
import { MEASURE_RANGE, parseLengthIn } from '@/domain/units';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatDay, formatLength, t } from '@/i18n';

const EMPTY: Record<MeasureSite, string> = { taille: '', huefte: '', brust: '', arm: '', oberschenkel: '' };

/** Körpermaße eintragen, mit Anleitung und Verlauf (Register GOAL-004). */
export default function MeasurementsScreen() {
  const theme = useTheme();
  const units = useUnits();
  const { data: list, reload, db } = useLoad(listMeasurements, [] as Measurement[]);
  const [day, setDay] = useState(todayDay);
  const [form, setForm] = useState(EMPTY);
  const [problem, setProblem] = useState<'invalid' | 'none' | null>(null);
  const [saved, setSaved] = useState(false);
  const allowLeave = useUnsavedGuard(Object.values(form).some((v) => v.trim() !== ''));
  const latest = latestBySite(list);

  async function save() {
    const values: Partial<Record<MeasureSite, number>> = {};
    for (const site of MEASURE_SITES) {
      const text = form[site].trim();
      if (text === '') continue;
      const cm = parseLengthIn(text, units.length, MEASURE_RANGE);
      if (cm === null) {
        setProblem('invalid');
        return;
      }
      values[site] = cm;
    }
    if (Object.keys(values).length === 0) {
      setProblem('none');
      return;
    }
    setProblem(null);
    await addMeasurements(db, day, values);
    allowLeave();
    setForm(EMPTY);
    setSaved(true);
    await reload();
  }

  const signed = (cm: number) => {
    const text = formatLength(Math.abs(cm), units.length);
    return cm > 0.05 ? `+${text}` : cm < -0.05 ? `−${text}` : text;
  };

  return (
    <Screen withHeader>
      <Card>
        <DaySwitcher day={day} onChange={setDay} />
        {MEASURE_SITES.map((site) => {
          const last = latest[site];
          return (
            <View key={site}>
              <Field
                label={t('measure.input', { site: t(`measure.sites.${site}`), unit: units.length })}
                value={form[site]}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, [site]: v }));
                  setSaved(false);
                }}
                keyboardType="decimal-pad"
              />
              {last ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('measure.latest', { value: formatLength(last.latest.cm, units.length), date: formatDay(last.latest.day) })}{' '}
                  {last.previous
                    ? t('measure.previousChange', {
                        change: signed(last.latest.cm - last.previous.cm),
                        date: formatDay(last.previous.day),
                      })
                    : ''}
                </ThemedText>
              ) : null}
            </View>
          );
        })}
        {problem ? (
          <ThemedText style={{ color: theme.danger }}>
            {problem === 'none'
              ? t('measure.none')
              : t('measure.invalid', {
                  min: formatLength(MEASURE_RANGE.min, units.length),
                  max: formatLength(MEASURE_RANGE.max, units.length),
                })}
          </ThemedText>
        ) : null}
        <Button label={t('measure.save')} onPress={save} />
        {saved ? <ThemedText type="smallBold">{t('measure.saved')}</ThemedText> : null}
      </Card>

      <Card title={t('measure.guideTitle')}>
        <ThemedText type="small">{t('measure.guide')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('measure.guideNote')}
        </ThemedText>
      </Card>

      {list.length > 0 ? (
        <Card title={t('measure.history')}>
          {list.map((m) => (
            <View key={m.id} style={styles.entry}>
              <ThemedText style={styles.flex}>
                {formatDay(m.day)} · {t(`measure.sites.${m.site}`)} · {formatLength(m.cm, units.length)}
              </ThemedText>
              <ConfirmButton label={t('common.delete')} onConfirm={async () => { await deleteMeasurement(db, m.id); await reload(); }} />
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  entry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
