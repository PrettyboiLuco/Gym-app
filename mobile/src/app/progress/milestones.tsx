import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Toggle } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ShareCard, type ShareCardContent } from '@/components/share-card';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { loadMotivation, markMilestonesSeen, saveBalanceOn, type Motivation } from '@/data/motivation';
import { listExercises, type Exercise } from '@/data/training';
import { MILESTONES, milestoneProgress, type Milestone, type MilestoneId, type WeekResult } from '@/domain/motivation';
import { todayDay } from '@/domain/time';
import { exerciseName } from '@/format/exercise-name';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';

async function load(db: Db) {
  const [m, exercises] = await Promise.all([loadMotivation(db, todayDay()), listExercises(db)]);
  return { m, exercises };
}

/**
 * Meilensteine und Plan-Wochen (Ausbauplan A10.5–A10.7) – ohne Serien, nichts geht verloren.
 * Aufbau nach getlayers-Kompositionen: oben ein invertiertes Panel mit Aussage und großen Zahlen („lumora-stats“),
 * darunter der nächste Meilenstein mit Fortschritt, die erreichten als Zeitleiste mit Wert-Plakette, die ganze
 * Sammlung als Raster und die Plan-Wochen mit zwei großen Zahlen über den Wochenkästchen.
 */
export default function MilestonesScreen() {
  const theme = useTheme();
  const { data, db, loaded, reload } = useLoad(load, { m: null as Motivation | null, exercises: [] as Exercise[] });
  const [share, setShare] = useState<ShareCardContent | null>(null);
  const m = data.m;
  const byId = new Map(data.exercises.map((e) => [e.id, e]));

  // Angesehen = nicht mehr neu (Hinweis auf „Heute“ verschwindet). Die „Neu“-Marke bleibt für diesen Besuch stehen,
  // weil die geladenen Daten erst beim nächsten Öffnen neu gelesen werden.
  useEffect(() => {
    if (m?.fresh.length)
      markMilestonesSeen(
        db,
        m.fresh.map((f) => f.id)
      );
  }, [db, m]);

  if (!loaded || !m) return <Screen withHeader>{null}</Screen>;
  const detail = (ms: Milestone) => (ms.id === 'kg_100' && ms.detail ? exerciseName(byId.get(ms.detail)) : null);
  const reached = new Set(m.milestones.map((x) => x.id));
  const freshIds = new Set(m.fresh.map((f) => f.id));
  const upcoming = MILESTONES.filter((id) => !reached.has(id));
  // Nächster = der, dem man am nächsten ist (größter Anteil geschafft) – nicht stur der nächste in der Liste.
  const next = [...upcoming].sort((a, b) => share01(b) - share01(a))[0] ?? null;
  function share01(id: MilestoneId) {
    const p = milestoneProgress(id, m!.stats);
    return p.current / p.target;
  }
  const current = m.weeks.at(-1);

  const milestoneCard = (ms: Milestone): ShareCardContent => ({
    eyebrow: t('milestones.eyebrow'),
    value: t(`milestones.value.${ms.id}`),
    title: t(`milestones.name.${ms.id}`),
    lines: [detail(ms), formatDay(ms.day)].filter((x): x is string => !!x),
  });

  return (
    <Screen withHeader>
      {/* 1 · Panel „Bisher“: invertiert, Aussage oben links, drei große Zahlen darunter. */}
      <View style={[styles.hero, { backgroundColor: theme.text }]} accessible accessibilityRole="summary">
        <View style={styles.eyebrowRow}>
          <View style={[styles.eyebrowDot, { backgroundColor: theme.accent }]} />
          <ThemedText type="small" style={{ color: theme.background, opacity: 0.7 }}>
            {t('milestones.heroEyebrow')}
          </ThemedText>
        </View>
        <ThemedText style={[styles.heroTitle, { color: theme.background }]}>
          {t('milestones.heroTitle', { count: m.milestones.length, total: MILESTONES.length })}
        </ThemedText>
        <View style={styles.heroStats}>
          <HeroStat value={formatNumber(m.stats.trainings, 0)} label={t('milestones.statTrainings')} color={theme.background} />
          <HeroStat value={formatNumber(m.stats.sets, 0)} label={t('milestones.statSets')} color={theme.background} />
          <HeroStat value={m.stats.bestKg > 0 ? formatNumber(m.stats.bestKg, 0) : '–'} label={t('milestones.statBest')} color={theme.background} />
        </View>
      </View>

      {/* Teilen-Karte direkt unter dem Panel, damit sie nach dem Tippen sichtbar ist – mit Schließen. */}
      {share ? (
        <Card title={t('shareCard.title')} trailing={<Button label={t('common.close')} variant="quiet" size="compact" onPress={() => setShare(null)} />}>
          <ShareCard content={share} />
        </Card>
      ) : null}

      {/* 2 · Als Nächstes: der am weitesten fortgeschrittene offene Meilenstein mit Balken und Rest. */}
      {next ? <NextCard id={next} progress={milestoneProgress(next, m.stats)} /> : null}

      {/* 3 · Erreicht: Zeitleiste, neueste oben, Wert als Plakette, „Neu“-Marke, Teilen-Knopf. */}
      <Card title={t('milestones.reachedTitle')}>
        {m.milestones.length === 0 ? (
          <ThemedText themeColor="textSecondary">{t('milestones.none')}</ThemedText>
        ) : (
          [...m.milestones].reverse().map((ms, i, all) => (
            <View key={ms.id} style={styles.timelineRow}>
              <View style={styles.rail}>
                <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                  <ThemedText
                    style={[styles.badgeText, t(`milestones.badge.${ms.id}`).length > 4 && styles.badgeTextLong, { color: theme.onAccent }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    {t(`milestones.badge.${ms.id}`)}
                  </ThemedText>
                </View>
                {i < all.length - 1 ? <View style={[styles.railLine, { backgroundColor: theme.backgroundSelected }]} /> : null}
              </View>
              <View style={styles.timelineText}>
                <View style={styles.titleRow}>
                  <ThemedText type="smallBold" style={styles.flex}>
                    {t(`milestones.name.${ms.id}`)}
                  </ThemedText>
                  {freshIds.has(ms.id) ? (
                    <View style={[styles.newPill, { backgroundColor: theme.accent }]}>
                      <ThemedText type="small" style={{ color: theme.onAccent, fontWeight: 700 }}>
                        {t('milestones.new')}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {[detail(ms), formatDay(ms.day)].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('milestones.shareOne', { name: t(`milestones.name.${ms.id}`) })}
                hitSlop={8}
                onPress={() => setShare(milestoneCard(ms))}
                style={({ pressed }) => [styles.shareBtn, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
                <Icon name="share" color={theme.textSecondary} size={20} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      {/* 4 · Sammlung: alle Meilensteine als Raster – erreichte gefüllt, offene mit Fortschritt in Prozent. */}
      <Card title={t('milestones.collectionTitle')} trailing={<ThemedText themeColor="textSecondary">{`${m.milestones.length}/${MILESTONES.length}`}</ThemedText>}>
        <View style={styles.grid}>
          {MILESTONES.map((id) => {
            const done = reached.has(id);
            const p = milestoneProgress(id, m.stats);
            const pct = Math.floor((p.current / p.target) * 100);
            return (
              <View
                key={id}
                accessible
                accessibilityLabel={`${t(`milestones.name.${id}`)}: ${done ? t('milestones.done') : t('milestones.percent', { pct })}`}
                style={[
                  styles.tile,
                  done ? { backgroundColor: theme.accent } : { backgroundColor: theme.backgroundSelected, opacity: 0.85 },
                ]}>
                <ThemedText style={[styles.tileValue, { color: done ? theme.onAccent : theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {t(`milestones.badge.${id}`)}
                </ThemedText>
                <ThemedText type="small" numberOfLines={1} style={{ color: done ? theme.onAccent : theme.text }}>
                  {t(`milestones.short.${id}`)}
                </ThemedText>
                <ThemedText type="small" numberOfLines={1} style={{ color: done ? theme.onAccent : theme.textSecondary, opacity: done ? 0.75 : 1 }}>
                  {done ? `✓ ${t('milestones.done')}` : t('milestones.percent', { pct })}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </Card>

      {/* 5 · Plan-Wochen: zwei große Zahlen statt drei Sätzen, Kästchen mit Legende, Schalter in derselben Karte. */}
      {m.showBalance && m.goal ? (
        <Card title={t('balance.title')}>
          {current ? <ThemedText>{t(`balance.current.${current.status}`, { trained: current.trained, goal: current.goal })}</ThemedText> : null}
          {m.total.counted === 0 ? (
            <ThemedText themeColor="textSecondary">{t('balance.empty', { goal: m.goal })}</ThemedText>
          ) : (
            <View style={styles.balanceStats}>
              <BalanceStat value={`${m.last4.done}/${m.last4.counted}`} label={t('balance.last4Short')} />
              <BalanceStat value={`${m.month.done}/${m.month.counted}`} label={t('balance.monthShort')} />
              <BalanceStat value={`${m.total.done}/${m.total.counted}`} label={t('balance.totalShort')} />
            </View>
          )}
          <WeekStrip weeks={m.weeks.slice(-12)} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('balance.hint', { goal: m.goal })}
          </ThemedText>
          {m.total.counted === 0 ? null : (
            <Button
              label={t('balance.shareMonth')}
              variant="secondary"
              size="compact"
              icon={<Icon name="share" color={theme.text} size={16} />}
              onPress={() =>
                setShare({
                  eyebrow: t('balance.eyebrow'),
                  value: `${m.month.done}/${m.month.counted}`,
                  title: t('balance.shareTitle'),
                  lines: [t('balance.shareLine', { done: m.last4.done, counted: m.last4.counted })],
                })
              }
            />
          )}
          <Toggle label={t('balance.toggle')} hint={t('balance.toggleHint')} value onChange={(on) => setBalance(on)} />
        </Card>
      ) : (
        <Card>
          <Toggle label={t('balance.toggle')} hint={t('balance.toggleHint')} value={m.showBalance} onChange={(on) => setBalance(on)} />
        </Card>
      )}
    </Screen>
  );

  async function setBalance(on: boolean) {
    await saveBalanceOn(db, on);
    await reload();
  }
}

function HeroStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.heroStat} accessible accessibilityLabel={`${value} ${label}`}>
      <ThemedText style={[styles.heroValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color, opacity: 0.7 }} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

function NextCard({ id, progress }: { id: MilestoneId; progress: { current: number; target: number } }) {
  const theme = useTheme();
  const left = progress.target - progress.current;
  const kind = id.split('_')[0];
  return (
    <Card>
      <ThemedText type="small" themeColor="textSecondary">
        {t('milestones.nextEyebrow')}
      </ThemedText>
      <ThemedText style={styles.nextTitle}>{t(`milestones.name.${id}`)}</ThemedText>
      <View
        style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: progress.target, now: progress.current }}>
        <View style={[styles.barFill, { backgroundColor: theme.accent, width: `${Math.max((progress.current / progress.target) * 100, 2)}%` }]} />
      </View>
      <View style={styles.nextRow}>
        <ThemedText type="smallBold">{t(`milestones.progress.${kind}`, { current: formatNumber(progress.current, 0), target: formatNumber(progress.target, 0) })}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t(`milestones.left.${kind}`, { count: left, left: formatNumber(left, 0) })}
        </ThemedText>
      </View>
    </Card>
  );
}

function BalanceStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.balanceStat} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText style={styles.balanceValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

function WeekStrip({ weeks }: { weeks: WeekResult[] }) {
  const theme = useTheme();
  return (
    <View style={styles.weekWrap}>
      <View style={styles.weeks} accessible accessibilityLabel={t('balance.weeksLabel')}>
        {weeks.map((w) => (
          <View
            key={w.start}
            style={[
              styles.week,
              {
                backgroundColor: w.status === 'geschafft' ? theme.accent : 'transparent',
                borderColor: w.status === 'geschafft' ? theme.accent : w.status === 'pausiert' ? theme.textSecondary : theme.backgroundSelected,
                borderStyle: w.status === 'pausiert' ? 'dashed' : 'solid',
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        <LegendItem fill={theme.accent} border={theme.accent} label={t('balance.legendDone')} />
        <LegendItem fill="transparent" border={theme.backgroundSelected} label={t('balance.legendOpen')} />
        <LegendItem fill="transparent" border={theme.textSecondary} dashed label={t('balance.legendPaused')} />
      </View>
    </View>
  );
}

function LegendItem({ fill, border, dashed = false, label }: { fill: string; border: string; dashed?: boolean; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, { backgroundColor: fill, borderColor: border, borderStyle: dashed ? 'dashed' : 'solid' }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { borderRadius: Radius.card + 8, padding: Spacing.four, gap: Spacing.three },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  eyebrowDot: { width: 8, height: 8, borderRadius: 4 },
  heroTitle: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, maxWidth: 260 },
  heroStats: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  heroStat: { flex: 1, minWidth: 0, gap: Spacing.half },
  heroValue: { fontFamily: DisplayFont.bold, fontSize: 34, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  nextTitle: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  bar: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.pill },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.two },
  timelineRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  rail: { alignItems: 'center', alignSelf: 'stretch' },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontFamily: DisplayFont.bold, fontSize: 15, lineHeight: 18, fontVariant: ['tabular-nums'] },
  badgeTextLong: { fontSize: 12, lineHeight: 15 },
  railLine: { width: 2, flex: 1, minHeight: 16, marginVertical: 4, borderRadius: 1 },
  timelineText: { flex: 1, gap: Spacing.half, paddingTop: Spacing.one + 2, paddingBottom: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  newPill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 1 },
  shareBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: '31%', minHeight: 96, borderRadius: Radius.field + 2, padding: Spacing.three - 2, gap: Spacing.half, justifyContent: 'space-between' },
  tileValue: { fontFamily: DisplayFont.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  balanceStats: { flexDirection: 'row', gap: Spacing.three },
  balanceStat: { flex: 1, minWidth: 0, gap: Spacing.half },
  balanceValue: { fontFamily: DisplayFont.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  weekWrap: { gap: Spacing.two, marginVertical: Spacing.one },
  weeks: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  week: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  legendBox: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5 },
});
