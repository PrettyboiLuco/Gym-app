// Phase 5: Timer-Engine, Dehnroutinen, HIIT-Programme, Aufwärmen/Cool-down, Zeit-Sätze.

import { describe, expect, test } from '@jest/globals';

import { HIIT_EXERCISES, STARTER_EXERCISES, STRETCH_EXERCISES } from '../exercises';
import { flexibilityProgress } from '../goals';
import {
  cooldownItems,
  findTemplate,
  HIIT_PROGRAMS,
  routineSteps,
  STRETCH_TEMPLATES,
  validateRoutine,
  warmupItems,
  type RoutineDraft,
} from '../routines';
import {
  hiitSteps,
  newRun,
  pauseRun,
  resumeRun,
  runDoneSeconds,
  runElapsedMs,
  runRoundsDone,
  skipStep,
  stepsTotalSeconds,
  stretchSteps,
  timelineState,
} from '../timeline';
import { estimateDayMinutes, parseSecondsInput, validatePlan } from '../training';

const ALL_IDS = new Set([...STARTER_EXERCISES, ...HIIT_EXERCISES, ...STRETCH_EXERCISES].map((e) => e.id));
const sides = (id: string) => [...HIIT_EXERCISES, ...STRETCH_EXERCISES].find((e) => e.id === id)?.sides ?? 'beidseitig';

describe('Timer-Engine Dehnen (STRETCH-004)', () => {
  const items = [
    { exerciseId: 'beinbeuger', seconds: 30, bothSides: true },
    { exerciseId: 'brust', seconds: 30, bothSides: false },
  ];
  test('wie Referenzmodell: links, Wechsel, rechts, Übergang, 105 s ohne Vorbereitung', () => {
    const steps = stretchSteps(items, 5, 10, 0);
    expect(steps.map((s) => `${s.kind}${s.side ? `:${s.side}` : ''}`)).toEqual([
      'halten:links',
      'seitenwechsel:rechts',
      'halten:rechts',
      'wechsel',
      'halten',
    ]);
    expect(stepsTotalSeconds(steps)).toBe(105);
  });
  test('Vorbereitung kündigt die erste Übung an', () => {
    const steps = stretchSteps(items, 5, 10);
    expect(steps[0]).toMatchObject({ kind: 'vorbereitung', exerciseId: 'beinbeuger', seconds: 5 });
  });
  test('Haltezeit 0 und leere Routine abgelehnt', () => {
    expect(() => stretchSteps([{ exerciseId: 'x', seconds: 0, bothSides: false }], 5, 10)).toThrow();
    expect(() => stretchSteps([], 5, 10)).toThrow();
  });
});

describe('Timer-Engine HIIT (HIIT-003)', () => {
  const steps = hiitSteps({
    items: [
      { exerciseId: 'a', bothSides: false },
      { exerciseId: 'b', bothSides: false },
    ],
    workSeconds: 20,
    restSeconds: 10,
    rounds: 2,
    roundRestSeconds: 60,
    prepSeconds: 10,
  });
  test('Ablauf: Vorbereitung, Belastung, Pause, Belastung, Rundenpause, … ohne Pause am Ende', () => {
    expect(steps.map((s) => s.kind)).toEqual([
      'vorbereitung',
      'belastung',
      'pause',
      'belastung',
      'rundenpause',
      'belastung',
      'pause',
      'belastung',
    ]);
    expect(stepsTotalSeconds(steps)).toBe(10 + 20 + 10 + 20 + 60 + 20 + 10 + 20);
  });
  test('Pause kündigt die nächste Übung an', () => {
    expect(steps[2]).toMatchObject({ kind: 'pause', exerciseId: 'b' });
    expect(steps[4]).toMatchObject({ kind: 'rundenpause', exerciseId: 'a', round: 2 });
  });
  test('einseitige Übung: links und rechts', () => {
    const one = hiitSteps({ items: [{ exerciseId: 's', bothSides: true }], workSeconds: 20, restSeconds: 10, rounds: 1, roundRestSeconds: 0, prepSeconds: 0 });
    expect(one.map((s) => s.side)).toEqual(['links', 'rechts', 'rechts']);
    expect(one.map((s) => s.kind)).toEqual(['belastung', 'seitenwechsel', 'belastung']);
  });
  test('Zustand aus verstrichener Zeit', () => {
    const at = timelineState(steps, 15_000);
    expect(at.done).toBe(false);
    if (!at.done) {
      expect(at.step.kind).toBe('belastung');
      expect(at.remainingMs).toBe(15_000);
      expect(at.next?.kind).toBe('pause');
    }
    expect(timelineState(steps, stepsTotalSeconds(steps) * 1000).done).toBe(true);
  });
  test('kein Schritt verloren oder doppelt: Grenzen gehören zum nächsten Schritt', () => {
    const at = timelineState(steps, 10_000);
    expect(!at.done && at.index).toBe(1);
  });
});

