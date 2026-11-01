import { StyleSheet, View } from 'react-native';

import { Choice, Field, MultiChoice } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { BAR_OPTIONS_KG, BAR_OPTIONS_LB, DEFAULT_PLATES_KG, DEFAULT_PLATES_LB, platesPerSide, RIR_OPTIONS, SET_TYPES, type PlateSetup, type SetType } from '@/domain/logger';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';
import { parseDecimal, type WeightUnit } from '@/domain/units';

const rirKey = (rir: number | null) => (rir === null ? 'leer' : String(rir));

/** RIR-Auswahl (0 · 1 · 2 · 3 · 4+), optional mit „–“ für „keine Angabe“. */
export function RirChoice({
  value,
  onChange,
  label,
  allowEmpty = true,
}: {
  value: number | null;
  onChange: (rir: number | null) => void;
  label: string;
  allowEmpty?: boolean;
}) {
  const options = [...(allowEmpty ? ['leer'] : []), ...RIR_OPTIONS.map(String)] as string[];
  return (
    <Choice
      label={label}
      options={options}
      value={rirKey(value)}
      onChange={(v) => onChange(v === 'leer' ? null : Number(v))}
      format={(v) => (v === 'leer' ? '–' : v === '4' ? '4+' : v)}
    />
  );
}

/**
 * Details zu einem Satz (A1): Satzart, Wiederholungen in Reserve, Notiz und – bei der Langhantel – die Scheiben je
 * Seite für das eingetragene Gewicht. Öffnet sich über die Satznummer.
 */
export function SetDetails({
  setType,
  rir,
  note,
  targetRir,
  onChange,
  plates,
}: {
  setType: SetType;
  rir: number | null;
  note: string | null;
  targetRir: string | null;
  onChange: (change: { setType?: SetType; rir?: number | null; note?: string | null }) => void;
  plates: { weightText: string; unit: WeightUnit; setup: PlateSetup; onSetup: (setup: PlateSetup) => void } | null;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.panel, { borderColor: theme.hairline }]}>
      <Choice chips label={t('logger.setType')} options={SET_TYPES} value={setType} onChange={(v) => onChange({ setType: v })} format={(v) => t(`logger.types.${v}`)} />
      <ThemedText type="small" themeColor="textSecondary">
        {t(`logger.typeHint.${setType}`)}
      </ThemedText>
      <RirChoice
        label={targetRir ? t('logger.rirWithTarget', { target: targetRir }) : t('logger.rir')}
        value={rir}
        onChange={(v) => onChange({ rir: v })}
      />
      <Field
        label={t('logger.note')}
        defaultValue={note ?? ''}
        placeholder={t('logger.notePlaceholder')}
        onEndEditing={(e) => onChange({ note: e.nativeEvent.text })}
      />
      {plates ? <PlateLine {...plates} /> : null}
    </View>
  );
}

function PlateLine({ weightText, unit, setup, onSetup }: { weightText: string; unit: WeightUnit; setup: PlateSetup; onSetup: (s: PlateSetup) => void }) {
  const shownWeight = parseDecimal(weightText);
  const result = shownWeight === null ? null : platesPerSide(shownWeight, setup);
  const bars = (unit === 'lb' ? BAR_OPTIONS_LB : BAR_OPTIONS_KG).map(String);
  return (
    <View style={styles.plates}>
      <Choice
        label={t('logger.bar', { unit })}
        options={bars}
        value={String(setup.barKg)}
        onChange={(v) => onSetup({ ...setup, barKg: Number(v) })}
        format={(v) => `${formatNumber(Number(v), 2)} ${unit}`}
      />
      <ThemedText>
        {result === null
          ? t('logger.platesNone', { bar: formatNumber(setup.barKg, 2), unit })
          : result.plates.length === 0
            ? t('logger.platesBarOnly')
            : t('logger.plates', { list: result.plates.map((p) => formatNumber(p, 2)).join(' · '), unit })}
      </ThemedText>
      <MultiChoice
        label={t('logger.platesAvailable', { unit })}
        options={(unit === 'lb' ? DEFAULT_PLATES_LB : DEFAULT_PLATES_KG).map(String)}
        value={setup.platesKg.map(String)}
        onChange={(v) => onSetup({ ...setup, platesKg: v.map(Number) })}
        format={(v) => formatNumber(Number(v), 2)}
      />
      {result && result.rest > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('logger.platesRest', { rest: formatNumber(result.rest, 2), unit })}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: Spacing.three, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  plates: { gap: Spacing.one },
});
