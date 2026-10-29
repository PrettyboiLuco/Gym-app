// Minimale Typen für Node's eingebautes SQLite (nur in Tests verwendet).
declare module 'node:sqlite' {
  type Value = string | number | null;
  interface StatementSync {
    run(...params: Value[]): unknown;
    all(...params: Value[]): unknown[];
    get(...params: Value[]): unknown;
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
