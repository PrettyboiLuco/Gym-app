// Nur für Tests: dieselbe Db-Schnittstelle wie in der App, aber mit Node's eingebautem SQLite.

import { DatabaseSync } from 'node:sqlite';

import type { Db, SqlValue } from '../db';

export function createTestDb(): Db & { close(): void } {
  const sqlite = new DatabaseSync(':memory:');
  return {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, ...params: SqlValue[]) {
      return sqlite.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, ...params: SqlValue[]) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: SqlValue[]) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      sqlite.close();
    },
  };
}
