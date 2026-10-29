import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Card } from '@/components/card';
import { Choice, ListRow } from '@/components/fields';
import { formatKcal, todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { daySums, DEFAULT_SETTINGS, loadNutritionSettings } from '@/data/nutrition';
import { shiftDay, weekAverage } from '@/domain/nutrition';
import { useLoad } from '@/hooks/use-load';
import { formatDay, t } from '@/i18n';

const RANGES = ['7', '30'] as const;

type DayRow = { day: string; kcal: number | null; entries: number; unknownKcal: number };

async function loadRange(db: Db, endDay: string, days: number) {
  const from = shiftDay(endDay, -(days - 1));
  const [sums, settings] = await Promise.all([daySums(db, from, endDay), loadNutritionSettings(db)]);
  const byDay = new Map(sums.map((s) => [s.day, s]));
  // Jeder Tag erscheint, auch ohne Einträge – leere Tage werden getrennt gezählt (TRACK-004).
  const rows: DayRow[] = [];
  for (let i = 0; i < days; i++) {
    const day = shiftDay(endDay, -i);
    rows.push(byDay.get(day) ?? { day, kcal: null, entries: 0, unknownKcal: 0 });
  }
  return { rows, hide: settings.hideNumbers };
}

export default function WeekScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const endDay = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : todayDay();
  const [range, setRange] = useState<(typeof RANGES)[number]>('7');
  const { data } = useLoad((d) => loadRange(d, endDay, Number(range)), { rows: [] as DayRow[], hide: DEFAULT_SETTINGS.hideNumbers }, `${endDay}-${range}`);
  const stats = weekAverage(data.rows);

  return (
    <Screen withHeader>
      <Choice
        label={t('nutrition.week.range')}
        options={RANGES}
        value={range}
        onChange={setRange}
        format={(r) => (r === '7' ? t('nutrition.week.days7') : t('nutrition.week.days30'))}
      />
      <Card>
        {!data.hide ? (
          <ThemedText type="smallBold">
            {stats.average === null ? t('nutrition.week.averageNone') : t('nutrition.week.average', { kcal: formatKcal(stats.average) })}
          </ThemedText>
        ) : null}
        <ThemedText type="small">
          {t('nutrition.week.counts', { tracked: stats.trackedDays, incomplete: stats.incompleteDays, empty: stats.emptyDays })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('nutrition.week.basis')}
        </ThemedText>
      </Card>
      <Card>
        {data.rows.map((r) => {
          const status =
            r.entries === 0
              ? t('nutrition.week.emptyDay')
              : r.kcal === null || r.unknownKcal > 0
                ? t('nutrition.week.incompleteDay')
                : null;
          const parts = data.hide
            ? [t('nutrition.week.entries', { count: r.entries }), status]
            : [
                r.entries === 0 ? null : r.kcal === null ? t('nutrition.kcalUnknown') : `${r.unknownKcal > 0 ? '≥ ' : ''}${formatKcal(r.kcal)}`,
                status,
              ];
          return <ListRow key={r.day} title={formatDay(r.day)} subtitle={parts.filter(Boolean).join(' · ')} />;
        })}
      </Card>
    </Screen>
  );
}
