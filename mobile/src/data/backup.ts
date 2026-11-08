// Export, Wiederherstellung und „Alle Daten löschen“ (Register TECH-014, LAW-006). Läuft jeweils in
// einer Transaktion: scheitert etwas, bleibt der alte Stand vollständig erhalten.

import { BACKUP_APP, BACKUP_FORMAT, BACKUP_TABLES, TRANSIENT_STATE, type BackupManifest } from '@/domain/backup';

import { readState, writeState } from './app-state';
import { syncBasisFoods } from './basis-foods';
import { exclusiveTransaction, nowUtc, type Db, type SqlValue } from './db';
import { RESTORE_DATA_STEPS } from './migrations';
import { loadNutritionSettings } from './nutrition';
import { loadOnlineSetting } from './online';

async function schemaVersion(db: Db) {
  return (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
}

/** Tag der letzten Sicherung (für den Hinweis nach 30 Tagen, Prüfung 08.11.). */
export const loadLastBackup = (db: Db) => readState<string | null>(db, 'last_backup', null);
export const saveLastBackup = (db: Db, day: string) => writeState(db, 'last_backup', day);

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
  // Exklusiv (Prüfung 08.11.): Kein anderer Bildschirm kann zwischen Löschen und Einfügen halbe Daten sehen oder schreiben.
  await exclusiveTransaction(db, async (tx) => {
    // Verweise innerhalb einer Tabelle (z. B. befristete Planversion → Standardversion) erst am Ende prüfen.
    await tx.execAsync('PRAGMA defer_foreign_keys = ON');
    await clearAll(tx);
    for (const table of BACKUP_TABLES) {
      const rows = (manifest.tables[table] ?? []).filter((row) => !(table === 'exercise' && row.name_key != null));
      if (rows.length === 0) continue;
      const columns = new Set((await tx.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name));
      // Zeilen mit gleichen Spalten bündeln und mehrere auf einmal einfügen (vorher eine Anfrage je Zeile:
      // ~10 Sekunden und mehr bei einigen Jahren Daten). SQLite erlaubt höchstens 999 Platzhalter je Befehl.
      const groups = new Map<string, Record<string, unknown>[]>();
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => columns.has(k));
        const sig = keys.join(',');
        groups.set(sig, [...(groups.get(sig) ?? []), row]);
      }
      for (const [sig, group] of groups) {
        if (!sig) continue;
        const keys = sig.split(',');
        const perBatch = Math.max(1, Math.floor(900 / keys.length));
        for (let i = 0; i < group.length; i += perBatch) {
          const batch = group.slice(i, i + perBatch);
          const one = `(${keys.map(() => '?').join(', ')})`;
          await tx.runAsync(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${batch.map(() => one).join(', ')}`,
            ...batch.flatMap((row) => keys.map((k) => row[k] as SqlValue))
          );
        }
      }
    }
    for (const [key, value] of Object.entries(manifest.appState)) {
      if (TRANSIENT_STATE.includes(key)) continue;
      await tx.runAsync('INSERT INTO app_state (key, value) VALUES (?, ?)', key, JSON.stringify(value));
    }
    // Laufende Dehn-/HIIT-Einheiten aus der Sicherung laufen hier nicht weiter (der Ablauf wird nicht mitgesichert):
    // als abgebrochen ablegen, sonst blieben sie für immer „aktiv“ und ließen sich weder löschen noch exportieren.
    await tx.runAsync("UPDATE timed_session SET status = 'abgebrochen', finished_at_utc = COALESCE(finished_at_utc, ?) WHERE status = 'aktiv'", nowUtc());
  });
  // Ältere Sicherung: Datenumwandlungen späterer Migrationen nachholen (Phase 1 Scan, F11), z. B. Schlaf aus
  // sleep_entry in den Morgen-Check (nur bei Sicherungen von vor Version 23).
  for (const step of RESTORE_DATA_STEPS) if (manifest.schemaVersion < step.version) await db.execAsync(step.sql);
  // Sicherung von vor den Grundnahrungsmitteln (A4): Liste gleich wieder einspielen, nicht erst beim nächsten Start.
  await syncBasisFoods(db);
  // Zwischengespeicherte Einstellung „Online-Funktionen“ an die Sicherung anpassen (Datenschutz: aus bleibt aus).
  await loadOnlineSetting(db);
  // Zwischengespeichertes Tagesende und Essenszeiten (Ernährungstag, Mahlzeit-Vorschlag) aus der Sicherung übernehmen.
  await loadNutritionSettings(db);
}

/** Löscht alle eigenen Daten auf diesem Gerät; danach startet die App wie neu (LAW-006). */
export async function deleteAllData(db: Db) {
  await db.withTransactionAsync(async () => {
    await clearAll(db);
  });
  // Grundnahrungsmittel gehören zur App, nicht zu den eigenen Daten (A4).
  await syncBasisFoods(db);
  // Einstellung „Online-Funktionen“ ist gelöscht: Zwischenspeicher auf den Standard zurücksetzen.
  await loadOnlineSetting(db);
  // Ebenso Tagesende und Essenszeiten der Ernährung.
  await loadNutritionSettings(db);
}
