// „Was fehlt mir heute?“ und Nährstoff-Suche (Ausbauplan B2, W3). Vorschläge aus Grundnahrungsmitteln und eigenen
// Favoriten – ohne Bewertung von Lebensmitteln, nur nach Nährstoff je Menge. Vorläufig, Fachprüfung offen
// (docs/Fachpruefung_Mappe.md, Abschnitt P).
//
// Regeln Fassung 1 (03.11.2026):
// - Offene Lücke: Eiweiß ab 10 g, Ballaststoffe ab 5 g unter dem Tagesziel; angeheftete Vitamine/Mineralstoffe, wenn
//   weniger als 90 % des Ziels erfasst sind.
// - Kandidaten: Grundnahrungsmittel ohne Getränke, Süßes/Snacks, Fette/Öle, Aufstriche/Saucen und Backzutaten, dazu
//   alle Favoriten (selbst gewählt, daher ohne Filter); Grundnahrungsmittel passend zu Ernährungsweise und Allergien
//   aus den Einstellungen (unbekannte Angaben = nicht vorgeschlagen, sobald dort etwas gewählt ist).
// - Menge: Portionen der Liste (1–3 Stück bis 100 g, sonst eine), ohne Portionen 50–200 g; höchstens 400 g. Gewählt
//   wird die kleinste Menge, die die Hauptlücke des Lebensmittels schließt, sonst die übliche Portion (bzw. 100 g,
//   höchstens die größte erlaubte). Die Menge darf
//   die übrigen kcal des Tagesziels nicht überschreiten; ist das Ziel erreicht, gibt es keine Vorschläge.
// - Reihenfolge: geschlossener Anteil der Lücken (Eiweiß und Ballaststoffe zählen voll, Vitamine/Mineralstoffe halb,
//   je Lücke höchstens 100 %) geteilt durch (kcal + 100) – so zählen große Beiträge mehr als nur wenig kcal;
//   mindestens 20 % einer Lücke; Favoriten × 1,2; höchstens zwei je Gruppe.
// - Würzmengen (übliche Portion unter 10 g, z. B. Kräuter) werden weder vorgeschlagen noch in der Suche gelistet.

import { MICRO_KEYS, type BasisGroup, type MicroKey, type Micros, type Portion } from './basis-foods';
import type { Allergen, Diet, FoodDiet } from './diet';

export const GAP_RULES_VERSION = 1;

export type GapKey = 'protein' | 'fiber' | MicroKey;
export const GAP_MIN = { protein: 10, fiber: 5, microShare: 0.9 } as const;
export const MAX_AMOUNT = 400;
export const MIN_COVERAGE = 0.2;
export const FAVORITE_BONUS = 1.2;
export const PER_GROUP = 2;
/** Übliche Portion darunter = Würzmenge (Kräuter, Gewürze). */
export const SEASONING_G = 10;
const WEIGHT: Record<'protein' | 'fiber' | 'micro', number> = { protein: 1, fiber: 1, micro: 0.5 };
const EXCLUDED_GROUPS: readonly BasisGroup[] = ['getraenke', 'suesses_snacks', 'fette_oele', 'aufstriche_saucen', 'backen_sonstiges'];

/** Ein Lebensmittel mit Werten je 100 g/ml. */
export type GapFood = {
  id: string;
  name: string;
  basis: 'g' | 'ml';
  kcal: number;
  protein: number | null;
  fiber: number | null;
  micros: Micros | null;
  portions: Portion[];
  serving: number | null;
  /** Gruppe aus der Grundnahrungsmittel-Liste; null = eigenes Lebensmittel/Produkt. */
  group: BasisGroup | null;
  favorite: boolean;
  diet: FoodDiet | null;
  allergens: Allergen[] | null;
};

export type Gap = { key: GapKey; open: number; target: number };

/** Offene Lücken des Tages. `micros` nur für angeheftete Nährstoffe mit Ziel. */
export function openGaps(input: {
  protein: { target: number; eaten: number } | null;
  fiber: { target: number; eaten: number } | null;
  micros: { key: MicroKey; target: number; eaten: number }[];
}): Gap[] {
  const gaps: Gap[] = [];
  if (input.protein && input.protein.target - input.protein.eaten >= GAP_MIN.protein)
    gaps.push({ key: 'protein', open: input.protein.target - input.protein.eaten, target: input.protein.target });
  if (input.fiber && input.fiber.target - input.fiber.eaten >= GAP_MIN.fiber)
    gaps.push({ key: 'fiber', open: input.fiber.target - input.fiber.eaten, target: input.fiber.target });
  for (const m of input.micros) if (m.eaten < m.target * GAP_MIN.microShare) gaps.push({ key: m.key, open: m.target - m.eaten, target: m.target });
  return gaps;
}

/** Nährstoff je 100 g/ml; null = unbekannt. */
export function valuePer100(food: Pick<GapFood, 'protein' | 'fiber' | 'micros'>, key: GapKey): number | null {
  if (key === 'protein') return food.protein;
  if (key === 'fiber') return food.fiber;
  return food.micros?.[key] ?? null;
}

/** Passt zu Ernährungsweise und Allergien? Unbekannte Angaben zählen als „passt nicht“, sobald etwas gewählt ist. */
export function fitsDiet(food: Pick<GapFood, 'diet' | 'allergens'>, diet: Diet, allergies: readonly Allergen[]): boolean {
  if (diet === 'vegan' && food.diet !== 'vegan') return false;
  if (diet === 'vegetarisch' && food.diet !== 'vegan' && food.diet !== 'vegetarisch') return false;
  if (allergies.length > 0 && (food.allergens === null || food.allergens.some((a) => allergies.includes(a)))) return false;
  return true;
}

