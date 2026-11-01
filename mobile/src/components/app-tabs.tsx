import { NativeTabs } from 'expo-router/native-tabs';

import { MiniPlayer } from '@/components/mini-player';
import { Colors } from '@/constants/theme';
import { useLiveTraining } from '@/providers/live-training';
import { useModules } from '@/providers/profile-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/i18n';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const live = useLiveTraining();
  const running = !!live.session || !!live.timedTitle;
  const modules = useModules();

  return (
    <NativeTabs
      // iOS 26: Leiste schrumpft beim Scrollen nach unten und kommt beim Zurückscrollen wieder.
      minimizeBehavior="onScrollDown"
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      tintColor={colors.text}
      labelStyle={{ selected: { color: colors.text } }}>
      {running ? (
        <NativeTabs.BottomAccessory>
          <Accessory live={live} />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.today')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="training">
        <NativeTabs.Trigger.Label>{t('tabs.training')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dumbbell.fill" md="fitness_center" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="nutrition" hidden={!modules.ernaehrung}>
        <NativeTabs.Trigger.Label>{t('tabs.nutrition')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>{t('tabs.progress')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>{t('tabs.more')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis.circle" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** Mini-Player im Zubehör-Platz über der Tab-Leiste (iOS 26); eingeklappt kompakt. */
function Accessory({ live }: { live: ReturnType<typeof useLiveTraining> }) {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  return <MiniPlayer live={live} compact={placement === 'inline'} />;
}
