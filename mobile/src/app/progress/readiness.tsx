import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, ConfirmButton, Field, ListRow, MultiChoice } from '@/components/fields';
import { levelColor, reasonText } from '@/components/readiness';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { notificationPermission } from '@/data/notifications';
import {
  endStatus,
  getCheck,
  journalDays,
  listChecks,
  loadSleepGoal,
  readinessHistory,
  saveCheck,
  startStatus,
  statusToday,
  type HistoryDay,
  type StatusPeriod,
} from '@/data/readiness';
import { loadReminders } from '@/data/reminders';
import { shiftDay } from '@/domain/dates';
import {
  hoursBetween,
  READINESS_RULES_VERSION,
  journalFindings,
  MANUAL_FACTORS,
  sleepStats,
  STATUSES,
  type DailyCheck,
  type Factor,
  type JournalFinding,
  type SleepStats,
  type Status,
} from '@/domain/readiness';
import { formatTime, parseTime } from '@/domain/reminders';
import { todayDay } from '@/domain/time';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';
import { applyReminders } from '@/services/alerts';

const SCALE = ['1', '2', '3', '4', '5'] as const;
type Scale = (typeof SCALE)[number];

async function load(db: Db) {
  const today = todayDay();
  const [check, status, goal, checks, history, journal, todayJournal] = await Promise.all([
    getCheck(db, today),
    statusToday(db, today),
    loadSleepGoal(db),
    listChecks(db, shiftDay(today, -13), today),
    readinessHistory(db, today, 28),
    journalDays(db, shiftDay(today, -89), today),
    journalDays(db, today, today),
  ]);
  return {
    today,
    check,
    status,
    goal,
    stats: sleepStats(checks, today, goal),
    history,
    findings: journalFindings(journal),
    journalDays: journal.length,
    diaryToday: todayJournal[0]?.diary ?? [],
  };
}

/** Bereitschaft (A6): Morgen-Check im Detail, Status, Schlaf, Journal und Verlauf von 4 Wochen. */
export default function ReadinessScreen() {
  const { data, db, loaded, reload } = useLoad(load, {
    today: '',
    check: null as DailyCheck | null,
    status: null as StatusPeriod | null,
    goal: 8,
    stats: null as SleepStats | null,
    history: [] as HistoryDay[],
    findings: [] as JournalFinding[],
    journalDays: 0,
    diaryToday: [] as Factor[],
  });
  if (!loaded) return <Screen withHeader>{null}</Screen>;
  return (
    <Screen withHeader>
      <CheckForm key={data.today + JSON.stringify(data.check)} db={db} day={data.today} check={data.check} diary={data.diaryToday} onSaved={reload} />
      <StatusCard db={db} today={data.today} status={data.status} onChanged={reload} />
      {data.stats ? <SleepCard stats={data.stats} goal={data.goal} /> : null}
      <JournalCard findings={data.findings} days={data.journalDays} />
      <HistoryCard history={data.history} />
      <Card title={t('readiness.breatheTitle')}>
        <ThemedText type="small">{t('readiness.breatheText')}</ThemedText>
        <Button label={t('readiness.breatheOpen')} variant="secondary" onPress={() => router.push('/progress/breathe')} />
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        {t('readiness.disclaimer', { version: READINESS_RULES_VERSION })}
      </ThemedText>
    </Screen>
  );
}

