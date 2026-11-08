// Sicherungsdatei teilen bzw. einlesen (iPhone: Teilen-Menü → z. B. „In Dateien sichern“).

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { parsePhotoLine } from '@/domain/backup';

import { photoFile } from './photo-files';

/** Bytes → Text (UTF-8). Für die erste Zeile; ältere Sicherungen können Umlaute direkt enthalten. */
function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let cp = b;
    if (b >= 0xf0) cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else if (b >= 0xe0) cp = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else if (b >= 0xc0) cp = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
    out += String.fromCodePoint(cp);
  }
  return out;
}

/** Nur ASCII (Fotozeilen): schnell in Stücken umwandeln. */
function decodeAscii(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
}

const CHUNK = 512 * 1024;
const NEWLINE = 10;

/**
 * Sicherung schreiben und teilen: erste Zeile = Daten (JSON), danach je Foto eine Zeile „Name<Tab>Base64“ – jedes Foto
 * wird einzeln gelesen und angehängt, nie alle zusammen im Speicher (Prüfung 08.11.: Absturzgefahr ab ~30 Fotos).
 */
export async function writeAndShareBackup(headJson: string, photoNames: string[], fileName: string, dialogTitle: string) {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(`${headJson}\n`);
  for (const name of photoNames) {
    const photo = photoFile(name);
    if (!photo.exists) continue;
    file.write(`${name}\t${await photo.base64()}\n`, { append: true });
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle });
}

/** Sicherung wählen: nur die erste Zeile (Daten) wird gelesen; die Fotos folgen beim Wiederherstellen Zeile für Zeile. */
export async function pickBackupFile(): Promise<{ head: string; uri: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const uri = result.assets[0].uri;
  const handle = new File(uri).open();
  try {
    const parts: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const chunk = await handle.readBytes(CHUNK);
      if (chunk.length === 0) break;
      const nl = chunk.indexOf(NEWLINE);
      parts.push(nl >= 0 ? chunk.subarray(0, nl) : chunk);
      total += nl >= 0 ? nl : chunk.length;
      if (nl >= 0) break;
    }
    const all = new Uint8Array(total);
    let at = 0;
    for (const p of parts) {
      all.set(p, at);
      at += p.length;
    }
    return { head: decodeUtf8(all), uri };
  } finally {
    handle.close();
  }
}

/** Fotozeilen nach der ersten Zeile lesen und einzeln speichern. Gibt die Zahl der gespeicherten Fotos zurück. */
export async function restoreBackupPhotos(uri: string): Promise<number> {
  const handle = new File(uri).open();
  let saved = 0;
  try {
    let rest = '';
    let pastHead = false;
    for (;;) {
      const chunk = await handle.readBytes(CHUNK);
      if (chunk.length === 0) break;
      rest += decodeAscii(chunk);
      let nl = rest.indexOf('\n');
      while (nl >= 0) {
        const line = rest.slice(0, nl);
        rest = rest.slice(nl + 1);
        if (pastHead) {
          const photo = parsePhotoLine(line);
          if (photo) {
            await writePhotoBase64(photo.name, photo.base64);
            saved++;
          }
        }
        pastHead = true;
        nl = rest.indexOf('\n');
      }
      // Erste Zeile (Daten) kann groß sein: nicht als Text sammeln, nur das Zeilenende abwarten.
      if (!pastHead) rest = '';
    }
    if (pastHead && rest) {
      const photo = parsePhotoLine(rest);
      if (photo) {
        await writePhotoBase64(photo.name, photo.base64);
        saved++;
      }
    }
  } finally {
    handle.close();
  }
  return saved;
}

export async function shareBackup(json: string, fileName: string, dialogTitle: string) {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle });
}

export async function pickBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  return new File(result.assets[0].uri).text();
}

export async function readPhotoBase64(fileName: string): Promise<string | null> {
  const file = photoFile(fileName);
  return file.exists ? file.base64() : null;
}

export async function writePhotoBase64(fileName: string, base64: string) {
  const file = photoFile(fileName);
  if (file.exists) file.delete();
  file.create({ intermediates: true });
  await file.write(base64, { encoding: 'base64' });
}

/** CSV- oder Textdatei wählen (Import aus anderen Apps, A5). null = abgebrochen. */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'public.comma-separated-values-text', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return new File(result.assets[0].uri).text();
}
