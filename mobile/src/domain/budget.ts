// Wochenbudget für Kalorien (Ausbauplan B2, W1). Ohne KI: feste, prüfbare Regeln; vorläufig, Fachprüfung offen
// (docs/Fachpruefung_Mappe.md, Abschnitt M.1).
//
// Regeln Fassung 1 (03.11.2026):
// - Wochenbudget = Summe der Tagesziele Montag–Sonntag (Kalorienziel je Tag, mit Trainings-/Ruhetag des Coachs). Tage
//   ohne eigenes Ziel (Ziel erst ab Mittwoch) rechnen mit dem nächsten bekannten Tagesziel.
// - Verteilung je Wochentag über Anteile: „wie Ziel“ (die Tagesziele selbst), „Wochenende höher“ (Sa/So +15 %),
//   „Trainingstage höher“ (+10 %), „eigene Anteile“ (70–140 % je Tag). Die Wochensumme bleibt gleich (auf 10 kcal
//   gerundet, Rundungsreste nach dem größten Rest verteilt).
// - Kein Tag unter der Untergrenze max(1200, Ruheenergie) (CALC-005, energy.ts calorieFloor); was dadurch fehlt,
//   tragen die übrigen Tage anteilig.
// - Übertrag (nur wenn eingeschaltet): Plan minus Gegessenes der vollständig erfassten Vortage dieser Woche wird
//   gleichmäßig auf den gewählten und die restlichen Tage verteilt, höchstens ±300 kcal je Tag, nie unter die
//   Untergrenze. Leere, unvollständige oder als „nicht vollständig“ markierte Tage zählen nicht (fehlende Werte ≠ 0).
// - Keine Zahlen bei sensibler Situation oder „ohne Zahlen“ (wird beim Laden geprüft, data/targets-settings.ts).

export const BUDGET_RULES_VERSION = 1;

export const BUDGET_PRESETS = ['ziel', 'wochenende', 'training', 'eigen'] as const;
export type BudgetPreset = (typeof BUDGET_PRESETS)[number];

/** Eigene Anteile je Wochentag in Prozent des Tagesschnitts. */
export const SHARE_RANGE = { min: 70, max: 140, step: 5 } as const;
export const WEEKEND_PLUS = 15;
export const TRAINING_PLUS = 10;
/** Höchstens so viel Übertrag je Tag (in beide Richtungen). */
export const CARRY_MAX_PER_DAY = 300;

export type BudgetSettings = {
  enabled: boolean;
  preset: BudgetPreset;
  /** Eigene Anteile Mo–So in Prozent (nur für „eigen“). */
  shares: number[];
  carryover: boolean;
};

export const DEFAULT_BUDGET: BudgetSettings = { enabled: false, preset: 'ziel', shares: [100, 100, 100, 100, 100, 100, 100], carryover: false };

const round10 = (v: number) => Math.round(v / 10) * 10;
const clampShare = (v: number) => Math.min(SHARE_RANGE.max, Math.max(SHARE_RANGE.min, Math.round(v)));

/** Gespeicherte Einstellungen in den erlaubten Rahmen setzen (alte oder beschädigte Werte). */
export function sanitizeBudget(raw: Partial<BudgetSettings> | null | undefined): BudgetSettings {
  const s = raw ?? {};
  const shares =
    Array.isArray(s.shares) && s.shares.length === 7 && s.shares.every((v) => Number.isFinite(v)) ? s.shares.map(clampShare) : DEFAULT_BUDGET.shares;
  return {
    enabled: s.enabled === true,
    preset: BUDGET_PRESETS.includes(s.preset as BudgetPreset) ? (s.preset as BudgetPreset) : DEFAULT_BUDGET.preset,
    shares,
    carryover: s.carryover === true,
  };
}

/** Eigenen Anteil eines Wochentags (0 = Montag) um einen Schritt ändern. */
export function stepShare(shares: number[], index: number, direction: 1 | -1): number[] {
  return shares.map((v, i) => (i === index ? clampShare(v + direction * SHARE_RANGE.step) : v));
}

/** Tagesziele der Woche; Tage ohne Ziel bekommen das nächste bekannte Ziel (sonst das letzte davor). null = gar keins. */
export function fillGoals(goals: (number | null)[]): number[] | null {
  if (goals.every((g) => g === null)) return null;
  return goals.map((g, i) => g ?? goals.slice(i + 1).find((x) => x !== null) ?? [...goals.slice(0, i)].reverse().find((x) => x !== null)!);
}

/** Gewichte je Wochentag (0 = Montag) für eine Vorlage. `goals` = Tagesziele, `trainingWeekdays` 1 = Montag … 7 = Sonntag. */
export function presetWeights(preset: BudgetPreset, goals: number[], trainingWeekdays: number[], shares: number[]): number[] {
  if (preset === 'ziel') return goals;
  if (preset === 'eigen') return shares.map(clampShare);
  if (preset === 'wochenende') return goals.map((_, i) => 100 + (i >= 5 ? WEEKEND_PLUS : 0));
  // Ohne bekannte Trainingstage gleich verteilt.
  return goals.map((_, i) => 100 + (trainingWeekdays.includes(i + 1) ? TRAINING_PLUS : 0));
}

/**
 * Wochensumme nach Gewichten auf 7 Tage verteilen. Kein Tag unter `floor`; die Summe bleibt (auf 10 kcal gerundet)
 * gleich, außer das Budget reicht nicht einmal für die Untergrenze an jedem Tag – dann gilt an jedem Tag die Untergrenze.
 */
