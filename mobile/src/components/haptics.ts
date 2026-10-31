import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Spürbare Rückmeldung an einer Stelle gesammelt (im Web ohne Wirkung).
 * - tap: leichtes Antippen (Auswahl, Knopf)
 * - press: deutlicher Druck (Satz erledigt)
 * - tick: Countdown-Schlag (letzte Sekunden der Pause)
 * - success / warning: Ergebnis (Übung fertig, Pause vorbei, Bestleistung)
 */
const on = Platform.OS !== 'web';
const safe = (p: Promise<void>) => p.catch(() => undefined);

export const haptic = {
  tap: () => on && safe(Haptics.selectionAsync()),
  press: () => on && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  tick: () => on && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
