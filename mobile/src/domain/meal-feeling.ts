// Hunger, Sättigung und Stimmung je Mahlzeit (Ausbauplan B1, Review W10): freiwillig, ein Tipp je Angabe, fünf
// neutrale Stufen. Es gibt keine „richtige“ Stufe – die App bewertet die Angaben nicht.

import type { Meal } from './nutrition';

export const FEELING_KEYS = ['hunger', 'fullness', 'mood'] as const;
export type FeelingKey = (typeof FEELING_KEYS)[number];

/** Stufen 1–5, wie die CHECK-Bedingung der Tabelle meal_feeling. */
export const FEELING_LEVELS = [1, 2, 3, 4, 5] as const;
export type FeelingLevel = (typeof FEELING_LEVELS)[number];

export type MealFeeling = Record<FeelingKey, FeelingLevel | null>;

export const EMPTY_FEELING: MealFeeling = { hunger: null, fullness: null, mood: null };

export function isFeelingLevel(value: unknown): value is FeelingLevel {
  return typeof value === 'number' && (FEELING_LEVELS as readonly number[]).includes(value);
}

/** Ungültige Werte werden zu „keine Angabe“. */
export function cleanFeeling(f: Partial<Record<FeelingKey, unknown>>): MealFeeling {
  return {
    hunger: isFeelingLevel(f.hunger) ? f.hunger : null,
    fullness: isFeelingLevel(f.fullness) ? f.fullness : null,
    mood: isFeelingLevel(f.mood) ? f.mood : null,
  };
}

export const feelingEmpty = (f: MealFeeling) => FEELING_KEYS.every((k) => f[k] === null);

/** Gleiche Stufe noch einmal getippt = Angabe wieder entfernen. */
export function toggleLevel(f: MealFeeling, key: FeelingKey, level: FeelingLevel): MealFeeling {
  return { ...f, [key]: f[key] === level ? null : level };
}

export type DayFeelings = Partial<Record<Meal, MealFeeling>>;
