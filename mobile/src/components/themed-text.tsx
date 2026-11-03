import { StyleSheet, Text, type TextProps } from 'react-native';

import { DisplayFont, TabularNums, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle';
  themeColor?: ThemeColor;
  /** Kennzahl (Timer, Gewicht, Sätze, Volumen): Ziffern gleicher Breite (O7). */
  numeric?: boolean;
};

export function ThemedText({ style, type = 'default', themeColor, numeric = false, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  // Große Schrift (iPhone-Einstellung): Fließtext wächst frei mit, Überschriften und große Zahlen begrenzt (×1,4),
  // damit Titel und Kennzahlen nicht aus ihren Feldern laufen.
  const capped = type === 'title' || type === 'subtitle';
  return (
    <Text
      maxFontSizeMultiplier={capped ? 1.4 : undefined}
      style={[{ color: theme[themeColor ?? 'text'] }, styles[type], numeric && TabularNums, style]}
      {...rest}
    />
  );
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
});
