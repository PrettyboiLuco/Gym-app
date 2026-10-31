import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { applyReminders } from '@/components/alerts';
import { Button, Card } from '@/components/card';
import { Choice, ConfirmButton, Field, Presets } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { NOTIFICATIONS_SUPPORTED, notificationPermission } from '@/data/notifications';
import { loadReminders } from '@/data/reminders';
import { useDb } from '@/data/store-provider';
import { archiveSupplement, listSupplements, loggedDays, saveSupplement, setTaken } from '@/data/supplements';
import {
  EMPTY_SUPPLEMENT_FORM,
  MAX_SUPPLEMENT_REMINDERS,
  MAX_SUPPLEMENTS,
  parseSupplementForm,
  SUPPLEMENT_UNITS,
  supplementToForm,
  takenOnDays,
  type Supplement,
  type SupplementForm,
  type SupplementProblem,
} from '@/domain/supplements';
import { suggestSupplementNames } from '@/domain/supplement-names';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

const amountText = (s: Supplement) =>
  s.amount === null || s.unit === null ? '' : `${formatNumber(s.amount, 3)} ${t(`supplements.units.${s.unit}`)}`;

/**
 * Supplement-Tracker (Entscheidung 31.10.2026): erfassen, abhaken, auf Wunsch erinnern. Keine Empfehlungen, keine
 * vorgeschlagenen Mengen, keine Marken, keine Wirkversprechen.
 */
