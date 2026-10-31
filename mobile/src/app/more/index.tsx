import Constants from 'expo-constants';
import { router } from 'expo-router';

import { Card } from '@/components/card';
import { Choice, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { saveAppearance } from '@/data/appearance';
import { useDb } from '@/data/store-provider';
import { APPEARANCES, setAppearance, useAppearance, type AppearanceChoice } from '@/hooks/use-color-scheme';
import { t } from '@/i18n';

export default function MoreScreen() {
  const db = useDb();
  const appearance = useAppearance();
  const changeAppearance = (value: AppearanceChoice) => {
    setAppearance(value);
    saveAppearance(db, value);
  };
  return (
    <Screen title={t('more.title')}>
      <Card title={t('more.appearanceTitle')}>
        <Choice
          label={t('more.appearance')}
          options={APPEARANCES}
          value={appearance}
          onChange={changeAppearance}
          format={(v) => t(`more.appearanceOption.${v}`)}
        />
      </Card>
      <Card title={t('more.settingsTitle')}>
        <ListRow title={t('progress.profileOpen')} subtitle={t('progress.profileTitle')} accessory="›" onPress={() => router.push('/progress/profile')} />
        <ListRow title={t('reminders.title')} subtitle={t('more.remindersSubtitle')} accessory="›" onPress={() => router.push('/more/notifications')} />
        <ListRow title={t('dataScreen.title')} subtitle={t('more.dataSubtitle')} accessory="›" onPress={() => router.push('/more/data')} />
        <ListRow title={t('security.title')} subtitle={t('more.securitySubtitle')} accessory="›" onPress={() => router.push('/more/security')} />
      </Card>
      <Card title={t('more.helpTitle')}>
        <ListRow title={t('help.title')} subtitle={t('more.helpSubtitle')} accessory="›" onPress={() => router.push('/more/help')} />
        <ListRow title={t('feedback.title')} subtitle={t('more.feedbackSubtitle')} accessory="›" onPress={() => router.push('/more/feedback')} />
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
