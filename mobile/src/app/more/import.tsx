import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { ExercisePicker } from '@/components/exercise-picker';
import { Choice, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { pickTextFile } from '@/data/backup-files';
import { importTraining, importWeights, suggestChoices, type ExerciseChoice } from '@/data/import';
import { useDb } from '@/data/store-provider';
import { listExercises, type Exercise } from '@/data/training';
import { isCardioSet, parseTrainingCsv, parseWeightCsv, strengthExercises, type TrainingImport, type WeightRow } from '@/domain/import-csv';
import { localDay } from '@/domain/time';
import { timeZone } from '@/components/nutrition-format';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, t } from '@/i18n';

type Kind = 'training' | 'gewicht';
type Choices = Record<string, ExerciseChoice & { score?: number }>;

const dayOf = (iso: string) => localDay(new Date(iso), timeZone);

/** Import aus Strong/Hevy und Gewichts-CSV (Ausbauplan A5.3/A5.4): Vorschau, Übungen zuordnen, dann übernehmen. */
export default function ImportScreen() {
  const db = useDb();
  const theme = useTheme();
  const [kind, setKind] = useState<Kind>('training');
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [training, setTraining] = useState<{ imp: TrainingImport; duplicates: number } | null>(null);
  const [weights, setWeights] = useState<WeightRow[] | null>(null);
  const [choices, setChoices] = useState<Choices>({});
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  function reset() {
    setTraining(null);
    setWeights(null);
    setChoices({});
    setPicking(null);
  }

  async function choose() {
    setMessage(null);
    reset();
    let text: string | null;
    try {
      text = await pickTextFile();
    } catch {
      setMessage({ text: t('importCsv.problems.lesen'), error: true });
      return;
    }
    if (text === null) return;
    if (kind === 'gewicht') {
      const r = parseWeightCsv(text);
      if ('error' in r) setMessage({ text: t(`importCsv.problems.${r.error}`), error: true });
      else setWeights(r);
      return;
    }
    const r = parseTrainingCsv(text, unit);
    if ('error' in r) {
      setMessage({ text: t(`importCsv.problems.${r.error}`), error: true });
      return;
    }
    const existing = new Set(
      (await db.getAllAsync<{ at: string }>('SELECT started_at_utc AS at FROM workout_session')).map((x) => new Date(x.at).toISOString())
    );
    setExercises((await listExercises(db)).filter((e) => e.kind === 'kraft'));
    setChoices(await suggestChoices(db, strengthExercises(r)));
    setTraining({ imp: r, duplicates: r.workouts.filter((w) => existing.has(w.startedAt)).length });
  }

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      if (training) {
        const r = await importTraining(db, training.imp, choices);
        setMessage({ text: t('importCsv.done', { ...r }) });
      } else if (weights) {
        const r = await importWeights(db, weights);
        setMessage({ text: t('importCsv.weightDone', r) });
      }
      reset();
    } catch {
      setMessage({ text: t('importCsv.failed'), error: true });
    } finally {
      setBusy(false);
    }
  }

  if (picking) {
    return (
      <Screen withHeader>
        <Card title={picking}>
          <Button
            label={t('importCsv.pickNew')}
            variant="secondary"
            onPress={() => {
              setChoices({ ...choices, [picking]: { kind: 'neu' } });
              setPicking(null);
            }}
          />
          <Button
            label={t('importCsv.pickSkip')}
            variant="secondary"
            onPress={() => {
              setChoices({ ...choices, [picking]: { kind: 'weglassen' } });
              setPicking(null);
            }}
          />
        </Card>
        <ExercisePicker
          exercises={exercises}
          onPick={(e) => {
            setChoices({ ...choices, [picking]: { kind: 'vorhanden', id: e.id } });
            setPicking(null);
          }}
          onCancel={() => setPicking(null)}
        />
      </Screen>
    );
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const imp = training?.imp;
  const sets = imp ? imp.workouts.reduce((n, w) => n + w.sets.filter((s) => !isCardioSet(s)).length, 0) : 0;
  const cardio = imp ? imp.workouts.reduce((n, w) => n + w.sets.filter(isCardioSet).length, 0) : 0;

  return (
    <Screen withHeader>
      <Card title={t('importCsv.title')}>
        <Choice
          label={t('importCsv.what')}
          options={['training', 'gewicht'] as const}
          value={kind}
          onChange={(v) => {
            setKind(v);
            reset();
            setMessage(null);
          }}
          format={(v) => t(`importCsv.whatOptions.${v}`)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {kind === 'training' ? t('importCsv.howTraining') : t('importCsv.howWeight')}
        </ThemedText>
        {kind === 'training' ? (
          <>
            <Choice label={t('importCsv.unit')} options={['kg', 'lb'] as const} value={unit} onChange={setUnit} format={(v) => v} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('importCsv.unitHint')}
            </ThemedText>
          </>
        ) : null}
        <Button label={t('importCsv.choose')} variant={training || weights ? 'secondary' : 'primary'} disabled={busy} onPress={choose} />
      </Card>

      {imp ? (
        <Card>
          <ThemedText>
            {t('importCsv.preview', {
              source: t(`importCsv.sources.${imp.source}`),
              workouts: imp.workouts.length,
              from: formatDay(dayOf(imp.workouts[0].startedAt)),
              to: formatDay(dayOf(imp.workouts[imp.workouts.length - 1].startedAt)),
              sets: formatNumber(sets),
              cardio,
            })}
          </ThemedText>
          {training!.duplicates ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('importCsv.duplicates', { count: training!.duplicates })}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {imp && Object.keys(choices).length ? (
        <Card title={t('importCsv.mapTitle')}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('importCsv.mapText')}
          </ThemedText>
          {Object.entries(choices).map(([name, c], i, all) => (
            <ListRow
              key={name}
              title={name}
              subtitle={
                c.kind === 'vorhanden'
                  ? `${t('importCsv.mapTo', { name: exerciseName(byId.get(c.id)) })}${c.score !== undefined ? ` · ${c.score >= 0.95 ? t('importCsv.mapSure') : t('importCsv.mapCheck')}` : ''}`
                  : c.kind === 'neu'
                    ? t('importCsv.mapNew')
                    : t('importCsv.mapSkip')
              }
              accessory="›"
              last={i === all.length - 1}
              onPress={() => setPicking(name)}
            />
          ))}
        </Card>
      ) : null}

      {weights ? (
        <Card>
          <ThemedText>
            {t('importCsv.weightPreview', { count: weights.length, from: formatDay(weights[0].day), to: formatDay(weights[weights.length - 1].day) })}
          </ThemedText>
        </Card>
      ) : null}

      {imp || weights ? <Button label={t('importCsv.import')} disabled={busy} onPress={run} /> : null}
      {message ? <ThemedText style={message.error ? { color: theme.danger } : undefined}>{message.text}</ThemedText> : null}
    </Screen>
  );
}
