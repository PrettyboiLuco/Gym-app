/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Farben nach Lucs Vorlage (31.10.2026): ruhig, Schwarz/Weiß/Grau, Akzent Lime-Grün #C6F24E.
 * - primary/onPrimary: Hauptknöpfe und gewählte Optionen (dunkel: weiße Pille, hell: schwarze Pille)
 * - accent/onAccent: Flächen in Lime (Ringe, Punkte, Fortschritt) – immer mit schwarzer Schrift
 * - tint: Akzent als Schrift- und Symbolfarbe; hell dunkleres Grün, damit es auf Weiß lesbar bleibt (Kontrast ≥ 4,5)
 */
export const Colors = {
  light: {
    text: '#0A0A0A',
    background: '#F4F4F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7E7EA',
    border: '#D4D4D8',
    textSecondary: '#6E6E73',
    tint: '#4A7300',
    onTint: '#FFFFFF',
    primary: '#0A0A0A',
    onPrimary: '#FFFFFF',
    accent: '#C6F24E',
    onAccent: '#000000',
    danger: '#C62828',
    onDanger: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2C2C2E',
    border: '#3A3A3C',
    textSecondary: '#A1A1A6',
    tint: '#C6F24E',
    onTint: '#000000',
    primary: '#FFFFFF',
    onPrimary: '#000000',
    accent: '#C6F24E',
    onAccent: '#000000',
    danger: '#FF6B6B',
    onDanger: '#000000',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Überschriften in Manrope (aus der getlayers.ai-Schriftauswahl: „engineered, premium, calm“),
 * Fließtext bleibt in der Systemschrift. Geladen in app/_layout.tsx; bei eigenen Schriften kein fontWeight setzen.
 */
export const DisplayFont = { bold: 'Manrope_700Bold', extraBold: 'Manrope_800ExtraBold' } as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Rundungen: Karten groß und weich, Knöpfe als Pille. */
export const Radius = { card: 24, field: 14, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 72 }) ?? 0;
export const MaxContentWidth = 800;
