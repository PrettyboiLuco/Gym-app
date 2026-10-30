// Export, Wiederherstellung und „Alle Daten löschen“ (Register TECH-014, LAW-006). Läuft jeweils in
// einer Transaktion: scheitert etwas, bleibt der alte Stand vollständig erhalten.

import { BACKUP_APP, BACKUP_FORMAT, BACKUP_TABLES, TRANSIENT_STATE, type BackupManifest } from '@/domain/backup';

import { nowUtc, type Db, type SqlValue } from './db';

async function schemaVersion(db: Db) {
  return (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
}

export async function currentSchemaVersion(db: Db) {
  return schemaVersion(db);
}

/** Alle Daten als Manifest. Startübungen sind in jeder App gleich und werden nicht mitgesichert. */
export async function exportBackup(db: Db, photos: Record<string, string> | null): Promise<BackupManifest> {
  const tables: BackupManifest['tables'] = {};
  for (const table of BACKUP_TABLES) {
    const where = table === 'exercise' ? ' WHERE name_key IS NULL' : '';
    tables[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}${where}`);
  }
  const state = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_state');
  const appState: Record<string, unknown> = {};
  for (const row of state) {
    if (TRANSIENT_STATE.includes(row.key)) continue;
    try {
      appState[row.key] = JSON.parse(row.value);
    } catch {
      // Unlesbare Einträge werden ausgelassen.
    }
  }
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    schemaVersion: await schemaVersion(db),
    exportedAt: nowUtc(),
    tables,
    appState,
    photos,
  };
}

async function clearAll(db: Db) {
  for (const table of [...BACKUP_TABLES].reverse()) {
    await db.runAsync(table === 'exercise' ? 'DELETE FROM exercise WHERE name_key IS NULL' : `DELETE FROM ${table}`);
  }
  await db.runAsync('DELETE FROM app_state');
}

/**
 * Ersetzt alle Daten durch die Sicherung. Ältere Sicherungen passen, weil spätere Versionen nur Spalten
 * ergänzt haben: Es werden die Spalten übernommen, die es heute gibt; neue Spalten bekommen ihren Standard.
 */
export async function restoreBackup(db: Db, manifest: BackupManifest) {
  await db.withTransactionAsync(async () => {
    // Verweise innerhalb einer Tabelle (z. B. befristete Planversion → Standardversion) erst am Ende prüfen.
    await db.execAsync('PRAGMA defer_foreign_keys = ON');
    await clearAll(db);
    for (const table of BACKUP_TABLES) {
      const rows = manifest.tables[table] ?? [];
      if (rows.length === 0) continue;
      const columns = new Set((await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name));
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => columns.has(k));
        if (table === 'exercise' && row.name_key != null) continue;
        await db.runAsync(
          `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          ...keys.map((k) => row[k] as SqlValue)
        );
      }
    }
    for (const [key, value] of Object.entries(manifest.appState)) {
      if (TRANSIENT_STATE.includes(key)) continue;
      await db.runAsync('INSERT INTO app_state (key, value) VALUES (?, ?)', key, JSON.stringify(value));
    }
  });
}

/** Löscht alle eigenen Daten auf diesem Gerät; danach startet die App wie neu (LAW-006). */
export async function deleteAllData(db: Db) {
  await db.withTransactionAsync(async () => {
    await clearAll(db);
  });
}
