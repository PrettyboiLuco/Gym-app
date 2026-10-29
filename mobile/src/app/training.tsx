import { ComingSoonList } from '@/components/card';
import { Screen } from '@/components/screen';
import { t } from '@/i18n';

export default function TrainingScreen() {
  return (
    <Screen title={t('training.title')} subtitle={t('training.intro')}>
      <ComingSoonList
        label={t('common.comingSoon')}
        items={[
          t('training.plans'),
          t('training.logger'),
          t('training.timer'),
          t('training.hiit'),
          t('training.stretching'),
        ]}
      />
    </Screen>
  );
}