export default function SupplementsScreen() {
  const db = useDb();
  const theme = useTheme();
  const today = todayDay();
  const [list, setList] = useState<Supplement[]>([]);
  const [days, setDays] = useState<Map<string, string[]>>(new Map());
  // null = kein Formular offen, 'neu' = neues Supplement, sonst die ID des bearbeiteten.
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SupplementForm>(EMPTY_SUPPLEMENT_FORM);
  const [problems, setProblems] = useState<SupplementProblem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    const weekAgo = new Date(Date.parse(`${today}T12:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
    return Promise.all([listSupplements(db), loggedDays(db, weekAgo)]);
  }, [db, today]);

  async function reload() {
    const [items, logged] = await load();
    setList(items);
    setDays(logged);
  }

  useEffect(() => {
    let cancelled = false;
    load().then(([items, logged]) => {
      if (cancelled) return;
      setList(items);
      setDays(logged);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  /** Erinnerungen neu planen, nur wenn Mitteilungen erlaubt sind (gefragt wird beim Speichern mit Uhrzeit). */
  async function rescheduleReminders(ask: boolean) {
    if (!NOTIFICATIONS_SUPPORTED) return;
    if ((await notificationPermission(ask)) !== 'granted') return;
    await applyReminders(db, await loadReminders(db));
  }

  function open(id: string | null) {
    setMessage(null);
    setProblems([]);
    const current = id ? list.find((s) => s.id === id) : undefined;
    setForm(current ? supplementToForm(current) : EMPTY_SUPPLEMENT_FORM);
    setEditing(id ?? 'neu');
  }

  async function save() {
    const others = list.filter((s) => s.id !== editing && s.reminderTime !== null).length;
    const { value, problems: found } = parseSupplementForm(form, others);
    setProblems(found);
    if (!value) return;
    await saveSupplement(db, editing === 'neu' ? null : editing, value);
    setEditing(null);
    setMessage(t('supplements.saved'));
    await reload();
    await rescheduleReminders(value.reminderTime !== null);
  }

  async function remove(id: string) {
    await archiveSupplement(db, id);
    setEditing(null);
    await reload();
    await rescheduleReminders(false);
  }

  async function toggle(s: Supplement, taken: boolean) {
    await setTaken(db, s, today, taken);
    await reload();
  }

  // Namensvorschläge beim Tippen, solange der Name nicht schon genau ein Vorschlag ist.
  const suggestions = suggestSupplementNames(form.name).filter((n) => n !== form.name.trim());

  const problemText = (p: SupplementProblem) => t(`supplements.problem.${p}`, { max: MAX_SUPPLEMENT_REMINDERS });

  return (
    <Screen withHeader>
      <Card>
        <ThemedText themeColor="textSecondary">{t('supplements.notice')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('supplements.proteinHint')}
        </ThemedText>
      </Card>

      <Card title={t('supplements.todayTitle')}>
        {list.length === 0 ? <ThemedText themeColor="textSecondary">{t('supplements.empty')}</ThemedText> : null}
        {list.map((s) => {
          const logged = days.get(s.id) ?? [];
          const taken = logged.includes(today);
          return (
            <View key={s.id} style={[styles.item, { borderColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">{s.name}</ThemedText>
              <Choice
                label={[amountText(s), s.reminderTime ? `⏰ ${s.reminderTime}` : '', t('supplements.lastDays', { count: takenOnDays(logged, today) })]
                  .filter(Boolean)
                  .join(' · ')}
                options={['offen', 'genommen'] as const}
                value={taken ? 'genommen' : 'offen'}
                onChange={(v) => toggle(s, v === 'genommen')}
                format={(v) => t(`supplements.${v === 'genommen' ? 'taken' : 'open'}`)}
              />
            </View>
          );
        })}
      </Card>

      <Card title={t('supplements.listTitle')}>
        {list.map((s) => (
          <View key={s.id} style={styles.row}>
            <ThemedText style={styles.grow}>{s.name}</ThemedText>
            <Button label={t('supplements.edit')} variant="danger" onPress={() => open(s.id)} />
          </View>
        ))}
        {editing === null ? (
          list.length < MAX_SUPPLEMENTS ? (
            <Button label={t('supplements.add')} onPress={() => open(null)} />
          ) : (
            <ThemedText themeColor="textSecondary">{t('supplements.tooMany', { max: MAX_SUPPLEMENTS })}</ThemedText>
          )
        ) : null}
        {message ? <ThemedText themeColor="textSecondary">{message}</ThemedText> : null}
      </Card>

      {editing !== null ? (
        <Card title={editing === 'neu' ? t('supplements.newTitle') : t('supplements.editTitle')}>
          <Field
            label={t('supplements.name')}
            placeholder={t('supplements.namePlaceholder')}
            value={form.name}
            maxLength={60}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
          />
          {suggestions.length > 0 ? (
            <Presets
              label={t('supplements.suggestion')}
              options={suggestions}
              onChange={(name) => setForm((f) => ({ ...f, name }))}
              format={(name) => name}
            />
          ) : null}
          <Field
            label={t('supplements.amount')}
            value={form.amount}
            keyboardType="decimal-pad"
            onChangeText={(amount) => setForm((f) => ({ ...f, amount }))}
          />
          {form.amount.trim() !== '' ? (
            <Choice
              label={t('supplements.unit')}
              options={SUPPLEMENT_UNITS}
              value={form.unit}
              onChange={(unit) => setForm((f) => ({ ...f, unit }))}
              format={(u) => t(`supplements.units.${u}`)}
            />
          ) : null}
          <Field
            label={t('supplements.reminder')}
            value={form.reminderTime}
            placeholder="08:00"
            keyboardType="numbers-and-punctuation"
            onChangeText={(reminderTime) => setForm((f) => ({ ...f, reminderTime }))}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('supplements.reminderHint', { max: MAX_SUPPLEMENT_REMINDERS })} {t('supplements.sameDayHint')}
          </ThemedText>
          {problems.map((p) => (
            <ThemedText key={p} style={{ color: theme.danger }}>
              {problemText(p)}
            </ThemedText>
          ))}
          <View style={styles.row}>
            <Button label={t('common.save')} onPress={save} />
            <Button label={t('common.cancel')} variant="danger" onPress={() => setEditing(null)} />
          </View>
          {editing !== 'neu' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('supplements.removeHint')}
            </ThemedText>
          ) : null}
          {editing !== 'neu' ? (
            <ConfirmButton label={t('supplements.remove')} confirmLabel={t('supplements.removeConfirm')} onConfirm={() => remove(editing)} />
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, gap: Spacing.one },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1, minWidth: 120 },
});
