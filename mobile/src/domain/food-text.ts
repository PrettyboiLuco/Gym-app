// Essen in eigenen Worten (Phase 9.5, Register FOOD-014): „2 Scheiben Brot mit Nutella, 1 Banane, 300 ml Milch“.
// Ohne KI und ohne Internet: Der Text wird in Teile mit Menge, Einheit und Name zerlegt. Daraus entstehen nur
// Kandidaten; gebucht wird erst nach Bestätigung, Mengen ohne sichere Umrechnung muss man selbst eintragen.

import type { DrinkType } from './nutrition';
import { normalize } from './wish';

export const TEXT_UNITS = ['g', 'ml', 'stueck', 'scheibe', 'portion', 'el', 'tl', 'glas', 'tasse'] as const;
export type TextUnit = (typeof TEXT_UNITS)[number];

export type FoodTextItem = {
  /** Originaltext des Teils, z. B. „2 Scheiben Brot“. */
  raw: string;
  /** Gesuchter Name ohne Menge, z. B. „brot“ (normalisiert). */
  name: string;
  amount: number | null;
  unit: TextUnit | null;
};

export const MAX_FOOD_TEXT = 500;

const NUMBER_WORDS: Record<string, number> = {
  ein: 1,
  eine: 1,
  einen: 1,
  einer: 1,
  halb: 0.5,
  halbe: 0.5,
  halben: 0.5,
  zwei: 2,
  drei: 3,
  vier: 4,
  fuenf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
};

const UNIT_WORDS: [RegExp, TextUnit, number][] = [
  [/^(?:kg|kilo|kilogramm)$/, 'g', 1000],
  [/^(?:g|gr|gramm)$/, 'g', 1],
  [/^(?:l|liter)$/, 'ml', 1000],
  [/^(?:ml|milliliter)$/, 'ml', 1],
  [/^(?:stueck|stk|st)$/, 'stueck', 1],
  [/^scheiben?$/, 'scheibe', 1],
  [/^portion(?:en)?$/, 'portion', 1],
  [/^(?:el|essloeffel)$/, 'el', 1],
  [/^(?:tl|teeloeffel)$/, 'tl', 1],
  [/^(?:glas|glaeser)$/, 'glas', 1],
  [/^(?:tasse|tassen|becher)$/, 'tasse', 1],
];

/** Füllwörter, die nicht zum Namen gehören. */
const FILLER = new Set(['etwas', 'bisschen', 'ca', 'circa', 'ungefaehr', 'eine', 'ein', 'einen', 'eines', 'von', 'vom', 'der', 'die', 'das', 'den', 'dem', 'gegessen', 'getrunken', 'hatte', 'ich', 'habe']);

function parsePart(raw: string): FoodTextItem | null {
  const words = normalize(raw).replace(/,/g, '.').split(' ').filter(Boolean);
  let amount: number | null = null;
  let unit: TextUnit | null = null;
  const rest: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // „300g“, „1.5l“: Zahl und Einheit zusammengeschrieben.
    const glued = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(word);
    const number = /^\d+(?:\.\d+)?$/.test(word) ? Number(word) : glued ? Number(glued[1]) : (NUMBER_WORDS[word] ?? null);
    if (amount === null && number !== null && rest.length === 0) {
      amount = number;
      const unitWord = glued ? glued[2] : words[i + 1];
      const match = unitWord ? UNIT_WORDS.find(([re]) => re.test(unitWord)) : undefined;
      if (match) {
        unit = match[1];
        amount = Math.round(amount * match[2] * 100) / 100;
        if (!glued) i++;
      }
      continue;
    }
    if (!FILLER.has(word)) rest.push(word);
  }
  const name = rest.join(' ').replace(/[.\-/]+$/g, '').trim();
  if (name.length < 2) return null;
  return { raw: raw.trim(), name, amount, unit };
}

/** Zerlegt den Text an Komma (nicht in „1,5“), Semikolon, Zeilen, „und“, „mit“ und „+“. */
export function parseFoodText(input: string): FoodTextItem[] {
  return input
    .slice(0, MAX_FOOD_TEXT)
    .split(/,(?!\d)|[;\n+]|\bund\b|\bmit\b|\bdazu\b|\bsowie\b/i)
    .map((part) => parsePart(part))
    .filter((item): item is FoodTextItem => item !== null)
    .slice(0, 20);
}

/**
 * Menge in g/ml des Lebensmittels, wenn sie sicher bestimmbar ist: g/ml direkt (passend zur Basis), Stück/
 * Scheibe/Portion über die hinterlegte Portionsgröße. Löffel, Glas und Tasse werden nicht geschätzt – die
 * Menge trägt man selbst ein (keine erfundene Genauigkeit).
 */
export function resolveAmount(item: Pick<FoodTextItem, 'amount' | 'unit'>, food: { basis: 'g' | 'ml'; servingAmount: number | null }): number | null {
  if (item.amount === null || item.amount <= 0) return null;
  if (item.unit === food.basis) return item.amount;
  if (item.unit === 'g' || item.unit === 'ml') return null;
  if ((item.unit === null || item.unit === 'stueck' || item.unit === 'scheibe' || item.unit === 'portion') && food.servingAmount) {
    return Math.round(item.amount * food.servingAmount * 10) / 10;
  }
  return null;
}

/** Trefferqualität eines Namens für ein Lebensmittel: 3 = gleich, 2 = beginnt damit, 1 = enthält, 0 = nein. */
export function matchScore(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (c === q) return 3;
  if (c.startsWith(q) || q.startsWith(c)) return 2;
  if (c.includes(q) || q.split(' ').some((w) => w.length >= 4 && c.includes(w))) return 1;
  return 0;
}

/** Getränkeart aus dem Namen, damit Getränke in der Trinkübersicht zählen (TIME-004/-005). Unklar = „sonstiges“. */
export function guessDrinkType(name: string): DrinkType {
  const n = normalize(name);
  if (/\bwasser\b|sprudel|mineral/.test(n)) return 'wasser';
  if (/kaffee|espresso|cappuccino|latte|\btee\b/.test(n)) return 'kaffee_tee';
  if (/milch|kakao|\bshake\b/.test(n)) return 'milch';
  if (/saft|smoothie|schorle/.test(n)) return 'saft';
  if (/\bcola\b|limo|limonade|eistee|energy/.test(n)) return 'softdrink';
  if (/\bbier\b|wein|sekt|schnaps|radler/.test(n)) return 'alkohol';
  return 'sonstiges';
}

/** Reines Wasser braucht kein Lebensmittel (0 kcal, wie die Wasser-Schnelltasten). */
export function isPlainWater(name: string): boolean {
  return /^(?:stilles |leitungs|mineral)?wasser$/.test(normalize(name));
}
