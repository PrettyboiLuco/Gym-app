import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, Card } from "@/components/card";
import { Field } from "@/components/fields";
import { exerciseName } from "@/components/exercise-name";
import { haptic } from "@/components/haptics";
import { Icon } from "@/components/icon";
import { todayDay } from "@/components/nutrition-format";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import {
  FigureStrip,
  WeekStrip,
  type WeekDay,
} from "@/components/today-widgets";
import { DisplayFont, Spacing } from "@/constants/theme";
import type { Db } from "@/data/db";
import { useUnits } from "@/data/profile-provider";
import { timedSessionsForWorkout } from "@/data/routines";
import {
  getSession,
  listExercises,
  listSessionSets,
  planHintsForSession,
  previousBests,
  setSessionNote,
  type Exercise,
  type PlanHint,
  type SessionInfo,
} from "@/data/training";
import { bestOneRepMax, loadModeOf } from "@/domain/logger";
import { CardioRow } from "@/components/cardio-row";
import { listCardioForSession, type CardioEntry } from "@/data/cardio";
import { loadTrainingWeek, type TrainingWeek } from "@/data/training-week";
import { findRecords, summarize, type Record } from "@/domain/summary";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLoad } from "@/hooks/use-load";
import { useTheme } from "@/hooks/use-theme";
import { formatNumber, formatWeight, t } from "@/i18n";

/**
 * Abschluss nach einem Training: ein verdienter Moment, gebaut nur aus den echten Sätzen.
 * Leitfrage: „Was habe ich heute geschafft?“ – Antwort groß (Dauer, Sätze, bewegtes Gewicht),
 * darunter neue Bestleistungen (nur gegenüber früheren Trainings) und die Trainingswoche mit dem heutigen Tag.
 * Einmal beim Öffnen ein Erfolgs-Signal (bei Bestleistung deutlicher).
 */
