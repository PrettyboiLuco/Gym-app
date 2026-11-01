import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Spacing } from '@/constants/theme';
import { t } from '@/i18n';

export type ShareCardContent = { eyebrow: string; value: string; unit?: string; title: string; lines: string[] };

/**
 * Teilen-Karte als Bild (Ausbauplan A10.7): feste, kontrastreiche Gestaltung (schwarz, Lime), unabhängig vom Hell-/
 * Dunkelmodus. Geteilt wird über das Teilen-Menü – ohne Konto, ohne Server. Klappt das Bild nicht (z. B. im
 * Browser), wird der Text geteilt.
 */
export function ShareCard({ content }: { content: ShareCardContent }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const text = [content.eyebrow, `${content.value}${content.unit ? ` ${content.unit}` : ''} – ${content.title}`, ...content.lines, 'Myhealth'].join('\n');

  async function share() {
    setBusy(true);
    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        // Typen von react-native-view-shot kennen den View-Ref von RN 0.8x noch nicht; zur Laufzeit passt er.
        const uri = await captureRef(ref as unknown as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('shareCard.dialog') });
      } else {
        await Share.share({ message: text });
      }
    } catch {
      await Share.share({ message: text }).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View ref={ref} collapsable={false} style={styles.card} accessible accessibilityLabel={text}>
        <ThemedText style={styles.eyebrow}>{content.eyebrow}</ThemedText>
        <View style={styles.valueRow}>
          <ThemedText style={styles.value}>{content.value}</ThemedText>
          {content.unit ? <ThemedText style={styles.unit}>{content.unit}</ThemedText> : null}
        </View>
        <ThemedText style={styles.title}>{content.title}</ThemedText>
        {content.lines.map((l) => (
          <ThemedText key={l} style={styles.line}>
            {l}
          </ThemedText>
        ))}
        <ThemedText style={styles.brand}>Myhealth</ThemedText>
      </View>
      <Button label={t('shareCard.share')} variant="secondary" loading={busy} onPress={share} />
    </View>
  );
}

const LIME = '#C6F24E';
const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  card: { backgroundColor: '#0B0B0B', borderRadius: 20, padding: Spacing.four, gap: Spacing.one, aspectRatio: 4 / 5, justifyContent: 'center' },
  eyebrow: { color: LIME, fontSize: 14, lineHeight: 18, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one },
  value: { color: '#FFFFFF', fontFamily: DisplayFont.bold, fontSize: 64, lineHeight: 72 },
  unit: { color: '#FFFFFF', fontSize: 22, lineHeight: 34, opacity: 0.8 },
  title: { color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '600' },
  line: { color: '#D8D8D8', fontSize: 15, lineHeight: 21 },
  brand: { color: LIME, fontSize: 14, lineHeight: 18, marginTop: Spacing.three, fontWeight: '700' },
});
