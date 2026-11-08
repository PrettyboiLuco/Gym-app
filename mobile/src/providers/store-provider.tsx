// Lokale Datenbank für die ganze App: öffnen, vorbereiten (Migrationen, Grundnahrungsmittel) und bereitstellen.

import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import { syncBasisFoods } from '@/data/basis-foods';
import { serialTransactions, type Db } from '@/data/db';
import { migrate } from '@/data/migrations';
import { loadOnlineSetting } from '@/data/online';

/** Exklusive Transaktionen (Wiederherstellen) gibt es in expo-sqlite nur auf dem Handy. */
const NATIVE = Platform.OS !== 'web';

/** Datenbank vorbereiten: Migrationen, dann die mitgelieferten Grundnahrungsmittel (A4, nur bei neuer Listen-Version). */
async function prepare(db: Db) {
  await migrate(db);
  await syncBasisFoods(db);
  await loadOnlineSetting(db);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName="gym-app.db" onInit={(db) => prepare(serialTransactions(db as unknown as Db, NATIVE))}>
      {children}
    </SQLiteProvider>
  );
}

/** Zugriff auf die lokale Datenbank (in der App: expo-sqlite), mit Transaktionen nacheinander (data/db.ts). */
export function useDb(): Db {
  return serialTransactions(useSQLiteContext() as unknown as Db, NATIVE);
}
