import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import type { ReactNode } from 'react';

import type { Db } from '@/data/db';
import { syncBasisFoods } from '@/data/basis-foods';
import { migrate } from '@/data/migrations';

/** Datenbank vorbereiten: Migrationen, dann die mitgelieferten Grundnahrungsmittel (A4, nur bei neuer Listen-Version). */
async function prepare(db: Db) {
  await migrate(db);
  await syncBasisFoods(db);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName="gym-app.db" onInit={(db) => prepare(db as unknown as Db)}>
      {children}
    </SQLiteProvider>
  );
}

/** Zugriff auf die lokale Datenbank (in der App: expo-sqlite). */
export function useDb(): Db {
  return useSQLiteContext() as unknown as Db;
}
