// Farben des aktuellen Erscheinungsbilds (hell/dunkel, siehe use-color-scheme.ts) aus constants/theme.ts.

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  return Colors[useColorScheme()];
}
