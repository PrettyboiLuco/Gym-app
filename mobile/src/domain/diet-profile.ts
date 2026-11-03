// Ernährungsformen als Makro-Voreinstellung (Ausbauplan B2, W7). Vorläufig, Fachprüfung offen
// (docs/Fachpruefung_Mappe.md, Abschnitt O). Keine Empfehlung für eine Form – die Wahl trifft die Person.
//
// Regeln Fassung 1 (03.11.2026), immer für das Kalorienziel des Tages:
// - Ausgewogen (Standard): Makros des Coachs unverändert (Standard, Lean oder eigene Werte); ein anderes Tagesziel
//   (Wochenbudget) ändert nur die Kohlenhydrate – wie bei Trainings-/Ruhetagen.
// - Eiweißreich: Eiweiß mindestens 30 % der kcal, aber höchstens 2,5 g/kg (Rahmen „eigene Werte“ im Coach) und nie
//   weniger als der Coach-Wert; Fett 30 %, Kohlenhydrate der Rest.
// - Low-Carb: Kohlenhydrate höchstens 20 % der kcal und höchstens 130 g (Definition „low carbohydrate“ unter 26 % bzw.
//   unter 130 g, Feinman u. a. 2015); Eiweiß wie Coach; Fett der Rest.
// - Keto: Kohlenhydrate 30 g (übliche Spanne 20–50 g); Eiweiß wie Coach; Fett der Rest.
// - Low-Fat: Fett 20 % (nie weniger, wie im Coach B4); Eiweiß wie Coach; Kohlenhydrate der Rest.
// - Ballaststoffe bleiben beim Coach-Wert (mindestens 30 g).
// - Netto-Kohlenhydrate (Low-Carb, Keto) = Kohlenhydrate ohne Ballaststoffe. Die App speichert Kohlenhydrate wie auf
//   EU-Etiketten, also schon ohne Ballaststoffe (Grundnahrungsmittel umgerechnet, basis-foods.ts) – dann wird nichts
//   abgezogen. Nur Gesamt-Kohlenhydrate (z. B. US-Angaben) werden um die Ballaststoffe verringert.
// - Bei sensibler Situation werden Low-Carb und Keto nicht angeboten; eine gespeicherte Wahl gilt dann als „Ausgewogen“.

import { FAT_SHARE, FAT_SHARE_MIN, PROTEIN_PER_KG_RANGE, type Macros } from './coach';

export const DIET_RULES_VERSION = 1;

export const DIET_PROFILES = ['ausgewogen', 'eiweissreich', 'lowcarb', 'keto', 'lowfat'] as const;
export type DietProfile = (typeof DIET_PROFILES)[number];

export const HIGH_PROTEIN_SHARE = 0.3;
export const LOW_CARB = { share: 0.2, maxG: 130 } as const;
export const KETO_CARBS_G = 30;
export const LOW_FAT_SHARE = FAT_SHARE_MIN;

/** Nicht anbieten bei sensibler Situation. */
const RESTRICTIVE: readonly DietProfile[] = ['lowcarb', 'keto'];

export function dietProfilesFor(sensitive: boolean): DietProfile[] {
  return DIET_PROFILES.filter((p) => !sensitive || !RESTRICTIVE.includes(p));
}

export function effectiveDietProfile(profile: DietProfile, sensitive: boolean): DietProfile {
  return dietProfilesFor(sensitive).includes(profile) ? profile : 'ausgewogen';
}

export function sanitizeDietProfile(raw: unknown): DietProfile {
  return DIET_PROFILES.includes(raw as DietProfile) ? (raw as DietProfile) : 'ausgewogen';
}

/** Netto-Kohlenhydrate in der Tagesübersicht anzeigen. */
export const showsNetCarbs = (profile: DietProfile) => profile === 'lowcarb' || profile === 'keto';

/** Kohlenhydrat-Obergrenze der Form (g), sonst null. */
export function carbLimit(profile: DietProfile, kcal: number): number | null {
  if (profile === 'keto') return KETO_CARBS_G;
  if (profile === 'lowcarb') return Math.min(LOW_CARB.maxG, Math.round((kcal * LOW_CARB.share) / 4));
  return null;
}

/**
 * Netto-Kohlenhydrate. `carbs` nach EU-Etikett (ohne Ballaststoffe, so speichert die App) bleibt unverändert;
 * Gesamt-Kohlenhydrate (mit Ballaststoffen) werden um die Ballaststoffe verringert, nie unter 0.
 */
export function netCarbs(carbs: number, fiber: number | null, convention: 'eu' | 'gesamt' = 'eu'): number {
  if (convention === 'eu') return carbs;
  return Math.max(0, carbs - (fiber ?? 0));
}

/**
 * Makros des Tages für die Ernährungsform. `base` = Makros des Coachs für `baseKcal` (Eiweiß in g aus g/kg), `kcal` =
 * Ziel des Tages (z. B. aus dem Wochenbudget), `weightKg` nur für die Eiweiß-Obergrenze bei „Eiweißreich“.
 */
export function dietMacros(profile: DietProfile, kcal: number, base: Macros, baseKcal: number, weightKg: number | null): Macros {
  const protein = base.protein;
  const fiber = base.fiber;
  const rest = (fat: number, prot: number) => Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
  switch (profile) {
    case 'ausgewogen':
      return { ...base, carbs: Math.max(0, Math.round(base.carbs + (kcal - baseKcal) / 4)) };
    case 'eiweissreich': {
      const wanted = Math.round((kcal * HIGH_PROTEIN_SHARE) / 4);
      const cap = weightKg !== null && weightKg > 0 ? Math.round(weightKg * PROTEIN_PER_KG_RANGE.max) : wanted;
      const prot = Math.max(protein, Math.min(wanted, cap));
      const fat = Math.round((kcal * FAT_SHARE) / 9);
      return { protein: prot, fat, carbs: rest(fat, prot), fiber };
    }
    case 'lowfat': {
      const fat = Math.round((kcal * LOW_FAT_SHARE) / 9);
      return { protein, fat, carbs: rest(fat, protein), fiber };
    }
    case 'lowcarb':
    case 'keto': {
      const carbs = Math.min(carbLimit(profile, kcal)!, Math.max(0, Math.round((kcal - protein * 4) / 4)));
      const fat = Math.max(0, Math.round((kcal - protein * 4 - carbs * 4) / 9));
      return { protein, fat, carbs, fiber };
    }
  }
}
