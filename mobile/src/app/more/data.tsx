import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, ConfirmButton, Toggle } from '@/components/fields';
import { InsightInfo } from '@/components/insight-info';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { currentSchemaVersion, deleteAllData, exportBackup, restoreBackup , saveLastBackup } from '@/data/backup';
import { pickBackupFile, restoreBackupPhotos, writeAndShareBackup, writePhotoBase64 } from '@/data/backup-files';
import { shareCsv } from '@/data/export';
import { EXPORT_AREAS, type ExportArea } from '@/data/export-csv';
import { notificationPermission } from '@/data/notifications';
import { photoExists, PHOTOS_SUPPORTED, removeAllPhotoFiles } from '@/data/photo-files';
import { deletePhoto, listPhotos } from '@/data/photos';
import { loadReminders } from '@/data/reminders';
import { asciiJson, backupFileName, backupSummary, checkBackup, type BackupManifest } from '@/domain/backup';
import { todayDay } from '@/domain/time';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';
import { useProfile } from '@/providers/profile-provider';
import { useDb } from '@/providers/store-provider';
import { applyReminders, cancelAllAlerts } from '@/services/alerts';

/**
 * Deine Daten (Register TECH-013/014, LAW-006): Sicherung als Datei, Wiederherstellen, alles löschen.
 * Die App hat keinen Server; die Sicherung liegt nur dort, wo du sie speicherst.
 */
