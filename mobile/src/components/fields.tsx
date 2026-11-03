import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Button } from '@/components/card';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Press, Spring } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnce } from '@/hooks/use-once';
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
        style={[
          styles.input,
          props.multiline && styles.multiline,
          { color: theme.text, borderColor: focused ? theme.text : theme.border, backgroundColor: theme.background },
        ]}
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
  return (
    <PressableScale
      scaleTo={Press.button}
      accessibilityRole={role}
      accessibilityState={role === 'checkbox' ? { checked: selected } : { selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[small ? styles.smallChip : styles.chip, { backgroundColor: selected ? theme.primary : theme.backgroundSelected }]}>
      {check && selected ? <Icon name="check" color={theme.onPrimary} size={14} strokeWidth={2.4} /> : null}
      <ThemedText type="small" style={{ color: selected ? theme.onPrimary : theme.text, fontWeight: selected ? 600 : 500 }}>
        {label}
      </ThemedText>
    </PressableScale>
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
  hideLabel = false,
}: {
  label: string;
  options: readonly T[];
  /** null = noch nichts gewählt. */
  value: T | null;
  onChange: (value: T) => void;
  format: (value: T) => string;
  /** Immer als Chips (z. B. wenn der Platz für einen Segment-Schalter zu knapp ist). */
  chips?: boolean;
  /** Beschriftung nur für Bildschirmleser – wenn die Karte darüber schon dasselbe sagt. */
  hideLabel?: boolean;
}) {
  const segmented = !chips && options.length >= 2 && options.length <= 4 && options.every((o) => format(o).length <= Math.floor(32 / options.length));
  return (
    <View style={styles.field}>
      {hideLabel ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
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

/**
 * Ein/Aus als Schalter-Zeile: Titel links (darunter optional eine graue Erklärung), Schalter rechts. Die ganze
 * Zeile ist antippbar. An-Farbe: dunkel Lime (Signalgrün), hell fast Schwarz – nie ein Segment „An | Aus“.
 */
export function Toggle({
  label,
  hint,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const flip = () => {
    if (disabled) return;
    haptic.tap();
    onChange(!value);
  };
  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value, disabled }}
      onPress={flip}
      style={[styles.toggle, disabled && { opacity: 0.6 }]}>
      <View style={styles.rowText}>
        <ThemedText style={styles.toggleTitle}>{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={flip}
        disabled={disabled}
        accessible={false}
        trackColor={{ false: theme.backgroundSelected, true: dark ? theme.accent : theme.primary }}
        thumbColor={dark ? (value ? theme.onAccent : theme.textSecondary) : theme.backgroundElement}
        ios_backgroundColor={theme.backgroundSelected}
        {...({ activeThumbColor: dark ? theme.onAccent : theme.backgroundElement } as object)}
      />
    </PressableScale>
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
          <PressableScale
            key={option}
            wrapStyle={styles.flex}
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
          </PressableScale>
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

/** Auswahl mit längeren Beschriftungen untereinander, z. B. Aktivitätsstufen – Zeilen mit echtem Optionskreis, ohne Kästen. */
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
          <PressableScale
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
              { borderColor: theme.backgroundSelected, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
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
          </PressableScale>
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
 * - size regular: Knopf über die volle Breite (roter Rahmen – die Aktion steht für sich am Ende eines Bereichs)
 * - size compact: für Listenzeilen – ruhiges graues Papierkorb-Symbol, Rot erst in der Rückfrage
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
  const theme = useTheme();
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const id = setTimeout(() => setAsking(false), 6000);
    return () => clearTimeout(id);
  }, [asking]);
  const ask = () => {
    haptic.warning();
    setAsking(true);
  };
  if (!asking)
    return size === 'compact' ? (
      <PressableScale
        scaleTo={Press.button}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        onPress={ask}
        style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: theme.backgroundSelected }]}>
        <Icon name="trash" color={theme.textSecondary} size={20} />
      </PressableScale>
    ) : (
      <Button label={label} variant="danger" size={size} onPress={ask} />
    );
  if (size === 'compact')
    return (
      <View style={styles.confirmInline}>
        <Button label={t('common.cancel')} variant="quiet" size="compact" onPress={() => setAsking(false)} />
        <Button
          label={confirmLabel}
          variant="destructive"
          size="compact"
          onPress={() => {
            setAsking(false);
            onConfirm();
          }}
        />
      </View>
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
 * Eintrag in einem Verlauf: links Datum (darunter optional eine graue Zeile), rechts der Wert in
 * gleich breiten Ziffern, danach eine kleine Aktion (z. B. Löschen). Zeilen trennt eine feine Linie.
 */
export function EntryRow({
  title,
  subtitle,
  value,
  action,
  last = false,
}: {
  title: string;
  subtitle?: string;
  value: string;
  action?: ReactNode;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.entry, { borderColor: last ? 'transparent' : theme.backgroundSelected }]}>
      <View style={styles.rowText}>
        <ThemedText>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText style={styles.entryValue}>{value}</ThemedText>
      {action}
    </View>
  );
}

