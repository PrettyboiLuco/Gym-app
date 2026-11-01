import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, ListRow } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { lighterPlanToday, saveCheck } from '@/data/readiness';
import { offersFor, type DailyCheck, type Level, type Readiness, type Reason } from '@/domain/readiness';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';
import { useModules } from '@/providers/profile-provider';

const SCALE = ['1', '2', '3', '4', '5'] as const;
const SLEEP_CHIPS = ['4', '5', '6', '7', '8', '9', '10'] as const;

/** Farbe der Ampel; Bedeutung steht immer auch als Text daneben. */
export function levelColor(level: Level, theme: ReturnType<typeof useTheme>) {
  return level === 'gruen' ? theme.accent : level === 'gelb' ? '#F2B53A' : theme.danger;
}

/** Begründung mit Rohwert und eigenem Schnitt, z. B. „Schlaf 5,5 h (dein Schnitt 7,4 h)“. */
export function reasonText(r: Reason): string {
  const n = (v: number, d = 1) => formatNumber(v, d);
  const base = r.baseline === null ? '' : r.key === 'last' ? '' : t('readiness.baseline', { value: r.key === 'schlaf' ? `${n(r.baseline)} h` : n(r.baseline) });
  const value = r.key === 'schlaf' ? `${n(r.value)} h` : r.key === 'last' ? n(r.value, 2) : String(r.value);
  return `${t(`readiness.reason.${r.key}`, { value })}${base ? ` ${base}` : ''}`;
}

/** „Heute: 7 h Schlaf · Qualität 4 · Energie 3 · Muskelkater 2“ – die Rohwerte hinter der Ampel. */
function todayLine(c: DailyCheck): string {
  const parts = [
    c.sleepHours !== null ? t('readiness.today.sleep', { value: formatNumber(c.sleepHours, 1) }) : null,
    c.sleepQuality !== null ? t('readiness.today.quality', { value: c.sleepQuality }) : null,
    c.energy !== null ? t('readiness.today.energy', { value: c.energy }) : null,
    c.soreness !== null ? t('readiness.today.soreness', { value: c.soreness }) : null,
  ].filter(Boolean);
  return `${t('readiness.today.label')} ${parts.join(' · ')}`;
}

/**
 * Morgen-Check in 4 Antippen (A6.2): Schlaf, Schlafqualität, Energie, Muskelkater. Jede Wahl wird sofort gespeichert,
 * damit nichts verloren geht; genauer (Uhrzeiten, Faktoren, Notiz) geht es in den Details.
 */
export function MorningCheck({ db, day, check, onSaved }: { db: Db; day: string; check: DailyCheck | null; onSaved: () => void }) {
  const [values, setValues] = useState({
    sleepHours: check?.sleepHours ?? null,
    sleepQuality: check?.sleepQuality ?? null,
    energy: check?.energy ?? null,
    soreness: check?.soreness ?? null,
  });
  async function set<K extends keyof typeof values>(key: K, value: number) {
    const next = { ...values, [key]: value };
    setValues(next);
    await saveCheck(db, day, { [key]: value });
    if (Object.values(next).every((v) => v !== null)) onSaved();
  }
  const pick = (v: number | null) => (v === null ? null : (String(v) as (typeof SCALE)[number]));
  const sleepPick = values.sleepHours === null ? null : (String(Math.min(10, Math.max(4, Math.round(values.sleepHours)))) as (typeof SLEEP_CHIPS)[number]);
  return (
    <Card title={t('readiness.checkTitle')}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('readiness.checkIntro')}
      </ThemedText>
      <Choice
        label={t('readiness.sleepHours')}
        options={SLEEP_CHIPS}
        value={sleepPick}
        onChange={(v) => set('sleepHours', Number(v))}
        format={(v) => (v === '4' ? '≤4' : v === '10' ? '10+' : v)}
        chips
      />
      <Choice
        label={t('readiness.sleepQuality')}
        options={SCALE}
        value={pick(values.sleepQuality)}
        onChange={(v) => set('sleepQuality', Number(v))}
        format={(v) => v}
        chips
      />
      <Choice label={t('readiness.energy')} options={SCALE} value={pick(values.energy)} onChange={(v) => set('energy', Number(v))} format={(v) => v} chips />
      <Choice
        label={t('readiness.soreness')}
        options={SCALE}
        value={pick(values.soreness)}
        onChange={(v) => set('soreness', Number(v))}
        format={(v) => v}
        chips
      />
      <ThemedText type="small" themeColor="textSecondary">
        {t('readiness.scaleHint')}
      </ThemedText>
      <ListRow title={t('readiness.details')} accessory="›" last onPress={() => router.push('/progress/readiness')} />
    </Card>
  );
}

