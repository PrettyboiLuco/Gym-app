// „Kopieren auf …“ (Ausbauplan B1, W5): Einträge einer Mahlzeit oder ein einzelner Eintrag auf mehrere Tage,
// auch in die Zukunft. Zukünftige Tage sind „geplant“ und zählen erst am Tag selbst.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { MultiChoice } from '@/components/fields';
import { Sheet, SheetRow } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { copyEventsToDays } from '@/data/nutrition';
import { isoWeekday, shiftDay } from '@/domain/dates';
import { copyDayOptions, copyTargets, isPlannedDay } from '@/domain/diary';
import { timeZone } from '@/domain/time';
import { formatDayShort, t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { dayLabel, diaryToday } from '@/services/nutrition-format';

/** „Mo 4. Nov.“ bzw. „Heute“/„Gestern“/„Morgen“. */
function shortDay(day: string, today: string) {
  const near = [shiftDay(today, -1), today, shiftDay(today, 1)].includes(day);
  return near ? dayLabel(day, today) : `${t(`reminders.dayShort.${isoWeekday(day)}`)} ${formatDayShort(day)}`;
}

export function DiaryCopySheet({
  visible,
  onClose,
  sourceDay,
  eventIds,
  title,
  onCopied,
}: {
  visible: boolean;
  onClose: () => void;
  sourceDay: string;
  eventIds: string[];
  /** Was kopiert wird, z. B. „Frühstück“ oder der Name des Eintrags. */
  title: string;
  onCopied?: (count: number) => void;
}) {
  const db = useDb();
  const today = diaryToday();
  // Auswahl beginnt leer: das Tagebuch hängt das Fenster zu jedem Öffnen neu ein (key).
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const options = copyDayOptions(sourceDay, today);
  const past = options.filter((d) => !isPlannedDay(d, today));
  const future = options.filter((d) => isPlannedDay(d, today));
  const targets = copyTargets(sourceDay, selected);
  const nextWeek = future.slice(0, 7);

  async function copy() {
    if (targets.length === 0 || busy) return;
    setBusy(true);
    try {
      const count = await copyEventsToDays(db, eventIds, targets, timeZone);
      showToast(t('diary.copy.done', { count, days: targets.length }));
      onCopied?.(count);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title={t('diary.copy.title', { what: title })}
      onClose={onClose}
      footer={
        <Button
          label={targets.length > 0 ? t('diary.copy.confirm', { count: targets.length }) : t('diary.copy.pick')}
          disabled={targets.length === 0}
          loading={busy}
          onPress={copy}
        />
      }>
      <SheetRow index={0}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('diary.copy.hint')}
        </ThemedText>
      </SheetRow>
      <SheetRow index={1} divider style={styles.group}>
        <MultiChoice label={t('diary.copy.future')} options={future} value={selected} onChange={setSelected} format={(d) => shortDay(d, today)} />
        <View style={styles.row}>
          <Button label={t('diary.copy.nextWeek')} variant="secondary" size="compact" onPress={() => setSelected((s) => [...new Set([...s, ...nextWeek])])} />
          {selected.length > 0 ? <Button label={t('diary.copy.clear')} variant="quiet" size="compact" onPress={() => setSelected([])} /> : null}
        </View>
      </SheetRow>
      <SheetRow index={2} divider>
        <MultiChoice label={t('diary.copy.past')} options={past} value={selected} onChange={setSelected} format={(d) => shortDay(d, today)} />
      </SheetRow>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  group: { gap: Spacing.three },
});
