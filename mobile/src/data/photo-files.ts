// Bilddateien der Fortschrittsfotos im App-Ordner (Documents). Gespeichert wird nur der Dateiname,
// weil sich der absolute Pfad des App-Ordners bei Updates ändern kann. Nichts davon verlässt das Gerät.

import { Directory, File, Paths } from 'expo-file-system';

export const PHOTOS_SUPPORTED = true;

function folder() {
  return new Directory(Paths.document, 'progress-photos');
}

/** Kopiert ein aufgenommenes oder gewähltes Bild in den App-Ordner und gibt den Dateinamen zurück. */
export async function storePhoto(sourceUri: string, id: string): Promise<string> {
  const dir = folder();
  dir.create({ idempotent: true, intermediates: true });
  const name = `${id}.jpg`;
  await new File(sourceUri).copy(new File(dir, name));
  return name;
}

export function photoUri(fileName: string): string {
  return new File(folder(), fileName).uri;
}

export function photoExists(fileName: string): boolean {
  return new File(folder(), fileName).exists;
}

export function photoFile(fileName: string): File {
  folder().create({ idempotent: true, intermediates: true });
  return new File(folder(), fileName);
}

/** Alle Fotodateien entfernen (z. B. „Alle Daten löschen“). */
export function removeAllPhotoFiles() {
  const dir = folder();
  if (dir.exists) dir.delete();
}

export function removePhotoFile(fileName: string) {
  const file = new File(folder(), fileName);
  if (file.exists) file.delete();
}
