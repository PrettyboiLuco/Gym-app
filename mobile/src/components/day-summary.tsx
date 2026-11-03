import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/card';
import { MeterBar, ProgressRing } from '@/components/charts';
import { EntryRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import { MICRO_KEYS, MICRO_UNITS, type Micros } from '@/domain/basis-foods';
import type { Macros } from '@/domain/coach';
import type { NutrientTotals } from '@/domain/nutrition';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

type MacroKey = 'protein' | 'carbs' | 'fat';
const MACROS: MacroKey[] = ['protein', 'carbs', 'fat'];
const KCAL_PER_G: Record<MacroKey, number> = { protein: 4, carbs: 4, fat: 9 };
const EXTRAS = ['fiber', 'sugar', 'satFat', 'salt'] as const;

/** „≥ “ vor einer Summe, wenn bei manchen Einträgen der Wert fehlt (nie als 0 gezählt, TRACK-002). */
const atLeast = (totals: NutrientTotals, key: keyof NutrientTotals['values']) => (totals.unknown[key] > 0 ? '≥ ' : '');
const grams = (v: number) => `${formatNumber(v, v < 10 ? 1 : 0)} g`;

/**
 * Tagesübersicht Ernährung: Ring mit gegessenen kcal (Lime = Daten, Rot nur über dem Ziel), daneben Übrig und Ziel.
 * Darunter Eiweiß, Kohlenhydrate und Fett als Kacheln mit Balken zum Makro-Ziel des Coachs (ohne Ziel: Anteil an
 * den kcal), dann Ballaststoffe, Zucker, gesättigte Fettsäuren und Salz als Raster. „Vitamine & Mineralstoffe“
 * öffnet ein eigenes Fenster (nur Summen, keine Bewertung).
 */
export function DaySummary({
  totals,
  goal,
  macroGoals,
  micros,
}: {
  totals: NutrientTotals;
  goal: number | null;
  macroGoals: Macros | null;
  micros: { values: Micros; known: number; total: number };
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const data = dark ? theme.accent : theme.tint;
  const [microsOpen, setMicrosOpen] = useState(false);
  const eaten = totals.values.kcal;
  const left = goal === null ? null : goal - eaten;
  const over = left !== null && left < 0;
  const unknownKcal = totals.unknown.kcal > 0;
  // Drei Datenreihen: Eiweiß in der Datenfarbe, Kohlenhydrate hell, Fett grau (taste: höchstens drei Reihen).
  const macroColor: Record<MacroKey, string> = { protein: data, carbs: dark ? '#E6E6E6' : '#3C3C3C', fat: dark ? '#6B6B6B' : '#A0A0A0' };
  const macroKcal = MACROS.reduce((s, k) => s + totals.values[k] * KCAL_PER_G[k], 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <ProgressRing growIn progress={goal ? eaten / goal : 0} size={128} stroke={11} color={over ? theme.danger : data} trackColor={theme.backgroundSelected}>
          <View
            style={styles.ringCenter}
            accessible
            accessibilityLabel={`${t('nutrition.summary.eaten')} ${unknownKcal ? '≥ ' : ''}${formatNumber(eaten, 0)} kcal${goal !== null ? `, ${t('nutrition.summary.goal')} ${formatNumber(goal, 0)} kcal` : ''}`}>
            <ThemedText style={styles.ringValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatNumber(eaten, 0)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {unknownKcal ? '≥ kcal' : 'kcal'}
            </ThemedText>
          </View>
        </ProgressRing>
        <View style={styles.side}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              {over ? t('nutrition.summary.over') : t('nutrition.summary.left')}
            </ThemedText>
            <ThemedText style={[styles.sideValue, over && { color: theme.danger }]}>
              {left === null ? '–' : `${unknownKcal && !over ? '≤ ' : ''}${formatNumber(Math.abs(left), 0)}`}
              <ThemedText themeColor="textSecondary" style={styles.sideUnit}>
                {left === null ? '' : ' kcal'}
              </ThemedText>
            </ThemedText>
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              {t('nutrition.summary.goal')}
            </ThemedText>
            <ThemedText style={styles.sideSmall}>{goal === null ? '–' : `${formatNumber(goal, 0)} kcal`}</ThemedText>
          </View>
          {goal ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('nutrition.summary.percent', { value: formatNumber(Math.round((eaten / goal) * 100), 0) })}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.macros}>
        {MACROS.map((k) => {
          const target = macroGoals ? macroGoals[k] : null;
          const share = macroKcal > 0 ? Math.round(((totals.values[k] * KCAL_PER_G[k]) / macroKcal) * 100) : 0;
          return (
            <View
              key={k}
              style={[styles.macro, { backgroundColor: theme.backgroundSelected }]}
              accessible
              accessibilityLabel={`${t(`nutrition.${k}`)} ${atLeast(totals, k)}${grams(totals.values[k])}${target ? `, ${t('nutrition.summary.ofGrams', { value: formatNumber(target, 0) })}` : ''}`}>
              <View style={styles.macroHead}>
                <View style={[styles.dot, { backgroundColor: macroColor[k] }]} />
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {t(`nutrition.macroShort.${k}`)}
                </ThemedText>
              </View>
              <ThemedText style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit>
                {atLeast(totals, k)}
                {formatNumber(totals.values[k], totals.values[k] < 10 ? 1 : 0)}
                <ThemedText type="small" themeColor="textSecondary">
                  {' g'}
                </ThemedText>
              </ThemedText>
              <MeterBar
                growIn
                progress={target ? totals.values[k] / target : share / 100}
                color={macroColor[k]}
                trackColor={theme.backgroundElement}
                height={6}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.macroSub} numberOfLines={1}>
                {target ? t('nutrition.summary.ofGrams', { value: formatNumber(target, 0) }) : t('nutrition.summary.share', { value: share })}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <View style={[styles.extras, { borderColor: theme.backgroundSelected }]}>
        {EXTRAS.map((k, i) => (
          <View
            key={k}
            style={[
              styles.extra,
              i % 2 === 1 && { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.backgroundSelected },
              i >= 2 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.backgroundSelected },
            ]}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={[styles.flex, styles.extraLabel]}>
              {t(`nutrition.${k}`)}
            </ThemedText>
            <ThemedText type="smallBold" style={styles.num}>
              {totals.values[k] > 0 || totals.unknown[k] === 0 ? `${atLeast(totals, k)}${grams(totals.values[k])}` : '–'}
            </ThemedText>
          </View>
        ))}
      </View>

      {micros.known > 0 ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${t('micros.title')}. ${t('micros.openHint', { known: micros.known, total: micros.total })}`}
          onPress={() => setMicrosOpen(true)}
          style={({ pressed }) => [
            styles.microRow,
            { backgroundColor: pressed ? theme.backgroundSelected : 'transparent', borderColor: theme.backgroundSelected },
          ]}>
          <View style={styles.flex}>
            <ThemedText style={styles.microTitle}>{t('micros.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('micros.openHint', { known: micros.known, total: micros.total })}
            </ThemedText>
          </View>
          <Icon name="chevron" color={theme.textSecondary} size={18} strokeWidth={2} />
        </PressableScale>
      ) : null}

      <MicrosSheet visible={microsOpen} onClose={() => setMicrosOpen(false)} micros={micros} />
    </View>
  );
}

/** Vitamine und Mineralstoffe des Tages als eigenes Fenster (von unten, wie ein iPhone-Blatt). */
function MicrosSheet({ visible, onClose, micros }: { visible: boolean; onClose: () => void; micros: { values: Micros; known: number; total: number } }) {
  const theme = useTheme();
  const keys = MICRO_KEYS.filter((k) => micros.values[k] != null && micros.values[k]! > 0);
  const missing = MICRO_KEYS.filter((k) => !keys.includes(k));
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.sheet, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.sheetHead}>
          <ThemedText type="subtitle" accessibilityRole="header" style={styles.flex}>
            {t('micros.title')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            hitSlop={8}
            style={[styles.close, { backgroundColor: theme.backgroundSelected }]}>
            <Icon name="close" color={theme.text} size={18} strokeWidth={2} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={[styles.sheetCard, { backgroundColor: theme.backgroundElement }]}>
            {keys.map((k, i) => (
              <EntryRow
                key={k}
                title={t(`micros.${k}`)}
                value={`${formatNumber(micros.values[k]!, micros.values[k]! < 10 ? 1 : 0)} ${MICRO_UNITS[k]}`}
                last={i === keys.length - 1}
              />
            ))}
          </View>
          {missing.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('micros.missing', { list: missing.map((k) => t(`micros.${k}`)).join(', ') })}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {t('micros.coverage', { known: micros.known, total: micros.total })}
          </ThemedText>
          <Button label={t('common.close')} variant="secondary" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  ringCenter: { alignItems: 'center', paddingHorizontal: Spacing.three },
  ringValue: { fontFamily: DisplayFont.bold, fontSize: 30, lineHeight: 36, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  side: { flex: 1, gap: Spacing.two },
  sideValue: { fontFamily: DisplayFont.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  sideUnit: { fontSize: 14, fontFamily: undefined, letterSpacing: 0 },
  sideSmall: { fontWeight: 600, fontVariant: ['tabular-nums'] },
  macros: { flexDirection: 'row', gap: Spacing.two },
  macro: { flex: 1, minWidth: 0, borderRadius: Radius.field + 4, paddingVertical: Spacing.three - 2, paddingHorizontal: Spacing.two + 2, gap: Spacing.one + 2 },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macroValue: { fontFamily: DisplayFont.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  macroSub: { fontSize: 12, lineHeight: 16 },
  extras: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.field + 4, overflow: 'hidden' },
  extra: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three - 2, paddingVertical: Spacing.two + 2 },
  extraLabel: { fontSize: 13, lineHeight: 17 },
  flex: { flex: 1, minWidth: 0 },
  num: { fontVariant: ['tabular-nums'] },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.field + 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
  },
  microTitle: { fontWeight: 600 },
  sheet: { flex: 1 },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: Spacing.four, gap: Spacing.three },
  sheetCard: { borderRadius: Radius.card, paddingHorizontal: Spacing.four, paddingVertical: Spacing.one },
});
