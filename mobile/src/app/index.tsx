import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useWeights } from '@/hooks/use-weights';
import { formatDay, formatLongDate, formatNumber, t } from '@/i18n';

export default function TodayScreen() {
  const { weights } = useWeights();
  const last = weights[0];

  return (
    <Screen title={t('today.title')} subtitle={formatLongDate(new Date())}>
      <Card title={t('today.calories')}>
        <ThemedText themeColor="textSecondary">{t('today.caloriesHint')}</ThemedText>
      </Card>
      <Card title={t('today.training')}>
        <ThemedText themeColor="textSecondary">{t('today.trainingHint')}</ThemedText>
      </Card>
      <Card title={t('today.weight')}>
        <ThemedText themeColor={last ? 'text' : 'textSecondary'}>
          {last
            ? t('today.weightLast', {
                kg: t('common.kg', { value: formatNumber(last.kg) }),
                date: formatDay(last.day),
              })
            : t('today.weightNone')}
        </ThemedText>
      </Card>
    </Screen>
  );
}
