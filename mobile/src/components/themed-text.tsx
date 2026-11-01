import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { DisplayFont, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  // Große Schrift (iPhone-Einstellung): Fließtext wächst frei mit, Überschriften und große Zahlen begrenzt (×1,4),
  // damit Titel und Kennzahlen nicht aus ihren Feldern laufen.
  const capped = type === 'title' || type === 'subtitle';
  return <Text maxFontSizeMultiplier={capped ? 1.4 : undefined} style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  // App-Bildschirme: Titel 18–32 px, keine Zahl über 40 px (taste-skill, app-screens §9.1).
  title: {
    fontFamily: DisplayFont.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: DisplayFont.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
