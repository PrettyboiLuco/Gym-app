// Grafiken vor dem Screenreader verstecken – auf allen Plattformen mit derselben Zeile.
import { Platform } from 'react-native';

/**
 * Für `<Svg>`: react-native-svg reicht Props im Web ungefiltert ans DOM weiter, dort sind
 * `accessibilityElementsHidden`/`importantForAccessibility` unbekannt (React-Warnung). Im Web daher `aria-hidden`.
 */
export const HIDDEN_FROM_A11Y =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);
