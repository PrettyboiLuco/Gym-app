import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { mediaFor } from '@/domain/media';
import { EXERCISE_MEDIA } from '@/media/exercise-media';
import { t } from '@/i18n';

/** Bild zur Übung aus dem Verzeichnis (Phase 9.1); ohne Eintrag nichts (dann gilt die Textanleitung). */
export function ExerciseMedia({ exerciseId, label }: { exerciseId: string; label: string }) {
  const entry = mediaFor(EXERCISE_MEDIA, exerciseId);
  if (!entry) return null;
  return (
    <View style={styles.box}>
      <Image source={entry.source} style={styles.image} contentFit="contain" accessibilityLabel={label} />
      <ThemedText type="small" themeColor="textSecondary">
        {t('media.caption', { author: entry.author, license: entry.license })}
        {entry.movementReviewed ? '' : ` · ${t('media.notReviewed')}`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.one },
  image: { width: '100%', aspectRatio: 1, maxHeight: 280 },
});
