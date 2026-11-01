// Grundnahrungsmittel offline (Ausbauplan A4). Quelle: USDA National Nutrient Database for Standard Reference,
// Release 28 (2015) – gemeinfrei (US-Regierung). Deutsche Namen, Synonyme und Portionen sind eigene Zuordnung.
// Umrechnung: Kohlenhydrate wie auf EU-Etiketten ohne Ballaststoffe (USDA rechnet sie mit), Salz = Natrium × 2,5.

import type { Allergen, FoodDiet } from './diet';
import { foldText } from './text';

export const MICRO_KEYS = ['calcium', 'iron', 'magnesium', 'potassium', 'zinc', 'vitC', 'vitD', 'vitB12', 'folate', 'vitA', 'vitE'] as const;
export type MicroKey = (typeof MICRO_KEYS)[number];
export type Micros = Partial<Record<MicroKey, number>>;
export const MICRO_UNITS: Record<MicroKey, 'mg' | 'µg'> = {
  calcium: 'mg',
  iron: 'mg',
  magnesium: 'mg',
  potassium: 'mg',
  zinc: 'mg',
  vitC: 'mg',
  vitD: 'µg',
  vitB12: 'µg',
  folate: 'µg',
  vitA: 'µg',
  vitE: 'mg',
};

export type BasisGroup =
  | 'fleisch_fisch'
  | 'eier_milch'
  | 'pflanzlich_eiweiss'
  | 'getreide'
  | 'brot'
  | 'kartoffeln'
  | 'huelsenfruechte'
  | 'nuesse_samen'
  | 'fette_oele'
  | 'obst'
  | 'gemuese'
  | 'getraenke'
  | 'suesses_snacks'
  | 'aufstriche_saucen'
  | 'backen_sonstiges';

export type BasisFood = {
  /** „usda-05062“ – NDB-Nummer der Quelle. */
  id: string;
  name: string;
  group: BasisGroup;
  basis: 'g' | 'ml';
  prep: 'roh' | 'gekocht' | null;
  /** je 100 g/ml: kcal, Eiweiß, Kohlenhydrate (ohne Ballaststoffe), Fett, Ballaststoffe, Zucker, ges. Fettsäuren, Salz. */
  per100: [number, number, number, number, number | null, number | null, number | null, number | null];
  micros: Micros;
  portions: { label: string; g: number }[];
  serving: number | null;
  synonyms: string[];
  /** Allergene laut Zuordnung (null = keine Aussage möglich) und Ernährungsweise (null = unklar). */
  allergens: Allergen[] | null;
  diet: FoodDiet | null;
};

/** Stand der mitgelieferten Liste; höher = beim nächsten Start werden Werte aktualisiert. */
export const BASIS_VERSION = 1;

export function searchTermsOf(food: Pick<BasisFood, 'name' | 'synonyms'>): string {
  return ` ${[food.name, ...food.synonyms].map(foldText).join(' | ')} `;
}

/** Levenshtein-Abstand, abgebrochen sobald er `max` übersteigt. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Tippfehler-tolerante Suche: jedes Suchwort (ab 4 Zeichen) muss ein Wort aus Name/Synonymen treffen –
 * exakt am Wortanfang oder mit höchstens einem Tippfehler (ab 7 Zeichen zwei).
 */
export function fuzzyBasis(query: string, foods: readonly BasisFood[], limit = 10): BasisFood[] {
  const words = foldText(query)
    .split(' ')
    .filter((w) => w.length >= 3);
  if (words.length === 0) return [];
  const scored: { food: BasisFood; score: number }[] = [];
  for (const food of foods) {
    const tokens = searchTermsOf(food).split(/[ |]+/).filter(Boolean);
    let score = 0;
    let ok = true;
    for (const w of words) {
      let best = Infinity;
      for (const tok of tokens) {
        if (tok.startsWith(w)) best = 0;
        else if (w.length >= 4) best = Math.min(best, editDistance(w, tok.slice(0, Math.max(w.length, tok.length)), w.length >= 7 ? 2 : 1));
        if (best === 0) break;
      }
      if (best > (w.length >= 7 ? 2 : 1)) {
        ok = false;
        break;
      }
      score += best;
    }
    if (ok) scored.push({ food, score: score + food.name.length / 100 });
  }
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.food);
}

/** Mikronährstoffe für eine Menge (Faktor = Menge / 100). */
export function scaleMicros(micros: Micros | null, factor: number): Micros | null {
  if (!micros) return null;
  const out: Micros = {};
  for (const key of MICRO_KEYS) if (micros[key] != null) out[key] = Math.round(micros[key]! * factor * 1000) / 1000;
  return out;
}

/** Tagessumme: Wert und in wie vielen Einträgen er bekannt war. */
export function sumMicros(list: (Micros | null)[]): { values: Micros; known: number; total: number } {
  const values: Micros = {};
  let known = 0;
  for (const m of list) {
    if (!m) continue;
    known++;
    for (const key of MICRO_KEYS) if (m[key] != null) values[key] = (values[key] ?? 0) + m[key]!;
  }
  return { values, known, total: list.length };
}

export function parseMicros(json: string | null): Micros | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === 'object' ? (v as Micros) : null;
  } catch {
    return null;
  }
}

export type Portion = { label: string; g: number };

/** Portionen eines Grundnahrungsmittels (A4) aus JSON. */
export function parsePortions(json: string | null): Portion[] {
  if (!json) return [];
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list.filter((p) => p && typeof p.label === 'string' && p.g > 0) : [];
  } catch {
    return [];
  }
}

const CONTAINERS = /\b(?:EL|TL|Tasse|Glas|Handvoll|Portion|Packung|Flasche|Dose|Becher|Schale|Bund|Päckchen|Scheibe)\b/;
const UNIT_PORTION: Record<string, RegExp> = {
  el: /\bEL\b/,
  tl: /\bTL\b/,
  scheibe: /Scheibe/,
  glas: /\bGlas\b/,
  tasse: /\b(?:Tasse|Becher)\b/,
  portion: /\bPortion\b/,
};

/**
 * Gramm für eine Einheit aus dem Freitext („2 EL Haferflocken“, „1 Scheibe Brot“, „2 Eier“) anhand der Portionen.
 * Stück = übliche bzw. erste Portion ohne Gefäß/Löffel (z. B. „1 Ei (M)“, „1 Banane (mittel)“). Unbekannt = null.
 */
export function portionGrams(unit: string | null, portions: readonly Portion[], serving: number | null = null): number | null {
  const re = unit === null || unit === 'stueck' ? null : UNIT_PORTION[unit];
  if (unit !== null && unit !== 'stueck' && !re) return null;
  const fits = portions.filter((p) => (re ? re.test(p.label) : !CONTAINERS.test(p.label)));
  // mehrere Größen (Ei S/M/L): die übliche Portion zuerst
  const hit = fits.find((p) => p.g === serving) ?? fits[0];
  if (!hit) return null;
  const lead = hit.label.match(/^(\d+)(?:\/(\d+))?/);
  const count = lead ? (lead[2] ? +lead[1] / +lead[2] : +lead[1]) : 1;
  return count > 0 ? hit.g / count : null;
}
