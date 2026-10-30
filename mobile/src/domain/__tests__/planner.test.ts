// Planassistent ohne Netz und ohne KI (Phase 8, TRAIN-004–011, -016, -019, -021).

import { describe, expect, test } from '@jest/globals';

import {
  EXERCISE_META,
  HIIT_EXERCISES,
  MORE_STRENGTH_EXERCISES,
  STARTER_EXERCISES,
  TIMED_EXERCISES,
  levelOf,
  patternOf,
} from '../exercises';
import {
  buildTemplate,
  canApply,
  chooseSplit,
  dayAccepts,
  dayNames,
  findReplacement,
  rebuildPlan,
  replacementOptions,
  temporaryEnd,
  type PlannerExercise,
  type RebuildInput,
} from '../planner';
import { validatePlan, type PlanDraft } from '../training';

const EXERCISES: PlannerExercise[] = [...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES, ...HIIT_EXERCISES].map((e) => ({
  id: e.id,
  equipment: e.equipment,
  muscleGroup: e.muscleGroup,
  kind: 'kraft',
  measure: TIMED_EXERCISES.includes(e.id) ? 'zeit' : 'wdh',
}));
const byId = new Map(EXERCISES.map((e) => [e.id, e]));
const item = (exerciseId: string, sets = 3, restSeconds = 120) => ({ exerciseId, sets, repsMin: 8, repsMax: 12, restSeconds, targetSeconds: null });
const name = (type: string, letter: string | null) => (letter ? `${type} ${letter}` : type);

// Sechs Tage Push/Pull/Beine, je Übung zweimal pro Woche.
const pushA = ['bankdruecken', 'schulterdruecken_kh', 'schraegbankdruecken_kh', 'seitheben', 'trizepsdruecken_kabel'];
const pullA = ['klimmzuege', 'langhantelrudern', 'face_pulls', 'bizepscurls_kh'];
const legsA = ['kniebeuge', 'rumaenisches_kreuzheben', 'beinpresse', 'beinbeuger', 'wadenheben'];
const ppl6: PlanDraft = {
  name: 'PPL',
  days: [pushA, pullA, legsA, pushA, pullA, legsA].map((ids, i) => ({
    name: ['Push', 'Pull', 'Beine'][i % 3] + (i < 3 ? ' A' : ' B'),
    items: ids.map((id) => item(id)),
  })),
};

function input(over: Partial<RebuildInput> = {}): RebuildInput {
  return {
    current: ppl6,
    exercises: EXERCISES,
    days: 4,
    minutes: 60,
    split: 'auto',
    locked: [],
    blockedEquipment: [],
    blockedExercises: [],
    dayName: name,
    ...over,
  };
}

describe('Übungsdaten (8.1)', () => {
  test('jede kuratierte Kraftübung hat Muster, Stufe und nur existierende Ersatzübungen', () => {
    for (const e of EXERCISES) {
      expect(EXERCISE_META[e.id]).toBeDefined();
      for (const alt of EXERCISE_META[e.id].alternatives) expect(byId.has(alt)).toBe(true);
    }
  });
  test('eigene Übung ohne Angabe: Muster aus der Muskelgruppe, mit Angabe: eigene Wahl', () => {
    expect(patternOf({ id: 'x', muscleGroup: 'brust' })).toBe('druecken_horizontal');
    expect(patternOf({ id: 'x', muscleGroup: 'brust', pattern: 'brust_isolation' })).toBe('brust_isolation');
    expect(levelOf('unbekannt')).toBe('einsteiger');
  });
});

