import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Button } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Eingabefeld mit Beschriftung darüber. In Zeilen mit `style={{ flex: 1 }}` nebeneinander anordnen. */
export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.field, style]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        {...props}
      />
    </View>
  );
}

/** Auswahl aus wenigen Möglichkeiten als Knopfreihe. */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  /** null = noch nichts gewählt. */
  value: T | null;
  onChange: (value: T) => void;
  format: (value: T) => string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={format(option)}
              onPress={() => onChange(option)}
              style={[
                styles.chip,
                { backgroundColor: selected ? theme.tint : theme.backgroundSelected },
              ]}>
              <ThemedText type="small" style={{ color: selected ? theme.onTint : theme.text }}>
                {format(option)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Mehrfachauswahl als Knopfreihe, z. B. vorhandene Geräte. */
export function MultiChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  format: (value: T) => string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={format(option)}
              onPress={() => onChange(selected ? value.filter((v) => v !== option) : [...value, option])}
              style={[styles.chip, { backgroundColor: selected ? theme.tint : theme.backgroundSelected }]}>
              <ThemedText type="small" style={{ color: selected ? theme.onTint : theme.text }}>
                {selected ? `✓ ${format(option)}` : format(option)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Auswahl mit längeren Beschriftungen untereinander, z. B. Aktivitätsstufen. */
export function RadioList<T extends string>({
  label,
  options,
  value,
  onChange,
  format,
  describe,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
  describe?: (value: T) => string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={format(option)}
            onPress={() => onChange(option)}
            style={[styles.radio, { borderColor: selected ? theme.tint : theme.backgroundSelected }]}>
            <ThemedText style={{ color: theme.tint }}>{selected ? '●' : '○'}</ThemedText>
            <View style={styles.rowText}>
              <ThemedText>{format(option)}</ThemedText>
              {describe ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {describe(option)}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Kleine Schnellwahl-Knöpfe, z. B. Pausenlängen. */
export function Presets<T extends string | number>({
  options,
  value,
  onChange,
  format,
  label,
}: {
  options: readonly T[];
  value?: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={String(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label} ${format(option)}`}
            onPress={() => onChange(option)}
            style={[styles.smallChip, { backgroundColor: selected ? theme.tint : theme.backgroundSelected }]}>
            <ThemedText type="small" style={{ color: selected ? theme.onTint : theme.text }}>
              {format(option)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Löschen mit Rückfrage: erster Tipp fragt nach, zweiter Tipp löscht (Schutz vor Datenverlust). */
export function ConfirmButton({
  label,
  confirmLabel = t('common.confirmDelete'),
  onConfirm,
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button label={label} variant="danger" onPress={() => setAsking(true)} />;
  return (
    <View style={styles.confirm}>
      <Button label={t('common.cancel')} variant="danger" onPress={() => setAsking(false)} />
      <Button
        label={confirmLabel}
        onPress={() => {
          setAsking(false);
          onConfirm();
        }}
      />
    </View>
  );
}

/** Zeile in einer Liste, die als Ganzes antippbar ist. */
export function ListRow({
  title,
  subtitle,
  onPress,
  accessory,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  accessory?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 }]}>
      <View style={styles.rowText}>
        <ThemedText>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {accessory ? <ThemedText style={{ color: theme.tint }}>{accessory}</ThemedText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  input: {
    minHeight: 44,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Spacing.four },
  smallChip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Spacing.three, minHeight: 32, justifyContent: 'center' },
  confirm: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    minHeight: 44,
  },
  rowText: { flex: 1, gap: Spacing.half },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    minHeight: 44,
  },
});
