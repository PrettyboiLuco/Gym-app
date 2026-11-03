import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Card } from '@/components/card';
import { DayBars } from '@/components/charts';
import { Choice, EntryRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { daySums, DEFAULT_SETTINGS, loadNutritionSettings } from '@/data/nutrition';
import { isoWeekday, shiftDay } from '@/domain/dates';
import { weekAverage } from '@/domain/nutrition';
import { todayDay } from '@/domain/time';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatNumber, t } from '@/i18n';
import { formatKcal } from '@/services/nutrition-format';

const RANGES = ['7', '30'] as const;

type DayRow = { day: string; kcal: number | null; entries: number; unknownKcal: number; flagged?: number };

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
      {!data.hide && range === '7' && stats.trackedDays > 0 ? (
        <Card>
          <DayBars
            label={data.rows.map((r) => `${formatDay(r.day)}: ${r.kcal === null ? t('nutrition.week.emptyDay') : formatKcal(r.kcal)}`).join(', ')}
            days={[...data.rows].reverse().map((r) => ({
              label: t(`reminders.dayShort.${isoWeekday(r.day)}` as 'reminders.dayShort.1'),
              value: r.kcal,
              today: r.day === endDay,
            }))}
            format={(v) => formatNumber(v, 0)}
          />
        </Card>
      ) : null}
      <Card>
        {data.rows.map((r, i) => {
          const status =
            r.entries === 0 ? t('nutrition.week.emptyDay') : r.kcal === null || r.unknownKcal > 0 || r.flagged ? t('nutrition.week.incompleteDay') : undefined;
          const value = data.hide
            ? t('nutrition.week.entries', { count: r.entries })
            : r.entries === 0
              ? '–'
              : r.kcal === null
                ? t('nutrition.kcalUnknown')
                : `${r.unknownKcal > 0 ? '≥ ' : ''}${formatKcal(r.kcal)}`;
          return <EntryRow key={r.day} title={formatDay(r.day)} subtitle={status} value={value} last={i === data.rows.length - 1} />;
        })}
      </Card>
    </Screen>
  );
}
