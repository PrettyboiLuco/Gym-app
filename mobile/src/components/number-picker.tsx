// Zahlen einstellen ohne Tastatur (Wunsch Luc: „sehr smooth, von links nach rechts, nur dunkel“):
// - NumberInput: sieht aus wie ein Eingabefeld, öffnet beim Tippen das Fenster
// - Fenster: immer dunkel, oben groß der Wert, darunter ein waagrechtes Lineal zum Wischen (rastet je Schritt ein,
//   spürbarer Tick bei jedem neuen Wert), darunter ein Ziffernblock zum direkten Eintippen und ✓ zum Übernehmen.
// Werte gehen als Text hinein und heraus (wie bisher bei TextInput), damit Prüfung und Speichern unverändert bleiben.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, DisplayFont, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

/** Fenster ist immer dunkel – unabhängig von der Darstellung der App. */
const D = Colors.dark;
/** Breite eines Schritts im Lineal. */
const STEP_W = 14;

export type NumberSpec = {
  min: number;
  max: number;
  step: number;
  /** Nachkommastellen beim Anzeigen und Übernehmen (0 = ganze Zahlen; dann kein Komma im Ziffernblock). */
  decimals?: number;
  /** Jeder wievielte Schritt bekommt einen langen Strich mit Zahl. */
  major?: number;
  unit?: string;
  /** Wo das Lineal steht, wenn es noch keinen Wert und keinen Vorschlag gibt (z. B. 20 kg statt 0). */
  start?: number;
};

/** Gewicht je Einheit: kg in 0,5er-Schritten (Eintippen bis 2 Nachkommastellen, z. B. 1,25), lb in ganzen. */
export const weightSpec = (unit: 'kg' | 'lb'): NumberSpec =>
  unit === 'kg' ? { min: 0, max: 400, step: 0.5, decimals: 2, major: 10, unit: 'kg', start: 20 } : { min: 0, max: 900, step: 1, decimals: 1, major: 10, unit: 'lb', start: 45 };
export const repsSpec = (): NumberSpec => ({ min: 0, max: 100, step: 1, major: 5, unit: t('number.reps'), start: 10 });
export const SECONDS_SPEC: NumberSpec = { min: 0, max: 600, step: 5, major: 6, unit: 's', start: 30 };

const parse = (text: string) => {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Zahl als Text in deutscher Schreibweise (Komma), ohne überflüssige Nullen. */
function toText(n: number, decimals: number) {
  const fixed = n.toFixed(decimals);
  return (decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed).replace('.', ',');
}

/**
 * Feld, das beim Tippen das Zahlenfenster öffnet. `label` (optional) steht darüber wie bei `Field`.
 * `placeholder` zeigt einen Vorschlag (z. B. den Wert vom letzten Mal); das Fenster startet dann dort.
 */
export function NumberInput({
  value,
  onChange,
  spec,
  placeholder,
  label,
  title,
  accessibilityLabel,
  style,
  textStyle,
  emptyLabel,
}: {
  /** Grau im leeren Feld statt „–“ (wirkte wie ein Minus-Knopf), z. B. „kg“. */
  emptyLabel?: string;
  value: string;
  onChange: (text: string) => void;
  spec: NumberSpec;
  placeholder?: string;
  label?: string;
  /** Überschrift im Fenster (Standard: label). */
  title?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const shown = value.trim() !== '' ? value : (placeholder ?? '');
  const box = (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ text: value || placeholder || '' }}
      onPress={() => {
        haptic.tap();
        setOpen(true);
      }}
      style={({ pressed }) => [
        styles.box,
        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.75 : 1 },
        label ? styles.boxField : null,
        style,
      ]}>
      <ThemedText numeric numberOfLines={1} style={[styles.boxText, { color: value.trim() !== '' ? theme.text : theme.textSecondary }, textStyle]}>
        {shown || emptyLabel || t('session.empty')}
      </ThemedText>
    </Pressable>
  );
  return (
    <>
      {label ? (
        <View style={[styles.field, style]}>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
          {box}
        </View>
      ) : (
        box
      )}
      {open ? (
        <NumberPickerSheet
          title={title ?? label ?? accessibilityLabel ?? ''}
          initial={parse(value) ?? parse(placeholder ?? '') ?? null}
          spec={spec}
          onCancel={() => setOpen(false)}
          onDone={(n) => {
            setOpen(false);
            onChange(n === null ? '' : toText(n, spec.decimals ?? 0));
          }}
        />
      ) : null}
    </>
  );
}

