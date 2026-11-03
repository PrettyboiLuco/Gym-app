import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { Choice, ConfirmButton } from '@/components/fields';
import { Screen } from '@/components/screen';
import { Slider } from '@/components/slider';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { newId } from '@/data/db';
import { PHOTOS_SUPPORTED, photoUri, removePhotoFile, storePhoto } from '@/data/photo-files';
import { addPhoto, deleteAllPhotos, deletePhoto, listPhotos } from '@/data/photos';
import { comparePair, PHOTO_POSES, type PhotoPose, type ProgressPhoto } from '@/domain/body';
import { todayDay } from '@/domain/time';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';
import { useProfile } from '@/providers/profile-provider';

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
  // Vergleich (A10.1): zwei beliebige Tage, nebeneinander oder überblendet, mit Hilfslinien
  const [pick, setPick] = useState<{ a: string | null; b: string | null }>({ a: null, b: null });
  const [mode, setMode] = useState<'nebeneinander' | 'ueberblenden'>('nebeneinander');
  const [blend, setBlend] = useState(0.5);
  const [guides, setGuides] = useState(true);
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
  const posePhotos = photos.filter((p) => p.pose === comparePose).sort((x, y) => x.day.localeCompare(y.day));
  const first = posePhotos.find((p) => p.id === pick.a) ?? pair?.first ?? null;
  const second = posePhotos.find((p) => p.id === pick.b) ?? pair?.latest ?? null;
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
            <Button label={t('photos.library')} variant="secondary" onPress={pickPhoto} />
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
            <Button label={visible ? t('photos.hide') : t('photos.show')} variant="secondary" onPress={() => setVisible((v) => !v)} />
          </Card>

          <Card title={t('photos.compareTitle')}>
            <Choice
              label={t('photos.pose')}
              options={PHOTO_POSES}
              value={comparePose}
              onChange={(p) => {
                setComparePose(p);
                setPick({ a: null, b: null });
              }}
              format={(p) => t(`photos.poses.${p}`)}
            />
            {pair && first && second ? (
              <>
                <Choice
                  label={t('photos.compareA')}
                  options={posePhotos.map((p) => p.id)}
                  value={first.id}
                  onChange={(a) => setPick((x) => ({ ...x, a }))}
                  format={(id) => formatDay(posePhotos.find((p) => p.id === id)!.day)}
                  chips
                />
                <Choice
                  label={t('photos.compareB')}
                  options={posePhotos.map((p) => p.id)}
                  value={second.id}
                  onChange={(b) => setPick((x) => ({ ...x, b }))}
                  format={(id) => formatDay(posePhotos.find((p) => p.id === id)!.day)}
                  chips
                />
                <Choice
                  label={t('photos.mode')}
                  options={['nebeneinander', 'ueberblenden'] as const}
                  value={mode}
                  onChange={setMode}
                  format={(m) => t(`photos.modes.${m}`)}
                />
                <Choice
                  label={t('photos.guides')}
                  options={['an', 'aus'] as const}
                  value={guides ? 'an' : 'aus'}
                  onChange={(v) => setGuides(v === 'an')}
                  format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
                />
                {mode === 'nebeneinander' ? (
                  <View style={styles.row}>
                    {[first, second].map((photo) => (
                      <View key={photo.id} style={styles.half}>
                        <View>
                          <PhotoView photo={photo} visible={visible} label={label(photo)} />
                          {guides ? <GuideLines /> : null}
                        </View>
                        <ThemedText type="small">{formatDay(photo.day)}</ThemedText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <>
                    <View>
                      <PhotoView photo={first} visible={visible} label={label(first)} />
                      <View style={[StyleSheet.absoluteFill, { opacity: blend }]}>
                        <PhotoView photo={second} visible={visible} label={label(second)} />
                      </View>
                      {guides ? <GuideLines /> : null}
                    </View>
                    <Slider value={blend} onChange={setBlend} label={t('photos.blend', { a: formatDay(first.day), b: formatDay(second.day) })} />
                    <View style={styles.blendLabels}>
                      <ThemedText type="small">{formatDay(first.day)}</ThemedText>
                      <ThemedText type="small">{formatDay(second.day)}</ThemedText>
                    </View>
                  </>
                )}
                <ThemedText type="small" themeColor="textSecondary">
                  {t('photos.guidesHint')}
                </ThemedText>
              </>
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
        {photos.length > 0 ? <ConfirmButton label={t('photos.deleteAll')} confirmLabel={t('photos.deleteAllConfirm')} onConfirm={removeAll} /> : null}
        <Button label={t('photos.disable')} variant="danger" onPress={() => updateProfile({ ...profile, photos: false })} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('photos.disableHint')}
        </ThemedText>
      </Card>
      {intro}
    </Screen>
  );
}

/** Hilfslinien für die gleiche Pose: Mitte senkrecht, Drittel waagerecht. */
function GuideLines() {
  const theme = useTheme();
  const line = [styles.guide, { backgroundColor: theme.accent }];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.guides]}>
      <View style={[line, { left: '50%', top: 0, bottom: 0, width: 1 }]} />
      <View style={[line, { top: '33.3%', left: 0, right: 0, height: 1 }]} />
      <View style={[line, { top: '66.6%', left: 0, right: 0, height: 1 }]} />
    </View>
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
  guides: { opacity: 0.7 },
  guide: { position: 'absolute' },
  blendLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  flex: { flex: 1 },
});
