// Lokale Mitteilungen (Register HEALTH-012, UX-006/007, TIME-011). Nichts verlässt das Gerät; es gibt
// keine Push-Mitteilungen. iOS stellt lokale Mitteilungen nicht garantiert sekundengenau zu.

import * as Notifications from 'expo-notifications';

export const NOTIFICATIONS_SUPPORTED = true;

export type Alert = { id: string; atMs: number; title: string; body: string };
export type Repeating =
  | { id: string; kind: 'weekly'; weekday: number; hour: number; minute: number; title: string; body: string }
  | { id: string; kind: 'daily'; hour: number; minute: number; title: string; body: string };

/** Im Vordergrund keine Timer-Banner (die App zeigt den Timer selbst), Erinnerungen schon. */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const timer = n.request.identifier.startsWith('timer-');
      return { shouldPlaySound: !timer, shouldSetBadge: false, shouldShowBanner: !timer, shouldShowList: !timer };
    },
  });
}

export async function notificationPermission(ask: boolean): Promise<'granted' | 'denied' | 'undetermined'> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!ask) return current.canAskAgain ? 'undetermined' : 'denied';
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : 'denied';
}

async function cancelPrefix(prefix: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/** Ersetzt alle geplanten Timer-Hinweise einer Gruppe (z. B. „timer-pause-“ oder „timer-ablauf-“). */
export async function replaceAlerts(prefix: string, alerts: Alert[]) {
  await cancelPrefix(prefix);
  const now = Date.now();
  for (const a of alerts) {
    if (a.atMs <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${prefix}${a.id}`,
      content: { title: a.title, body: a.body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.atMs },
    });
  }
}

export async function cancelAlerts(prefix: string) {
  await cancelPrefix(prefix);
}

/** Ersetzt alle wiederkehrenden Erinnerungen. */
export async function replaceReminders(list: Repeating[]) {
  await cancelPrefix('erinnerung-');
  for (const r of list) {
    await Notifications.scheduleNotificationAsync({
      identifier: `erinnerung-${r.id}`,
      content: { title: r.title, body: r.body },
      trigger:
        r.kind === 'weekly'
          ? { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: r.weekday, hour: r.hour, minute: r.minute }
          : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute },
    });
  }
}

export async function cancelEverything() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