describe('Laufender Ablauf: Pause, Weiter, Überspringen (HIIT-003)', () => {
  const steps = stretchSteps([{ exerciseId: 'a', seconds: 30, bothSides: false }, { exerciseId: 'b', seconds: 30, bothSides: false }], 5, 10, 0);
  const run = newRun({ kind: 'dehnen', title: 'Test', steps, sessionId: 's', workoutSessionId: null }, 0);
  test('Pause hält die Zeit an', () => {
    const paused = pauseRun(run, 10_000);
    expect(runElapsedMs(paused, 50_000)).toBe(10_000);
    const resumed = resumeRun(paused, 50_000);
    expect(runElapsedMs(resumed, 55_000)).toBe(15_000);
  });
  test('Überspringen springt an den Anfang des nächsten Schritts', () => {
    const skipped = skipStep(run, 12_000);
    const state = timelineState(steps, runElapsedMs(skipped, 12_000));
    expect(!state.done && state.step.kind).toBe('wechsel');
    expect(!state.done && state.remainingMs).toBe(10_000);
  });
  test('absolvierte Zeit zählt Übersprungenes nicht mit', () => {
    expect(runDoneSeconds(skipStep(run, 12_000), 12_000)).toBe(12);
    expect(runDoneSeconds(run, 999_000)).toBe(70);
  });
  test('Runden im Protokoll', () => {
    const h = hiitSteps({ items: [{ exerciseId: 'a', bothSides: false }], workSeconds: 10, restSeconds: 0, rounds: 3, roundRestSeconds: 5, prepSeconds: 0 });
    const r = newRun({ kind: 'hiit', title: 'H', steps: h, sessionId: 's', workoutSessionId: null }, 0);
    expect(runRoundsDone(r, 5_000)).toBe(0);
    expect(runRoundsDone(r, 12_000)).toBe(1);
    expect(runRoundsDone(r, 999_000)).toBe(3);
  });
});

describe('Vorlagen und Programme (STRETCH-003, HIIT-001/002)', () => {
  test('alle Übungen der Vorlagen existieren', () => {
    for (const t of [...STRETCH_TEMPLATES, ...HIIT_PROGRAMS]) for (const i of t.items) expect(ALL_IDS.has(i.exerciseId)).toBe(true);
  });
  test('alle Vorlagen sind gültig (mit Namen)', () => {
    for (const t of [...STRETCH_TEMPLATES, ...HIIT_PROGRAMS]) expect(validateRoutine({ ...t, name: 'x' })).toEqual([]);
  });
  test('Bauch und Ganzkörper je in Anfänger und Fortgeschritten', () => {
    for (const focus of ['bauch', 'ganzkoerper']) {
      expect(HIIT_PROGRAMS.filter((p) => p.focus === focus).map((p) => p.level).sort()).toEqual(['anfaenger', 'fortgeschritten']);
    }
  });
  test('Fortgeschritten ist länger als Anfänger', () => {
    const minutes = (id: string) => stepsTotalSeconds(routineSteps(findTemplate(id)!, sides));
    expect(minutes('bauch_fortgeschritten')).toBeGreaterThan(minutes('bauch_anfaenger'));
    expect(minutes('ganzkoerper_fortgeschritten')).toBeGreaterThan(minutes('ganzkoerper_anfaenger'));
  });
  test('„Morgens“ dauert etwa 10 Minuten', () => {
    const seconds = stepsTotalSeconds(routineSteps(findTemplate('morgens')!, sides));
    expect(seconds).toBeGreaterThan(6 * 60);
    expect(seconds).toBeLessThan(12 * 60);
  });
  test('Dehnübungen nutzen nur bekannte Arten und sinnvolle Haltezeiten', () => {
    for (const e of STRETCH_EXERCISES) {
      expect(e.kind).not.toBe('kraft');
      expect(e.holdSeconds).toBeGreaterThanOrEqual(10);
      expect(e.holdSeconds).toBeLessThanOrEqual(60);
    }
  });
});

