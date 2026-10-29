import Constants from 'expo-constants';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { t } from '@/i18n';

export default function MoreScreen() {
  return (
    <Screen title={t('more.title')}>
      <Card title={t('more.privacyTitle')}>
        <ThemedText themeColor="textSecondary">{t('more.privacy')}</ThemedText>
      </Card>
      <Card title={t('more.healthTitle')}>
        <ThemedText themeColor="textSecondary">{t('more.health')}</ThemedText>
      </Card>
      <Card title={t('more.sourcesTitle')}>
        <ThemedText themeColor="textSecondary">{t('more.sources')}</ThemedText>
      </Card>
      <Card title={t('more.languageTitle')}>
        <ThemedText themeColor="textSecondary">{t('more.language')}</ThemedText>
      </Card>
      <Card title={t('more.versionTitle')}>
        <ThemedText themeColor="textSecondary">{Constants.expoConfig?.version ?? '–'}</ThemedText>
      </Card>
    </Screen>
  );
}
