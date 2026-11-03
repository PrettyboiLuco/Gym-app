import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Field } from '@/components/fields';
import { ScanFrame } from '@/components/scan-frame';
import { Screen } from '@/components/screen';
import type { Rect } from '@/components/set-table-logic';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { findFoodByBarcode, saveFood } from '@/data/nutrition';
import { fetchProduct, type OffError } from '@/data/off';
import { isValidBarcode, productCodeFromScan, type FoodDraft } from '@/domain/nutrition';
import { foodTitle } from '@/format/food-title';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { extraLine, formatKcal, macroLine, readTarget, targetParams, type TargetParams } from '@/services/nutrition-format';

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
  // Taschenlampe für dunkle Küchen und Regale (Empfehlung der Open-Food-Facts-Scan-Anleitung).
  const [torch, setTorch] = useState(false);
  // Die Kamera meldet denselben Code viele Male pro Sekunde: nur der erste zählt.
  const busy = useRef(false);
  // „Übernehmen“ und „Korrigieren“ sperren sich gegenseitig, sonst wird das Lebensmittel doppelt angelegt.
  const saving = useRef(false);
  const [savingShown, setSavingShown] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // N9: Code erkannt – Kamerabild bleibt kurz stehen, die Ecken ziehen sich auf den Code und werden zum Haken.
  const [lock, setLock] = useState<{ bounds: Rect | null } | null>(null);
  const unlock = useCallback(() => setLock(null), []);

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

  function onScanned(data: string, typed = false, bounds: Rect | null = null) {
    if (busy.current) return;
    // QR-Codes ohne Produktnummer (z. B. Werbung auf der Packung) still übergehen und weiter scannen.
    const code = typed ? data : productCodeFromScan(data);
    if (!code) return;
    busy.current = true;
    if (!typed) setLock({ bounds });
    // Kurze Vibration bestätigt, dass der Code erkannt wurde.
    if (!typed) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    safeLookUp(code, typed);
  }

  // Fehler beim Nachschlagen (z. B. Datenbank) als Fehlerzustand zeigen, statt den Scanner hängen zu lassen (Phase 1 Scan).
  function safeLookUp(code: string, typed: boolean) {
    return lookUp(code, typed).catch(() => setPhase({ kind: 'error', code, error: 'unavailable' }));
  }

  function submitManual() {
    if (!manual) return;
    busy.current = false;
    onScanned(manual, true);
  }

  function scanAgain() {
    busy.current = false;
    setLock(null);
    setSaveFailed(false);
    setPhase({ kind: 'scan' });
  }

  async function accept(draft: FoodDraft, correct: boolean) {
    if (saving.current) return;
    saving.current = true;
    setSavingShown(true);
    setSaveFailed(false);
    // Ohne Namen darf nichts gespeichert werden; vorläufig Marke bzw. Barcode, dann korrigieren.
    const named = draft.name ? draft : { ...draft, name: draft.brand ?? draft.barcode ?? '?' };
    let id: string;
    try {
      id = await saveFood(db, null, named, 'off');
    } catch {
      saving.current = false;
      setSavingShown(false);
      setSaveFailed(true);
      return;
    }
    // Gespeichert: Sperre bleibt, der Bildschirm wird ersetzt.
    if (correct || !draft.name) {
      router.replace({ pathname: '/nutrition/food-edit/[id]', params: { id, ...passOn } });
    } else openFood(id);
  }

  const showCamera = Platform.OS !== 'web' && (phase.kind === 'scan' || lock !== null) && permission?.granted;

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
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={(result) => onScanned(result.data, false, boundsOf(result))}
          />
          <ScanFrame lock={lock} onDone={unlock} />
          <ThemedText type="small" style={styles.cameraHint}>
            {t('nutrition.scan.hint')}
          </ThemedText>
        </View>
      ) : null}
      {showCamera && !lock ? (
        <Button
          label={torch ? t('nutrition.scan.torchOff') : t('nutrition.scan.torchOn')}
          variant="secondary"
          accessibilityState={{ checked: torch }}
          onPress={() => setTorch((on) => !on)}
        />
      ) : null}

      {/* N8: Produkt wird gesucht – die Fundkarte steht schon grau da (Titel, kcal groß, Makros) und atmet ruhig. */}
      {phase.kind === 'loading' ? <SkeletonCard lines={['30%', '70%', '45%', '85%']} big={2} label={t('nutrition.scan.loading')} /> : null}

      {phase.kind === 'found' ? (
        <Card title={t('nutrition.scan.found')}>
          <ThemedText type="smallBold">{foodTitle(phase.draft) || phase.draft.barcode}</ThemedText>
          <ThemedText>
            {formatKcal(phase.draft.per100.kcal)} / 100 {phase.draft.basis}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {macroLine(phase.draft.per100)}
          </ThemedText>
          {extraLine(phase.draft.per100) ? (
            <ThemedText type="small" themeColor="textSecondary">
              {extraLine(phase.draft.per100)}
            </ThemedText>
          ) : null}
          {(['kcal', 'protein', 'carbs', 'fat'] as const).some((k) => phase.draft.per100[k] === null) ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {t('nutrition.food.unknownHint')}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {t('nutrition.food.source.off')}
          </ThemedText>
          {!phase.draft.name ? <ThemedText style={{ color: theme.danger }}>{t('nutrition.scan.noName')}</ThemedText> : null}
          <View style={styles.row}>
            {phase.draft.name ? <Button label={t('nutrition.scan.accept')} disabled={savingShown} onPress={() => accept(phase.draft, false)} /> : null}
            <Button
              label={t('nutrition.scan.correct')}
              variant={phase.draft.name ? 'danger' : 'primary'}
              disabled={savingShown}
              onPress={() => accept(phase.draft, true)}
            />
            <Button label={t('nutrition.scan.again')} variant="secondary" disabled={savingShown} onPress={scanAgain} />
          </View>
          {saveFailed ? <ThemedText style={{ color: theme.danger }}>{t('common.saveFailed')}</ThemedText> : null}
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
                onPress={() => router.replace({ pathname: '/nutrition/food-edit/[id]', params: { id: 'neu', barcode: phase.code, ...passOn } })}
              />
            ) : null}
            {phase.error === 'offline' || phase.error === 'unavailable' || phase.error === 'rateLimited' ? (
              <Button label={t('nutrition.scan.retry')} variant="secondary" onPress={() => safeLookUp(phase.code, false)} />
            ) : null}
            <Button label={t('nutrition.scan.again')} variant="secondary" onPress={scanAgain} />
          </View>
        </Card>
      ) : null}

      <Card>
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

/** Lage des Codes im Kamerabild, wenn die Kamera sie meldet (nicht jedes Gerät und jeder Code-Typ tut das). */
function boundsOf(result: BarcodeScanningResult): Rect | null {
  const b = result.bounds;
  return b?.origin && b.size ? { x: b.origin.x, y: b.origin.y, width: b.size.width, height: b.size.height } : null;
}

const styles = StyleSheet.create({
  cameraBox: { height: 320, borderRadius: Spacing.three, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  cameraHint: { position: 'absolute', bottom: Spacing.two, color: '#fff' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