describe('Aufteilung (TRAIN-005)', () => {
  test.each([
    [2, 'ganzkoerper'],
    [3, 'ganzkoerper'],
    [4, 'ober_unter'],
    [5, 'ou_ppl'],
    [6, 'ppl'],
  ])('%i Tage → %s', (days, split) => expect(chooseSplit('auto', days)).toEqual({ split, requested: 'auto', fits: true }));
  test('unpassender Split wird nicht erzwungen, sondern begründet ersetzt', () => {
    expect(chooseSplit('ppl', 4)).toEqual({ split: 'ober_unter', requested: 'ppl', fits: false });
    expect(chooseSplit('arnold', 2)).toEqual({ split: 'ganzkoerper', requested: 'arnold', fits: false });
    expect(chooseSplit('ober_unter', 4).fits).toBe(true);
  });
  test('Tagesnamen mit A/B nur bei Wiederholung', () =>
    expect(dayNames(['oberkoerper', 'unterkoerper', 'push'], name)).toEqual(['oberkoerper', 'unterkoerper', 'push']));
});

describe('Planumbau (8.2)', () => {
  test('6 Tage PPL → 4 Tage Ober/Unter je 60 min (Beispiel Kap. 05)', () => {
    const p = rebuildPlan(input());
    expect(p.draft.days.map((d) => d.name)).toEqual(['oberkoerper A', 'unterkoerper A', 'oberkoerper B', 'unterkoerper B']);
    expect(p.conflicts).toEqual([]);
    expect(canApply(p)).toBe(true);
    expect(validatePlan(p.draft)).toEqual([]);
    p.dayMinutes.forEach((m) => expect(m).toBeLessThanOrEqual(60));
    // Oberkörpertage enthalten nur Push/Pull, Unterkörpertage nur Beine/Rumpf.
    p.draft.days.forEach((d, i) =>
      d.items.forEach((it) => expect(dayAccepts(p.dayTypes[i], patternOf(byId.get(it.exerciseId)!))).toBe(true))
    );
    // Jede bisherige Übung taucht in der Änderungsliste auf, mit Grund, wenn sie nicht nur behalten ist.
    expect(p.changes.map((c) => c.exerciseId).sort()).toEqual([...new Set([...pushA, ...pullA, ...legsA])].sort());
    p.changes.filter((c) => c.kind !== 'behalten').forEach((c) => expect(c.reasons.length).toBeGreaterThan(0));
  });

  test.each([2, 3, 4, 5, 6])('Umbau auf %i Tage mit 90 min ergibt einen gültigen Plan', (days) => {
    const p = rebuildPlan(input({ days, minutes: 90 }));
    expect(p.draft.days).toHaveLength(days);
    expect(validatePlan(p.draft)).toEqual([]);
    expect(p.conflicts).toEqual([]);
  });

  test('gleiche Eingabe → gleiches Ergebnis (deterministisch, TRAIN-021)', () =>
    expect(rebuildPlan(input({ days: 3 }))).toEqual(rebuildPlan(input({ days: 3 }))));

  test('Kürzen mit Begründung statt 6 Einheiten in 2 zu pressen', () => {
    const p = rebuildPlan(input({ days: 2, minutes: 60 }));
    expect(p.conflicts).toEqual([]);
    p.dayMinutes.forEach((m) => expect(m).toBeLessThanOrEqual(60));
    const shortened = p.changes.filter((c) => c.kind === 'reduziert' || c.kind === 'entfernt');
    expect(shortened.length).toBeGreaterThan(0);
    shortened.forEach((c) => expect(c.reasons.some((r) => ['zeitbudget', 'redundant', 'seltener'].includes(r))).toBe(true));
  });

  test('zu wenig Zeit für die Lieblingsübungen: Konflikt mit echter Dauer, nicht übernehmbar (TRAIN-007)', () => {
    const locked = [...pushA, ...pullA, ...legsA];
    const p = rebuildPlan(input({ days: 2, minutes: 30, locked }));
    const conflict = p.conflicts.find((c) => c.kind === 'zeit');
    expect(conflict).toBeDefined();
    if (conflict?.kind === 'zeit') {
      expect(conflict.minutes).toBeGreaterThan(30);
      expect(conflict.lockedMinutes).toBeGreaterThan(30);
    }
    expect(canApply(p)).toBe(false);
    // Gesperrte Übungen bleiben vollständig, auch im Konfliktfall (TRAIN-006).
    const kept = new Set(p.draft.days.flatMap((d) => d.items.map((i) => i.exerciseId)));
    locked.forEach((id) => expect(kept.has(id)).toBe(true));
    p.changes.forEach((c) => expect(c.kind).not.toBe('entfernt'));
  });

  test('gesperrte Übungen werden nie gekürzt', () => {
    const p = rebuildPlan(input({ days: 2, minutes: 60, locked: ['bankdruecken', 'kniebeuge'] }));
    for (const id of ['bankdruecken', 'kniebeuge']) {
      const change = p.changes.find((c) => c.exerciseId === id)!;
      expect(change.toSets).toBe(3);
      expect(change.kind).not.toBe('entfernt');
      expect(change.reasons).toContain('gesperrt');
    }
  });

  test('ungültige Tageszahl oder Zeit: Konflikt, kein Umbau', () => {
    expect(rebuildPlan(input({ days: 7 })).conflicts).toEqual([{ kind: 'tage', days: 7 }]);
    expect(rebuildPlan(input({ minutes: 10 })).conflicts).toEqual([{ kind: 'minuten', minutes: 10 }]);
    expect(rebuildPlan(input({ current: { name: 'Leer', days: [] } })).conflicts).toEqual([{ kind: 'leererPlan' }]);
  });

  test('Tag ohne passende Übung wird aus der kuratierten Liste ergänzt und begründet', () => {
    const upper: PlanDraft = { name: 'Oben', days: [{ name: 'A', items: pushA.map((id) => item(id)) }, { name: 'B', items: pullA.map((id) => item(id)) }] };
    const p = rebuildPlan(input({ current: upper, days: 4 }));
    const legDays = p.draft.days.filter((_, i) => p.dayTypes[i] === 'unterkoerper');
    legDays.forEach((d) => expect(d.items.length).toBeGreaterThan(0));
    expect(p.additions.length).toBeGreaterThan(0);
    p.additions.forEach((a) => expect(a.reason).toBe('leererTag'));
  });
});

