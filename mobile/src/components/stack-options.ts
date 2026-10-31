import { DisplayFont } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Einheitliche Kopfzeilen für alle Bereiche: gleicher Grund wie der Bildschirm, keine Trennlinie
 * (Flächen trennen sich durch Helligkeit, nicht durch Linien), Titel in Manrope, „Zurück“ in Schriftfarbe.
 */
export function useStackOptions() {
  const theme = useTheme();
  return {
    headerBackTitle: t('common.back'),
    headerTintColor: theme.text,
    headerStyle: { backgroundColor: theme.background },
    headerShadowVisible: false,
    headerTitleStyle: { color: theme.text, fontFamily: DisplayFont.semiBold, fontSize: 17 },
    contentStyle: { backgroundColor: theme.background },
  } as const;
}