function CheckForm({ db, day, check, diary, onSaved }: { db: Db; day: string; check: DailyCheck | null; diary: Factor[]; onSaved: () => void }) {
  const [bed, setBed] = useState(check?.bedTime ?? '');
  const [wake, setWake] = useState(check?.wakeTime ?? '');
  const [hours, setHours] = useState(check?.sleepHours != null ? formatNumber(check.sleepHours, 2) : '');
  const [quality, setQuality] = useState<Scale | null>(check?.sleepQuality ? (String(check.sleepQuality) as Scale) : null);
  const [energy, setEnergy] = useState<Scale | null>(check?.energy ? (String(check.energy) as Scale) : null);
  const [soreness, setSoreness] = useState<Scale | null>(check?.soreness ? (String(check.soreness) as Scale) : null);
  const [factors, setFactors] = useState<Factor[]>(check?.factors ?? []);
  const [note, setNote] = useState(check?.note ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const theme = useTheme();

  // Aus Bett- und Aufstehzeit die Dauer vorschlagen
  function setTimes(nextBed: string, nextWake: string) {
    setBed(nextBed);
    setWake(nextWake);
    if (parseTime(nextBed) !== null && parseTime(nextWake) !== null) {
      const h = hoursBetween(nextBed, nextWake);
      if (h !== null) setHours(formatNumber(h, 2));
    }
  }

  async function save() {
    const h = hours.trim() ? Number(hours.replace(',', '.')) : null;
    if (h !== null && !(h > 0 && h <= 16)) return setProblem(t('readiness.problems.hours'));
    if ((bed.trim() && parseTime(bed) === null) || (wake.trim() && parseTime(wake) === null)) return setProblem(t('readiness.problems.time'));
    setProblem(null);
    await saveCheck(db, day, {
      bedTime: bed.trim() ? formatTime(parseTime(bed)!) : null,
      wakeTime: wake.trim() ? formatTime(parseTime(wake)!) : null,
      sleepHours: h,
      sleepQuality: quality ? Number(quality) : null,
      energy: energy ? Number(energy) : null,
      soreness: soreness ? Number(soreness) : null,
      factors,
      note: note.trim() || null,
    });
    showToast(t('common.saved'));
    onSaved();
  }

  return (
    <Card title={t('readiness.checkTitleToday', { date: formatDay(day) })}>
      <View style={styles.row}>
        <Field
          label={t('readiness.bedTime')}
          value={bed}
          onChangeText={(v) => setTimes(v, wake)}
          placeholder="23:00"
          keyboardType="numbers-and-punctuation"
          style={styles.flex}
        />
        <Field
          label={t('readiness.wakeTime')}
          value={wake}
          onChangeText={(v) => setTimes(bed, v)}
          placeholder="07:00"
          keyboardType="numbers-and-punctuation"
          style={styles.flex}
        />
      </View>
      <Field label={t('readiness.sleepHoursExact')} value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
      <Choice label={t('readiness.sleepQuality')} options={SCALE} value={quality} onChange={setQuality} format={(v) => v} chips />
      <Choice label={t('readiness.energy')} options={SCALE} value={energy} onChange={setEnergy} format={(v) => v} chips />
      <Choice label={t('readiness.soreness')} options={SCALE} value={soreness} onChange={setSoreness} format={(v) => v} chips />
      <ThemedText type="small" themeColor="textSecondary">
        {t('readiness.scaleHint')}
      </ThemedText>
      <MultiChoice
        label={t('readiness.factorsLabel')}
        options={MANUAL_FACTORS}
        value={factors}
        onChange={setFactors}
        format={(f) => t(`readiness.factors.${f}`)}
      />
      {diary.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('readiness.factorsDiary', { list: diary.map((f) => t(`readiness.factors.${f}`)).join(', ') })}
        </ThemedText>
      ) : null}
      <Field label={t('readiness.note')} value={note} onChangeText={setNote} />
      {problem ? <ThemedText style={{ color: theme.danger }}>{problem}</ThemedText> : null}
      <Button label={t('common.save')} onPress={save} />
    </Card>
  );
}

function StatusCard({ db, today, status, onChanged }: { db: Db; today: string; status: StatusPeriod | null; onChanged: () => void }) {
  const [choice, setChoice] = useState<Status>('krank');
  async function reschedule() {
    if ((await notificationPermission(false)) === 'granted') await applyReminders(db, await loadReminders(db));
  }
  return (
    <Card title={t('readiness.statusTitle')}>
      {status ? (
        <>
          <ThemedText>{t('readiness.statusSince', { status: t(`readiness.status.${status.status}`), date: formatDay(status.fromDay) })}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('readiness.statusEffects')}
          </ThemedText>
          <Button
            label={t('readiness.statusEnd')}
            onPress={async () => {
              await endStatus(db, today);
              await reschedule();
              showToast(t('readiness.statusEnded'));
              onChanged();
            }}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('readiness.statusComeback')}
          </ThemedText>
        </>
      ) : (
        <>
          <ThemedText type="small">{t('readiness.statusIntro')}</ThemedText>
          <Choice label={t('readiness.statusChoose')} options={STATUSES} value={choice} onChange={setChoice} format={(s) => t(`readiness.status.${s}`)} />
          <ConfirmButton
            label={t('readiness.statusStart')}
            confirmLabel={t('readiness.statusStartConfirm', { status: t(`readiness.status.${choice}`) })}
            onConfirm={async () => {
              await startStatus(db, choice, today);
              await reschedule();
              onChanged();
            }}
          />
        </>
      )}
    </Card>
  );
}

