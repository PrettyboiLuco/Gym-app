// Online-Funktionen abschaltbar (TECH-020, LAW-018, Phase 1 Scan): Open Food Facts (Scan, Online-Suche) und
// „Rezept per Link“. Zwei Schalter: der Nutzer unter Mehr → Online-Funktionen, und der Anbieter per Update (Not-Aus).

import { readState, writeState } from './app-state';
import type { Db } from './db';

/**
 * Not-Aus des Anbieters: Bei einem Vorfall (z. B. eine Quelle liefert falsche Daten oder ist unsicher) hier auf false
 * setzen und ein Update veröffentlichen – dann geht keine Anfrage mehr ins Netz. Ablauf: docs/Support_und_Notfallplan.md.
 */
export const PROVIDER_ONLINE_ENABLED = true;

let userOnline = true;

/** Beim Start und nach Änderungen geladen; so prüfen auch Funktionen ohne Datenbank-Zugriff (z. B. off.ts) schnell. */
export async function loadOnlineSetting(db: Db): Promise<boolean> {
  userOnline = await readState<boolean>(db, 'online_features', true);
  return userOnline;
}

export async function saveOnlineSetting(db: Db, on: boolean) {
  await writeState(db, 'online_features', on);
  userOnline = on;
}

/** Dürfen Online-Funktionen gerade ins Netz? */
export function onlineAllowed(): boolean {
  return PROVIDER_ONLINE_ENABLED && userOnline;
}
