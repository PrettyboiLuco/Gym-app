// Hell/Dunkel: folgt dem iPhone oder ist fest eingestellt (Einstellung „Darstellung“ unter Mehr).
// Die Wahl liegt hier im Speicher, damit alle Bildschirme sofort umschalten; gespeichert wird sie in app_state.

import { useSyncExternalStore } from 'react';
import { Appearance, Platform, useColorScheme as useSystemColorScheme } from 'react-native';

export const APPEARANCES = ['system', 'hell', 'dunkel'] as const;
export type AppearanceChoice = (typeof APPEARANCES)[number];

let choice: AppearanceChoice = 'system';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAppearance(next: AppearanceChoice) {
  if (!APPEARANCES.includes(next)) next = 'system';
  choice = next;
  // Auf dem Handy auch die nativen Teile (Tab-Leiste, Tastatur, Hinweisfenster) umschalten.
  if (Platform.OS !== 'web') Appearance.setColorScheme(next === 'system' ? 'auto' : next === 'dunkel' ? 'dark' : 'light');
  listeners.forEach((l) => l());
}

export function useAppearance(): AppearanceChoice {
  return useSyncExternalStore(subscribe, () => choice, () => choice);
}

/** Wirksames Farbschema: feste Wahl oder das des iPhones. */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const current = useAppearance();
  if (current === 'hell') return 'light';
  if (current === 'dunkel') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}
