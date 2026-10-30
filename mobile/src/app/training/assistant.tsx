import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/card';
import { exerciseName, exerciseSynonyms } from '@/components/exercise-name';
import { Choice, Field, ListRow, MultiChoice, Presets } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { dayLabel, extraSecondsFor } from '@/components/planner-helpers';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { loadPlannerPrefs, savePlannerPrefs, type PlannerPrefs } from '@/data/planner';
import { useProfile } from '@/data/profile-provider';
import { useDb } from '@/data/store-provider';
import {
  activatePlanVersion,
  activeVersion,
  archivePlan,
  listActivePlans,
  listExercises,
  loadPlanDraft,
  savePlan,
  type Exercise,
  type PlanSummary,
} from '@/data/training';
import { EQUIPMENT, type Equipment, type Level } from '@/domain/exercises';
import {
  buildTemplate,
  canApply,
  GOALS,
  LEVELS,
  MINUTE_PRESETS,
  MINUTES_RANGE,
  rebuildPlan,
  SPLITS,
  temporaryEnd,
  type PlanProposal,
  type SplitChoice,
  type TrainingGoal,
} from '@/domain/planner';
import { formatClock, parseWholeNumber, type PlanDraft } from '@/domain/training';
import { DURATIONS, isEmptyWish, parseWish, validateWish, type Duration, type Wish } from '@/domain/wish';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t, tOptional } from '@/i18n';

type Mode = 'umbau' | 'vorlage';
type Status = 'frei' | 'behalten' | 'ersetzen';
const DAY_OPTIONS = ['2', '3', '4', '5', '6'] as const;
const SPLIT_OPTIONS: readonly SplitChoice[] = ['auto', ...SPLITS];

type Applied = { planId: string; previousVersionId: string | null };

async function loadBase(db: Db) {
  const [plans, exercises, prefs] = await Promise.all([listActivePlans(db), listExercises(db), loadPlannerPrefs(db)]);
  return { plans, exercises, prefs };
}

