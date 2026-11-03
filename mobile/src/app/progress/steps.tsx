import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DayBars } from '@/components/charts';
import { DaySwitcher } from '@/components/day-switcher';
import { ConfirmButton, EntryRow, Field } from '@/components/fields';
import { InsightInfo } from '@/components/insight-info';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addSteps, deleteSteps, listSteps } from '@/data/steps';
import { isoWeekday, shiftDay } from '@/domain/dates';
import { formatTime } from '@/domain/reminders';
import { parseSteps, stepsAverage, stepsForDay, type StepEntry } from '@/domain/steps';
import { localDay, timeZone, todayDay } from '@/domain/time';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';

/** Uhrzeit HH:MM wie überall in der App (ohne fest eingestellte Sprache). */
const clockTime = (at: Date) => formatTime(at.getHours() * 60 + at.getMinutes());

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
    // Leeres Feld = nichts zu tun (z. B. „Fertig“ auf der Tastatur hat schon gespeichert und das Feld geleert) – keine Fehlermeldung.
    if (!input.trim()) return;
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
        {current && current.source !== 'manuell' ? (
          // Abgerufene Werte nicht als „live“ ausgeben: Abrufzeit sichtbar machen (HEALTH-006).
          <ThemedText type="small" themeColor="textSecondary">
            {t('steps.fetchedAt', {
              time: clockTime(new Date(current.fetchedAt)),
              day: formatDay(localDay(new Date(current.fetchedAt), timeZone)),
            })}
          </ThemedText>
        ) : null}
        <View style={styles.row}>
          <Field label={t('steps.input')} value={input} onChangeText={setInput} keyboardType="number-pad" style={styles.flex} />
          <Button label={t('common.save')} onPress={save} />
        </View>
        {error ? <ThemedText style={{ color: theme.danger }}>{t('steps.invalid')}</ThemedText> : null}
        <InsightInfo text={t('steps.manualHint')} />
      </Card>
      <Card title={t('steps.weekTitle')}>
        {average === null ? (
          <ThemedText themeColor="textSecondary">{t('steps.averageNone')}</ThemedText>
        ) : (
          <View>
            <ThemedText style={styles.kpi}>{formatNumber(average, 0)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('steps.averageLabel')}
            </ThemedText>
          </View>
        )}
        <DayBars
          label={week.map((d) => `${formatDay(d)}: ${stepsForDay(entries, d) ? formatNumber(stepsForDay(entries, d)!.steps, 0) : t('steps.empty')}`).join(', ')}
          days={[...week].reverse().map((d) => ({
            label: t(`reminders.dayShort.${isoWeekday(d)}` as 'reminders.dayShort.1'),
            value: stepsForDay(entries, d)?.steps ?? null,
            today: d === today,
          }))}
          format={(v) => formatNumber(v, 0)}
        />
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
            <EntryRow
              key={e.id}
              title={formatDay(e.day)}
              subtitle={t(`steps.source.${e.source}`)}
              value={formatNumber(e.steps, 0)}
              action={
                <ConfirmButton
                  label={t('common.delete')}
                  size="compact"
                  onConfirm={async () => {
                    await deleteSteps(db, e.id);
                    await reload();
                  }}
                />
              }
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpi: { fontSize: 34, lineHeight: 40, fontWeight: 600, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
