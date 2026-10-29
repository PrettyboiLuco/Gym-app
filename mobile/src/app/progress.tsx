import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { ConfirmButton } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addWeight, deleteWeight, listWeights } from '@/data/weights';
import { localDay } from '@/domain/time';
import { parseWeight, weightTrend } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function ProgressScreen() {
  const theme = useTheme();
  const { data: weights, reload, db } = useLoad(listWeights, []);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const today = localDay(new Date(), timeZone);
  const trend = weightTrend(weights, today);

  async function save() {
    const kg = parseWeight(input);
    if (kg === null) {
      setError(true);
      return;
    }
    setError(false);
    await addWeight(db, today, kg);
    setInput('');
    await reload();
  }

  async function remove(id: string) {
    await deleteWeight(db, id);
    await reload();
  }

  return (
    <Screen title={t('progress.title')}>
      <Card title={t('progress.weightTitle')}>
        <View style={styles.row}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={save}
            placeholder={t('progress.weightPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            returnKeyType="done"
            accessibilityLabel={t('progress.weightLabel')}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <Button label={t('common.save')} onPress={save} />
        </View>
        {error ? <ThemedText style={{ color: theme.danger }}>{t('progress.weightInvalid')}</ThemedText> : null}
        <ThemedText themeColor="textSecondary">
          {trend === null
            ? t('progress.trendMissing')
            : t('progress.trend', { kg: t('common.kg', { value: formatNumber(trend) }) })}
        </ThemedText>
      </Card>

      <Card title={t('progress.history')}>
        {weights.length === 0 ? (
          <ThemedText themeColor="textSecondary">{t('progress.empty')}</ThemedText>
        ) : (
          weights.map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <ThemedText>
                {formatDay(entry.day)} · {t('common.kg', { value: formatNumber(entry.kg) })}
              </ThemedText>
              <ConfirmButton label={t('common.delete')} onConfirm={() => remove(entry.id)} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: 0, // sonst bestimmt die Standardbreite des Eingabefelds die Zeilenbreite
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  entry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