/** Planassistent (Phase 8): Plan umbauen oder Vorlage, Vorschau mit Gründen, erst dann übernehmen. */
export default function AssistantScreen() {
  // `dauer=woche`: aus „Woche ausgefallen? Neu planen“ (TRAIN-015).
  const params = useLocalSearchParams<{ plan?: string; dauer?: string }>();
  const db = useDb();
  const theme = useTheme();
  const { profile } = useProfile();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [prefs, setPrefs] = useState<PlannerPrefs | null>(null);
  const [mode, setMode] = useState<Mode>('umbau');
  const [planId, setPlanId] = useState<string | null>(params.plan ?? null);
  const [current, setCurrent] = useState<PlanDraft | null>(null);
  const [days, setDays] = useState('3');
  const [minutes, setMinutes] = useState(String(profile.sessionMinutes ?? 60));
  const [split, setSplit] = useState<SplitChoice>('auto');
  const [duration, setDuration] = useState<Duration>(params.dauer === 'woche' ? 'woche' : 'dauerhaft');
  const [goal, setGoal] = useState<TrainingGoal>(profile.trainingGoal ?? 'muskelaufbau');
  const [experience, setExperience] = useState<Level>(profile.experience ?? 'einsteiger');
  const [available, setAvailable] = useState<Equipment[]>(profile.equipment ?? [...EQUIPMENT]);
  const [blockedEquipment, setBlockedEquipment] = useState<Equipment[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [planName, setPlanName] = useState('');
  const [wishText, setWishText] = useState('');
  const [wishMessages, setWishMessages] = useState<string[]>([]);
  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [openHow, setOpenHow] = useState<string | null>(null);
  const [applied, setApplied] = useState<Applied | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBase(db).then((data) => {
      if (cancelled) return;
      setPlans(data.plans);
      setExercises(data.exercises);
      setPrefs(data.prefs);
      setBlockedEquipment(data.prefs.blockedEquipment);
      if (data.plans.length === 0) setMode('vorlage');
      else setPlanId((id) => (id && data.plans.some((p) => p.planId === id) ? id : data.plans[0].planId));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Bisherigen Plan laden; Status der Übungen aus den gemerkten Einstellungen.
  useEffect(() => {
    if (!planId || !prefs) return;
    let cancelled = false;
    loadPlanDraft(db, planId).then((draft) => {
      if (cancelled || !draft) return;
      setCurrent(draft);
      setDays(String(Math.min(6, Math.max(2, draft.days.length))));
      const ids = [...new Set(draft.days.flatMap((d) => d.items.map((i) => i.exerciseId)))];
      setStatus(
        Object.fromEntries(
          ids.map((id) => [id, prefs.locked.includes(id) ? 'behalten' : prefs.blockedExercises.includes(id) ? 'ersetzen' : 'frei'])
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [db, planId, prefs]);

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const nameOf = (id: string) => exerciseName(byId.get(id));
  const dayCount = Number(days);
  const minuteValue = parseWholeNumber(minutes) ?? 0;
  const planExercises = Object.keys(status);
  const locked = planExercises.filter((id) => status[id] === 'behalten');
  const blockedExercises = planExercises.filter((id) => status[id] === 'ersetzen');
  const endDate = duration === 'dauerhaft' ? null : temporaryEnd(duration, todayDay());

  /** Jede Änderung am Rahmen macht eine alte Vorschau ungültig. */
  function edit<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setProposal(null);
      setApplied(null);
    };
  }

  function applyWish() {
    const names = exercises.flatMap((e) => [exerciseName(e), ...exerciseSynonyms(e)].map((name) => ({ id: e.id, name })));
    const parsed = parseWish(wishText, names);
    if (isEmptyWish(parsed)) {
      setWishMessages([t('assistant.wishNone')]);
      return;
    }
    // Dieselbe Prüfung, die später auch eine KI-Antwort durchlaufen muss (TRAIN-020).
    const { wish, problems } = validateWish(parsed, new Set(exercises.map((e) => e.id)));
    const usable: Wish = wish ?? validateWish(dropInvalid(parsed), new Set(exercises.map((e) => e.id))).wish ?? {};
    const found: string[] = [];
    if (usable.days) {
      setDays(String(usable.days));
      found.push(t('assistant.wishParts.days', { value: usable.days }));
    }
    if (usable.minutes) {
      setMinutes(String(usable.minutes));
      found.push(t('assistant.wishParts.minutes', { value: usable.minutes }));
    }
    if (usable.split) {
      setSplit(usable.split);
      found.push(t(`split.${usable.split}`));
    }
    if (usable.duration && mode === 'umbau') {
      setDuration(usable.duration);
      found.push(t(`assistant.wishParts.duration.${usable.duration}`));
    }
    if (usable.blockedEquipment?.length) {
      if (mode === 'vorlage') setAvailable((a) => a.filter((e) => !usable.blockedEquipment!.includes(e)));
      else setBlockedEquipment((b) => [...new Set([...b, ...usable.blockedEquipment!])]);
      found.push(t('assistant.wishParts.blockedEquipment', { value: usable.blockedEquipment.map((e) => t(`equipment.${e}`)).join(', ') }));
    }
    const setMany = (ids: string[] | undefined, value: Status, key: 'blockedExercises' | 'lockedExercises') => {
      const inPlan = (ids ?? []).filter((id) => id in status);
      if (inPlan.length === 0) return;
      setStatus((s) => ({ ...s, ...Object.fromEntries(inPlan.map((id) => [id, value])) }));
      found.push(t(`assistant.wishParts.${key}`, { value: inPlan.map(nameOf).join(', ') }));
    };
    setMany(usable.blockedExercises, 'ersetzen', 'blockedExercises');
    setMany(usable.lockedExercises, 'behalten', 'lockedExercises');
    const lines = found.length > 0 ? [t('assistant.wishFound', { list: found.join(' · ') })] : [t('assistant.wishNone')];
    if (problems.length > 0) lines.push(t('assistant.wishRejected', { list: problems.map((p) => t(`assistant.wishProblems.${p}`)).join(', ') }));
    if (usable.keepFavorites && locked.length === 0) lines.push(t('assistant.wishFavorites'));
    if (usable.pain) lines.push(t('assistant.wishPain'));
    setWishMessages(lines);
    setProposal(null);
    setApplied(null);
  }

  function preview() {
    const shared = {
      exercises,
      days: dayCount,
      minutes: minuteValue,
      split,
      dayName: dayLabel,
      extraSeconds: extraSecondsFor(exercises),
    };
    if (mode === 'umbau' && current) {
      setProposal(rebuildPlan({ ...shared, current, locked, blockedEquipment, blockedExercises }));
    } else {
      const name = planName.trim() || t('assistant.planNameDefault', { split: t(`split.${split === 'auto' ? 'ganzkoerper' : split}`), days: dayCount });
      const result = buildTemplate({ ...shared, goal, experience, available, blockedEquipment: [], blockedExercises: [], planName: name });
      // Name passend zur tatsächlich gewählten Aufteilung, falls nichts eingetragen wurde.
      if (!planName.trim()) result.draft.name = t('assistant.planNameDefault', { split: t(`split.${result.decision.split}`), days: dayCount });
      setProposal(result);
    }
    setApplied(null);
    setMessage(null);
  }

  async function apply() {
    if (!proposal || !canApply(proposal)) return;
    if (mode === 'umbau' && planId && current) {
      const previous = await activeVersion(db, planId);
      // Aus einer befristeten Fassung heraus geändert: zurück geht es trotzdem zur gewohnten Fassung.
      const returnVersionId = previous?.validUntil ? previous.returnVersionId : (previous?.id ?? null);
      await savePlan(db, planId, proposal.draft, {
        note: t('assistant.note', { from: current.days.length, to: proposal.draft.days.length }),
        validUntil: endDate,
        returnVersionId,
      });
      await savePlannerPrefs(db, { locked, blockedEquipment, blockedExercises });
      setApplied({ planId, previousVersionId: previous?.id ?? null });
      setMessage(t('assistant.applied'));
    } else {
      const id = await savePlan(db, null, proposal.draft, { note: t('assistant.noteTemplate', { split: t(`split.${proposal.decision.split}`) }) });
      setApplied({ planId: id, previousVersionId: null });
      setMessage(t('assistant.appliedNew'));
    }
  }

  async function undo() {
    if (!applied) return;
    if (applied.previousVersionId) await activatePlanVersion(db, applied.planId, applied.previousVersionId);
    else await archivePlan(db, applied.planId);
    setApplied(null);
    setProposal(null);
    setMessage(t('assistant.undone'));
  }

  return (
    <Screen withHeader>
      {plans.length > 0 ? (
        <Card>
          <Choice
            label={t('assistant.mode')}
            options={['umbau', 'vorlage'] as const}
            value={mode}
            onChange={edit(setMode)}
            format={(v) => t(`assistant.modeOption.${v}`)}
          />
          {mode === 'umbau' && plans.length > 1 ? (
            <Choice
              label={t('assistant.plan')}
              options={plans.map((p) => p.planId)}
              value={planId ?? plans[0].planId}
              onChange={edit(setPlanId)}
              format={(id) => plans.find((p) => p.planId === id)?.name ?? id}
            />
          ) : null}
        </Card>
      ) : (
        <ThemedText themeColor="textSecondary">{t('assistant.noPlans')}</ThemedText>
      )}

      <Card title={t('assistant.wishTitle')}>
        <Field
          label={t('assistant.wishTitle')}
          placeholder={t('assistant.wishPlaceholder')}
          value={wishText}
          onChangeText={setWishText}
          maxLength={500}
          multiline
        />
        <Button label={t('assistant.wishApply')} variant="danger" onPress={applyWish} disabled={!wishText.trim()} />
        {wishMessages.map((line) => (
          <ThemedText key={line} type="small">
            {line}
          </ThemedText>
        ))}
        <ThemedText type="small" themeColor="textSecondary">
          {t('assistant.wishHint')}
        </ThemedText>
      </Card>

      <Card title={t('assistant.frameTitle')}>
        <Choice label={t('assistant.days')} options={DAY_OPTIONS} value={days as (typeof DAY_OPTIONS)[number]} onChange={edit(setDays)} format={(v) => v} />
        <Field label={t('assistant.minutes')} value={minutes} onChangeText={edit(setMinutes)} keyboardType="number-pad" />
        <Presets
          label={t('assistant.minutes')}
          options={MINUTE_PRESETS}
          value={parseWholeNumber(minutes) ?? undefined}
          format={(m) => t('common.minutes', { value: m })}
          onChange={(m) => edit(setMinutes)(String(m))}
        />
        <Choice
          label={t('assistant.split')}
          options={SPLIT_OPTIONS}
          value={split}
          onChange={edit(setSplit)}
          format={(v) => (v === 'auto' ? t('split.auto') : `${t(`split.${v}`)} (${t(`split.fits.${v}`)})`)}
        />
        {mode === 'umbau' ? (
          <>
            <Choice
              label={t('assistant.duration')}
              options={DURATIONS}
              value={duration}
              onChange={edit(setDuration)}
              format={(v) => t(`assistant.durationOption.${v}`)}
            />
            {endDate ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('assistant.durationHint', { date: formatDay(nextDay(endDate)) })}
              </ThemedText>
            ) : null}
          </>
        ) : (
          <>
            <Choice label={t('assistant.goal')} options={GOALS} value={goal} onChange={edit(setGoal)} format={(v) => t(`trainingGoal.${v}`)} />
            <Choice label={t('assistant.experience')} options={LEVELS} value={experience} onChange={edit(setExperience)} format={(v) => t(`exercises.levelOption.${v}`)} />
            <MultiChoice label={t('assistant.available')} options={EQUIPMENT} value={available} onChange={edit(setAvailable)} format={(v) => t(`equipment.${v}`)} />
            <Field label={t('assistant.planName')} value={planName} onChangeText={edit(setPlanName)} />
          </>
        )}
      </Card>

      {mode === 'umbau' && planExercises.length > 0 ? (
        <>
          <Card title={t('assistant.exercisesTitle')}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('assistant.exercisesHint')}
            </ThemedText>
            {planExercises.map((id) => (
              <Choice
                key={id}
                label={nameOf(id)}
                options={['frei', 'behalten', 'ersetzen'] as const}
                value={status[id]}
                onChange={(value) => edit(setStatus)({ ...status, [id]: value })}
                format={(v) => t(`assistant.exerciseOption.${v}`)}
              />
            ))}
          </Card>
          <Card title={t('assistant.blockedTitle')}>
            <MultiChoice
              label={t('assistant.blockedHint')}
              options={EQUIPMENT.filter((e) => e !== 'koerpergewicht')}
              value={blockedEquipment}
              onChange={edit(setBlockedEquipment)}
              format={(v) => t(`equipment.${v}`)}
            />
          </Card>
        </>
      ) : null}

      <Button label={t('assistant.preview')} onPress={preview} disabled={mode === 'umbau' && !current} />

      {proposal ? (
        <ProposalView
          proposal={proposal}
          mode={mode}
          dayCount={dayCount}
          budget={minuteValue}
          nameOf={nameOf}
          openHow={openHow}
          setOpenHow={setOpenHow}
          beginner={mode === 'vorlage' && experience === 'einsteiger'}
          homeOnly={mode === 'vorlage' && available.every((e) => e === 'koerpergewicht')}
        />
      ) : null}

      {proposal && !applied ? (
        <>
          <Button label={t('assistant.apply')} onPress={apply} disabled={!canApply(proposal)} />
          <Button label={t('assistant.discard')} variant="danger" onPress={() => setProposal(null)} />
        </>
      ) : null}

      {message ? (
        <Card>
          <ThemedText>{message}</ThemedText>
          {applied ? (
            <>
              <Button label={t('assistant.openPlan')} onPress={() => router.replace(`/training/plan/${applied.planId}`)} />
              <Button label={t('assistant.undo')} variant="danger" onPress={undo} />
            </>
          ) : null}
        </Card>
      ) : null}
      {minuteValue > 0 && (minuteValue < MINUTES_RANGE.min || minuteValue > MINUTES_RANGE.max) ? (
        <ThemedText style={{ color: theme.danger }}>{t('assistant.conflicts.minuten')}</ThemedText>
      ) : null}
    </Screen>
  );
}

function ProposalView({
  proposal,
  mode,
  dayCount,
  budget,
  nameOf,
  openHow,
  setOpenHow,
  beginner,
  homeOnly,
}: {
  proposal: PlanProposal;
  mode: Mode;
  dayCount: number;
  budget: number;
  nameOf: (id: string) => string;
  openHow: string | null;
  setOpenHow: (id: string | null) => void;
  beginner: boolean;
  homeOnly: boolean;
}) {
  const theme = useTheme();
  const { decision } = proposal;
  return (
    <>
      <Card title={t('assistant.previewTitle')}>
        <ThemedText type="small">
          {decision.fits
            ? t('assistant.splitUsed', { split: t(`split.${decision.split}`) })
            : t('assistant.splitNote', {
                requested: t(`split.${decision.requested}`),
                fits: t(`split.fits.${decision.requested}`),
                days: dayCount,
                split: t(`split.${decision.split}`),
              })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('assistant.disclaimer')}
        </ThemedText>
      </Card>

      {proposal.conflicts.length > 0 ? (
        <Card title={t('assistant.conflictsTitle')}>
          {proposal.conflicts.map((c, i) => (
            <ThemedText key={i} style={{ color: theme.danger }}>
              {c.kind === 'zeit'
                ? t('assistant.conflicts.zeit', { day: c.day, minutes: c.minutes, budget: c.budget, locked: c.lockedMinutes })
                : c.kind === 'gesperrtNichtVerfuegbar'
                  ? t('assistant.conflicts.gesperrtNichtVerfuegbar', { name: nameOf(c.exerciseId) })
                  : c.kind === 'leererTag'
                    ? t('assistant.conflicts.leererTag', { day: c.day })
                    : t(`assistant.conflicts.${c.kind}`)}
            </ThemedText>
          ))}
        </Card>
      ) : null}

      {mode === 'umbau' && proposal.changes.length > 0 ? (
        <Card title={t('assistant.changesTitle')}>
          {proposal.changes.map((c) => (
            <ListRow
              key={c.exerciseId}
              title={`${nameOf(c.exerciseId)}: ${t(`assistant.change.${c.kind}`)}`}
              subtitle={[
                c.replacedBy ? t('assistant.changeReplaced', { name: nameOf(c.replacedBy) }) : null,
                c.kind !== 'behalten' && c.toDays.length > 0
                  ? t('assistant.changeDays', { from: [...new Set(c.fromDays)].join(', '), to: [...new Set(c.toDays)].join(', ') })
                  : null,
                c.toDays.length > 0 && c.toDays.length !== c.fromDays.length
                  ? t('assistant.changeFrequency', { from: c.fromDays.length, to: c.toDays.length })
                  : null,
                c.toSets > 0 && c.toSets !== c.fromSets ? t('assistant.changeSets', { from: c.fromSets, to: c.toSets }) : null,
                c.reasons.length > 0 ? c.reasons.map((r) => t(`assistant.reason.${r}`)).join(', ') : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
          {proposal.additions.map((a, i) => (
            <ThemedText key={i} type="small">
              {t('assistant.added', { name: nameOf(a.exerciseId), day: a.day })}
            </ThemedText>
          ))}
        </Card>
      ) : null}

      {beginner ? (
        <Card title={t('assistant.beginnerTitle')}>
          <ThemedText type="small">{t('assistant.beginner')}</ThemedText>
        </Card>
      ) : null}
      {homeOnly ? <ThemedText type="small" themeColor="textSecondary">{t('assistant.homeHint')}</ThemedText> : null}

      {proposal.draft.days.map((day, i) => (
        <Card key={i} title={t('assistant.dayTitle', { day: day.name, minutes: proposal.dayMinutes[i], budget })}>
          {day.items.map((item, j) => {
            const how = tOptional(`exerciseHow.${item.exerciseId}`);
            const key = `${i}-${j}`;
            return (
              <ListRow
                key={key}
                title={nameOf(item.exerciseId)}
                subtitle={[
                  item.targetSeconds != null
                    ? t('assistant.itemSeconds', { sets: item.sets, seconds: item.targetSeconds, rest: formatClock(item.restSeconds * 1000) })
                    : t('assistant.itemLine', { sets: item.sets, reps: `${item.repsMin}–${item.repsMax}`, rest: formatClock(item.restSeconds * 1000) }),
                  openHow === key ? how : null,
                ]
                  .filter(Boolean)
                  .join('\n')}
                accessory={how ? (openHow === key ? '▴' : 'ⓘ') : undefined}
                onPress={how ? () => setOpenHow(openHow === key ? null : key) : undefined}
              />
            );
          })}
        </Card>
      ))}
    </>
  );
}

/** Ungültige Teile eines Wunschs weglassen, den Rest behalten. */
function dropInvalid(wish: Wish): Wish {
  const copy: Wish = { ...wish };
  if (copy.days !== undefined && (copy.days < 2 || copy.days > 6)) delete copy.days;
  if (copy.minutes !== undefined && (copy.minutes < MINUTES_RANGE.min || copy.minutes > MINUTES_RANGE.max)) delete copy.minutes;
  return copy;
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
