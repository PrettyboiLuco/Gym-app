// Sportart wählen (Idee aus fin, 10.11.2026): Suche, Gruppen als wischbare Chips, Liste mit „nach Zeit“ bzw.
// „Strecke und Zeit“. Ersetzt die lange Chip-Wolke, seit es über 40 Sportarten gibt.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Choice, Field, ListRow } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { CARDIO_ACTIVITIES, CARDIO_CATEGORIES, CARDIO_INFO, matchesActivity, type CardioActivity, type CardioCategory } from '@/domain/cardio';
import { t } from '@/i18n';

const GROUPS = ['alle', ...CARDIO_CATEGORIES] as const;

export function ActivityPicker({ value, onPick }: { value?: CardioActivity | null; onPick: (activity: CardioActivity) => void }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('alle');
  const list = CARDIO_ACTIVITIES.filter(
    (a) => (group === 'alle' || CARDIO_INFO[a].category === (group as CardioCategory)) && matchesActivity(t(`cardio.activities.${a}`), query)
  );
  return (
    <View style={styles.wrap}>
      <Field label={t('cardio.searchActivity')} value={query} onChangeText={setQuery} autoCorrect={false} placeholder={t('cardio.searchActivity')} />
      <Choice scroll hideLabel label={t('cardio.activity')} options={GROUPS} value={group} onChange={setGroup} format={(g) => t(`cardio.categories.${g}`)} />
      {list.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('cardio.noActivity')}
        </ThemedText>
      ) : null}
      <View>
        {list.map((a, i) => (
          <ListRow
            key={a}
            title={t(`cardio.activities.${a}`)}
            subtitle={CARDIO_INFO[a].distance ? t('cardio.byDistance') : t('cardio.byTime')}
            accessory={a === value ? '✓' : '›'}
            last={i === list.length - 1}
            onPress={() => onPick(a)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
});
