import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, ConfirmButton } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { currentSchemaVersion, deleteAllData, exportBackup, restoreBackup } from '@/data/backup';
import { pickBackup, readPhotoBase64, shareBackup, writePhotoBase64 } from '@/data/backup-files';
import { applyReminders } from '@/components/alerts';
import { cancelEverything, notificationPermission } from '@/data/notifications';
import { loadReminders } from '@/data/reminders';
import { photoExists, PHOTOS_SUPPORTED, removeAllPhotoFiles } from '@/data/photo-files';
import { deletePhoto, listPhotos } from '@/data/photos';
import { useProfile } from '@/data/profile-provider';
import { useDb } from '@/data/store-provider';
import { backupFileName, backupSummary, checkBackup, type BackupManifest } from '@/domain/backup';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';

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

  async function exportNow() {
    setBusy(true);
    setMessage(null);
    try {
      let photos: Record<string, string> | null = null;
      if (withPhotos) {
        photos = {};
        for (const p of await listPhotos(db)) {
          const b64 = await readPhotoBase64(p.fileName);
          if (b64) photos[p.fileName] = b64;
        }
      }
      const manifest = await exportBackup(db, photos);
      await shareBackup(JSON.stringify(manifest), backupFileName(todayDay()), t('dataScreen.exportTitle'));
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
    const raw = await pickBackup();
    if (raw === null) return;
    const { manifest, problem } = checkBackup(raw, await currentSchemaVersion(db));
    if (!manifest) {
      setMessage({ text: t(`dataScreen.problems.${problem}`), error: true });
      return;
    }
    setPending(manifest);
  }

  async function restoreNow() {
    if (!pending) return;
    setBusy(true);
    try {
      await cancelEverything();
      await restoreBackup(db, pending);
      if (pending.photos && PHOTOS_SUPPORTED) {
        for (const [name, b64] of Object.entries(pending.photos)) await writePhotoBase64(name, b64);
      }
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
    } finally {
      setBusy(false);
    }
  }

  async function deleteEverything() {
    setBusy(true);
    try {
      await cancelEverything();
      await deleteAllData(db);
      removeAllPhotoFiles();
      // Danach startet die App mit dem Erststart wie nach der Installation.
      await reload();
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
            <Choice
              label={t('dataScreen.withPhotos')}
              options={['aus', 'an'] as const}
              value={withPhotos ? 'an' : 'aus'}
              onChange={(v) => setWithPhotos(v === 'an')}
              format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {t('dataScreen.withPhotosHint')}
            </ThemedText>
          </>
        ) : null}
        <Button label={t('dataScreen.export')} disabled={busy} onPress={exportNow} />
      </Card>

      <Card title={t('dataScreen.restoreTitle')}>
        <ThemedText type="small">{t('dataScreen.restoreText')}</ThemedText>
        <Button label={t('dataScreen.choose')} variant="danger" disabled={busy} onPress={chooseFile} />
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
        <ThemedText type="small" themeColor="textSecondary">
          {t('dataScreen.encryption')}
        </ThemedText>
      </Card>
    </Screen>
  );
}
