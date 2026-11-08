// Bilddateien der Fortschrittsfotos im App-Ordner (Documents). Gespeichert wird nur der Dateiname,
// weil sich der absolute Pfad des App-Ordners bei Updates ändern kann. Nichts davon verlässt das Gerät.

import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const PHOTOS_SUPPORTED = true;

function folder() {
  return new Directory(Paths.document, 'progress-photos');
}

/** Längste Seite gespeicherter Fotos: reicht für den Vergleich, hält Speicher und Sicherung klein (Prüfung 08.11.). */
const MAX_SIDE = 1600;

/**
 * Speichert ein aufgenommenes oder gewähltes Bild verkleinert (längste Seite 1600 px, JPEG 80 %) im App-Ordner und
 * gibt den Dateinamen zurück. Vorher lagen Fotos in voller Kamera-Auflösung (2–4 MB) – eine Sicherung mit Fotos wurde
 * nach einigen Monaten zu groß. Klappt das Verkleinern nicht, wird das Original kopiert.
 */
export async function storePhoto(sourceUri: string, id: string): Promise<string> {
  const dir = folder();
  dir.create({ idempotent: true, intermediates: true });
  const name = `${id}.jpg`;
  const target = new File(dir, name);
  try {
    const context = ImageManipulator.manipulate(sourceUri);
    const image = await context.renderAsync();
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const saved =
      scale < 1
        ? await (await ImageManipulator.manipulate(sourceUri).resize({ width: Math.round(image.width * scale) }).renderAsync()).saveAsync({
            compress: 0.8,
            format: SaveFormat.JPEG,
          })
        : await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    await new File(saved.uri).move(target);
  } catch {
    if (!target.exists) await new File(sourceUri).copy(target);
  }
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
