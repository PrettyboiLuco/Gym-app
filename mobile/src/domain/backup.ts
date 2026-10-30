// Sicherung und Wiederherstellung (Register TECH-014, LAW-006): versioniertes Manifest, volle Kontrolle
// beim Nutzer. Die Datei liegt dort, wo du sie speicherst – die App hat keinen Server.

export const BACKUP_APP = 'gym-app';
export const BACKUP_FORMAT = 1;

/** Tabellen in einer Reihenfolge, in der Eltern vor Kindern kommen (Einfügen vorwärts, Löschen rückwärts). */
export const BACKUP_TABLES = [
  'weight_entry',
  'exercise',
  'plan',
  'plan_version',
  'plan_day',
  'plan_item',
  'workout_session',
  'set_log',
  'food',
  'recipe',
  'recipe_version',
  'recipe_ingredient',
  'meal_template',
  'meal_template_item',
  'consumption_event',
  'calorie_goal',
  'goal',
  'goal_version',
  'body_measurement',
  'progress_photo',
  'routine',
  'routine_version',
  'routine_item',
  'timed_session',
  'flexibility_test',
  'steps_entry',
  'sleep_entry',
  'checkin',
] as const;

/** Laufende Zustände gehören nicht in eine Sicherung. */
export const TRANSIENT_STATE = ['rest_timer', 'interval_run', 'timed_run'];

export type BackupManifest = {
  app: typeof BACKUP_APP;
  format: number;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
  appState: Record<string, unknown>;
  /** Fortschrittsfotos nur, wenn ausdrücklich gewählt (Dateiname → Base64). */
  photos: Record<string, string> | null;
};

export type BackupProblem = 'notJson' | 'notOurs' | 'format' | 'newer' | 'broken';

/** Prüft eine eingelesene Datei, bevor irgendetwas überschrieben wird. */
export function checkBackup(raw: string, currentSchema: number): { manifest: BackupManifest | null; problem: BackupProblem | null } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { manifest: null, problem: 'notJson' };
  }
  if (!data || typeof data !== 'object') return { manifest: null, problem: 'notOurs' };
  const m = data as Partial<BackupManifest>;
  if (m.app !== BACKUP_APP) return { manifest: null, problem: 'notOurs' };
  if (m.format !== BACKUP_FORMAT) return { manifest: null, problem: 'format' };
  if (typeof m.schemaVersion !== 'number' || m.schemaVersion > currentSchema) return { manifest: null, problem: 'newer' };
  if (!m.tables || typeof m.tables !== 'object' || !m.appState || typeof m.appState !== 'object') {
    return { manifest: null, problem: 'broken' };
  }
  for (const rows of Object.values(m.tables)) if (!Array.isArray(rows)) return { manifest: null, problem: 'broken' };
  return { manifest: m as BackupManifest, problem: null };
}

export function backupSummary(m: BackupManifest) {
  const count = (t: string) => m.tables[t]?.length ?? 0;
  return {
    exportedAt: m.exportedAt,
    workouts: count('workout_session'),
    entries: count('consumption_event'),
    weights: count('weight_entry'),
    photos: m.photos ? Object.keys(m.photos).length : 0,
  };
}

export function backupFileName(day: string): string {
  return `gym-app-sicherung-${day}.json`;
}
