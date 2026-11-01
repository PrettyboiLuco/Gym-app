import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { getSessionFeedback, setSessionFeedback } from '@/data/readiness';
import { t } from '@/i18n';

const EFFORT = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;
const THREE = ['1', '2', '3'] as const;
const ASPECTS = ['pump', 'muskelkater', 'gelenke'] as const;

type Feedback = Record<string, Record<string, number>>;

/**
 * Nach dem Training (A6.3): Anstrengung 1–10 (für die Trainingslast) und – freiwillig – je trainierter Muskelgruppe
 * Pump, Muskelkater und Gelenke (1–3). Jede Wahl wird sofort gespeichert.
 */
export function SessionFeedback({ db, sessionId, muscleGroups }: { db: Db; sessionId: string; muscleGroups: string[] }) {
  const [effort, setEffort] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getSessionFeedback(db, sessionId).then((f) => {
      setEffort(f.effort);
      setFeedback(f.feedback);
      if (Object.keys(f.feedback).length) setOpen(true);
    });
  }, [db, sessionId]);

  async function save(nextEffort: number | null, nextFeedback: Feedback) {
    setEffort(nextEffort);
    setFeedback(nextFeedback);
    await setSessionFeedback(db, sessionId, nextEffort, nextFeedback);
  }

  return (
    <Card title={t('sessionFeedback.title')}>
      <Choice
        label={t('sessionFeedback.effort')}
        options={EFFORT}
        value={effort === null ? null : (String(effort) as (typeof EFFORT)[number])}
        onChange={(v) => save(Number(v), feedback)}
        format={(v) => v}
        chips
      />
      <ThemedText type="small" themeColor="textSecondary">
        {t('sessionFeedback.effortHint')}
      </ThemedText>
      {open ? (
        muscleGroups.map((m) =>
          ASPECTS.map((a) => (
            <Choice
              key={`${m}-${a}`}
              label={`${t(`muscle.${m}`)} · ${t(`sessionFeedback.aspect.${a}`)}`}
              options={THREE}
              value={feedback[m]?.[a] ? (String(feedback[m][a]) as (typeof THREE)[number]) : null}
              onChange={(v) => save(effort, { ...feedback, [m]: { ...feedback[m], [a]: Number(v) } })}
              format={(v) => t(`sessionFeedback.level.${v}`)}
            />
          ))
        )
      ) : muscleGroups.length ? (
        <Button label={t('sessionFeedback.more')} variant="secondary" onPress={() => setOpen(true)} />
      ) : null}
    </Card>
  );
}