describe('Gerät nicht verfügbar (8.4, TRAIN-016)', () => {
  test('Langhantel fehlt: Bankdrücken wird durch eine Übung ohne Langhantel ersetzt', () => {
    const p = rebuildPlan(input({ blockedEquipment: ['langhantel'] }));
    const change = p.changes.find((c) => c.exerciseId === 'bankdruecken')!;
    expect(change.kind).toBe('ersetzt');
    expect(change.reasons[0]).toBe('geraet');
    expect(byId.get(change.replacedBy!)!.equipment).not.toBe('langhantel');
    p.draft.days.forEach((d) => d.items.forEach((i) => expect(byId.get(i.exerciseId)!.equipment).not.toBe('langhantel')));
  });

  test('einzelne Übung ausgeschlossen (z. B. Beinpresse kaputt)', () => {
    const change = rebuildPlan(input({ blockedExercises: ['beinpresse'] })).changes.find((c) => c.exerciseId === 'beinpresse')!;
    expect(change.kind).toBe('ersetzt');
    expect(change.reasons[0]).toBe('ausgeschlossen');
  });

  test('gesperrt und Gerät fehlt: Konflikt statt Entfernen (TRAIN-006)', () => {
    const p = rebuildPlan(input({ locked: ['kniebeuge'], blockedEquipment: ['langhantel'] }));
    expect(p.conflicts).toContainEqual({ kind: 'gesperrtNichtVerfuegbar', exerciseId: 'kniebeuge' });
    expect(canApply(p)).toBe(false);
  });

  test('ohne passendes Gerät: entfernt mit Grund „kein Ersatz“', () => {
    const p = rebuildPlan(input({ blockedEquipment: ['kabel', 'kurzhantel', 'maschine', 'langhantel'] }));
    const change = p.changes.find((c) => c.exerciseId === 'bizepscurls_kh')!;
    expect(change.kind).toBe('entfernt');
    expect(change.reasons).toEqual(['geraet', 'keinErsatz']);
  });

  test('Ersatz hat dieselbe Messart (Zeit bleibt Zeit)', () => {
    const plank = byId.get('plank')!;
    expect(findReplacement(plank, EXERCISES, () => true)?.measure).toBe('zeit');
  });

  test('Ersatz im Training: kuratierte Reihenfolge, ohne die Übung selbst', () => {
    const options = replacementOptions(byId.get('latzug')!, EXERCISES).map((e) => e.id);
    expect(options.slice(0, 2)).toEqual(['klimmzuege_unterstuetzt', 'klimmzuege']);
    expect(options).not.toContain('latzug');
  });
});

