import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ListRow, Segmented } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { saveAppearance } from '@/data/appearance';
import { useDb } from '@/data/store-provider';
import { APPEARANCES, setAppearance, useAppearance, type AppearanceChoice } from '@/hooks/use-color-scheme';
import { t } from '@/i18n';

type InfoKey = 'privacy' | 'sources' | 'language';

/**
 * „Mehr“: Einstellungen als ruhige Liste in Gruppen (Symbol links, Wert rechts, Pfeil), wie die
 * iPhone-Einstellungen. Darstellung direkt als Segment-Schalter. Die Hinweise klappen beim Antippen auf,
 * statt als fünf Textkarten untereinander zu stehen; der Gesundheitshinweis bleibt unten immer sichtbar.
 */
export default function MoreScreen() {
  const db = useDb();
  const appearance = useAppearance();
  const [open, setOpen] = useState<InfoKey | null>(null);
  const changeAppearance = (value: AppearanceChoice) => {
    setAppearance(value);
    saveAppearance(db, value);
  };
  const info = (key: InfoKey, title: string, icon: Parameters<typeof ListRow>[0]['icon'], text: string, value?: string, last = false) => (
    <View key={key}>
      <ListRow
        title={title}
        icon={icon}
        value={value}
        accessory={open === key ? '−' : '+'}
        last={last && open !== key}
        onPress={() => setOpen(open === key ? null : key)}
      />
      {open === key ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
          {text}
        </ThemedText>
      ) : null}
    </View>
  );
  const version = Constants.expoConfig?.version ?? '–';

  return (
    <Screen title={t('more.title')}>
      <Card title={t('more.appearanceTitle')}>
        <Segmented
          label={t('more.appearance')}
          options={APPEARANCES}
          value={appearance}
          onChange={changeAppearance}
          format={(v) => t(`more.appearanceOption.${v}`)}
        />
      </Card>
      <Card title={t('more.settingsTitle')}>
        <ListRow icon="person" title={t('progress.profileOpen')} subtitle={t('progress.profileTitle')} accessory="›" onPress={() => router.push('/progress/profile')} />
        <ListRow icon="bell" title={t('reminders.title')} subtitle={t('more.remindersSubtitle')} accessory="›" onPress={() => router.push('/more/notifications')} />
        <ListRow icon="database" title={t('dataScreen.title')} subtitle={t('more.dataSubtitle')} accessory="›" onPress={() => router.push('/more/data')} />
        <ListRow icon="lock" title={t('security.title')} subtitle={t('more.securitySubtitle')} accessory="›" onPress={() => router.push('/more/security')} last />
      </Card>
      <Card title={t('more.helpTitle')}>
        <ListRow icon="book" title={t('learn.title')} subtitle={t('learn.subtitle')} accessory="›" onPress={() => router.push('/more/learn')} />
        <ListRow icon="help" title={t('help.title')} subtitle={t('more.helpSubtitle')} accessory="›" onPress={() => router.push('/more/help')} />
        <ListRow icon="chat" title={t('feedback.title')} subtitle={t('more.feedbackSubtitle')} accessory="›" onPress={() => router.push('/more/feedback')} last />
      </Card>
      <Card title={t('more.aboutTitle')}>
        {info('privacy', t('more.privacyTitle'), 'shield', t('more.privacy'))}
        {info('sources', t('more.sourcesTitle'), 'book', t('more.sources'))}
        {info('language', t('more.languageTitle'), 'globe', t('more.language'), t('more.languageValue'))}
        <ListRow icon="tag" title={t('more.versionTitle')} value={version} last />
      </Card>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        {t('more.health')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoText: { paddingLeft: 36, paddingBottom: Spacing.three, paddingTop: Spacing.one },
  footer: { paddingHorizontal: Spacing.two, textAlign: 'center' },
});
