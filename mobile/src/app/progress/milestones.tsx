import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Choice, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ShareCard, type ShareCardContent } from '@/components/share-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { loadMotivation, markMilestonesSeen, saveBalanceOn, type Motivation } from '@/data/motivation';
import { listExercises, type Exercise } from '@/data/training';
import { MILESTONES, type Milestone } from '@/domain/motivation';
import { todayDay } from '@/domain/time';
import { exerciseName } from '@/format/exercise-name';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';

async function load(db: Db) {
  const [m, exercises] = await Promise.all([loadMotivation(db, todayDay()), listExercises(db)]);
  return { m, exercises };
}

/** Meilensteine und Wochenbilanz (Ausbauplan A10.5/A10.6/A10.7) – ohne Serien, nichts geht verloren. */
export default function MilestonesScreen() {
  const theme = useTheme();
  const { data, db, loaded, reload } = useLoad(load, { m: null as Motivation | null, exercises: [] as Exercise[] });
  const [share, setShare] = useState<ShareCardContent | null>(null);
  const m = data.m;
  const byId = new Map(data.exercises.map((e) => [e.id, e]));

  // Angesehen = nicht mehr neu (Hinweis auf „Heute“ verschwindet).
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
  const current = m.weeks.at(-1);

  const milestoneCard = (ms: Milestone): ShareCardContent => ({
    eyebrow: t('milestones.eyebrow'),
    value: t(`milestones.value.${ms.id}`),
    title: t(`milestones.name.${ms.id}`),
    lines: [detail(ms), formatDay(ms.day)].filter((x): x is string => !!x),
  });

  return (
    <Screen withHeader>
      {m.showBalance && m.goal ? (
        <Card title={t('balance.title')}>
          {current ? <ThemedText>{t(`balance.current.${current.status}`, { trained: current.trained, goal: current.goal })}</ThemedText> : null}
          <ThemedText>{t('balance.last4', { done: m.last4.done, counted: m.last4.counted })}</ThemedText>
          <ThemedText>{t('balance.month', { done: m.month.done, counted: m.month.counted })}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('balance.total', { done: m.total.done, counted: m.total.counted })}
          </ThemedText>
          <View style={styles.weeks} accessible accessibilityLabel={t('balance.weeksLabel')}>
            {m.weeks.slice(-12).map((w) => (
              <View
                key={w.start}
                style={[
                  styles.week,
                  {
                    backgroundColor: w.status === 'geschafft' ? theme.accent : 'transparent',
                    borderColor: w.status === 'pausiert' ? theme.textSecondary : theme.backgroundSelected,
                    borderStyle: w.status === 'pausiert' ? 'dashed' : 'solid',
                  },
                ]}
              />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t('balance.hint', { goal: m.goal })}
          </ThemedText>
          <ListRow
            title={t('balance.shareMonth')}
            accessory="›"
            last
            onPress={() =>
              setShare({
                eyebrow: t('balance.eyebrow'),
                value: `${m.month.done}/${m.month.counted}`,
                title: t('balance.shareTitle'),
                lines: [t('balance.shareLine', { done: m.last4.done, counted: m.last4.counted })],
              })
            }
          />
        </Card>
      ) : null}

      {share ? (
        <Card title={t('shareCard.title')}>
          <ShareCard content={share} />
        </Card>
      ) : null}

      <Card title={t('milestones.title')}>
        {m.milestones.length === 0 ? <ThemedText type="small">{t('milestones.none')}</ThemedText> : null}
        {[...m.milestones].reverse().map((ms) => (
          <ListRow
            key={ms.id}
            icon="target"
            title={t(`milestones.name.${ms.id}`)}
            subtitle={[detail(ms), formatDay(ms.day)].filter(Boolean).join(' · ')}
            accessory="⇪"
            onPress={() => setShare(milestoneCard(ms))}
          />
        ))}
        {MILESTONES.filter((id) => !reached.has(id))
          .slice(0, 3)
          .map((id) => (
            <ThemedText key={id} type="small" themeColor="textSecondary">
              {t('milestones.next', { name: t(`milestones.name.${id}`) })}
            </ThemedText>
          ))}
      </Card>

      <Card>
        <Choice
          label={t('balance.toggle')}
          options={['an', 'aus'] as const}
          value={m.showBalance ? 'an' : 'aus'}
          onChange={async (v) => {
            await saveBalanceOn(db, v === 'an');
            await reload();
          }}
          format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('balance.toggleHint')}
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weeks: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: Spacing.one },
  week: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5 },
});