export function distributeWeek(total: number, weights: number[], floor: number): number[] {
  const n = weights.length;
  const w = weights.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  if (!w.some((v) => v > 0)) w.fill(1);
  if (total <= floor * n) return w.map(() => floor);
  // Tage unter der Untergrenze festsetzen, den Rest auf die übrigen Tage verteilen, bis nichts mehr darunter liegt.
  const fixed = new Set<number>();
  let raw: number[] = [];
  for (;;) {
    const free = w.map((v, i) => (fixed.has(i) ? 0 : v));
    const sum = free.reduce((a, b) => a + b, 0);
    const rest = total - floor * fixed.size;
    raw = w.map((_, i) => (fixed.has(i) ? floor : sum > 0 ? (rest * free[i]) / sum : rest / (n - fixed.size)));
    const below = raw.map((v, i) => (!fixed.has(i) && v < floor ? i : -1)).filter((i) => i >= 0);
    if (below.length === 0) break;
    below.forEach((i) => fixed.add(i));
  }
  // Auf 10 kcal runden (abrunden, nie unter die Untergrenze), Reste nach dem größten Bruchteil verteilen.
  const out = raw.map((v) => Math.max(floor, Math.floor(v / 10) * 10));
  let left = round10(total) - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - out[i] })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left !== 0 && k < order.length * 10; k++) {
    const i = order[k % order.length].i;
    if (left > 0) {
      out[i] += 10;
      left -= 10;
    } else if (out[i] - 10 >= floor) {
      out[i] -= 10;
      left += 10;
    }
  }
  return out;
}

/**
 * Übertrag: Plan minus Gegessenes der vollständig erfassten Tage vor `index` gleichmäßig auf `index` und die Tage
 * danach. `eaten[i] = null` heißt „zählt nicht“ (leer oder unvollständig). Ergebnis: neue Tagesziele und wie viel
 * insgesamt verschoben wurde (positiv = mehr übrig).
 */
export function applyCarryover(
  planned: number[],
  eaten: (number | null)[],
  index: number,
  floor: number,
  cap = CARRY_MAX_PER_DAY
): { targets: number[]; balance: number; carried: number } {
  let balance = 0;
  for (let i = 0; i < index; i++) if (eaten[i] !== null && eaten[i] !== undefined) balance += planned[i] - eaten[i]!;
  const remaining = planned.length - index;
  if (remaining <= 0 || balance === 0) return { targets: [...planned], balance, carried: 0 };
  const perDay = Math.max(-cap, Math.min(cap, balance / remaining));
  const targets = planned.map((p, i) => (i < index ? p : Math.max(floor, round10(p + perDay))));
  const carried = targets.reduce((s, v, i) => s + (i >= index ? v - planned[i] : 0), 0);
  return { targets, balance, carried };
}

export type BudgetDay = {
  /** Kalorien des Tages (bekannte Summe), null = keine Einträge. */
  kcal: number | null;
  /** Einträge vorhanden, alle kcal bekannt und nicht als „nicht vollständig“ markiert. */
  complete: boolean;
  /** Einträge ohne kcal-Angabe. */
  unknown: number;
};

export type WeekBudget = {
  version: number;
  /** Wochenbudget (Summe der verteilten Tagesziele). */
  total: number;
  /** Verteilte Tagesziele Mo–So ohne Übertrag. */
  planned: number[];
  /** Tagesziele mit Übertrag (ohne Übertrag = planned). */
  targets: number[];
  /** Index des gewählten Tags (0 = Montag). */
  index: number;
  /** Ziel des gewählten Tags. */
  dayTarget: number;
  /** Übertrag auf den gewählten Tag (Ziel minus Plan). */
  carriedToday: number;
  /** Bisher gegessen bis einschließlich des gewählten Tags (bekannte kcal). */
  eaten: number;
  /** Mindestens ein Eintrag ohne kcal-Angabe bis zum gewählten Tag: Summe ist „mindestens“. */
  unknown: boolean;
};

/**
 * Wochenbudget für den Tag `index` (0 = Montag) der Woche. `goals` = Kalorienziel je Tag (null = keins),
 * `days` = Gegessenes je Tag. Ohne Ziel in der ganzen Woche: null.
 */
export function planWeek(input: {
  goals: (number | null)[];
  days: BudgetDay[];
  index: number;
  trainingWeekdays: number[];
  settings: BudgetSettings;
  floor: number;
}): WeekBudget | null {
  const goals = fillGoals(input.goals);
  if (!goals) return null;
  const total = goals.reduce((a, b) => a + b, 0);
  const weights = presetWeights(input.settings.preset, goals, input.trainingWeekdays, input.settings.shares);
  const planned = distributeWeek(total, weights, input.floor);
  const eatenForCarry = input.days.map((d) => (d.complete && d.kcal !== null ? d.kcal : null));
  const targets = input.settings.carryover ? applyCarryover(planned, eatenForCarry, input.index, input.floor).targets : planned;
  const upTo = input.days.slice(0, input.index + 1);
  return {
    version: BUDGET_RULES_VERSION,
    total: planned.reduce((a, b) => a + b, 0),
    planned,
    targets,
    index: input.index,
    dayTarget: targets[input.index],
    carriedToday: targets[input.index] - planned[input.index],
    eaten: Math.round(upTo.reduce((s, d) => s + (d.kcal ?? 0), 0)),
    unknown: upTo.some((d) => d.unknown > 0),
  };
}
