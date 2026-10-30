// Browser: Sicherung als Download, Einlesen über die Dateiauswahl. Fotos gibt es im Browser nicht.

import * as DocumentPicker from 'expo-document-picker';

export async function shareBackup(json: string, fileName: string, _dialogTitle: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function pickBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return asset.file ? asset.file.text() : (await fetch(asset.uri)).text();
}

export async function readPhotoBase64(_fileName: string): Promise<string | null> {
  return null;
}

export async function writePhotoBase64(_fileName: string, _base64: string) {}
