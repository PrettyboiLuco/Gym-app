// Minimale Datenbank-Schnittstelle. expo-sqlite erfüllt sie in der App; in den Tests steckt
// Node's eingebautes SQLite dahinter (src/data/__tests__/node-db.ts). So prüfen die Tests
// genau dieselben SQL-Befehle, die auch auf dem iPhone laufen.

export type SqlValue = string | number | null;

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowUtc(): string {
  return new Date().toISOString();
}
