// Profil (Register COACH-001, UX-003, UX-010, COACH-010). Nur Eingaben mit klarem Zweck:
// Volljährigkeit für den Start, Geburtsmonat/Größe/Formelvariante nur für den Kalorienrechner.
// Alles ist optional außer der Bestätigung „mindestens 18“.

import type { ActivityLevel, FormulaTerm } from './energy';
import { DEFAULT_UNITS, HEIGHT_RANGE, lengthInputText, parseLengthIn, type Units } from './units';

export type Profile = {
  /** Bestätigt „mindestens 18 Jahre“ (Start nur für Erwachsene). */
  adult: boolean;
  /** Geburtsmonat als YYYY-MM, nur für die Altersangabe im Rechner. */
  birthMonth: string | null;
  heightCm: number | null;
  /** Formelvariante nach Mifflin-St Jeor (+5 bzw. −161 laut Originalstudie). */
  formulaTerm: FormulaTerm | null;
  activity: ActivityLevel | null;
  /** Sport 4–5× pro Woche je 30–60 min. */
  sport: boolean;
  /**
   * Eine sensible Situation wurde angegeben (z. B. Schwangerschaft, Essstörung). Gespeichert wird
   * nur ja/nein, nicht welche – Datenminimierung (COACH-010).
   */
  sensitive: boolean;
  units: Units;
  /** Fortschrittsfotos eingeschaltet (Standard aus, GOAL-008). */
  photos: boolean;
};

export const EMPTY_PROFILE: Profile = {
  adult: false,
  birthMonth: null,
  heightCm: null,
  formulaTerm: null,
  activity: null,
  sport: false,
  sensitive: false,
  units: DEFAULT_UNITS,
  photos: false,
};

/** Volle Lebensjahre am Tag `today` (YYYY-MM-DD); Geburtstag wird am Monatsersten angenommen. */
export function ageOn(birthMonth: string, today: string): number {
  const [by, bm] = birthMonth.split('-').map(Number);
  const [ty, tm] = today.split('-').map(Number);
  return ty - by - (tm < bm ? 1 : 0);
}

/** Liest „03.1996“ oder „3/1996“; Zukunft und mehr als 120 Jahre zurück sind ungültig. */
export function parseBirthMonth(input: string, today: string): string | null {
  const match = /^(\d{1,2})[./](\d{4})$/.exec(input.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const value = `${year}-${String(month).padStart(2, '0')}`;
  if (value > today.slice(0, 7)) return null;
  if (ageOn(value, today) > 120) return null;
  return value;
}

export function birthMonthText(birthMonth: string | null): string {
  if (!birthMonth) return '';
  const [year, month] = birthMonth.split('-');
  return `${month}.${year}`;
}

export type ProfileForm = {
  birth: string;
  height: string;
  formulaTerm: FormulaTerm | 'keine';
  activity: ActivityLevel | 'keine';
  sport: boolean;
  sensitive: boolean;
  units: Units;
};

export type ProfileProblem = 'birth' | 'height' | 'minor';

export function profileToForm(p: Profile): ProfileForm {
  return {
    birth: birthMonthText(p.birthMonth),
    height: p.heightCm === null ? '' : lengthInputText(p.heightCm, p.units.length),
    formulaTerm: p.formulaTerm ?? 'keine',
    activity: p.activity ?? 'keine',
    sport: p.sport,
    sensitive: p.sensitive,
    units: p.units,
  };
}

/**
 * Prüft das Profilformular. Die Größe wird in der Einheit gelesen, die im Formular gewählt ist.
 * Ein Geburtsmonat unter 18 Jahren widerspricht dem Start nur für Erwachsene.
 */
export function parseProfileForm(
  form: ProfileForm,
  previous: Profile,
  today: string
): { profile: Profile | null; problems: ProfileProblem[] } {
  const problems: ProfileProblem[] = [];
  const birthMonth = form.birth.trim() === '' ? null : parseBirthMonth(form.birth, today);
  if (form.birth.trim() !== '' && birthMonth === null) problems.push('birth');
  if (birthMonth !== null && ageOn(birthMonth, today) < 18) problems.push('minor');
  const heightCm = form.height.trim() === '' ? null : parseLengthIn(form.height, form.units.length, HEIGHT_RANGE);
  if (form.height.trim() !== '' && heightCm === null) problems.push('height');
  if (problems.length > 0) return { profile: null, problems };
  return {
    profile: {
      ...previous,
      birthMonth,
      heightCm,
      formulaTerm: form.formulaTerm === 'keine' ? null : form.formulaTerm,
      activity: form.activity === 'keine' ? null : form.activity,
      sport: form.sport,
      sensitive: form.sensitive,
      units: form.units,
    },
    problems,
  };
}