function SleepCard({ stats, goal }: { stats: SleepStats; goal: number }) {
  const n = (v: number, d = 1) => formatNumber(v, d);
  return (
    <Card title={t('readiness.sleepTitle')}>
      {stats.nights === 0 ? (
        <ThemedText type="small">{t('readiness.sleepNone')}</ThemedText>
      ) : (
        <>
          <ThemedText>{t('readiness.sleepAvg', { hours: n(stats.avgHours!), nights: stats.nights, goal: n(goal) })}</ThemedText>
          <ThemedText>{t('readiness.sleepDebt', { hours: n(stats.debtHours) })}</ThemedText>
          <ThemedText type="small">
            {stats.wakeSpread !== null ? t('readiness.wakeSpread', { minutes: stats.wakeSpread }) : t('readiness.spreadMissing')}
          </ThemedText>
          {stats.bedSpread !== null ? <ThemedText type="small">{t('readiness.bedSpread', { minutes: stats.bedSpread })}</ThemedText> : null}
        </>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {t('readiness.sleepHint')}
      </ThemedText>
      <ListRow title={t('readiness.sleepReminder')} accessory="›" last onPress={() => router.push('/more/notifications')} />
    </Card>
  );
}

function JournalCard({ findings, days }: { findings: JournalFinding[]; days: number }) {
  const n = (v: number, metric: JournalFinding['metric']) =>
    metric === 'sleepHours' ? `${formatNumber(v, 1)} h` : metric === 'performance' ? `${formatNumber(v, 0)} %` : formatNumber(v, 1);
  return (
    <Card title={t('readiness.journalTitle')}>
      {findings.length === 0 ? (
        <ThemedText type="small">{t('readiness.journalEmpty', { days })}</ThemedText>
      ) : (
        findings.slice(0, 6).map((f) => (
          <ThemedText key={`${f.factor}-${f.metric}`} type="small">
            {t('readiness.journalLine', {
              factor: t(`readiness.factors.${f.factor}`),
              withDays: f.withDays,
              metric: t(`readiness.metric.${f.metric}`),
              with: n(f.withAvg, f.metric),
              without: n(f.withoutAvg, f.metric),
            })}
          </ThemedText>
        ))
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {t('readiness.journalHint')}
      </ThemedText>
    </Card>
  );
}

function HistoryCard({ history }: { history: HistoryDay[] }) {
  const theme = useTheme();
  const shown = history.filter((h) => h.check || h.load > 0 || h.readiness.kind === 'status');
  return (
    <Card title={t('readiness.historyTitle')}>
      {shown.length === 0 ? <ThemedText type="small">{t('readiness.historyEmpty')}</ThemedText> : null}
      {shown.map((h) => {
        const r = h.readiness;
        const label =
          r.kind === 'ampel'
            ? t(`readiness.levelShort.${r.level}`)
            : r.kind === 'status'
              ? t(`readiness.status.${r.status}`)
              : r.kind === 'lernen'
                ? t('readiness.learningShort')
                : '–';
        const c = h.check;
        const parts = [
          c?.sleepHours != null ? `${formatNumber(c.sleepHours, 1)} h` : null,
          c?.energy != null ? t('readiness.short.energy', { value: c.energy }) : null,
          c?.soreness != null ? t('readiness.short.soreness', { value: c.soreness }) : null,
          h.load > 0 ? t('readiness.short.load', { value: h.load }) : null,
        ].filter(Boolean);
        return (
          <View key={h.day} style={styles.histRow} accessible accessibilityLabel={`${formatDay(h.day)}: ${label}. ${parts.join(', ')}`}>
            <View style={[styles.dot, { backgroundColor: r.kind === 'ampel' ? levelColor(r.level, theme) : theme.backgroundSelected }]} />
            <ThemedText type="small" style={styles.date}>
              {formatDay(h.day)}
            </ThemedText>
            <ThemedText type="small" style={styles.flex}>
              {[label, ...parts].join(' · ')}
            </ThemedText>
          </View>
        );
      })}
      {history[0]?.readiness.kind === 'ampel' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {history[0].readiness.reasons.map(reasonText).join(' · ')}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  date: { width: 84 },
});