export default function DataScreen() {
  const db = useDb();
  const theme = useTheme();
  const { reload } = useProfile();
  const [withPhotos, setWithPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, setPending] = useState<BackupManifest | null>(null);
  // Datei der gewählten Sicherung: Fotos werden erst beim Wiederherstellen Zeile für Zeile daraus gelesen.
  const [pendingUri, setPendingUri] = useState('');
  const [area, setArea] = useState<ExportArea>('training');

  async function exportCsv() {
    setBusy(true);
    setMessage(null);
    try {
      await shareCsv(db, area, todayDay());
    } catch {
      setMessage({ text: t('exportCsv.failed'), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function exportNow() {
    setBusy(true);
    setMessage(null);
    try {
      // Fotos nicht mehr im JSON, sondern einzeln als Zeilen hinter den Daten (Speicher: immer nur ein Foto).
      const photoNames = withPhotos && PHOTOS_SUPPORTED ? (await listPhotos(db)).map((p) => p.fileName) : [];
      const manifest = { ...(await exportBackup(db, null)), photoFiles: photoNames };
      await writeAndShareBackup(asciiJson(manifest), photoNames, backupFileName(todayDay()), t('dataScreen.exportTitle'));
      await saveLastBackup(db, todayDay());
      setMessage({ text: t('dataScreen.exported') });
    } catch {
      setMessage({ text: t('dataScreen.exportFailed'), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function chooseFile() {
    setMessage(null);
    setPending(null);
    let picked: { head: string; uri: string } | null;
    try {
      picked = await pickBackupFile();
    } catch {
      setMessage({ text: t('dataScreen.problems.notJson'), error: true });
      return;
    }
    if (picked === null) return;
    const { manifest, problem } = checkBackup(picked.head, await currentSchemaVersion(db));
    if (!manifest) {
      setMessage({ text: t(`dataScreen.problems.${problem}`), error: true });
      return;
    }
    setPending(manifest);
    setPendingUri(picked.uri);
  }

  async function restoreNow() {
    if (!pending) return;
    setBusy(true);
    try {
      await cancelAllAlerts();
      await restoreBackup(db, pending);
      if (pending.photos && PHOTOS_SUPPORTED) {
        // Nur einfache Dateinamen wie „<id>.jpg“: eine manipulierte Sicherung darf nicht außerhalb des Foto-Ordners schreiben.
        for (const [name, b64] of Object.entries(pending.photos)) if (/^[A-Za-z0-9_-]+\.jpe?g$/.test(name)) await writePhotoBase64(name, b64);
      }
      // Neues Format: Fotos stehen als einzelne Zeilen hinter den Daten.
      if (pending.photoFiles?.length && PHOTOS_SUPPORTED && pendingUri) await restoreBackupPhotos(pendingUri);
      // Foto-Einträge ohne Datei (z. B. Sicherung ohne Fotos auf einem neuen Handy) nicht als leere Bilder behalten.
      for (const photo of await listPhotos(db)) {
        if (!photoExists(photo.fileName)) await deletePhoto(db, photo.id);
      }
      // Erinnerungen aus der Sicherung wieder einplanen, falls Mitteilungen erlaubt sind.
      if ((await notificationPermission(false)) === 'granted') await applyReminders(db, await loadReminders(db));
      setPending(null);
      await reload();
      setMessage({ text: t('dataScreen.restored') });
    } catch {
      setMessage({ text: t('dataScreen.restoreFailed'), error: true });
      // Die Daten sind unverändert – also auch die Erinnerungen wieder einplanen (vorher blieben alle gelöscht, Phase 1 Scan).
      if ((await notificationPermission(false)) === 'granted') await applyReminders(db, await loadReminders(db)).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function deleteEverything() {
    setBusy(true);
    try {
      await cancelAllAlerts();
      await deleteAllData(db);
      removeAllPhotoFiles();
      // Danach startet die App mit dem Erststart wie nach der Installation.
      await reload();
    } catch {
      setMessage({ text: t('dataScreen.deleteFailed'), error: true });
    } finally {
      setBusy(false);
    }
  }

  const summary = pending ? backupSummary(pending) : null;

  return (
    <Screen withHeader>
      <Card title={t('dataScreen.exportTitle')}>
        <ThemedText type="small">{t('dataScreen.exportText')}</ThemedText>
        {PHOTOS_SUPPORTED ? (
          <>
            <Toggle label={t('dataScreen.withPhotos')} hint={t('dataScreen.withPhotosHint')} value={withPhotos} onChange={(on) => setWithPhotos(on)} />
          </>
        ) : null}
        <Button label={t('dataScreen.export')} disabled={busy} onPress={exportNow} />
      </Card>

      <Card title={t('exportCsv.title')}>
        <ThemedText type="small">{t('exportCsv.text')}</ThemedText>
        <Choice label={t('exportCsv.area')} options={EXPORT_AREAS} value={area} onChange={setArea} format={(a) => t(`exportCsv.areas.${a}`)} chips />
        <Button label={t('exportCsv.share')} variant="secondary" disabled={busy} onPress={exportCsv} />
        <InsightInfo text={t('common.healthDataHint')} />
      </Card>

      <Card title={t('importCsv.cardTitle')}>
        <ThemedText type="small">{t('importCsv.cardText')}</ThemedText>
        <Button label={t('importCsv.open')} variant="secondary" onPress={() => router.push('/more/import')} />
      </Card>

      <Card title={t('report.cardTitle')}>
        <ThemedText type="small">{t('report.cardText')}</ThemedText>
        <Button label={t('report.open')} variant="secondary" onPress={() => router.push('/more/report')} />
        <InsightInfo text={t('dataScreen.trainerText')} />
      </Card>

      <Card title={t('dataScreen.restoreTitle')}>
        <ThemedText type="small">{t('dataScreen.restoreText')}</ThemedText>
        <Button label={t('dataScreen.choose')} variant="secondary" disabled={busy} onPress={chooseFile} />
        {summary ? (
          <>
            <ThemedText>
              {t('dataScreen.summary', {
                date: formatDay(summary.exportedAt.slice(0, 10)),
                workouts: summary.workouts,
                entries: summary.entries,
                weights: summary.weights,
                photos: summary.photos,
              })}
            </ThemedText>
            <ConfirmButton label={t('dataScreen.restore')} confirmLabel={t('dataScreen.restoreConfirm')} onConfirm={restoreNow} />
          </>
        ) : null}
      </Card>

      {message ? <ThemedText style={message.error ? { color: theme.danger } : undefined}>{message.text}</ThemedText> : null}

      <Card title={t('dataScreen.deleteTitle')}>
        <ThemedText type="small">{t('dataScreen.deleteText')}</ThemedText>
        <ConfirmButton label={t('dataScreen.delete')} confirmLabel={t('dataScreen.deleteConfirm')} onConfirm={deleteEverything} />
      </Card>

      <Card title={t('dataScreen.encryptionTitle')}>
        <InsightInfo label={t('insights.info.privacy')} text={t('dataScreen.encryption')} />
      </Card>
    </Screen>
  );
}
