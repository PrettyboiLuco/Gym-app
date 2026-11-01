import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Button } from '@/components/card';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spring } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Eingabefeld mit Beschriftung darüber; beim Tippen bekommt der Rahmen die Schriftfarbe (Fokus sichtbar). */
export function Field({ label, style, onFocus, onBlur, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: focused ? theme.text : theme.border, backgroundColor: theme.background }]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}

/** Ein antippbarer Chip, der beim Drücken leicht einfedert. */
function Chip({
  selected,
  label,
  role,
  onPress,
  small = false,
  check = false,
  accessibilityLabel,
}: {
  selected: boolean;
  label: string;
  role: 'radio' | 'checkbox' | 'button';
  onPress: () => void;
  small?: boolean;
  check?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole={role}
        accessibilityState={role === 'checkbox' ? { checked: selected } : { selected }}
        accessibilityLabel={accessibilityLabel ?? label}
        onPressIn={() => scale.set(withSpring(0.94, Spring))}
        onPressOut={() => scale.set(withSpring(1, Spring))}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={[small ? styles.smallChip : styles.chip, { backgroundColor: selected ? theme.primary : theme.backgroundSelected }]}>
        {check && selected ? <Icon name="check" color={theme.onPrimary} size={14} strokeWidth={2.4} /> : null}
        <ThemedText type="small" style={{ color: selected ? theme.onPrimary : theme.text, fontWeight: selected ? 600 : 500 }}>
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Auswahl aus wenigen Möglichkeiten. Bis zu vier kurze Möglichkeiten: Segment-Schalter mit gleitendem
 * Auswahlfeld (wie iOS). Mehr oder längere: Chips in Reihen.
 */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  format,
  chips = false,
}: {
  label: string;
  options: readonly T[];
  /** null = noch nichts gewählt. */
  value: T | null;
  onChange: (value: T) => void;
  format: (value: T) => string;
  /** Immer als Chips (z. B. wenn der Platz für einen Segment-Schalter zu knapp ist). */
  chips?: boolean;
}) {
  const segmented = !chips && options.length >= 2 && options.length <= 4 && options.every((o) => format(o).length <= 14);
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {segmented ? (
        <Segmented label={label} options={options} value={value} onChange={onChange} format={format} />
      ) : (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
          {options.map((option) => (
            <Chip key={option} role="radio" selected={option === value} label={format(option)} onPress={() => onChange(option)} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Segment-Schalter: eine Spur, darauf gleitet das gewählte Feld mit der App-Feder zur neuen Wahl. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  format: (value: T) => string;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = value === null ? -1 : options.indexOf(value);
  const segment = width > 0 ? (width - 8) / options.length : 0;
  const x = useSharedValue(Math.max(index, 0) * segment);

  useEffect(() => {
    if (index < 0 || segment === 0) return;
    x.set(reduced ? index * segment : withSpring(index * segment, Spring));
  }, [index, segment, reduced, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      {index >= 0 && segment > 0 ? <Animated.View style={[styles.thumb, { width: segment, backgroundColor: theme.primary }, thumb]} /> : null}
      {options.map((option, i) => {
        const selected = i === index;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={format(option)}
            onPress={() => {
              if (!selected) haptic.tap();
              onChange(option);
            }}
            style={styles.segment}>
            <ThemedText type="small" numberOfLines={1} style={{ color: selected ? theme.onPrimary : theme.text, fontWeight: selected ? 600 : 500 }}>
              {format(option)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Mehrfachauswahl als Chips mit Haken, z. B. vorhandene Geräte. */
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
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <Chip
              key={option}
              role="checkbox"
              check
              selected={selected}
              label={format(option)}
              onPress={() => onChange(selected ? value.filter((v) => v !== option) : [...value, option])}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Auswahl mit längeren Beschriftungen untereinander, z. B. Aktivitätsstufen – mit echtem Optionskreis. */
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
            onPress={() => {
              if (!selected) haptic.tap();
              onChange(option);
            }}
            style={({ pressed }) => [
              styles.radio,
              { borderColor: selected ? theme.text : theme.border, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
            ]}>
            <View style={[styles.radioOuter, { borderColor: selected ? theme.text : theme.border }]}>
              {selected ? <View style={[styles.radioInner, { backgroundColor: theme.text }]} /> : null}
            </View>
            <View style={styles.rowText}>
              <ThemedText style={{ fontWeight: selected ? 600 : 500 }}>{format(option)}</ThemedText>
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
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <Chip
          key={String(option)}
          role="button"
          small
          selected={option === value}
          label={format(option)}
          accessibilityLabel={`${label} ${format(option)}`}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}

/**
 * Löschen mit Rückfrage: erster Tipp fragt nach (spürbare Warnung), zweiter Tipp löscht.
 * Ohne Antwort klappt die Rückfrage nach 6 Sekunden wieder zu.
 */
export function ConfirmButton({
  label,
  confirmLabel = t('common.confirmDelete'),
  onConfirm,
  size = 'regular',
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  size?: 'regular' | 'compact';
}) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const id = setTimeout(() => setAsking(false), 6000);
    return () => clearTimeout(id);
  }, [asking]);
  if (!asking)
    return (
      <Button
        label={label}
        variant="danger"
        size={size}
        onPress={() => {
          haptic.warning();
          setAsking(true);
        }}
      />
    );
  return (
    <View style={styles.confirm}>
      <View style={styles.flex}>
        <Button label={t('common.cancel')} variant="secondary" size={size} onPress={() => setAsking(false)} />
      </View>
      <View style={styles.flex}>
        <Button
          label={confirmLabel}
          variant="destructive"
          size={size}
          onPress={() => {
            setAsking(false);
            onConfirm();
          }}
        />
      </View>
    </View>
  );
}

/**
 * Zeile in einer Liste, als Ganzes antippbar.
 * - icon: ruhiges graues Symbol links (hilft beim Finden) · value: Wert rechts (z. B. „Wie iPhone“)
 * - accessory „›“ wird als gezeichneter Pfeil dargestellt, andere Zeichen als Text
 * Beim Drücken hellt die Zeile auf (statt durchsichtig zu werden).
 */
export function ListRow({
  title,
  subtitle,
  onPress,
  accessory,
  icon,
  value,
  last = false,
  trailing,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  accessory?: string;
  icon?: IconName;
  value?: string;
  /** Letzte Zeile einer Gruppe: ohne Trennlinie. */
  last?: boolean;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join(', ')}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.rowOuter, pressed && { backgroundColor: theme.backgroundSelected }]}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Icon name={icon} color={theme.textSecondary} size={20} />
        </View>
      ) : null}
      <View style={[styles.row, { borderColor: last ? 'transparent' : theme.backgroundSelected }]}>
        <View style={styles.rowText}>
          <ThemedText>{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {value ? (
          <ThemedText themeColor="textSecondary" numberOfLines={1} style={styles.value}>
            {value}
          </ThemedText>
        ) : null}
        {trailing}
        {accessory === '›' ? (
          <Icon name="chevron" color={theme.textSecondary} size={18} strokeWidth={2} />
        ) : accessory ? (
          <ThemedText style={{ color: theme.textSecondary }}>{accessory}</ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one + 2 },
  input: {
    minHeight: 48,
    minWidth: 0,
    borderWidth: 1.5,
    borderRadius: Radius.field,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three + Spacing.one,
    borderRadius: Radius.pill,
  },
  smallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    minHeight: 34,
  },
  track: { flexDirection: 'row', borderRadius: Radius.pill, padding: 4, minHeight: 44 },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: Radius.pill },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two, minHeight: 36 },
  confirm: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  rowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: -Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.field,
  },
  rowIcon: { width: 24, alignItems: 'center' },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    minHeight: 48,
  },
  rowText: { flex: 1, gap: Spacing.half },
  value: { maxWidth: '45%' },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderRadius: Radius.field,
    padding: Spacing.three,
    minHeight: 48,
  },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
});
