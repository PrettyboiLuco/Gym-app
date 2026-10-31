import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Field } from '@/components/fields';
import { foodTitle } from '@/components/food-title';
import { formatKcal, macroLine, readTarget, targetParams, type TargetParams } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { findFoodByBarcode, saveFood } from '@/data/nutrition';
import { fetchProduct, type OffError } from '@/data/off';
import { useDb } from '@/data/store-provider';
import { isValidBarcode, productCodeFromScan, type FoodDraft } from '@/domain/nutrition';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

type Phase =
  | { kind: 'scan' }
  | { kind: 'loading'; code: string }
  | { kind: 'found'; draft: FoodDraft }
  | { kind: 'error'; code: string; error: OffError | 'invalidCode' };

// Gängige Lebensmittel-Barcodes (FOOD-001) und die 2D-Codes, die ab 2027 auf Verpackungen kommen (GS1 „Sunrise 2027“).
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'datamatrix'] as const;

export default function ScanScreen() {
  const params = useLocalSearchParams<TargetParams>();
  const { day, target } = readTarget(params);
  const passOn = targetParams(day, target);
  const db = useDb();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ kind: 'scan' });
  const [manual, setManual] = useState('');
  // Die Kamera meldet denselben Code viele Male pro Sekunde: nur der erste zählt.
  const busy = useRef(false);

  function openFood(id: string) {
    router.replace({ pathname: '/nutrition/food/[id]', params: { id, ...passOn } });
  }

  // Gescannte Codes prüft die Kamera selbst (auch UPC-E mit eigener Prüfziffer-Regel);
  // eingetippte Codes prüfen wir, um Tippfehler abzufangen.
  async function lookUp(code: string, typed: boolean) {
    if (typed && !isValidBarcode(code)) {
      setPhase({ kind: 'error', code, error: 'invalidCode' });
      return;
    }
    // Schon einmal gespeichert? Dann ohne Netz direkt öffnen (wirkt auch als Zwischenspeicher, FOOD-003).
    const local = await findFoodByBarcode(db, code);
    if (local) {
      openFood(local.id);
      return;
    }
    setPhase({ kind: 'loading', code });
    const res = await fetchProduct(code);
    setPhase(res.ok ? { kind: 'found', draft: res.value } : { kind: 'error', code, error: res.error });
  }

  function onScanned(data: string, typed = false) {
    if (busy.current) return;
    // QR-Codes ohne Produktnummer (z. B. Werbung auf der Packung) still übergehen und weiter scannen.
    const code = typed ? data : productCodeFromScan(data);
    if (!code) return;
    busy.current = true;
    lookUp(code, typed);
  }

  function submitManual() {
    if (!manual) return;
    busy.current = false;
    onScanned(manual, true);
  }

  function scanAgain() {
    busy.current = false;
    setPhase({ kind: 'scan' });
  }

  async function accept(draft: FoodDraft, correct: boolean) {
    // Ohne Namen darf nichts gespeichert werden; vorläufig Marke bzw. Barcode, dann korrigieren.
    const named = draft.name ? draft : { ...draft, name: draft.brand ?? draft.barcode ?? '?' };
    const id = await saveFood(db, null, named, 'off');
    if (correct || !draft.name) {
      router.replace({ pathname: '/nutrition/food-edit/[id]', params: { id, ...passOn } });
    } else openFood(id);
  }

  const showCamera = Platform.OS !== 'web' && phase.kind === 'scan' && permission?.granted;

  return (
    <Screen withHeader>
      {Platform.OS === 'web' ? (
        <ThemedText themeColor="textSecondary">{t('nutrition.scan.webHint')}</ThemedText>
      ) : !permission ? null : !permission.granted ? (
        <Card>
          <ThemedText>{permission.canAskAgain ? t('nutrition.scan.permission') : t('nutrition.scan.denied')}</ThemedText>
          {permission.canAskAgain ? <Button label={t('nutrition.scan.allow')} onPress={requestPermission} /> : null}
        </Card>
      ) : null}

      {showCamera ? (
        <View style={styles.cameraBox}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={(result) => onScanned(result.data)}
          />
          <View style={[styles.frame, { borderColor: theme.tint }]} pointerEvents="none" />
          <ThemedText type="small" style={styles.cameraHint}>
            {t('nutrition.scan.hint')}
          </ThemedText>
        </View>
      ) : null}

      {phase.kind === 'loading' ? <ThemedText>{t('nutrition.scan.loading')}</ThemedText> : null}

      {phase.kind === 'found' ? (
        <Card title={t('nutrition.scan.found')}>
          <ThemedText type="smallBold">{foodTitle(phase.draft) || phase.draft.barcode}</ThemedText>
          <ThemedText>
            {formatKcal(phase.draft.per100.kcal)} / 100 {phase.draft.basis}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {macroLine(phase.draft.per100)}
          </ThemedText>
          {Object.values(phase.draft.per100).some((v) => v === null) ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {t('nutrition.food.unknownHint')}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {t('nutrition.food.source.off')}
          </ThemedText>
          {!phase.draft.name ? <ThemedText style={{ color: theme.danger }}>{t('nutrition.scan.noName')}</ThemedText> : null}
          <View style={styles.row}>
            {phase.draft.name ? <Button label={t('nutrition.scan.accept')} onPress={() => accept(phase.draft, false)} /> : null}
            <Button label={t('nutrition.scan.correct')} variant={phase.draft.name ? 'danger' : 'primary'} onPress={() => accept(phase.draft, true)} />
            <Button label={t('nutrition.scan.again')} variant="danger" onPress={scanAgain} />
          </View>
        </Card>
      ) : null}

      {phase.kind === 'error' ? (
        <Card>
          <ThemedText style={{ color: theme.danger }}>
            {phase.error === 'invalidCode' ? t('nutrition.scan.invalid') : t(`nutrition.errors.${phase.error}`)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {phase.code}
          </ThemedText>
          <View style={styles.row}>
            {phase.error !== 'invalidCode' ? (
              <Button
                label={t('nutrition.scan.createOwn')}
                onPress={() =>
                  router.replace({ pathname: '/nutrition/food-edit/[id]', params: { id: 'neu', barcode: phase.code, ...passOn } })
                }
              />
            ) : null}
            {phase.error === 'offline' || phase.error === 'unavailable' || phase.error === 'rateLimited' ? (
              <Button label={t('nutrition.scan.retry')} variant="danger" onPress={() => lookUp(phase.code, false)} />
            ) : null}
            <Button label={t('nutrition.scan.again')} variant="danger" onPress={scanAgain} />
          </View>
        </Card>
      ) : null}

      <Card title={t('nutrition.scan.manual')}>
        <Field
          label={t('nutrition.scan.manual')}
          value={manual}
          onChangeText={(v) => setManual(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          onSubmitEditing={submitManual}
        />
        <Button label={t('nutrition.scan.manualSearch')} onPress={submitManual} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraBox: { height: 320, borderRadius: Spacing.three, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  frame: { width: '80%', height: 120, borderWidth: 3, borderRadius: Spacing.two },
  cameraHint: { position: 'absolute', bottom: Spacing.two, color: '#fff' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
