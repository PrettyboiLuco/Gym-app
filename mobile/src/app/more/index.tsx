import Constants from 'expo-constants';
import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { t } from '@/i18n';

export default function MoreScreen() {
  return (
    <Screen title={t('more.title')}>
      <Card title={t('more.settingsTitle')}>
        <ListRow title={t('progress.profileOpen')} subtitle={t('progress.profileTitle')} accessory="›" onPress={() => router.push('/progress/profile')} />
        <ListRow title={t('reminders.title')} subtitle={t('more.remindersSubtitle')} accessory="›" onPress={() => router.push('/more/notifications')} />
        <ListRow title={t('dataScreen.title')} subtitle={t('more.dataSubtitle')} accessory="›" onPress={() => router.push('/more/data')} />
        <ListRow title={t('security.title')} subtitle={t('more.securitySubtitle')} accessory="›" onPress={() => router.push('/more/security')} />
      </Card>
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