/**
 * Werkzeuge einer Zeile in einem Editor (Plan, Routine): nach oben, nach unten, entfernen – als ruhige
 * Symbol-Knöpfe rechts neben dem Namen statt drei großer Pillen (die den Namen in schmale Zeilen gequetscht haben).
 */
export function ItemTools({
  name,
  onUp,
  onDown,
  onRemove,
  reorder = true,
}: {
  name: string;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  /** false = nur Entfernen (keine Plätze für die Pfeile freihalten). */
  reorder?: boolean;
}) {
  const theme = useTheme();
  const tool = (label: string, onPress: (() => void) | undefined, icon: ReactNode) =>
    onPress ? (
      <PressableScale
        scaleTo={Press.button}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${name}`}
        hitSlop={2}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? theme.border : theme.backgroundSelected }]}>
        {icon}
      </PressableScale>
    ) : (
      <View style={styles.iconButton} />
    );
  return (
    <View style={styles.tools}>
      {reorder &&
        tool(
          t('common.moveUp'),
          onUp,
          <View style={styles.up}>
            <Icon name="chevron" color={theme.text} size={18} strokeWidth={2} />
          </View>
        )}
      {reorder &&
        tool(
          t('common.moveDown'),
          onDown,
          <View style={styles.down}>
            <Icon name="chevron" color={theme.text} size={18} strokeWidth={2} />
          </View>
        )}
      {tool(t('common.remove'), onRemove, <Icon name="trash" color={theme.textSecondary} size={18} />)}
    </View>
  );
}

/** Symbole statt Textzeichen (ⓘ, ✕, ★) am rechten Rand einer Listenzeile. */
const ACCESSORY_ICONS: Record<string, IconName> = { info: 'info', collapse: 'chevron', remove: 'close', favorite: 'star' };

/**
 * Zeile in einer Liste, als Ganzes antippbar.
 * - icon: ruhiges graues Symbol links (hilft beim Finden) · value: Wert rechts (z. B. „Wie iPhone“)
 * - accessory „›“ wird als gezeichneter Pfeil dargestellt; „info“, „collapse“, „remove“, „favorite“ als Symbol; anderes als Text
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
  const press = useOnce(onPress);
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join(', ')}
      onPress={press}
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
        ) : accessory && accessory in ACCESSORY_ICONS ? (
          <View style={accessory === 'collapse' ? styles.up : undefined}>
            <Icon name={ACCESSORY_ICONS[accessory]} color={theme.textSecondary} size={18} strokeWidth={2} />
          </View>
        ) : accessory ? (
          <ThemedText style={{ color: theme.textSecondary }}>{accessory}</ThemedText>
        ) : null}
      </View>
    </PressableScale>
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
  /** Mehrzeilig: Platz für einige Zeilen, Text beginnt oben (sonst schneidet das Feld die zweite Zeile ab). */
  multiline: { minHeight: 112, paddingTop: Spacing.three, paddingBottom: Spacing.three, textAlignVertical: 'top' },
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
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryValue: { fontWeight: 600, fontVariant: ['tabular-nums'], textAlign: 'right' },
  tools: { flexDirection: 'row', gap: Spacing.one + 2 },
  up: { transform: [{ rotate: '-90deg' }] },
  down: { transform: [{ rotate: '90deg' }] },
  confirmInline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 48 },
  toggleTitle: { fontWeight: 500 },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.field,
    minHeight: 48,
  },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
});
