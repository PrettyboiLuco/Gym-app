import Constants from 'expo-constants';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ListRow, Segmented } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { saveAppearance } from '@/data/appearance';
import { type AppearanceChoice, APPEARANCES } from '@/domain/appearance';
import { setAppearance, useAppearance } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useDb } from '@/providers/store-provider';

type InfoKey = 'privacy' | 'sources' | 'licenses';

/**
 * „Mehr“: Einstellungen als ruhige Liste in Gruppen (Symbol links, Wert rechts, Pfeil), wie die
 * iPhone-Einstellungen. Darstellung direkt als Segment-Schalter. Die Hinweise klappen beim Antippen auf,
 * statt als fünf Textkarten untereinander zu stehen; der Gesundheitshinweis bleibt unten immer sichtbar.
 */
export default function MoreScreen() {
  const db = useDb();
  const theme = useTheme();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const appearance = useAppearance();
  const [open, setOpen] = useState<InfoKey | null>(null);
  const changeAppearance = (value: AppearanceChoice) => {
    setAppearance(value);
    saveAppearance(db, value);
  };
  // Aufklappen mit gezeichnetem Pfeil (zu: nach unten, offen: nach oben) statt „+“ / „−“ als Textzeichen.
  const info = (key: InfoKey, title: string, icon: Parameters<typeof ListRow>[0]['icon'], text: string) => (
    <View key={key}>
      <ListRow
        title={title}
        icon={icon}
        trailing={
          <View style={open === key ? styles.up : styles.down}>
            <Icon name="chevron" color={theme.textSecondary} size={18} strokeWidth={2} />
          </View>
        }
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
    <Screen
      title={t('more.title')}
      leading={
        // Kein eigener Tab mehr (der Platz gehört dem Coach): zurück dorthin, woher das Zahnrad kam.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('more.back')}
          hitSlop={8}
          onPress={() => router.navigate((from && from.startsWith('/') ? from : '/') as Href)}
          style={styles.back}>
          <View style={styles.flip}>
            <Icon name="chevron" color={theme.text} size={18} strokeWidth={2.2} />
          </View>
          <ThemedText type="smallBold">{t('more.back')}</ThemedText>
        </Pressable>
      }>
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
        <ListRow
          icon="person"
          title={t('progress.profileOpen')}
          subtitle={t('progress.profileTitle')}
          accessory="›"
          onPress={() => router.push('/progress/profile')}
        />
        <ListRow icon="list" title={t('modules.title')} subtitle={t('modules.subtitle')} accessory="›" onPress={() => router.push('/more/modules')} />
        <ListRow
          icon="bell"
          title={t('reminders.title')}
          subtitle={t('more.remindersSubtitle')}
          accessory="›"
          onPress={() => router.push('/more/notifications')}
        />
        <ListRow icon="database" title={t('dataScreen.title')} subtitle={t('more.dataSubtitle')} accessory="›" onPress={() => router.push('/more/data')} />
        <ListRow
          icon="lock"
          title={t('security.title')}
          subtitle={t('more.securitySubtitle')}
          accessory="›"
          onPress={() => router.push('/more/security')}
          last
        />
      </Card>
      <Card title={t('more.helpTitle')}>
        <ListRow icon="book" title={t('learn.title')} subtitle={t('learn.subtitle')} accessory="›" onPress={() => router.push('/more/learn')} />
        <ListRow icon="help" title={t('help.title')} subtitle={t('more.helpSubtitle')} accessory="›" onPress={() => router.push('/more/help')} />
        <ListRow
          icon="chat"
          title={t('feedback.title')}
          subtitle={t('more.feedbackSubtitle')}
          accessory="›"
          onPress={() => router.push('/more/feedback')}
          last
        />
      </Card>
      <Card title={t('more.aboutTitle')}>
        {info('privacy', t('more.privacyTitle'), 'shield', t('more.privacy'))}
        {info('sources', t('more.sourcesTitle'), 'book', t('more.sources'))}
        {info('licenses', t('more.licensesTitle'), 'book', t('more.licenses'))}
        {/* Sprache ist (noch) keine Einstellung: nur ein Hinweis, ohne Wert und ohne Pfeil. */}
        <ListRow icon="globe" title={t('more.languageTitle')} subtitle={t('more.language')} />
        <ListRow icon="tag" title={t('more.versionTitle')} value={version} last />
      </Card>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        {t('more.health')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-start', paddingVertical: Spacing.one },
  flip: { transform: [{ scaleX: -1 }] },
  infoText: { paddingLeft: 36, paddingBottom: Spacing.three, paddingTop: Spacing.one },
  footer: { paddingHorizontal: Spacing.two, textAlign: 'center' },
  down: { transform: [{ rotate: '90deg' }] },
  up: { transform: [{ rotate: '-90deg' }] },
});
