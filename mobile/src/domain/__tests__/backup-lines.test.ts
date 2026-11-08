// Prüfung 08.11.: Sicherung mit Fotos als Zeilen (erste Zeile Daten, danach je Foto eine Zeile).

import { describe, expect, test } from '@jest/globals';

import { asciiJson, backupDueDays, backupSummary, checkBackup, parsePhotoLine, type BackupManifest } from '../backup';

const manifest: BackupManifest = {
  app: 'gym-app',
  format: 1,
  schemaVersion: 28,
  exportedAt: '2026-11-08T10:00:00Z',
  tables: { weight_entry: [{ id: 'w', note: 'Größe ü 😀' }] },
  appState: {},
  photos: null,
  photoFiles: ['a.jpg', 'b.jpg'],
};

describe('Sicherung als Zeilen', () => {
  test('erste Zeile ist reines ASCII ohne Zeilenumbruch und liest sich zurück (auch Umlaute und Emoji)', () => {
    const head = asciiJson(manifest);
    expect(/^[\x20-\x7e]*$/.test(head)).toBe(true);
    const { manifest: back } = checkBackup(head, 28);
    expect(back?.tables.weight_entry[0]).toEqual({ id: 'w', note: 'Größe ü 😀' });
    expect(backupSummary(back!).photos).toBe(2);
  });
  test('Fotozeile: nur sichere Dateinamen und Base64', () => {
    expect(parsePhotoLine('a.jpg\tQUJD+/==')).toEqual({ name: 'a.jpg', base64: 'QUJD+/==' });
    expect(parsePhotoLine('../x.jpg\tQUJD')).toBeNull();
    expect(parsePhotoLine('a.jpg\t<script>')).toBeNull();
    expect(parsePhotoLine('kein Tab')).toBeNull();
  });
});

describe('Erinnerung an die Sicherung', () => {
  test('ab 30 Tagen seit letzter Sicherung bzw. erstem Eintrag, ohne Daten nie', () => {
    expect(backupDueDays(null, null, '2026-11-08')).toBeNull();
    expect(backupDueDays(null, '2026-10-20', '2026-11-08')).toBeNull();
    expect(backupDueDays(null, '2026-10-01', '2026-11-08')).toBe(38);
    expect(backupDueDays('2026-11-01', '2026-01-01', '2026-11-08')).toBeNull();
    expect(backupDueDays('2026-10-09', '2026-01-01', '2026-11-08')).toBe(30);
  });
});