/** Das dunkle Fenster: Wert, Lineal, Ziffernblock. */
export function NumberPickerSheet({
  title,
  initial,
  spec,
  onCancel,
  onDone,
}: {
  title: string;
  initial: number | null;
  spec: NumberSpec;
  onCancel: () => void;
  onDone: (value: number | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const decimals = spec.decimals ?? 0;
  const count = Math.round((spec.max - spec.min) / spec.step) + 1;
  const clampIndex = (i: number) => Math.min(Math.max(i, 0), count - 1);
  const indexOf = (n: number) => clampIndex(Math.round((n - spec.min) / spec.step));
  const valueAt = (i: number) => Number((spec.min + i * spec.step).toFixed(6));
  const start = indexOf(initial ?? spec.start ?? spec.min);

  const [value, setValue] = useState<number | null>(initial === null ? null : valueAt(start));
  // Getippter Text: der erste Tastendruck ersetzt den Wert, weitere hängen an.
  const [typed, setTyped] = useState<string | null>(null);
  const list = useRef<FlatList<number>>(null);
  const lastIndex = useRef(start);
  // Fährt das Lineal gerade selbst (nach dem Eintippen)? Dann die Scroll-Meldungen nicht als Wischen werten.
  const programmatic = useRef(false);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const major = spec.major ?? (spec.step < 1 ? Math.round(1 / spec.step) : spec.step >= 5 ? 6 : 5);
  const pad = (width - STEP_W) / 2;

  // Getippte Zahl: Lineal fährt weich mit.
  useEffect(() => {
    if (typed === null) return;
    const n = parse(typed);
    if (n === null) return;
    const i = indexOf(n);
    lastIndex.current = i;
    programmatic.current = true;
    list.current?.scrollToOffset({ offset: i * STEP_W, animated: true });
    const done = setTimeout(() => (programmatic.current = false), 450);
    return () => clearTimeout(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmatic.current) return;
    const i = clampIndex(Math.round(e.nativeEvent.contentOffset.x / STEP_W));
    if (i !== lastIndex.current) {
      lastIndex.current = i;
      haptic.tick();
      setTyped(null);
      setValue(valueAt(i));
    }
  };

  const press = (key: string) => {
    haptic.tap();
    setTyped((prev) => {
      let next = prev ?? '';
      if (key === 'del') next = next.slice(0, -1);
      else if (key === ',') next = next.includes(',') ? next : `${next || '0'},`;
      else {
        const [, frac] = next.split(',');
        if (frac !== undefined && frac.length >= decimals) return prev;
        next = next === '0' ? key : next + key;
      }
      const n = parse(next);
      setValue(n === null ? null : Math.min(n, spec.max));
      return next;
    });
  };

  const display = typed ?? (value === null ? '' : toText(value, decimals));
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimals > 0 ? ',' : '', '0', 'del'];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable accessibilityRole="button" style={styles.backdrop} onPress={onCancel} accessibilityLabel={t('common.cancel')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={styles.head}>
          <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={10}>
            <ThemedText style={{ color: D.textSecondary }}>{t('common.cancel')}</ThemedText>
          </Pressable>
          <ThemedText type="smallBold" style={{ color: D.text }} numberOfLines={1}>
            {title}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
            onPress={() => {
              haptic.press();
              onDone(value === null ? null : Math.min(Math.max(value, spec.min), spec.max));
            }}
            style={({ pressed }) => [styles.done, { backgroundColor: D.accent, opacity: pressed ? 0.8 : 1 }]}>
            <Icon name="check" color={D.onAccent} size={22} strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.valueRow} accessibilityLiveRegion="polite">
          <ThemedText style={[styles.value, { color: display ? D.text : D.textSecondary }]} numberOfLines={1}>
            {display || t('session.empty')}
          </ThemedText>
          {spec.unit ? <ThemedText style={[styles.unit, { color: D.textSecondary }]}>{spec.unit}</ThemedText> : null}
        </View>

        {/* Lineal: wischen von links nach rechts, rastet je Schritt ein; die Mitte ist der Wert. */}
        <View style={styles.ruler}>
          <FlatList
            ref={list}
            data={items}
            horizontal
            keyExtractor={(i) => String(i)}
            showsHorizontalScrollIndicator={false}
            snapToInterval={STEP_W}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: pad }}
            getItemLayout={(_, i) => ({ length: STEP_W, offset: STEP_W * i, index: i })}
            initialScrollIndex={start}
            initialNumToRender={Math.ceil(width / STEP_W) + 10}
            windowSize={9}
            removeClippedSubviews={false}
            onScrollBeginDrag={() => (programmatic.current = false)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item: i }) => {
              const isMajor = i % major === 0;
              return (
                <View style={styles.tickCell}>
                  <View style={[styles.tick, { height: isMajor ? 30 : 16, backgroundColor: isMajor ? D.text : D.border }]} />
                  {isMajor ? (
                    <ThemedText style={[styles.tickLabel, { color: D.textSecondary }]}>
                      {formatNumber(valueAt(i), decimals > 0 && spec.step * major < 1 ? 1 : 0)}
                    </ThemedText>
                  ) : null}
                </View>
              );
            }}
          />
          <View pointerEvents="none" style={[styles.needle, { left: width / 2 - 1.5, backgroundColor: D.accent }]} />
        </View>

        <View style={styles.pad}>
          {keys.map((k, i) =>
            k === '' ? (
              <View key={i} style={styles.key} />
            ) : (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={k === 'del' ? t('common.delete') : k}
                onPress={() => press(k)}
                style={({ pressed }) => [styles.key, { backgroundColor: k === 'del' ? 'transparent' : pressed ? D.border : D.backgroundSelected }]}>
                {k === 'del' ? (
                  <ThemedText style={[styles.keyText, { color: D.textSecondary }]}>⌫</ThemedText>
                ) : (
                  <ThemedText style={[styles.keyText, { color: D.text }]}>{k}</ThemedText>
                )}
              </Pressable>
            )
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  box: { minHeight: 44, borderRadius: Radius.field - 4, justifyContent: 'center', paddingHorizontal: Spacing.two },
  boxField: { minHeight: 52, borderRadius: Radius.field, paddingHorizontal: Spacing.three },
  boxText: { fontSize: 17, fontWeight: 600, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: D.backgroundElement, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: Spacing.three, gap: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, gap: Spacing.two },
  done: { width: 56, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: Spacing.two },
  value: { fontFamily: DisplayFont.bold, fontSize: 56, lineHeight: 64, letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 20, fontWeight: 600 },
  ruler: { height: 64, justifyContent: 'center' },
  tickCell: { width: STEP_W, alignItems: 'center', height: 64, justifyContent: 'flex-start', paddingTop: 4, overflow: 'visible', zIndex: 1 },
  tick: { width: 2, borderRadius: 1 },
  tickLabel: { position: 'absolute', top: 38, left: (STEP_W - 48) / 2, width: 48, textAlign: 'center', fontSize: 12, lineHeight: 16 },
  needle: { position: 'absolute', top: 0, width: 3, height: 40, borderRadius: 2 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.three, gap: Spacing.two, justifyContent: 'space-between' },
  key: { width: '31.5%', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: DisplayFont.semiBold, fontSize: 26, lineHeight: 32 },
});
