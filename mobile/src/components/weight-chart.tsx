import { TimeChart } from '@/components/time-chart';
import { kgToUnit, type WeightUnit } from '@/domain/units';
import { projectWeight } from '@/domain/weight';
import { formatDay, formatNumber, formatWeight, t } from '@/i18n';

/**
 * Gewichtsverlauf (30 Tage): Linie = 7-Tage-Durchschnitt, graue Punkte = einzelne Messungen,
 * gestrichelte Linie = Zielgewicht, gestrichelte Verlängerung = Hochrechnung bei gleichem Tempo (bis zum Ziel,
 * höchstens 4 Wochen). Werte in der gewählten Einheit, gespeichert wird kg.
 */
export function WeightChart({
  days,
  points,
  trend,
  unit,
  targetKg = null,
  weeklyChangeKg = null,
}: {
  /** Alle Tage im Zeitraum, aufsteigend (YYYY-MM-DD). */
  days: string[];
  points: { day: string; kg: number }[];
  trend: { day: string; kg: number }[];
  unit: WeightUnit;
  targetKg?: number | null;
  weeklyChangeKg?: number | null;
}) {
  if (points.length < 2) return null;
  const u = (kg: number) => kgToUnit(kg, unit);
  const lastTrend = trend[trend.length - 1] ?? null;
  const projection = projectWeight(lastTrend?.kg ?? null, weeklyChangeKg, targetKg, days[days.length - 1]);
  const values = points.map((p) => p.kg);
  return (
    <TimeChart
      days={days}
      line={trend.map((p) => ({ day: p.day, value: u(p.kg) }))}
      dots={points.map((p) => ({ day: p.day, value: u(p.kg) }))}
      reference={targetKg !== null ? { value: u(targetKg), label: t('progress.chartTarget', { value: formatWeight(targetKg, unit) }) } : undefined}
      projection={
        projection
          ? {
              to: { day: projection.day, value: u(projection.kg) },
              label: t('progress.chartProjection', { value: formatWeight(projection.kg, unit), date: formatDay(projection.day) }),
            }
          : undefined
      }
      format={(v) => formatNumber(v, 1)}
      dayLabel={formatDay}
      accessibilityLabel={t('progress.chartLabel', { min: formatWeight(Math.min(...values), unit), max: formatWeight(Math.max(...values), unit) })}
    />
  );
}
