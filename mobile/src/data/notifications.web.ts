// Im Browser gibt es keine lokalen Mitteilungen dieser Art; die Funktionen tun nichts.

import type { Alert, Repeating } from './notifications';

export type { Alert, Repeating };

export const NOTIFICATIONS_SUPPORTED = false;

export function configureNotifications() {}

export async function notificationPermission(_ask: boolean): Promise<'granted' | 'denied' | 'undetermined'> {
  return 'denied';
}

export async function replaceAlerts(_prefix: string, _alerts: Alert[]) {}

export async function cancelAlerts(_prefix: string) {}

export async function replaceReminders(_list: Repeating[]) {}

export async function cancelEverything() {}
