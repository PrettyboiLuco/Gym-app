import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { Choice, ConfirmButton, Field } from '@/components/fields';
import { foodTitle } from '@/components/food-title';
import { formatKcal, macroLine } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { deleteEvent, getEvent, updateEvent, type ConsumptionEvent } from '@/data/nutrition';
import { useDb } from '@/data/store-provider';
import { fractionOf, MEALS, parseAmount, type Meal } from '@/domain/nutrition';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatNumber, t } from '@/i18n';

type EntryForm = { amount: string; meal: Meal | null; day: string };

export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const [event, setEvent] = useState<ConsumptionEvent | null>(null);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState<EntryForm>({ amount: '', meal: null, day: '' });
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
      const loaded = { amount: formatNumber(e.amount), meal: e.meal, day: e.diaryDate };
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
    await updateEvent(db, event.id, { amount, meal: form.meal, diaryDate: form.day });
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
        <DaySwitcher day={form.day} onChange={(day) => setForm((f) => ({ ...f, day }))} />
        <Button label={t('nutrition.entry.save')} onPress={save} />
      </Card>
      <ConfirmButton label={t('common.delete')} onConfirm={remove} />
    </Screen>
  );
}
