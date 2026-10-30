import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { Choice, ConfirmButton } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { newId } from '@/data/db';
import { PHOTOS_SUPPORTED, photoUri, removePhotoFile, storePhoto } from '@/data/photo-files';
import { addPhoto, deleteAllPhotos, deletePhoto, listPhotos } from '@/data/photos';
import { useProfile } from '@/data/profile-provider';
import { comparePair, PHOTO_POSES, type PhotoPose, type ProgressPhoto } from '@/domain/body';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';

/**
 * Fortschrittsfotos (Register GOAL-008): freiwillig, standardmäßig aus, nur auf dem Gerät.
 * Beim Öffnen sind die Fotos verdeckt, damit z. B. im Gym niemand mitschaut.
 */
export default function PhotosScreen() {
  const theme = useTheme();
  const { profile, updateProfile } = useProfile();
  const { data: photos, reload, db } = useLoad(listPhotos, [] as ProgressPhoto[]);
  const [day, setDay] = useState(todayDay);
  const [pose, setPose] = useState<PhotoPose>('vorne');
  const [comparePose, setComparePose] = useState<PhotoPose>('vorne');
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function save(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets?.[0]) return;
    const id = newId();
    let fileName: string | null = null;
    try {
      fileName = await storePhoto(result.assets[0].uri, id);
      await addPhoto(db, day, pose, fileName);
      setMessage({ text: t('photos.saved') });
      setVisible(true);
      await reload();
    } catch {
      // Keine halben Einträge: Datei wieder entfernen, wenn die Datenbank nicht mitmacht.
      if (fileName) removePhotoFile(fileName);
      setMessage({ text: t('photos.failed'), error: true });
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage({ text: t('photos.cameraDenied'), error: true });
      return;
    }
    // Ohne Bearbeitung und ohne EXIF; die Aufnahme wird nicht in der Mediathek gespeichert.
    await save(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, exif: false }));
  }

  async function pickPhoto() {
    await save(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, exif: false }));
  }

  async function remove(id: string) {
    const fileName = await deletePhoto(db, id);
    if (fileName) removePhotoFile(fileName);
    await reload();
  }

  async function removeAll() {
    for (const fileName of await deleteAllPhotos(db)) removePhotoFile(fileName);
    setMessage({ text: t('photos.deletedAll') });
    await reload();
  }

  const intro = (
    <Card title={t('photos.introTitle')}>
      <ThemedText type="small">{t('photos.intro')}</ThemedText>
    </Card>
  );

  if (!profile.photos) {
    return (
      <Screen withHeader>
        {intro}
        <Button label={t('photos.enable')} onPress={() => updateProfile({ ...profile, photos: true })} />
      </Screen>
    );
  }

  const pair = comparePair(photos, comparePose);
  const label = (p: ProgressPhoto) => t('photos.photoLabel', { pose: t(`photos.poses.${p.pose}`), date: formatDay(p.day) });

  return (
    <Screen withHeader>
      {!PHOTOS_SUPPORTED ? (
        <Card>
          <ThemedText>{t('photos.webOnly')}</ThemedText>
        </Card>
      ) : (
        <Card title={t('photos.add')}>
          <DaySwitcher day={day} onChange={setDay} />
          <Choice label={t('photos.pose')} options={PHOTO_POSES} value={pose} onChange={setPose} format={(p) => t(`photos.poses.${p}`)} />
          <View style={styles.row}>
            <Button label={t('photos.camera')} onPress={takePhoto} />
            <Button label={t('photos.library')} variant="danger" onPress={pickPhoto} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t('photos.tip')}
          </ThemedText>
        </Card>
      )}
      {message ? <ThemedText style={message.error ? { color: theme.danger } : undefined}>{message.text}</ThemedText> : null}

      {photos.length > 0 ? (
        <>
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {visible ? '' : t('photos.hidden')}
            </ThemedText>
            <Button label={visible ? t('photos.hide') : t('photos.show')} variant="danger" onPress={() => setVisible((v) => !v)} />
          </Card>

          <Card title={t('photos.compareTitle')}>
            <Choice
              label={t('photos.pose')}
              options={PHOTO_POSES}
              value={comparePose}
              onChange={setComparePose}
              format={(p) => t(`photos.poses.${p}`)}
            />
            {pair ? (
              <View style={styles.row}>
                {[
                  { photo: pair.first, caption: t('photos.first', { date: formatDay(pair.first.day) }) },
                  { photo: pair.latest, caption: t('photos.latest', { date: formatDay(pair.latest.day) }) },
                ].map(({ photo, caption }) => (
                  <View key={photo.id} style={styles.half}>
                    <PhotoView photo={photo} visible={visible} label={label(photo)} />
                    <ThemedText type="small">{caption}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText themeColor="textSecondary">{t('photos.compareNone')}</ThemedText>
            )}
          </Card>
        </>
      ) : null}

      <Card title={t('photos.listTitle')}>
        {photos.length === 0 ? <ThemedText themeColor="textSecondary">{t('photos.empty')}</ThemedText> : null}
        {photos.map((p) => (
          <View key={p.id} style={styles.entry}>
            <View style={styles.thumb}>
              <PhotoView photo={p} visible={visible} label={label(p)} />
            </View>
            <ThemedText style={styles.flex}>{label(p)}</ThemedText>
            <ConfirmButton label={t('common.delete')} onConfirm={() => remove(p.id)} />
          </View>
        ))}
      </Card>

      <Card>
        {photos.length > 0 ? (
          <ConfirmButton label={t('photos.deleteAll')} confirmLabel={t('photos.deleteAllConfirm')} onConfirm={removeAll} />
        ) : null}
        <Button label={t('photos.disable')} variant="danger" onPress={() => updateProfile({ ...profile, photos: false })} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('photos.disableHint')}
        </ThemedText>
      </Card>
      {intro}
    </Screen>
  );
}

/** Ein Foto, solange verdeckt nur als graue Fläche. */
function PhotoView({ photo, visible, label }: { photo: ProgressPhoto; visible: boolean; label: string }) {
  const theme = useTheme();
  if (!visible) return <View accessibilityLabel={label} style={[styles.image, { backgroundColor: theme.backgroundSelected }]} />;
  return <Image source={{ uri: photoUri(photo.fileName) }} accessibilityLabel={label} style={styles.image} contentFit="cover" />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  half: { flex: 1, minWidth: 120, gap: Spacing.one },
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: Spacing.two },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  thumb: { width: 56 },
  flex: { flex: 1 },
});