describe('Routine prüfen', () => {
  const base: RoutineDraft = { ...findTemplate('morgens')!, name: 'Meine' };
  test('Name und Übungen nötig', () => expect(validateRoutine({ ...base, name: ' ', items: [] })).toEqual(['name', 'items']));
  test('Haltezeit 5–300 s', () =>
    expect(validateRoutine({ ...base, items: [{ exerciseId: 'dehn_kobra', seconds: 400 }] })).toEqual(['seconds']));
  test('HIIT: Belastung, Pause, Runden geprüft', () =>
    expect(
      validateRoutine({ ...findTemplate('bauch_anfaenger')!, name: 'x', workSeconds: 2, restSeconds: -1, rounds: 0, roundRestSeconds: 999 })
    ).toEqual(['work', 'rest', 'rounds', 'roundRest']));
});

describe('Aufwärmen und Cool-down (STRETCH-001/002)', () => {
  const hold = (id: string) => STRETCH_EXERCISES.find((e) => e.id === id)?.holdSeconds ?? 30;
  test('Beintag: allgemein, dann Hüfte und Sprunggelenk-nahe Mobilisation', () => {
    const ids = warmupItems(['beine'], hold).map((i) => i.exerciseId);
    expect(ids[0]).toBe('hampelmann');
    expect(ids).toEqual(expect.arrayContaining(['mob_beinpendel', 'mob_hueftkreisen']));
  });
  test('höchstens 6 Übungen, keine doppelt', () => {
    const ids = warmupItems(['brust', 'schultern', 'ruecken', 'beine', 'gesaess', 'waden'], hold).map((i) => i.exerciseId);
    expect(ids.length).toBeLessThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);
  });
  test('Aufwärmen nutzt dynamische Übungen, Cool-down statische', () => {
    const kind = (id: string) => STRETCH_EXERCISES.find((e) => e.id === id)?.kind;
    for (const i of warmupItems(['brust', 'beine'], hold)) expect(kind(i.exerciseId)).not.toBe('dehnung_statisch');
    for (const i of cooldownItems(['brust', 'beine'], hold)) expect(kind(i.exerciseId)).toBe('dehnung_statisch');
  });
  test('ohne Plan: allgemeine Folge', () => expect(cooldownItems([], hold).length).toBeGreaterThan(0));
});

describe('Zeit-Sätze (UX-011)', () => {
  test('Plan mit Zeit-Übung: Sekunden statt Wiederholungen', () => {
    const plan = { name: 'P', days: [{ name: 'T', items: [{ exerciseId: 'plank', sets: 3, repsMin: 1, repsMax: 1, restSeconds: 60, targetSeconds: 45 }] }] };
    expect(validatePlan(plan)).toEqual([]);
    expect(validatePlan({ ...plan, days: [{ name: 'T', items: [{ ...plan.days[0].items[0], targetSeconds: 2 }] }] })).toEqual([
      'invalidSeconds',
    ]);
  });
  test('Zeitschätzung nutzt die Sekunden und das Aufwärmen', () => {
    expect(estimateDayMinutes([{ sets: 3, restSeconds: 60, targetSeconds: 60 }])).toBe(6);
    expect(estimateDayMinutes([{ sets: 3, restSeconds: 60, targetSeconds: 60 }], 45, 60, 300)).toBe(11);
  });
  test('Sekunden einlesen', () => {
    expect(parseSecondsInput('45')).toBe(45);
    expect(parseSecondsInput('0')).toBeNull();
    expect(parseSecondsInput('abc')).toBeNull();
  });
});

describe('Beweglichkeitsziel', () => {
  test('erster Test ist Start, neuester zählt; kleiner ist besser', () => {
    const p = flexibilityProgress(
      [
        { day: '2026-10-30', cm: 8 },
        { day: '2026-10-01', cm: 15 },
      ],
      10
    );
    expect(p.start?.cm).toBe(15);
    expect(p.current?.cm).toBe(8);
    expect(p.reached).toBe(true);
  });
  test('ohne Test keine Aussage', () => expect(flexibilityProgress([], 0).current).toBeNull());
});
