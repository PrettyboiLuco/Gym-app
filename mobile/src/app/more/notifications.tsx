import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { applyReminders } from '@/components/alerts';
import { Button, Card } from '@/components/card';
import { Choice, Field, Presets } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { NOTIFICATIONS_SUPPORTED, notificationPermission } from '@/data/notifications';
import { loadReminders, saveReminders } from '@/data/reminders';
import { useDb } from '@/data/store-provider';
import { DEFAULT_REMINDERS, drinkTimes, formatTime, validateReminders, WEEKDAYS, type ReminderProblem, type ReminderSettings } from '@/domain/reminders';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { t } from '@/i18n';

/**
 * Mitteilungen und Erinnerungen (Register UX-006/007, TIME-011, HEALTH-012). Alles freiwillig und
 * standardmäßig aus; die Erlaubnis wird erst gefragt, wenn du etwas einschaltest.
 */
export default function NotificationsScreen() {
  const db = useDb();
  const theme = useTheme();
  const [form, setForm] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [baseline, setBaseline] = useState('');
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [problems, setProblems] = useState<ReminderProblem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadReminders(db), notificationPermission(false)]).then(([r, p]) => {
      if (cancelled) return;
      setForm(r);
      setBaseline(JSON.stringify(r));
      setPermission(p);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const allowLeave = useUnsavedGuard(baseline !== '' && JSON.stringify(form) !== baseline);
  const anyOn = form.timerAlerts || form.training.enabled || form.drink.enabled;

  async function save() {
    const found = validateReminders(form);
    if (found.length > 0) {
      setProblems(found);
      return;
    }
    setProblems([]);
    let granted = permission === 'granted';
    if (anyOn && !granted && NOTIFICATIONS_SUPPORTED) {
      const p = await notificationPermission(true);
      setPermission(p);
      granted = p === 'granted';
    }
    await saveReminders(db, form);
    if (granted) await applyReminders(db, form);
    allowLeave();
    setBaseline(JSON.stringify(form));
    setMessage(anyOn && !granted && NOTIFICATIONS_SUPPORTED ? t('reminders.savedNoPermission') : t('reminders.saved'));
  }

  const toggle = (value: boolean, onChange: (v: boolean) => void, label: string) => (
    <Choice
      label={label}
      options={['aus', 'an'] as const}
      value={value ? 'an' : 'aus'}
      onChange={(v) => onChange(v === 'an')}
      format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
    />
  );
  const times = drinkTimes(form.drink.from, form.drink.to, form.drink.everyHours);

  return (
    <Screen withHeader>
      {!NOTIFICATIONS_SUPPORTED ? (
        <Card>
          <ThemedText>{t('reminders.webOnly')}</ThemedText>
        </Card>
      ) : permission === 'denied' ? (
        <Card>
          <ThemedText style={{ color: theme.danger }}>{t('reminders.denied')}</ThemedText>
        </Card>
      ) : null}

      <Card title={t('reminders.timerTitle')}>
        {toggle(form.timerAlerts, (timerAlerts) => setForm((f) => ({ ...f, timerAlerts })), t('reminders.timerToggle'))}
        <ThemedText type="small" themeColor="textSecondary">
          {t('reminders.timerHint')}
        </ThemedText>
      </Card>

      <Card title={t('reminders.trainingTitle')}>
        {toggle(form.training.enabled, (enabled) => setForm((f) => ({ ...f, training: { ...f.training, enabled } })), t('reminders.trainingToggle'))}
        {form.training.enabled ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {t('reminders.weekdays')}
            </ThemedText>
            <View style={styles.chips}>
              {WEEKDAYS.map((d) => {
                const selected = form.training.weekdays.includes(d);
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={t(`reminders.day.${d}`)}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        training: {
                          ...f.training,
                          weekdays: selected ? f.training.weekdays.filter((x) => x !== d) : [...f.training.weekdays, d].sort(),
                        },
                      }))
                    }
                    style={[styles.chip, { backgroundColor: selected ? theme.tint : theme.backgroundSelected }]}>
                    <ThemedText type="small" style={{ color: selected ? theme.onTint : theme.text }}>
                      {t(`reminders.dayShort.${d}`)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <Field
              label={t('reminders.time')}
              value={form.training.time}
              onChangeText={(time) => setForm((f) => ({ ...f, training: { ...f.training, time } }))}
              keyboardType="numbers-and-punctuation"
            />
          </>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('reminders.trainingHint')}
        </ThemedText>
      </Card>

      <Card title={t('reminders.drinkTitle')}>
        {toggle(form.drink.enabled, (enabled) => setForm((f) => ({ ...f, drink: { ...f.drink, enabled } })), t('reminders.drinkToggle'))}
        {form.drink.enabled ? (
          <>
            <View style={styles.row}>
              <Field
                label={t('reminders.from')}
                value={form.drink.from}
                onChangeText={(from) => setForm((f) => ({ ...f, drink: { ...f.drink, from } }))}
                keyboardType="numbers-and-punctuation"
                style={styles.flex}
              />
              <Field
                label={t('reminders.to')}
                value={form.drink.to}
                onChangeText={(to) => setForm((f) => ({ ...f, drink: { ...f.drink, to } }))}
                keyboardType="numbers-and-punctuation"
                style={styles.flex}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {t('reminders.every')}
            </ThemedText>
            <Presets
              label={t('reminders.every')}
              options={[1, 2, 3, 4]}
              value={form.drink.everyHours}
              onChange={(everyHours) => setForm((f) => ({ ...f, drink: { ...f.drink, everyHours } }))}
              format={(h) => t('reminders.hours', { count: h })}
            />
            {times.length > 0 ? (
              <ThemedText type="small">{t('reminders.times', { times: times.map(formatTime).join(', ') })}</ThemedText>
            ) : null}
          </>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('reminders.drinkHint')}
        </ThemedText>
      </Card>

      {problems.length > 0 ? (
        <Card>
          {problems.map((p) => (
            <ThemedText key={p} style={{ color: theme.danger }}>
              {t(`reminders.problems.${p}`)}
            </ThemedText>
          ))}
        </Card>
      ) : null}
      {message ? <ThemedText>{message}</ThemedText> : null}
      <Button label={t('common.save')} onPress={save} />
      <ThemedText type="small" themeColor="textSecondary">
        {t('reminders.delivery')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Spacing.four, minWidth: 44, alignItems: 'center' },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
});
