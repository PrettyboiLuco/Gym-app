import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { Choice, Field, MultiChoice } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  BAR_OPTIONS_KG,
  BAR_OPTIONS_LB,
  DEFAULT_PLATES_KG,
  DEFAULT_PLATES_LB,
  platesPerSide,
  RIR_OPTIONS,
  SET_TYPES,
  type PlateSetup,
  type SetType,
} from '@/domain/logger';
import { parseDecimal, type WeightUnit } from '@/domain/units';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

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
      <Choice
        chips
        label={t('logger.setType')}
        options={SET_TYPES}
        value={setType}
        onChange={(v) => onChange({ setType: v })}
        format={(v) => t(`logger.types.${v}`)}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {t(`logger.typeHint.${setType}`)}
      </ThemedText>
      <RirChoice label={targetRir ? t('logger.rirWithTarget', { target: targetRir }) : t('logger.rir')} value={rir} onChange={(v) => onChange({ rir: v })} />
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

const OWN = 'eigene';

/** Scheibenrechner (A1.10): Stange 20/15/10 kg oder eigene, vorhandene Scheiben inkl. eigener, Scheiben je Seite. */
function PlateLine({ weightText, unit, setup, onSetup }: { weightText: string; unit: WeightUnit; setup: PlateSetup; onSetup: (s: PlateSetup) => void }) {
  const shownWeight = parseDecimal(weightText);
  const result = shownWeight === null ? null : platesPerSide(shownWeight, setup);
  const bars = (unit === 'lb' ? BAR_OPTIONS_LB : BAR_OPTIONS_KG).map(String);
  const [ownBar, setOwnBar] = useState(!bars.includes(String(setup.barKg)));
  const [barText, setBarText] = useState(bars.includes(String(setup.barKg)) ? '' : formatNumber(setup.barKg, 2));
  const [plateText, setPlateText] = useState('');
  const defaults = unit === 'lb' ? DEFAULT_PLATES_LB : DEFAULT_PLATES_KG;
  const plateOptions = [...new Set([...defaults, ...setup.platesKg])].sort((a, b) => b - a).map(String);
  const newPlate = parseDecimal(plateText);
  const plateValid = newPlate !== null && newPlate >= 0.25 && newPlate <= 50;
  return (
    <View style={styles.plates}>
      <Choice
        label={t('logger.bar', { unit })}
        options={[...bars, OWN]}
        value={ownBar ? OWN : String(setup.barKg)}
        onChange={(v) => {
          setOwnBar(v === OWN);
          if (v !== OWN) onSetup({ ...setup, barKg: Number(v) });
        }}
        format={(v) => (v === OWN ? t('logger.barOwn') : `${formatNumber(Number(v), 2)} ${unit}`)}
      />
      {ownBar ? (
        <Field
          label={t('logger.barOwnLabel', { unit })}
          value={barText}
          keyboardType="decimal-pad"
          onChangeText={(v) => {
            setBarText(v);
            const kg = parseDecimal(v);
            if (kg !== null && kg >= 0 && kg <= 50) onSetup({ ...setup, barKg: kg });
          }}
        />
      ) : null}
      <ThemedText>
        {result === null
          ? t('logger.platesNone', { bar: formatNumber(setup.barKg, 2), unit })
          : result.plates.length === 0
            ? t('logger.platesBarOnly')
            : t('logger.plates', { list: result.plates.map((p) => formatNumber(p, 2)).join(' · '), unit })}
      </ThemedText>
      <MultiChoice
        label={t('logger.platesAvailable', { unit })}
        options={plateOptions}
        value={setup.platesKg.map(String)}
        onChange={(v) => onSetup({ ...setup, platesKg: v.map(Number) })}
        format={(v) => formatNumber(Number(v), 2)}
      />
      <View style={styles.plateAdd}>
        <Field label={t('logger.plateOwn', { unit })} value={plateText} onChangeText={setPlateText} keyboardType="decimal-pad" style={styles.flex} />
        <Button
          label={t('logger.plateAdd')}
          variant="secondary"
          size="compact"
          disabled={!plateValid}
          onPress={() => {
            if (!plateValid || newPlate === null) return;
            onSetup({ ...setup, platesKg: [...new Set([...setup.platesKg, newPlate])].sort((a, b) => b - a) });
            setPlateText('');
          }}
        />
      </View>
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
  plateAdd: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex: { flex: 1 },
});
