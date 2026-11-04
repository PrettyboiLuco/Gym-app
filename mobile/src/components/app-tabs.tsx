import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { hidesTabBar, MiniPlayer, TRAINING_SCREENS } from '@/components/mini-player';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/i18n';
import { useLiveTraining } from '@/providers/live-training';
import { useModules } from '@/providers/profile-provider';

/**
 * O10: Auf iOS 26 zeichnet das System die Tab-Leiste als Liquid Glass (schwebend, mit gleitender Auswahl-Pille – N7
 * übernimmt dort das System). Geprüft wird das über expo-glass-effect: dann keine eigene Hintergrundfarbe, das Glas nimmt
 * den Inhalt darunter auf. Ältere iPhones und Android behalten den bisherigen schwarzen bzw. hellen Grund.
 */
const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const live = useLiveTraining();
  const pathname = usePathname();
  // Im Training selbst blendet sich der Mini-Player aus – dann auch keinen leeren Platz über der Tab-Leiste lassen.
  const inTraining = TRAINING_SCREENS.some((p) => pathname.startsWith(p));
  const running = (!!live.session || !!live.timedTitle) && !inTraining;
  const modules = useModules();
  const reduced = useReducedMotion();

  return (
    <NativeTabs
      // Im Satz-Logger ausgeblendet (mehr Platz für Sätze und Pausenleiste); bei „Bewegung reduzieren“ ohne Animation.
      hidden={hidesTabBar(pathname)}
      disableHiddenAnimation={reduced}
      // iOS 26: Leiste schrumpft beim Scrollen nach unten und kommt beim Zurückscrollen wieder.
      minimizeBehavior="onScrollDown"
      backgroundColor={LIQUID_GLASS ? undefined : colors.background}
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
