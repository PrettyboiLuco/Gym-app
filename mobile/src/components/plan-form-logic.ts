// Formular des Planeditors (ohne React): Zahlen als Text, Umwandlung von und zu PlanDraft, Supersatz-Gruppen.
// Getestet in data/__tests__/review3-training-claims-2.test.ts.

import type { CardioActivity } from '@/domain/cardio';
import { parseWholeNumber, type PlanDraft } from '@/domain/training';

// Im Formular stehen Zahlen als Text, damit man sie frei tippen kann.
export type ItemForm = {
  exerciseId: string;
  sets: string;
  repsMin: string;
  repsMax: string;
  rest: string;
  seconds: string;
  rir?: string;
  note?: string;
  label?: string;
  /** Supersatz mit der nächsten Übung (A1); daraus werden beim Speichern Gruppen-Nummern. */
  linkNext?: boolean;
};
export type CardioForm = { activity: CardioActivity; minutes: string; atEnd: boolean; note?: string };
export type DayForm = { name: string; items: ItemForm[]; warmup: boolean; cooldown: boolean; cardio?: CardioForm[] };
export type PlanForm = { name: string; days: DayForm[] };

export const NEW_ITEM = { sets: '3', repsMin: '8', repsMax: '12', rest: '90', seconds: '' };
export const NEW_DAY: DayForm = { name: '', items: [], warmup: true, cooldown: true };
export const EMPTY_FORM: PlanForm = { name: '', days: [NEW_DAY] };

export function planDraftToForm(draft: PlanDraft): PlanForm {
  return {
    name: draft.name,
    days: draft.days.map((day) => ({
      name: day.name,
      warmup: day.warmup !== false,
      cooldown: day.cooldown !== false,
      // Die Notiz eines Cardio-Blocks (z. B. „Steigung 8 %“) bleibt beim Bearbeiten erhalten.
      cardio: (day.cardio ?? []).map((c) => ({ activity: c.activity, minutes: String(c.minutes), atEnd: c.atEnd !== false, note: c.note ?? '' })),
      items: day.items.map((i, index) => ({
        exerciseId: i.exerciseId,
        sets: String(i.sets),
        repsMin: String(i.repsMin),
        repsMax: String(i.repsMax),
        rest: String(i.restSeconds),
        seconds: i.targetSeconds == null ? '' : String(i.targetSeconds),
        rir: i.rir ?? '',
        note: i.note ?? '',
        label: i.label ?? '',
        linkNext: i.superset != null && day.items[index + 1]?.superset === i.superset,
      })),
    })),
  };
}

export function planFormToDraft(form: PlanForm, timed: (exerciseId: string) => boolean): PlanDraft {
  // Ungültige Zahlen werden zu -1 und von validatePlan gemeldet.
  const num = (text: string) => parseWholeNumber(text) ?? -1;
  return {
    name: form.name,
    days: form.days.map((day) => ({
      name: day.name,
      warmup: day.warmup,
      cooldown: day.cooldown,
      ...(day.cardio?.length
        ? { cardio: day.cardio.map((c) => ({ activity: c.activity, minutes: num(c.minutes), atEnd: c.atEnd, note: c.note?.trim() || null })) }
        : {}),
      items: day.items.map((i, index) => ({
        exerciseId: i.exerciseId,
        sets: num(i.sets),
        // Zeit-Übungen (UX-011): Sekunden statt Wiederholungen.
        repsMin: timed(i.exerciseId) ? 1 : num(i.repsMin),
        repsMax: timed(i.exerciseId) ? 1 : num(i.repsMax),
        restSeconds: num(i.rest),
        targetSeconds: timed(i.exerciseId) ? num(i.seconds) : null,
        rir: i.rir?.trim() || null,
        note: i.note?.trim() || null,
        label: i.label?.trim() || null,
        superset: supersetGroups(day.items)[index],
      })),
    })),
  };
}

/** Gruppen-Nummern aus „mit nächster verbunden“: aufeinanderfolgende verbundene Übungen bilden einen Supersatz. */
export function supersetGroups(items: ItemForm[]): (number | null)[] {
  const groups: (number | null)[] = items.map(() => null);
  let next = 1;
  for (let i = 0; i < items.length - 1; i++) {
    if (!items[i].linkNext) continue;
    const group = groups[i] ?? next++;
    groups[i] = group;
    groups[i + 1] = group;
  }
  return groups;
}
