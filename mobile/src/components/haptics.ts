import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Spürbare Rückmeldung an einer Stelle gesammelt (im Web ohne Wirkung).
 * - tap: leichtes Antippen (Auswahl, Knopf)
 * - press: deutlicher Druck (Satz erledigt)
 * - tick: Countdown-Schlag (letzte Sekunden der Pause)
 * - success / warning: Ergebnis (Übung fertig, Pause vorbei)
 * - record: Bestleistung – Erfolg und kurz danach ein kräftiger Schlag, deutlicher als success
 */
const on = Platform.OS !== 'web';
const safe = (p: Promise<void>) => p.catch(() => undefined);
/** Abstand zwischen Erfolg und Schlag bei einer Bestleistung, damit beide einzeln spürbar sind. */
const RECORD_GAP_MS = 180;

export const haptic = {
  tap: () => on && safe(Haptics.selectionAsync()),
  press: () => on && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  tick: () => on && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  record: () => {
    if (!on) return;
    safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTimeout(() => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), RECORD_GAP_MS);
  },
};
