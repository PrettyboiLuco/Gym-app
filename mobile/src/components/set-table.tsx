// Satztabelle im Training (O3): Spaltenkopf, Zeilen mit Lime-Füllung beim Erledigen (N4), Ein-/Ausblenden (N3) und Löschen per Wischen.
import { useEffect, useRef, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { HIDDEN } from '@/components/a11y';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MapFade, SetRowMotion, Spring } from '@/constants/motion';
import { SetDoneTint, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Spaltenbreiten – Kopf und Zeilen teilen sie, damit alles bündig steht. „Vorher“ nimmt den Rest. */
export const SetCols = { set: 36, weight: 72, reps: 60, timedReps: 72, hold: 48, check: 44, trash: 36 } as const;

const WEB = Platform.OS === 'web';
const fillEase = Easing.bezier(...MapFade.easing);

/** Spaltenkopf: Satz · Vorher · kg · Wdh · ✓ (für Bildschirmleser ausgeblendet – jedes Feld trägt seinen eigenen Namen). */
export function SetTableHead({ unit, timed, hold, trash }: { unit: string; timed: boolean; hold: boolean; trash: boolean }) {
  const theme = useTheme();
  const head = (text: string, width: number | undefined, align: 'left' | 'center' = 'center') => (
    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={[styles.head, width ? { width } : styles.flex, { textAlign: align }]}>
      {text}
    </ThemedText>
  );
  return (
    <View style={styles.headRow} {...HIDDEN}>
      {head(t('session.colSet'), SetCols.set, 'left')}
      {head(t('session.colPrevious'), undefined, 'left')}
      {timed ? null : head(unit, SetCols.weight)}
      {head(timed ? t('session.colSeconds') : t('session.colReps'), timed ? SetCols.timedReps : SetCols.reps)}
      {hold ? <View style={{ width: SetCols.hold }} /> : null}
      <View style={[styles.headCheck, { width: SetCols.check }]}>
        <Icon name="check" color={theme.textSecondary} size={16} strokeWidth={2.2} />
      </View>
      {trash ? <View style={{ width: SetCols.trash }} /> : null}
    </View>
  );
}

/**
 * Hülle einer Satzzeile.
 * - Erledigt: Grund füllt sich einmal von links in dezentem Lime (beim Öffnen steht er sofort, ohne Auftritt).
 * - Neu/gelöscht: blendet weich ein bzw. aus; die übrigen Zeilen rücken nach (nur Handy, siehe cardLayout im Training).
 * - Löschen: nach links wischen (Gummiband), dahinter „Löschen“; im Web ein kleiner Papierkorb am Zeilenende.
 *   Für VoiceOver bleibt Löschen eine Aktion an der Satznummer und am Haken (accessibilityActions, im Bildschirm gesetzt).
 * Bei „Bewegung reduzieren“ steht alles sofort.
 */
export function SetRowShell({
  ref,
  done,
  deletable,
  onDelete,
  deleteLabel,
  children,
}: {
  ref?: Ref<ComponentRef<typeof View>>;
  done: boolean;
  deletable: boolean;
  onDelete: () => void;
  deleteLabel: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const reduced = useReducedMotion();
  const fill = useSharedValue(done ? 1 : 0);
  const wasDone = useRef(done);
  const swipe = useRef<SwipeableMethods>(null);

  useEffect(() => {
    if (wasDone.current === done) return;
    wasDone.current = done;
    if (reduced) fill.set(done ? 1 : 0);
    else if (done) {
      fill.set(0);
      fill.set(withTiming(1, { duration: SetRowMotion.fillMs, easing: fillEase }));
    } else fill.set(withTiming(0, { duration: SetRowMotion.unfillMs }));
  }, [done, reduced, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%`, opacity: fill.value > 0 ? 1 : 0 }));
  const tint = dark ? SetDoneTint.dark : SetDoneTint.light;

  const row = (
    <View ref={ref} style={styles.row}>
      <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: tint }, fillStyle]} />
      {children}
      {WEB && deletable ? (
        <Pressable accessibilityRole="button" accessibilityLabel={deleteLabel} onPress={onDelete} hitSlop={4} style={styles.trash}>
          <Icon name="trash" color={theme.textSecondary} size={18} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      style={styles.outer}
      entering={reduced ? undefined : FadeIn.duration(SetRowMotion.enterMs)}
      exiting={reduced ? undefined : FadeOut.duration(SetRowMotion.exitMs)}
      layout={reduced || WEB ? undefined : LinearTransition.springify().stiffness(Spring.stiffness).damping(Spring.damping)}>
      {WEB || !deletable ? (
        row
      ) : (
        <ReanimatedSwipeable
          ref={swipe}
          friction={SetRowMotion.swipeFriction}
          overshootFriction={SetRowMotion.overshootFriction}
          rightThreshold={SetRowMotion.actionWidth / 2}
          overshootRight
          onSwipeableWillOpen={() => haptic.tap()}
          renderRightActions={(_progress, translation) => (
            <DeleteAction
              translation={translation}
              label={deleteLabel}
              onPress={() => {
                swipe.current?.close();
                onDelete();
              }}
            />
          )}>
          {row}
        </ReanimatedSwipeable>
      )}
    </Animated.View>
  );
}

/** Rote Aktion hinter der Zeile; das Symbol wächst mit dem Wischweg (rot erst hier, nicht als Muster in jeder Zeile). */
function DeleteAction({ translation, label, onPress }: { translation: SharedValue<number>; label: string; onPress: () => void }) {
  const theme = useTheme();
  const iconStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, -translation.value / SetRowMotion.actionWidth));
    return { opacity: p, transform: [{ scale: 0.6 + 0.4 * p }] };
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.warning();
        onPress();
      }}
      style={[styles.action, { backgroundColor: theme.danger }]}>
      <Animated.View style={[styles.actionInner, iconStyle]}>
        <Icon name="trash" color={theme.onDanger} size={20} strokeWidth={2} />
        <ThemedText type="small" style={{ color: theme.onDanger }}>
          {t('common.delete')}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two, marginHorizontal: -Spacing.two },
  head: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  headCheck: { alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  /** Zeile ragt links und rechts etwas in den Kartenrand, damit die Tönung nicht am Text klebt. */
  outer: { marginHorizontal: -Spacing.two },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 12 },
  trash: { width: SetCols.trash, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  action: { width: SetRowMotion.actionWidth, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.two },
  actionInner: { alignItems: 'center', gap: Spacing.half },
});
