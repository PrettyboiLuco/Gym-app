// Mahlzeiten-Optionen (Ernährung neu, Abschnitt 3): „Kopieren auf …“, Vorlage und Befinden im Fenster; „Wie am Vortag“ mit Rückgängig.

import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { DiaryMealFeeling } from '@/components/diary-meal-feeling';
import { Field, ListRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Sheet, SheetRow, useSheetClose } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { copyMealEntries, removeEvents, saveTemplateFromMeal, type ConsumptionEvent } from '@/data/nutrition';
import { shiftDay } from '@/domain/dates';
import type { MealFeeling } from '@/domain/meal-feeling';
import type { Meal } from '@/domain/nutrition';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { whenFor } from '@/services/nutrition-format';

/**
 * „Wie am Vortag“ (Kopf einer leeren Mahlzeit und Optionen-Fenster): kopiert die Mahlzeit vom Vortag, meldet es als
 * Toast mit „Rückgängig“ – das nimmt genau die kopierten Einträge wieder heraus.
 */
export async function copyPreviousMeal(db: Db, day: string, meal: Meal, onChanged: () => void) {
  const ids = await copyMealEntries(db, shiftDay(day, -1), meal, whenFor(day, meal));
  if (ids.length === 0) {
    showToast(t('nutrition.copyNone'));
    return;
  }
  showToast(t('nutrition.copied', { count: ids.length }), {
    label: t('diary.undo'),
    hint: t('diary.options.undoCopy'),
    onPress: async () => {
      try {
        await removeEvents(db, ids);
        showToast(t('diary.options.copyUndone'));
      } catch {
        showToast(t('common.saveFailed'));
      }
      onChanged();
    },
  });
  onChanged();
}

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
  onClose: (next: MealOptionsNext) => void;
};

/**
 * Fenster je Mahlzeit mit Einträgen: „Kopieren auf …“, „Als Vorlage speichern“ (Name im Fenster; ohne Lebensmittel
 * ausgegraut mit Begründung) und Hunger/Sättigung/Stimmung. „Wie am Vortag“ steht bei leeren Mahlzeiten als Pille im Kopf. Rückmeldungen als Toast, jede Zeile steigt gestaffelt herein.
 */
export function MealOptionsSheet(props: Props) {
  const next = useRef<MealOptionsNext>(null);
  return (
    <Sheet
      visible={props.visible}
      title={t('diary.options.title', { meal: t(`nutrition.meals.${props.meal}`) })}
      onClose={() => {
        const after = next.current;
        next.current = null;
        props.onClose(after);
      }}>
      <OptionRows {...props} setNext={(n) => (next.current = n)} />
    </Sheet>
  );
}

function OptionRows({ meal, day, planned, items, feeling, onFeeling, setNext }: Props & { setNext: (next: MealOptionsNext) => void }) {
  const db = useDb();
  const theme = useTheme();
  const close = useSheetClose();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const hasFoods = items.some((e) => e.foodId);
  let i = 0;

  async function saveTemplate() {
    if (!name.trim()) return;
    await saveTemplateFromMeal(db, name, day, meal);
    showToast(t('nutrition.templateSaved'));
    close();
  }

  return (
    <>
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
          // Ausgegraut mit kurzer Begründung: Vorlagen speichern nur Lebensmittel aus der Liste.
          <View
            style={styles.off}
            accessible
            accessibilityState={{ disabled: true }}
            accessibilityLabel={`${t('nutrition.saveTemplate')}. ${t('nutrition.templateNoFoods')}`}>
            <View style={styles.offIcon}>
              <Icon name="star" color={theme.textSecondary} size={20} />
            </View>
            <View style={styles.offText}>
              <ThemedText themeColor="textSecondary">{t('nutrition.saveTemplate')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('nutrition.templateNoFoods')}
              </ThemedText>
            </View>
          </View>
        )}
      </SheetRow>
      {naming ? (
        <SheetRow index={i++} style={styles.template}>
          <Field label={t('nutrition.templateName')} placeholder={t('nutrition.templatePlaceholder')} value={name} onChangeText={setName} autoFocus />
          <View style={styles.buttons}>
            <Button label={t('common.save')} size="compact" disabled={!name.trim()} onPress={saveTemplate} />
            <Button label={t('common.cancel')} variant="secondary" size="compact" onPress={() => setNaming(false)} />
          </View>
        </SheetRow>
      ) : null}
      {!planned ? (
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
  off: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56, paddingVertical: Spacing.two + 2, opacity: 0.6 },
  offIcon: { width: 24, alignItems: 'center' },
  offText: { flex: 1, gap: Spacing.half },
  template: { gap: Spacing.three },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  feeling: { gap: Spacing.three },
  heading: { fontWeight: 600 },
});
