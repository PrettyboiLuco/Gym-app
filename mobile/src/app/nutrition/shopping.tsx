import { useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { InsightInfo } from '@/components/insight-info';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { checkedKeys, resetChecked, setChecked, shoppingFor } from '@/data/meal-plan';
import { weekDays, weekStart } from '@/domain/dates';
import { DEPARTMENTS, shoppingText, type ShoppingItem } from '@/domain/meal-plan';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';
import { diaryToday } from '@/services/nutrition-format';

async function load(db: Db, week: string) {
  const days = weekDays(week);
  // Ab heute: Vergangenes ist schon eingekauft bzw. gegessen.
  const from = days[0] < diaryToday() ? diaryToday() : days[0];
  const [items, checked] = await Promise.all([shoppingFor(db, from, days[6]), checkedKeys(db, week)]);
  return { items, checked, from, to: days[6] };
}

const amountText = (i: ShoppingItem) => `${formatNumber(i.amount, 0)} ${i.basis}${i.pieces ? ` (≈ ${i.pieces} ${t('shopping.pieces')})` : ''}`;

/** Einkaufsliste aus dem Wochenplan (Ausbauplan A9.3): zusammengefasst, nach Abteilung, abhakbar, teilbar. */
export default function ShoppingScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ week?: string }>();
  const week = params.week ?? weekStart(diaryToday());
  const { data, db, reload } = useLoad((d) => load(d, week), { items: [] as ShoppingItem[], checked: new Set<string>(), from: '', to: '' }, week);
  const open = data.items.filter((i) => !data.checked.has(i.key)).length;

  async function toggle(key: string) {
    await setChecked(db, week, key, !data.checked.has(key));
    await reload();
  }

  async function share() {
    const text = shoppingText(data.items, data.checked, (d) => t(`shopping.department.${d}`), amountText);
    await Share.share({ message: `${t('shopping.shareTitle', { from: formatDay(data.from), to: formatDay(data.to) })}\n${text}` });
  }

  return (
    <Screen withHeader>
      <Card>
        <ThemedText type="small">
          {data.items.length
            ? t('shopping.summary', { open, total: data.items.length, from: data.from ? formatDay(data.from) : '', to: data.to ? formatDay(data.to) : '' })
            : t('shopping.empty')}
        </ThemedText>
        {data.items.length ? (
          <View style={styles.row}>
            <Button label={t('shopping.share')} size="compact" onPress={share} />
            <Button
              label={t('shopping.reset')}
              variant="secondary"
              size="compact"
              onPress={async () => {
                await resetChecked(db, week);
                await reload();
              }}
            />
          </View>
        ) : null}
      </Card>
      {DEPARTMENTS.map((dep) => {
        const list = data.items.filter((i) => i.department === dep);
        if (!list.length) return null;
        return (
          <Card key={dep} title={t(`shopping.department.${dep}`)}>
            {list.map((i) => {
              const done = data.checked.has(i.key);
              return (
                <Pressable
                  key={i.key}
                  onPress={() => toggle(i.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`${i.name}, ${amountText(i)}`}
                  style={styles.item}>
                  <View style={[styles.box, { borderColor: theme.textSecondary, backgroundColor: done ? theme.accent : 'transparent' }]}>
                    {done ? <Icon name="check" color={theme.onAccent} size={14} strokeWidth={2.6} /> : null}
                  </View>
                  <ThemedText style={[styles.flex, done && styles.done]}>{i.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={done ? styles.done : undefined}>
                    {amountText(i)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </Card>
        );
      })}
      <InsightInfo text={t('shopping.hint')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  done: { textDecorationLine: 'line-through', opacity: 0.55 },
});
