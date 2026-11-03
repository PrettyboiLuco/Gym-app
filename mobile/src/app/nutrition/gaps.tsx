import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { EntryRow, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { loadGapsDay, type GapsDay } from '@/data/nutrient-gaps';
import { logFood } from '@/data/nutrition';
import { MICRO_KEYS, MICRO_UNITS, type MicroKey } from '@/domain/basis-foods';
import { GAP_RULES_VERSION, type GapKey, type Suggestion } from '@/domain/nutrient-gaps';
import { useLoad } from '@/hooks/use-load';
import { formatNumber, t } from '@/i18n';
import { diaryToday, formatAmount, readTarget, whenFor } from '@/services/nutrition-format';

const isMicro = (k: GapKey): k is MicroKey => (MICRO_KEYS as readonly string[]).includes(k);
const unitOf = (k: GapKey) => (isMicro(k) ? MICRO_UNITS[k] : 'g');
const nameOf = (k: GapKey) => (isMicro(k) ? t(`micros.${k}`) : t(`nutrition.${k}`));
const num = (v: number) => formatNumber(v, v < 10 ? 1 : 0);

function amountText(s: Suggestion) {
  const amount = formatAmount(s.amount, s.food.basis);
  // „1 Ei (M)“ × 2 → „2 × Ei (M) (100 g)“; eine Portion → „1 Becher (250 g)“; ohne Portion nur die Menge.
  if (!s.portion) return amount;
  const label = s.count > 1 ? t('targets.gaps.portion', { count: s.count, label: s.portion.label.replace(/^1 /, '') }) : s.portion.label;
  return `${label} (${amount})`;
}

/** „Was fehlt mir heute?“ (B2, W3): offene Lücken und Vorschläge, die sie ohne Überschreiten des kcal-Ziels schließen. */
export default function GapsScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : diaryToday();
  const { data, reload, db, loaded } = useLoad((d) => loadGapsDay(d, day), null as GapsDay | null, day);

  async function add(s: Suggestion) {
    const { target } = readTarget({ day });
    if (target.kind !== 'essen') return;
    await logFood(db, s.food.id, s.amount, target, whenFor(day, target.meal));
    showToast(t('targets.gaps.logged', { name: s.food.name }));
    await reload();
  }

  if (!data || !loaded) return <Screen withHeader>{null}</Screen>;
  const { targets, gaps, suggestions, kcalLeft, unknown } = data;

  if (targets.hidden) {
    return (
      <Screen withHeader>
        <Card>
          <ThemedText>{t('targets.gaps.hidden')}</ThemedText>
        </Card>
        <SearchLink day={day} />
      </Screen>
    );
  }

  return (
    <Screen withHeader>
      <Card title={t('targets.gaps.open')}>
        {targets.macros === null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.gaps.noMacros')}
          </ThemedText>
        ) : null}
        {gaps.length === 0 ? (
          <ThemedText>{t('targets.gaps.none')}</ThemedText>
        ) : (
          gaps.map((g, i) => (
            <EntryRow
              key={g.key}
              title={nameOf(g.key)}
              value={t('targets.gaps.gapValue', { value: num(g.open), unit: unitOf(g.key) })}
              last={i === gaps.length - 1}
            />
          ))
        )}
        {gaps.some((g) => (g.key === 'protein' && unknown.protein > 0) || (g.key === 'fiber' && unknown.fiber > 0)) ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.gaps.atMost')}
          </ThemedText>
        ) : null}
        {kcalLeft !== null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {kcalLeft > 0 ? t('targets.gaps.kcalLeft', { kcal: formatNumber(kcalLeft, 0) }) : t('targets.gaps.kcalReached')}
          </ThemedText>
        ) : null}
      </Card>

      {gaps.length > 0 && (kcalLeft === null || kcalLeft > 0) ? (
        <Card title={t('targets.gaps.suggestions')}>
          {suggestions.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('targets.gaps.noSuggestions')}
            </ThemedText>
          ) : (
            suggestions.map((s) => (
              <View key={s.food.id} style={styles.suggestion}>
                <View style={styles.flex}>
                  <ThemedText style={styles.name}>{s.food.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('targets.gaps.amount', { amount: amountText(s), kcal: formatNumber(s.kcal, 0) })}
                  </ThemedText>
                  <ThemedText type="small">
                    {gaps
                      .filter((g) => (s.adds[g.key] ?? 0) > 0)
                      .map((g) => t('targets.gaps.adds', { value: num(s.adds[g.key]!), unit: unitOf(g.key), name: nameOf(g.key) }))
                      .join(' · ')}
                  </ThemedText>
                </View>
                <Button
                  label={t('targets.gaps.log')}
                  size="compact"
                  variant="secondary"
                  accessibilityLabel={t('targets.gaps.logFor', { name: s.food.name })}
                  onPress={() => add(s)}
                />
              </View>
            ))
          )}
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.gaps.note')} {t('targets.rulesVersion', { version: GAP_RULES_VERSION })}
          </ThemedText>
        </Card>
      ) : null}

      <SearchLink day={day} />
    </Screen>
  );
}

function SearchLink({ day }: { day: string }) {
  return (
    <Card>
      <ListRow
        icon="search"
        title={t('targets.nutrient.title')}
        subtitle={t('targets.nutrient.linkSub')}
        accessory="›"
        onPress={() => router.push({ pathname: '/nutrition/nutrient', params: { day } })}
        last
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  flex: { flex: 1, minWidth: 0, gap: Spacing.half },
  name: { fontWeight: 600 },
});
