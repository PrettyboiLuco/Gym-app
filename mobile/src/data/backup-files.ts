// Sicherungsdatei teilen bzw. einlesen (iPhone: Teilen-Menü → z. B. „In Dateien sichern“).

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { photoFile } from './photo-files';

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
