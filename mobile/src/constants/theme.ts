// Gestaltung: Farben für Hell/Dunkel, Abstände und Schrift – eine Quelle für die ganze App.
import { Platform } from 'react-native';

/**
 * Farben nach Lucs Vorlage (31.10.2026): ruhig, Schwarz/Weiß/Grau, Akzent Lime-Grün #C6F24E.
 * Verfeinert nach taste-skill (App-Stil „True-black flat“): Karten heben sich nur durch Helligkeit ab
 * (dunkel #000 → #111 → #2A2A2A, ohne Rand), hell durch eine 1-px-Kante. Lime nur auf Daten
 * (Ringe, Balken, Verlauf, erledigte Tage), nie auf Knöpfen, Tabs oder Navigation.
 * - primary/onPrimary: Hauptknöpfe und gewählte Optionen (dunkel: weiße Pille, hell: schwarze Pille)
 * - accent/onAccent: Flächen in Lime (Ringe, Punkte, Fortschritt) – immer mit schwarzer Schrift
 * - tint: Akzent als Schrift- und Symbolfarbe; hell dunkleres Grün, damit es auf Weiß lesbar bleibt (Kontrast ≥ 4,5)
 */
export const Colors = {
  light: {
    text: '#0A0A0A',
    background: '#F6F6F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEEEEE',
    border: '#D1D5DB',
    textSecondary: '#5F6368',
    tint: '#4A7300',
    onTint: '#FFFFFF',
    primary: '#0A0A0A',
    onPrimary: '#FFFFFF',
    accent: '#C6F24E',
    onAccent: '#000000',
    danger: '#C62828',
    onDanger: '#FFFFFF',
    /** Feine Kante um Karten – gibt Tiefe, ohne Schatten. */
    hairline: '#E8E8E8',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    backgroundElement: '#111111',
    backgroundSelected: '#2A2A2A',
    border: '#444444',
    textSecondary: '#B4B4B4',
    tint: '#C6F24E',
    onTint: '#000000',
    primary: '#FFFFFF',
    onPrimary: '#000000',
    accent: '#C6F24E',
    onAccent: '#000000',
    danger: '#FF6B6B',
    onDanger: '#000000',
    hairline: 'transparent',
  },
} as const;

/**
 * Stufen der Muskelkarte (0 = keine Sätze … 4 = 20+): feste Farben statt Deckkraft, damit die Stufen gleichmäßig
 * heller werden und sich weich ineinander überblenden lassen. Stufe 0 = Rand-Grau, Stufe 4 = Datenfarbe
 * (hell das dunklere Grün, dunkel Lime) – Lime bleibt nur auf Daten.
 */
export const MuscleRamp = {
  light: ['#D1D5DB', '#C8DFA0', '#97C05A', '#6B9A22', '#4A7300'],
  dark: ['#444444', '#4E5E22', '#77922F', '#A0C43E', '#C6F24E'],
} as const;

/** Feine Körperdetails der Muskelkarte (Kniescheibe, Schlüsselbein …): knapp vom Körperton abgesetzt. */
export const BodyDetail = { light: '#DCDDE0', dark: '#363636' } as const;
/** Frisur der weiblichen Figur: dunkler als der Körper (wie Haar), damit die Form auf einen Blick erkennbar ist. */
export const BodyHair = { light: '#A9ACB2', dark: '#1B1B1B' } as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Überschriften und Kennzahlen in Manrope (aus der getlayers.ai-Schriftauswahl: „engineered, premium, calm“),
 * Fließtext bleibt in der Systemschrift. Höchstens 700 (taste-skill: App-Schrift ist keine Plakatschrift). Geladen in app/_layout.tsx; bei eigenen Schriften kein fontWeight setzen.
 */
export const DisplayFont = { semiBold: 'Manrope_600SemiBold', bold: 'Manrope_700Bold' } as const;

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
export const Radius = { card: 20, field: 14, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 72 }) ?? 0;
export const MaxContentWidth = 800;
