// Mahlzeiten-Optionen (Ernährung neu, Abschnitt 3): „Wie am Vortag“, „Kopieren auf …“, Vorlage und Befinden im Fenster.

import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { DiaryMealFeeling } from '@/components/diary-meal-feeling';
import { Field, ListRow } from '@/components/fields';
import { Sheet, SheetRow, useSheetClose } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { copyMeal, saveTemplateFromMeal, type ConsumptionEvent } from '@/data/nutrition';
import { shiftDay } from '@/domain/dates';
import type { MealFeeling } from '@/domain/meal-feeling';
import type { Meal } from '@/domain/nutrition';
import { t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { whenFor } from '@/services/nutrition-format';

/** Was nach dem Schließen kommt: das Fenster „Kopieren auf …“ (zwei Fenster nie gleichzeitig). */
export type MealOptionsNext = 'copy' | null;

type Props = {
  visible: boolean;
  meal: Meal;
  day: string;
  /** Geplanter Tag: ohne Befinden (das gibt es erst am Tag selbst). */
  planned: boolean;
  items: ConsumptionEvent[];
  feeling: MealFeeling;
  onFeeling: (next: MealFeeling) => void;
  /** Einträge haben sich geändert (z. B. „Wie am Vortag“). */
  onChanged: () => void;
  onClose: (next: MealOptionsNext) => void;
};

/**
 * Fenster je Mahlzeit: leere Mahlzeit → „Wie am Vortag“; mit Einträgen → „Kopieren auf …“, „Als Vorlage speichern“
 * (Name im Fenster) und Hunger/Sättigung/Stimmung. Rückmeldungen als Toast, jede Zeile steigt gestaffelt herein.
 */
export function MealOptionsSheet(props: Props) {
  const next = useRef<MealOptionsNext>(null);
  return (
    <Sheet
      visible={props.visible}
      title={t(`nutrition.meals.${props.meal}`)}
      onClose={() => {
        const after = next.current;
        next.current = null;
        props.onClose(after);
      }}>
      <OptionRows {...props} setNext={(n) => (next.current = n)} />
    </Sheet>
  );
}

function OptionRows({ meal, day, planned, items, feeling, onFeeling, onChanged, setNext }: Props & { setNext: (next: MealOptionsNext) => void }) {
  const db = useDb();
  const close = useSheetClose();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const hasFoods = items.some((e) => e.foodId);
  let i = 0;

  async function copyFromPreviousDay() {
    const count = await copyMeal(db, shiftDay(day, -1), meal, whenFor(day, meal));
    showToast(count > 0 ? t('nutrition.copied', { count }) : t('nutrition.copyNone'));
    onChanged();
    close();
  }

  async function saveTemplate() {
    if (!name.trim()) return;
    await saveTemplateFromMeal(db, name, day, meal);
    showToast(t('nutrition.templateSaved'));
    close();
  }

  return (
    <>
      {items.length === 0 ? (
        <SheetRow index={i++}>
          <ListRow
            icon="calendar"
            title={t('nutrition.copyYesterday')}
            subtitle={t('diary.options.yesterdaySub')}
            accessory="›"
            onPress={copyFromPreviousDay}
            last
          />
        </SheetRow>
      ) : (
        <SheetRow index={i++}>
          <ListRow
            icon="list"
            title={t('diary.copy.open')}
            subtitle={t('diary.copy.entryHint')}
            accessory="›"
            onPress={() => {
              setNext('copy');
              close();
            }}
            last={!hasFoods && planned}
          />
          {hasFoods ? (
            <ListRow
              icon="star"
              title={t('nutrition.saveTemplate')}
              accessory={naming ? 'collapse' : '›'}
              onPress={() => setNaming((v) => !v)}
              last={planned && !naming}
            />
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {t('nutrition.templateNoFoods')}
            </ThemedText>
          )}
        </SheetRow>
      )}
      {naming ? (
        <SheetRow index={i++} style={styles.template}>
          <Field label={t('nutrition.templateName')} placeholder={t('nutrition.templatePlaceholder')} value={name} onChangeText={setName} autoFocus />
          <View style={styles.buttons}>
            <Button label={t('common.save')} size="compact" disabled={!name.trim()} onPress={saveTemplate} />
            <Button label={t('common.cancel')} variant="secondary" size="compact" onPress={() => setNaming(false)} />
          </View>
        </SheetRow>
      ) : null}
      {items.length > 0 && !planned ? (
        <SheetRow index={i++} divider style={styles.feeling}>
          <ThemedText style={styles.heading} accessibilityRole="header">
            {t('diary.feeling.add')}
          </ThemedText>
          <DiaryMealFeeling feeling={feeling} onChange={onFeeling} />
        </SheetRow>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  note: { paddingVertical: Spacing.two },
  template: { gap: Spacing.three },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  feeling: { gap: Spacing.three },
  heading: { fontWeight: 600 },
});
