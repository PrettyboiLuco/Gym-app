import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, EntryRow, Toggle } from '@/components/fields';
import { Icon } from '@/components/icon';
import { InsightInfo } from '@/components/insight-info';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { calorieFloorOn } from '@/data/goals';
import { daySums } from '@/data/nutrition';
import { loadDayTargets, saveTargetsSettings, weekBudgetFor, type DayTargets } from '@/data/targets-settings';
import { BUDGET_PRESETS, BUDGET_RULES_VERSION, CARRY_MAX_PER_DAY, DEFAULT_BUDGET, stepShare, type BudgetSettings, type WeekBudget } from '@/domain/budget';
import { weekDays, weekStart } from '@/domain/dates';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatDayShort, formatNumber, t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { diaryToday } from '@/services/nutrition-format';

async function load(db: Db, day: string) {
  const days = weekDays(weekStart(day));
  const [targets, floor, sums] = await Promise.all([loadDayTargets(db, day), calorieFloorOn(db, day), daySums(db, days[0], days[6])]);
  return { targets, floor, eaten: new Map(sums.map((s) => [s.day, s])) };
}

const kcal = (v: number) => formatNumber(v, 0);

/** Wochenbudget (B2, W1): Wochensumme, Verteilung je Wochentag, Übertrag. Ohne Zahlen bei sensibler Situation. */
export default function BudgetScreen() {
  const db = useDb();
  const theme = useTheme();
  const day = diaryToday();
  const days = weekDays(weekStart(day));
  const { data, loaded } = useLoad((d) => load(d, day), { targets: null as DayTargets | null, floor: 1200, eaten: new Map() }, day);
  const [draft, setDraft] = useState<BudgetSettings | null>(null);
  const [preview, setPreview] = useState<WeekBudget | null>(null);
  const saved = data.targets?.settings.budget ?? DEFAULT_BUDGET;
  const current = draft ?? saved;
  const allowLeave = useUnsavedGuard(draft !== null && JSON.stringify(draft) !== JSON.stringify(saved));

  // Vorschau der Woche mit den noch nicht gespeicherten Einstellungen.
  useEffect(() => {
    let cancelled = false;
    if (!data.targets || data.targets.hidden || data.targets.goalKcal === null) return;
    weekBudgetFor(db, day, current).then((b) => {
      if (!cancelled) setPreview(b);
    });
    return () => {
      cancelled = true;
    };
  }, [db, day, current, data.targets]);

  if (!loaded || !data.targets) return <Screen withHeader>{null}</Screen>;
  const { targets } = data;

  if (targets.hidden || targets.goalKcal === null) {
    return (
      <Screen withHeader>
        <Card>
          <ThemedText>{targets.hidden ? t('targets.budget.hidden') : t('targets.budget.noGoal')}</ThemedText>
        </Card>
      </Screen>
    );
  }

  const change = (next: Partial<BudgetSettings>) => setDraft({ ...current, ...next });

  async function save() {
    await saveTargetsSettings(db, { ...targets.settings, budget: current });
    allowLeave();
    router.back();
  }

  return (
    <Screen withHeader>
      <Card>
        <Toggle
          label={t('targets.budget.enabled')}
          hint={t('targets.budget.enabledHint')}
          value={current.enabled}
          onChange={(enabled) => change({ enabled })}
        />
      </Card>

      <Card>
        <Choice
          chips
          label={t('targets.budget.preset')}
          options={BUDGET_PRESETS}
          value={current.preset}
          onChange={(preset) => change({ preset })}
          format={(p) => t(`targets.budget.presets.${p}`)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t(`targets.budget.presetText.${current.preset}`)}
        </ThemedText>
        {current.preset === 'eigen'
          ? days.map((d, i) => {
              const name = t(`reminders.day.${i + 1}`);
              return (
                <View key={d} style={[styles.shareRow, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText style={styles.flex}>{name}</ThemedText>
                  <StepButton
                    icon="minus"
                    label={t('targets.budget.less', { day: name })}
                    onPress={() => change({ shares: stepShare(current.shares, i, -1) })}
                  />
                  <ThemedText style={styles.share}>{t('targets.budget.shareValue', { value: current.shares[i] })}</ThemedText>
                  <StepButton icon="plus" label={t('targets.budget.more', { day: name })} onPress={() => change({ shares: stepShare(current.shares, i, 1) })} />
                </View>
              );
            })
          : null}
      </Card>

      <Card>
        <Toggle
          label={t('targets.budget.carryover')}
          hint={t('targets.budget.carryoverHint', { cap: CARRY_MAX_PER_DAY })}
          value={current.carryover}
          onChange={(carryover) => change({ carryover })}
        />
        <InsightInfo text={t('targets.budget.rules')} />
      </Card>

      {preview ? (
        <Card title={t('targets.budget.weekTitle')}>
          <ThemedText type="smallBold">{t('targets.budget.total', { total: kcal(preview.total) })}</ThemedText>
          {days.map((d, i) => {
            const eaten = data.eaten.get(d);
            const sub = [
              preview.targets[i] !== preview.planned[i] ? t('targets.budget.dayPlan', { kcal: kcal(preview.planned[i]) }) : null,
              eaten && eaten.entries > 0 ? t('targets.budget.dayEaten', { kcal: kcal(eaten.kcal ?? 0) }) : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <EntryRow
                key={d}
                title={`${t(`reminders.day.${i + 1}`)} ${formatDayShort(d)}`}
                subtitle={sub || undefined}
                value={`${kcal(preview.targets[i])} kcal`}
                last={i === 6}
              />
            );
          })}
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.budget.floorNote', { floor: kcal(data.floor) })} {t('targets.rulesVersion', { version: BUDGET_RULES_VERSION })}
          </ThemedText>
        </Card>
      ) : null}

      <Button label={t('common.save')} onPress={save} />
    </Screen>
  );
}

function StepButton({ icon, label, onPress }: { icon: 'plus' | 'minus'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.step, { backgroundColor: pressed ? theme.border : theme.backgroundSelected }]}>
      <Icon name={icon} color={theme.text} size={18} strokeWidth={2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one, borderBottomWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1, minWidth: 0 },
  share: { minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