/** Sinnvolle Mengen: Portionen (kleine bis 3 Stück), ohne Portionen 50–200 g; höchstens MAX_AMOUNT. */
export function amountOptions(food: Pick<GapFood, 'portions' | 'serving'>): { amount: number; portion: Portion | null; count: number }[] {
  const out: { amount: number; portion: Portion | null; count: number }[] = [];
  for (const p of food.portions) {
    const counts = p.g <= 100 ? [1, 2, 3] : [1];
    for (const count of counts) if (p.g * count <= MAX_AMOUNT) out.push({ amount: Math.round(p.g * count), portion: p, count });
  }
  if (out.length === 0) for (const g of [50, 100, 150, 200]) out.push({ amount: g, portion: null, count: 1 });
  const seen = new Set<number>();
  return out.sort((a, b) => a.amount - b.amount || a.count - b.count).filter((o) => (seen.has(o.amount) ? false : (seen.add(o.amount), true)));
}

export type Suggestion = {
  food: GapFood;
  amount: number;
  portion: Portion | null;
  count: number;
  kcal: number;
  /** Beitrag je Lücke in deren Einheit. */
  adds: Partial<Record<GapKey, number>>;
  score: number;
};

function coverage(food: GapFood, amount: number, gaps: Gap[]) {
  const adds: Partial<Record<GapKey, number>> = {};
  let total = 0;
  let best = 0;
  for (const gap of gaps) {
    const v = valuePer100(food, gap.key);
    if (v === null || v <= 0) continue;
    const add = (v * amount) / 100;
    adds[gap.key] = add;
    const share = Math.min(1, add / gap.open);
    best = Math.max(best, share);
    total += share * (gap.key === 'protein' || gap.key === 'fiber' ? WEIGHT[gap.key] : WEIGHT.micro);
  }
  return { adds, total, best };
}

/** Übliche Portion: die angegebene Portion, sonst die erste einzelne Portion, sonst 100 g; nie mehr als erlaubt. */
function usualOption<T extends { amount: number; count: number }>(food: Pick<GapFood, 'serving' | 'portions'>, options: T[]): T {
  const usual = food.serving ?? food.portions[0]?.g ?? 100;
  const fitting = options.filter((o) => o.amount <= usual + 0.5);
  return fitting.length > 0 ? fitting[fitting.length - 1] : options[0];
}

/** Übliche Menge unter 10 g (Kräuter, Gewürze): nicht vorschlagen, nicht listen. */
export function isSeasoning(food: Pick<GapFood, 'serving' | 'portions'>): boolean {
  const usual = food.serving ?? food.portions[0]?.g ?? null;
  return usual !== null && usual < SEASONING_G;
}

/** Vorschläge, die die Lücken schließen, ohne die übrigen kcal zu überschreiten (`kcalLeft` null = kein Ziel). */
export function suggestFoods(gaps: Gap[], kcalLeft: number | null, foods: GapFood[], limit = 6): Suggestion[] {
  if (gaps.length === 0 || (kcalLeft !== null && kcalLeft <= 0)) return [];
  const all: Suggestion[] = [];
  for (const food of foods) {
    if (!(food.kcal > 0)) continue;
    if (!food.favorite && ((food.group !== null && EXCLUDED_GROUPS.includes(food.group)) || isSeasoning(food))) continue;
    const options = amountOptions(food).filter((o) => kcalLeft === null || (food.kcal * o.amount) / 100 <= kcalLeft);
    if (options.length === 0) continue;
    // Kleinste Menge, die die Hauptlücke schließt, sonst die übliche Portion (höchstens die größte erlaubte).
    const chosen = options.find((o) => coverage(food, o.amount, gaps).best >= 1) ?? usualOption(food, options);
    const c = coverage(food, chosen.amount, gaps);
    if (c.best < MIN_COVERAGE) continue;
    const kcal = (food.kcal * chosen.amount) / 100;
    const score = (c.total / (kcal + 100)) * 100 * (food.favorite ? FAVORITE_BONUS : 1);
    all.push({ food, amount: chosen.amount, portion: chosen.portion, count: chosen.count, kcal: Math.round(kcal), adds: c.adds, score });
  }
  all.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name));
  const perGroup = new Map<string, number>();
  const out: Suggestion[] = [];
  for (const s of all) {
    const group = s.food.group ?? `eigen-${s.food.id}`;
    const n = perGroup.get(group) ?? 0;
    if (n >= PER_GROUP) continue;
    perGroup.set(group, n + 1);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

export const RANK_KEYS: readonly GapKey[] = ['protein', 'fiber', ...MICRO_KEYS];
export type RankBy = 'g100' | 'kcal100';
/** Je 100 kcal erst ab so vielen kcal je 100 g – sonst stehen Kräuter und Brühe ganz oben. */
export const RANK_MIN_KCAL = 20;

/** Lebensmittel nach Nährstoff je 100 g/ml oder je 100 kcal; ohne Angabe nicht in der Liste. */
export function rankFoods(foods: GapFood[], key: GapKey, by: RankBy, limit = 30): { food: GapFood; value: number }[] {
  return foods
    .filter((f) => f.group !== 'backen_sonstiges' && !isSeasoning(f))
    .map((food) => {
      const v = valuePer100(food, key);
      if (v === null || v <= 0) return null;
      if (by === 'kcal100') return food.kcal >= RANK_MIN_KCAL ? { food, value: (v / food.kcal) * 100 } : null;
      return { food, value: v };
    })
    .filter((x): x is { food: GapFood; value: number } => x !== null)
    .sort((a, b) => b.value - a.value || a.food.name.localeCompare(b.food.name))
    .slice(0, limit);
}