describe('Vorlagen (8.6, TRAIN-001, -019)', () => {
  const base = {
    exercises: EXERCISES,
    days: 3,
    minutes: 45,
    split: 'auto' as const,
    goal: 'muskelaufbau' as const,
    experience: 'einsteiger' as const,
    available: ['langhantel', 'kurzhantel', 'kabel', 'maschine', 'koerpergewicht'] as const,
    blockedEquipment: [],
    blockedExercises: [],
    dayName: name,
    planName: 'Start',
  };

  test.each([2, 3, 4, 5, 6])('%i Tage, 60 min: gültig, ohne Konflikt, je Tag mindestens 3 Übungen', (days) => {
    const p = buildTemplate({ ...base, available: [...base.available], days, minutes: 60 });
    expect(p.conflicts).toEqual([]);
    expect(validatePlan(p.draft)).toEqual([]);
    p.draft.days.forEach((d) => expect(d.items.length).toBeGreaterThanOrEqual(3));
    p.dayMinutes.forEach((m) => expect(m).toBeLessThanOrEqual(60));
  });

  test('nur Körpergewicht zu Hause: nur Übungen ohne Gerät', () => {
    const p = buildTemplate({ ...base, available: ['koerpergewicht'] });
    expect(p.conflicts).toEqual([]);
    p.draft.days.forEach((d) => d.items.forEach((i) => expect(byId.get(i.exerciseId)!.equipment).toBe('koerpergewicht')));
  });

  test('Einsteiger bekommen Einsteiger-Übungen, wenn es sie gibt', () => {
    const p = buildTemplate({ ...base, available: [...base.available] });
    p.draft.days.forEach((d) => d.items.forEach((i) => expect(levelOf(i.exerciseId)).toBe('einsteiger')));
  });

  test('Ziel Kraft: weniger Wiederholungen, längere Pausen als Fitness', () => {
    const kraft = buildTemplate({ ...base, available: [...base.available], goal: 'kraft', experience: 'fortgeschritten', minutes: 90 });
    const fitness = buildTemplate({ ...base, available: [...base.available], goal: 'fitness', minutes: 90 });
    expect(kraft.draft.days[0].items[0].repsMax).toBeLessThan(fitness.draft.days[0].items[0].repsMax);
    expect(kraft.draft.days[0].items[0].restSeconds).toBeGreaterThan(fitness.draft.days[0].items[0].restSeconds);
  });

  test('wenig Zeit: weniger Übungen statt falscher Dauer', () => {
    const p = buildTemplate({ ...base, available: [...base.available], minutes: 20 });
    p.dayMinutes.forEach((m, i) => (m > 20 ? expect(p.conflicts).toContainEqual(expect.objectContaining({ kind: 'zeit', day: p.draft.days[i].name })) : null));
  });
});

describe('Befristung (TRAIN-008)', () => {
  test('„diese Woche“ endet am Sonntag, „2 Wochen“ nach 14 Tagen', () => {
    expect(temporaryEnd('woche', '2026-10-28')).toBe('2026-11-01'); // Mittwoch → Sonntag
    expect(temporaryEnd('woche', '2026-11-01')).toBe('2026-11-01'); // Sonntag bleibt
    expect(temporaryEnd('zwei_wochen', '2026-10-28')).toBe('2026-11-10');
  });
});
