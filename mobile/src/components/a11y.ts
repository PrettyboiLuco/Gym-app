// Für Bildschirmleser ausblenden. Auf dem Web landen die nativen Namen bei einer Svg direkt am DOM-Element und
// erzeugen eine Warnung – dort gilt aria-hidden.
import { Platform } from 'react-native';

export const HIDDEN =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);
