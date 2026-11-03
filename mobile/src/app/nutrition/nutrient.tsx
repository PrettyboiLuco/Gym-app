import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Card } from '@/components/card';
import { Choice, EntryRow, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { TargetMicroBar } from '@/components/target-micro-bar';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { rankFoodsBy } from '@/data/nutrient-gaps';
import { listDay, type ConsumptionEvent } from '@/data/nutrition';
import { loadDayTargets, type DayTargets } from '@/data/targets-settings';
import { MICRO_KEYS, MICRO_UNITS, parseMicros, type MicroKey } from '@/domain/basis-foods';
import { topSources } from '@/domain/micro-targets';
import { RANK_KEYS, type GapKey, type RankBy } from '@/domain/nutrient-gaps';
import { useLoad } from '@/hooks/use-load';
import { formatNumber, t } from '@/i18n';
import { diaryToday, formatAmount, readTarget, targetParams } from '@/services/nutrition-format';

const BY: readonly RankBy[] = ['g100', 'kcal100'];
const isMicro = (k: GapKey): k is MicroKey => (MICRO_KEYS as readonly string[]).includes(k);
const unitOf = (k: GapKey) => (isMicro(k) ? MICRO_UNITS[k] : 'g');
const nameOf = (k: GapKey) => (isMicro(k) ? t(`micros.${k}`) : t(`nutrition.${k}`));
const num = (v: number) => formatNumber(v, v < 10 ? 1 : 0);

/** Wert eines Eintrags für den Nährstoff (Eiweiß/Ballaststoffe aus dem Eintrag, Mikros aus dessen Angaben). */
function entryValue(e: ConsumptionEvent, key: GapKey): number | null {
  if (key === 'protein') return e.protein;
  if (key === 'fiber') return e.fiber;
  return parseMicros(e.microsJson)?.[key] ?? null;
}

async function load(db: Db, day: string, key: GapKey, by: RankBy) {
  const [targets, events] = await Promise.all([loadDayTargets(db, day), listDay(db, day)]);
  // Bei sensibler Situation oder „Zahlen ausblenden“ nicht nach kcal sortieren.
  const ranked = await rankFoodsBy(db, key, targets.hidden ? 'g100' : by);
  const today = topSources(events, (e) => entryValue(e, key)).map((s) => ({ event: s.entry, value: s.value }));
  const total = events.reduce((s, e) => s + (entryValue(e, key) ?? 0), 0);
  const known = events.some((e) => entryValue(e, key) !== null);
  return { targets, ranked, today, total: known ? total : null };
}

/** Nährstoff-Suche (B2, W3): heute größte Quellen, Lebensmittel je 100 g/ml oder je 100 kcal. */
export default function NutrientScreen() {
  const params = useLocalSearchParams<{ key?: string; day?: string }>();
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : diaryToday();
  const [key, setKey] = useState<GapKey>(RANK_KEYS.includes(params.key as GapKey) ? (params.key as GapKey) : 'protein');
  const [by, setBy] = useState<RankBy>('g100');
  const { data } = useLoad((d) => load(d, day, key, by), { targets: null as DayTargets | null, ranked: [], today: [], total: null }, `${day}-${key}-${by}`);
  const { targets } = data;
  const hidden = targets?.hidden ?? true;
  const { target } = readTarget({ day });

  return (
    <Screen withHeader>
      <Choice chips label={t('targets.nutrient.label')} options={RANK_KEYS} value={key} onChange={setKey} format={nameOf} />

      {targets && !hidden && isMicro(key) ? (
        <Card>
          <TargetMicroBar name={nameOf(key)} value={data.total} unit={unitOf(key)} limits={targets.refs[key]} />
        </Card>
      ) : null}

      <Card title={t('targets.nutrient.today')}>
        {data.today.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.nutrient.todayNone')}
          </ThemedText>
        ) : (
          data.today.map((s, i) => (
            <EntryRow
              key={s.event.id}
              title={s.event.name}
              subtitle={formatAmount(s.event.amount, s.event.unit)}
              value={`${num(s.value)} ${unitOf(key)}`}
              last={i === data.today.length - 1}
            />
          ))
        )}
      </Card>

      <Card title={t('targets.nutrient.list')}>
        {!hidden ? (
          <Choice label={t('targets.nutrient.by')} options={BY} value={by} onChange={setBy} format={(b) => t(`targets.nutrient.byOption.${b}`)} />
        ) : null}
        {data.ranked.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.nutrient.listNone')}
          </ThemedText>
        ) : (
          data.ranked.map((r, i) => (
            <ListRow
              key={r.food.id}
              title={r.food.name}
              subtitle={
                by === 'kcal100' && !hidden
                  ? t('targets.nutrient.perKcal', { value: num(r.value), unit: unitOf(key) })
                  : t('targets.nutrient.perG', { value: num(r.value), unit: unitOf(key), basis: r.food.basis })
              }
              accessory="›"
              onPress={() => router.push({ pathname: '/nutrition/food/[id]', params: { id: r.food.id, ...targetParams(day, target) } })}
              last={i === data.ranked.length - 1}
            />
          ))
        )}
        <ThemedText type="small" themeColor="textSecondary">
          {t('targets.nutrient.note')}
        </ThemedText>
      </Card>
    </Screen>
  );
}
