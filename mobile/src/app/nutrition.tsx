import { ComingSoonList } from '@/components/card';
import { Screen } from '@/components/screen';
import { t } from '@/i18n';

export default function NutritionScreen() {
  return (
    <Screen title={t('nutrition.title')} subtitle={t('nutrition.intro')}>
      <ComingSoonList
        label={t('common.comingSoon')}
        items={[
          t('nutrition.tracker'),
          t('nutrition.barcode'),
          t('nutrition.calculator'),
          t('nutrition.drinks'),
        ]}
      />
    </Screen>
  );
}
