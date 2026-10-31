// Gespeicherte Darstellung (Hell/Dunkel/wie iPhone).

import { APPEARANCES, type AppearanceChoice } from '@/hooks/use-color-scheme';

import type { Db } from './db';
import { readState, writeState } from './app-state';

const KEY = 'appearance';

export async function loadAppearance(db: Db): Promise<AppearanceChoice> {
  const value = await readState<string>(db, KEY, 'system');
  return (APPEARANCES as readonly string[]).includes(value) ? (value as AppearanceChoice) : 'system';
}

export async function saveAppearance(db: Db, value: AppearanceChoice) {
  await writeState(db, KEY, value);
}
