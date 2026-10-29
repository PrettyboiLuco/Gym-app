import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useMemo, type ReactNode } from 'react';

import type { WeightEntry } from '@/domain/weight';

import { MIGRATIONS } from './migrations';
import { newId, StoreContext, type Store } from './store';

async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[version]);
      await tx.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

function sqliteStore(db: SQLiteDatabase): Store {
  return {
    listWeights: () =>
      db.getAllAsync<WeightEntry>('SELECT id, day, kg FROM weight_entry ORDER BY day DESC, recorded_at_utc DESC'),
    addWeight: async (day, kg) => {
      await db.runAsync(
        'INSERT INTO weight_entry (id, day, kg, recorded_at_utc) VALUES (?, ?, ?, ?)',
        newId(),
        day,
        kg,
        new Date().toISOString()
      );
    },
    deleteWeight: async (id) => {
      await db.runAsync('DELETE FROM weight_entry WHERE id = ?', id);
    },
  };
}

function SqliteStoreBridge({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const store = useMemo(() => sqliteStore(db), [db]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName="gym-app.db" onInit={migrate}>
      <SqliteStoreBridge>{children}</SqliteStoreBridge>
    </SQLiteProvider>
  );
}
