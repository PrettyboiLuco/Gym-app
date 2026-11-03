import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { DiaryCopySheet } from '@/components/diary-copy-sheet';
import { Choice, ConfirmButton, Field } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { deleteEvent, getEvent, updateEvent, type ConsumptionEvent } from '@/data/nutrition';
import { shiftDay } from '@/domain/dates';
import { atTimeOnDay, isPlannedDay, minutesOfDay, PLAN_AHEAD_DAYS } from '@/domain/diary';
import { fractionOf, MEALS, parseAmount, type Meal } from '@/domain/nutrition';
import { formatTime, parseTime } from '@/domain/reminders';
import { foodTitle } from '@/format/food-title';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatNumber, t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { diaryToday, extraLine, formatKcal, macroLine } from '@/services/nutrition-format';

type EntryForm = { amount: string; meal: Meal | null; day: string; time: string };

export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const [event, setEvent] = useState<ConsumptionEvent | null>(null);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState<EntryForm>({ amount: '', meal: null, day: '', time: '' });
  const [copying, setCopying] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEvent(db, id).then((e) => {
      if (cancelled) return;
      if (!e) {
        setMissing(true);
        return;
      }
      // 3 Nachkommastellen: „0,25 Portion“ darf beim Ändern der Mahlzeit nicht zu 0,3 werden (Phase 1 Scan).
      const loaded = { amount: formatNumber(e.amount, 3), meal: e.meal, day: e.diaryDate, time: formatTime(minutesOfDay(e.occurredAt)) };
      setEvent(e);
      setForm(loaded);
      setBaseline(JSON.stringify(loaded));
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const allowLeave = useUnsavedGuard(baseline !== '' && JSON.stringify(form) !== baseline);

  if (!event) {
    return <Screen withHeader>{missing ? <ThemedText>{t('nutrition.entry.notFound')}</ThemedText> : null}</Screen>;
  }

  const unitLabel = event.unit === 'portion' ? t('nutrition.recipe.log.portionsLabel') : event.unit;
  const amount = parseAmount(form.amount);
  const preview = amount === null ? null : fractionOf(event, amount / event.amount);

  async function save() {
    if (amount === null || !event) {
      setError(true);
      return;
    }
    // Uhrzeit (B1, W6): bezogen auf den gewählten Tag; beim Tageswechsel bleibt die Uhrzeit.
    const minutes = parseTime(form.time);
    if (minutes === null) {
      setTimeError(true);
      return;
    }
    await updateEvent(db, event.id, { amount, meal: form.meal, diaryDate: form.day, occurredAt: atTimeOnDay(form.day, minutes) });
    allowLeave();
    router.back();
  }

  async function remove() {
    if (!event) return;
    await deleteEvent(db, event.id);
    allowLeave();
    router.back();
  }

  return (
    <Screen withHeader>
      <Card>
        <ThemedText type="subtitle">{foodTitle(event)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.entry.snapshot')}
        </ThemedText>
      </Card>
      <Card>
        <Field
          label={`${t('nutrition.entry.amount')} (${unitLabel})`}
          value={form.amount}
          onChangeText={(v) => {
            setForm((f) => ({ ...f, amount: v }));
            setError(false);
          }}
          keyboardType="decimal-pad"
        />
        {error ? <ThemedText style={{ color: theme.danger }}>{t('nutrition.food.amountInvalid')}</ThemedText> : null}
        {preview ? (
          <>
            <ThemedText type="smallBold">{formatKcal(preview.kcal)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {macroLine(preview)}
            </ThemedText>
            {extraLine(preview) ? (
              <ThemedText type="small" themeColor="textSecondary">
                {extraLine(preview)}
              </ThemedText>
            ) : null}
            {event.caffeineMg != null && amount !== null ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('caffeine.amount', { mg: formatNumber((event.caffeineMg * amount) / event.amount, 0) })}
              </ThemedText>
            ) : null}
          </>
        ) : null}
        {event.kind === 'essen' && form.meal ? (
          <Choice
            label={t('nutrition.meal')}
            options={MEALS}
            value={form.meal}
            onChange={(meal) => setForm((f) => ({ ...f, meal }))}
            format={(m) => t(`nutrition.meals.${m}`)}
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {event.drinkType ? t(`nutrition.drinkTypes.${event.drinkType}`) : ''}
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.entry.day')}
        </ThemedText>
        <DaySwitcher day={form.day} onChange={(day) => setForm((f) => ({ ...f, day }))} today={diaryToday()} maxDay={shiftDay(diaryToday(), PLAN_AHEAD_DAYS)} />
        {isPlannedDay(form.day, diaryToday()) ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('diary.plannedDay')}
          </ThemedText>
        ) : null}
        <Field
          label={t('diary.time')}
          value={form.time}
          onChangeText={(time) => {
            setForm((f) => ({ ...f, time }));
            setTimeError(false);
          }}
          keyboardType="numbers-and-punctuation"
          placeholder="08:30"
        />
        {timeError ? <ThemedText style={{ color: theme.danger }}>{t('diary.timeInvalid')}</ThemedText> : null}
        <Button label={t('nutrition.entry.save')} onPress={save} />
      </Card>
      <Card>
        <Button label={t('diary.copy.open')} variant="secondary" onPress={() => setCopying(true)} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('diary.copy.entryHint')}
        </ThemedText>
      </Card>
      <DiaryCopySheet visible={copying} onClose={() => setCopying(false)} sourceDay={event.diaryDate} eventIds={[event.id]} title={foodTitle(event)} />
      <ConfirmButton label={t('common.delete')} onConfirm={remove} />
    </Screen>
  );
}
