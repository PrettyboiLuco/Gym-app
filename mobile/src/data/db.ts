// Minimale Datenbank-Schnittstelle. expo-sqlite erfüllt sie in der App; in den Tests steckt
// Node's eingebautes SQLite dahinter (src/data/testing/node-db.ts). So prüfen die Tests
// genau dieselben SQL-Befehle, die auch auf dem iPhone laufen.

export type SqlValue = string | number | null;

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  /**
   * Exklusive Transaktion: Alle Befehle laufen über `tx`, andere Bildschirme können nicht dazwischenfunken
   * (expo-sqlite auf dem Handy; im Web und in den Tests gibt es sie nicht – dann normale Transaktion).
   */
  withExclusiveTransactionAsync?(task: (tx: Db) => Promise<void>): Promise<void>;
}

/** Exklusiv, wo möglich; sonst die normale (in der Warteschlange laufende) Transaktion mit derselben Datenbank. */
export function exclusiveTransaction(db: Db, task: (tx: Db) => Promise<void>): Promise<void> {
  return db.withExclusiveTransactionAsync ? db.withExclusiveTransactionAsync(task) : db.withTransactionAsync(() => task(db));
}

const serialized = new WeakMap<object, Db>();

/**
 * Hülle, die Transaktionen nacheinander ausführt (Warteschlange). SQLite kann keine zweite Transaktion beginnen,
 * solange eine läuft („cannot start a transaction within a transaction“) – etwa bei einem Doppeltipp oder wenn zwei
 * Bildschirme gleichzeitig laden. Hier wartet die zweite, bis die erste fertig ist; einzelne Befehle laufen wie bisher.
 * Wichtig: Transaktionen nie verschachteln, die innere würde auf die äußere warten. Abläufe, die mehrere
 * Speicherfunktionen in einer Transaktion bündeln, nutzen deren Kern ohne Transaktion (z. B. insertPlanVersion).
 * Für dieselbe Datenbank gibt es immer dieselbe Hülle (wichtig für React-Abhängigkeiten und die gemeinsame Warteschlange).
 */
export function serialTransactions(db: Db, allowExclusive = false): Db {
  const known = serialized.get(db);
  if (known) return known;
  let tail: Promise<unknown> = Promise.resolve();
  const wrapped: Db = {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, ...params) => db.runAsync(sql, ...params),
    getAllAsync: (sql, ...params) => db.getAllAsync(sql, ...params),
    getFirstAsync: (sql, ...params) => db.getFirstAsync(sql, ...params),
    withTransactionAsync(task) {
      const run = tail.then(() => db.withTransactionAsync(task));
      tail = run.catch(() => undefined);
      return run;
    },
  };
  // Nur wo expo-sqlite sie wirklich kann (Handy, nicht Web).
  const exclusive = allowExclusive ? db.withExclusiveTransactionAsync?.bind(db) : undefined;
  if (exclusive) {
    wrapped.withExclusiveTransactionAsync = (task) => {
      const run = tail.then(() => exclusive(task));
      tail = run.catch(() => undefined);
      return run;
    };
  }
  serialized.set(db, wrapped);
  serialized.set(wrapped, wrapped);
  return wrapped;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowUtc(): string {
  return new Date().toISOString();
}
