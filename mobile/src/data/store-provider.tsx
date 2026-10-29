import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import type { ReactNode } from 'react';

import type { Db } from './db';
import { migrate } from './migrations';

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName="gym-app.db" onInit={(db) => migrate(db as unknown as Db)}>
      {children}
    </SQLiteProvider>
  );
}

/** Zugriff auf die lokale Datenbank (in der App: expo-sqlite). */
export function useDb(): Db {
  return useSQLiteContext() as unknown as Db;
}
