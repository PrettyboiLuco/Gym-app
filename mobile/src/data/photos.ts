// Fortschrittsfotos in der Datenbank (Register GOAL-008). Die Bilddateien verwaltet photo-files.ts.

import type { PhotoPose, ProgressPhoto } from '@/domain/body';

import { newId, nowUtc, type Db } from './db';

export function listPhotos(db: Db) {
  return db.getAllAsync<ProgressPhoto>(
    'SELECT id, day, pose, file_name AS fileName FROM progress_photo ORDER BY day DESC, created_at_utc DESC, rowid DESC'
  );
}

export async function addPhoto(db: Db, day: string, pose: PhotoPose, fileName: string) {
  const id = newId();
  await db.runAsync(
    'INSERT INTO progress_photo (id, day, pose, file_name, created_at_utc) VALUES (?, ?, ?, ?, ?)',
    id,
    day,
    pose,
    fileName,
    nowUtc()
  );
  return id;
}

/** Entfernt den Eintrag und gibt den Dateinamen zurück, damit die Datei gelöscht werden kann. */
export async function deletePhoto(db: Db, id: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ fileName: string }>('SELECT file_name AS fileName FROM progress_photo WHERE id = ?', id);
  await db.runAsync('DELETE FROM progress_photo WHERE id = ?', id);
  return row?.fileName ?? null;
}

export async function deleteAllPhotos(db: Db): Promise<string[]> {
  const rows = await db.getAllAsync<{ fileName: string }>('SELECT file_name AS fileName FROM progress_photo');
  await db.runAsync('DELETE FROM progress_photo');
  return rows.map((r) => r.fileName);
}