/** Ampel mit Begründung und Angebot (A6.5/A6.6). Wortwahl: Trainingsvorschlag, nie Befund. */
export function ReadinessCard({
  db,
  readiness,
  check,
  today,
  onChanged,
}: {
  db: Db;
  readiness: Readiness;
  check: DailyCheck | null;
  today: string;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const modules = useModules();
  if (readiness.kind === 'offen') return null;

  async function lighter(offer: 'wenigerSaetze' | 'leicht') {
    setBusy(true);
    try {
      const result = await lighterPlanToday(db, offer, today, t(`readiness.offerNote.${offer}`));
      showToast(result === 'angepasst' ? t('readiness.offerDone') : result === 'schon' ? t('readiness.offerAlready') : t('readiness.offerNoPlan'));
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (readiness.kind === 'status') {
    return (
      <Card title={t(`readiness.status.${readiness.status}`)}>
        <ThemedText type="small">{t('readiness.statusActive')}</ThemedText>
        <ListRow title={t('readiness.statusManage')} accessory="›" last onPress={() => router.push('/progress/readiness')} />
      </Card>
    );
  }

  const title = readiness.kind === 'lernen' ? t('readiness.learningTitle') : t(`readiness.level.${readiness.level}`);
  // Ohne Modul „Dehnen & HIIT“ kein Dehn-Angebot (A11.1).
  const offers = offersFor(readiness).filter((o) => o !== 'dehnen' || modules.routinen);
  return (
    <Card title={t('readiness.cardTitle')}>
      <View style={styles.head}>
        {readiness.kind === 'ampel' ? <View style={[styles.dot, { backgroundColor: levelColor(readiness.level, theme) }]} /> : null}
        <ThemedText type="subtitle" style={styles.flex}>
          {title}
        </ThemedText>
      </View>
      {readiness.kind === 'lernen' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('readiness.learning', { checks: readiness.checks, needed: readiness.needed })}
        </ThemedText>
      ) : null}
      {check ? <ThemedText type="small">{todayLine(check)}</ThemedText> : null}
      {readiness.reasons.length ? (
        readiness.reasons.map((r) => (
          <ThemedText key={r.key} type="small">
            {`· ${reasonText(r)}`}
          </ThemedText>
        ))
      ) : readiness.kind === 'ampel' ? (
        <ThemedText type="small">{t('readiness.noReasons')}</ThemedText>
      ) : null}
      {offers.includes('wenigerSaetze') ? (
        <Button label={t('readiness.offer.wenigerSaetze')} variant="secondary" disabled={busy} onPress={() => lighter('wenigerSaetze')} />
      ) : null}
      {offers.includes('leicht') ? <Button label={t('readiness.offer.leicht')} variant="secondary" disabled={busy} onPress={() => lighter('leicht')} /> : null}
      {offers.includes('dehnen') ? <Button label={t('readiness.offer.dehnen')} variant="secondary" onPress={() => router.push('/training/stretch')} /> : null}
      {offers.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('readiness.offerHint')}
        </ThemedText>
      ) : null}
      <ListRow title={t('readiness.details')} accessory="›" last onPress={() => router.push('/progress/readiness')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 14, height: 14, borderRadius: 7 },
  flex: { flex: 1 },
});