async function loadSummary(db: Db, id: string) {
  const [session, sets, exercises, week, blocks, hints] = await Promise.all([
    getSession(db, id),
    listSessionSets(db, id),
    listExercises(db),
    loadTrainingWeek(db, todayDay()),
    timedSessionsForWorkout(db, id),
    planHintsForSession(db, id),
  ]);
  const cardio = (await listCardioForSession(db, id)).filter(
    (c) => c.completedAt,
  );
  const done = sets.filter((s) => s.completedAt);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const modeOf = (exerciseId: string) => {
    const e = byId.get(exerciseId);
    return e ? loadModeOf(e) : "normal";
  };
  const records = session
    ? findRecords(
        done,
        await previousBests(
          db,
          [...new Set(done.map((s) => s.exerciseId))],
          id,
          session.startedAt,
        ),
        modeOf,
      )
    : [];
  // Geschätztes 1RM je Übung dieses Trainings (A1), für die Bestleistungen.
  const e1rm: { [exerciseId: string]: number | null } = {};
  for (const exerciseId of new Set(done.map((s) => s.exerciseId))) {
    e1rm[exerciseId] = bestOneRepMax(
      done.filter((s) => s.exerciseId === exerciseId),
      modeOf(exerciseId),
    );
  }
  const cooldownOffered =
    session?.cooldown !== 0 && !blocks.some((b) => b.kind === "cooldown");
  return {
    session,
    summary: session
      ? summarize(done, session.startedAt, session.finishedAt, modeOf)
      : null,
    records,
    e1rm,
    cardio,
    exercises,
    hints,
    week,
    cooldownOffered,
    loaded: true,
  };
}

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const dark = useColorScheme() === "dark";
  const units = useUnits();
  const { data, db } = useLoad(
    (d) => loadSummary(d, id),
    {
      session: null as SessionInfo | null,
      summary: null as ReturnType<typeof summarize> | null,
      records: [] as Record[],
      e1rm: {} as { [exerciseId: string]: number | null },
      cardio: [] as CardioEntry[],
      exercises: [] as Exercise[],
      hints: {} as { [exerciseId: string]: PlanHint },
      week: {
        done: [],
        planned: [],
        goal: null,
        todayIndex: 0,
      } as TrainingWeek,
      cooldownOffered: false,
      loaded: false,
    },
    id,
  );
  const {
    session,
    summary,
    records,
    e1rm,
    cardio,
    exercises,
    hints,
    week,
    cooldownOffered,
    loaded,
  } = data;
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    haptic.success();
  }, [loaded]);

  if (!session || !summary) return <Screen withHeader>{null}</Screen>;

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const nameOf = (exerciseId: string) =>
    hints[exerciseId]?.label || exerciseName(byId.get(exerciseId));
  const dayLabels = [1, 2, 3, 4, 5, 6, 7].map((d) =>
    t(`reminders.dayShort.${d}`),
  );
  const days: WeekDay[] = dayLabels.map((label, i) => ({
    label,
    done: !!week.done[i],
    planned: !!week.planned[i],
    today: i === week.todayIndex,
  }));
  const doneDays = week.done.filter(Boolean).length;
  const weekSummary = week.goal
    ? t("today.weekSummaryGoal", { count: doneDays, goal: week.goal })
    : t("today.weekSummary", { count: doneDays });
  const volume = formatWeight(summary.volumeKg, units.weight, 0);
  const recordText = (r: Record) =>
    r.kind === "gewicht"
      ? t("summary.recordWeight", {
          value: `${formatWeight(r.weightKg, units.weight, 2)} × ${r.reps}`,
          before: formatWeight(r.previousKg, units.weight, 2),
        })
      : r.kind === "wiederholungen"
        ? t("summary.recordReps", {
            value:
              r.weightKg > 0
                ? `${formatWeight(r.weightKg, units.weight, 2)} × ${r.reps}`
                : t("summary.reps", { count: r.reps }),
            before: r.previousReps,
          })
        : r.kind === "weniger"
          ? t("summary.recordAssist", {
              value: `${formatWeight(r.weightKg, units.weight, 2)} × ${r.reps}`,
              before: formatWeight(r.previousKg, units.weight, 2),
            })
          : t("summary.recordTime", {
              seconds: r.seconds,
              before: r.previousSeconds,
            });
  const e1rmText = (r: Record) =>
    (r.kind === "gewicht" || r.kind === "wiederholungen") && e1rm[r.exerciseId]
      ? ` · ${t("summary.e1rm", { value: formatWeight(e1rm[r.exerciseId]!, units.weight, 1) })}`
      : "";

  return (
    <Screen withHeader>
      <View style={styles.head} accessibilityRole="header">
        <ThemedText themeColor="textSecondary">
          {session.dayName
            ? `${session.planName} – ${session.dayName}`
            : t("session.free")}
        </ThemedText>
        <ThemedText type="title">
          {records.length > 0 ? t("summary.titleRecord") : t("summary.title")}
        </ThemedText>
      </View>

      <FigureStrip
        figures={
          summary.sets === 0 && cardio.length > 0
            ? [
                {
                  label: t("summary.duration"),
                  value:
                    summary.minutes === null
                      ? null
                      : formatNumber(summary.minutes, 0),
                  unit: "min",
                  accessibilityLabel: `${t("summary.duration")} ${summary.minutes ?? "–"} min`,
                  onPress: () => router.push("/training/history"),
                },
                {
                  label: t("cardio.title"),
                  value: formatNumber(
                    cardio.reduce((m, c) => m + (c.minutes ?? 0), 0),
                    0,
                  ),
                  unit: "min",
                  accessibilityLabel: `${t("cardio.title")} ${cardio.reduce((m, c) => m + (c.minutes ?? 0), 0)} min`,
                  onPress: () => router.push("/training/history"),
                },
                {
                  label: t("cardio.distance"),
                  value: cardio.some((c) => c.distanceKm != null)
                    ? formatNumber(
                        cardio.reduce((m, c) => m + (c.distanceKm ?? 0), 0),
                        1,
                      )
                    : null,
                  unit: "km",
                  accessibilityLabel: t("cardio.distance"),
                  onPress: () => router.push("/training/history"),
                },
              ]
            : [
                {
                  label: t("summary.duration"),
                  value:
                    summary.minutes === null
                      ? null
                      : formatNumber(summary.minutes, 0),
                  unit: "min",
                  accessibilityLabel: `${t("summary.duration")} ${summary.minutes ?? "–"} min`,
                  onPress: () => router.push("/training/history"),
                },
                {
                  label: t("summary.sets"),
                  value: String(summary.sets),
                  sub: t("summary.exercises", { count: summary.exercises }),
                  accessibilityLabel: `${t("summary.sets")} ${summary.sets}, ${t("summary.exercises", { count: summary.exercises })}`,
                  onPress: () => router.push(`/training/session/${id}`),
                },
                {
                  label: t("summary.volume"),
                  value: volume.replace(/\s*\S+$/, ""),
                  unit: units.weight,
                  accessibilityLabel: `${t("summary.volume")} ${volume}`,
                  onPress: () => router.push(`/training/session/${id}`),
                },
              ]
        }
      />

      {records.length > 0 ? (
        <Card title={t("summary.recordsTitle", { count: records.length })}>
          {records.map((r) => (
            <Pressable
              key={r.exerciseId}
              accessibilityRole="button"
              accessibilityLabel={`${nameOf(r.exerciseId)}: ${recordText(r)}. ${t("exerciseProgress.open")}`}
              onPress={() => router.push(`/training/exercise/${r.exerciseId}`)}
              style={({ pressed }) => [
                styles.record,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.recordMark,
                  { backgroundColor: dark ? theme.accent : theme.tint },
                ]}
              >
                <ThemedText
                  style={[
                    styles.recordMarkText,
                    { color: dark ? theme.onAccent : theme.onTint },
                  ]}
                >
                  ↑
                </ThemedText>
              </View>
              <View style={styles.flex}>
                <ThemedText style={styles.recordName}>
                  {nameOf(r.exerciseId)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {recordText(r)}
                  {e1rmText(r)}
                </ThemedText>
              </View>
              <Icon
                name="chevron"
                color={theme.textSecondary}
                size={18}
                strokeWidth={2}
              />
            </Pressable>
          ))}
        </Card>
      ) : null}

      {cardio.length > 0 ? (
        <Card title={t("cardio.title")}>
          {cardio.map((c, i) => (
            <CardioRow
              key={c.id}
              entry={c}
              active={false}
              last={i === cardio.length - 1}
            />
          ))}
        </Card>
      ) : null}

      <Card title={t("summary.noteTitle")}>
        <Field
          label={t("summary.noteLabel")}
          value={note ?? session.note ?? ""}
          onChangeText={setNote}
          onEndEditing={() =>
            note !== null ? setSessionNote(db, id, note) : undefined
          }
          placeholder={t("summary.notePlaceholder")}
          multiline
        />
      </Card>

      <Card title={t("summary.weekTitle")}>
        <WeekStrip days={days} summary={weekSummary} celebrateToday />
      </Card>

      <View style={styles.actions}>
        {cooldownOffered ? (
          <Button
            label={t("summary.cooldown")}
            variant="secondary"
            onPress={() => router.replace(`/training/session/${id}`)}
          />
        ) : null}
        <Button
          label={t("summary.done")}
          onPress={() => router.dismissTo("/training")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one, paddingTop: Spacing.two },
  record: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    minHeight: 48,
  },
  recordMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  recordMarkText: {
    fontFamily: DisplayFont.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  recordName: { fontSize: 16, lineHeight: 22, fontWeight: 600 },
  flex: { flex: 1 },
  actions: { gap: Spacing.three },
});
