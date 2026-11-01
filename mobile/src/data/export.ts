// Teilen der CSV-Dateien (A5.1) – getrennt von den Bausteinen in export-csv.ts, damit diese ohne Gerät testbar sind.

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { t } from '@/i18n';

import type { Db } from './db';
import { buildCsv, type ExportArea } from './export-csv';

/** CSV als Datei über das Teilen-Menü (Dateien, Mail, AirDrop). */
export async function shareCsv(db: Db, area: ExportArea, today: string) {
  const text = await buildCsv(db, area);
  const name = `myhealth-${area}-${today}.csv`;
  if (Platform.OS === 'web') {
    // Browser (Vorschau): als Download
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: t('exportCsv.dialog') });
}
