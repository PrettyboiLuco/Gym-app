// Rezept-Import per Link (Ausbauplan A9.4): Viele Rezeptseiten beschreiben ihr Rezept maschinenlesbar nach
// schema.org (JSON-LD). Daraus werden Name, Portionen, Zutatenzeilen und Schritte gelesen; die Zutaten werden danach
// mit Lebensmitteln abgeglichen, unklare wählt man selbst.

import { portionGrams, type Portion } from './basis-foods';

export type ImportedRecipe = { name: string; portions: number | null; ingredients: string[]; steps: string[]; source: string | null };

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function isRecipe(node: Json): node is { [key: string]: Json } {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const type = node['@type'];
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
}

function findRecipe(node: Json): { [key: string]: Json } | null {
  if (isRecipe(node)) return node;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findRecipe(n);
      if (hit) return hit;
    }
  } else if (node && typeof node === 'object') {
    for (const key of ['@graph', 'mainEntity', 'itemListElement']) {
      if (key in node) {
        const hit = findRecipe(node[key]);
        if (hit) return hit;
      }
    }
  }
  return null;
}

const text = (v: Json | undefined): string =>
  (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

function steps(v: Json | undefined): string[] {
  if (!v) return [];
  if (typeof v === 'string')
    return v
      .split(/\n+/)
      .map((s) => text(s))
      .filter(Boolean);
  if (Array.isArray(v))
    return v
      .flatMap((s) =>
        typeof s === 'string'
          ? [text(s)]
          : s && typeof s === 'object' && !Array.isArray(s)
            ? s.itemListElement
              ? steps(s.itemListElement)
              : [text(s.text ?? s.name)]
            : []
      )
      .filter(Boolean);
  return [];
}

/** „4 Portionen“, „4“, ["4", "4 servings"] → 4. */
export function parseYield(v: Json | undefined): number | null {
  const first = Array.isArray(v) ? v[0] : v;
  const m = text(first as Json).match(/\d+(?:[.,]\d+)?/);
  const n = m ? Number(m[0].replace(',', '.')) : NaN;
  return n > 0 && n <= 50 ? n : null;
}

/** Rezept aus dem HTML einer Seite (erstes schema.org-Rezept). null = keins gefunden. */
export function extractRecipe(html: string, url: string | null = null): ImportedRecipe | null {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const block of blocks) {
    let data: Json;
    try {
      data = JSON.parse(block.trim());
    } catch {
      continue;
    }
    const r = findRecipe(data);
    if (!r) continue;
    const ingredients = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : Array.isArray(r.ingredients) ? r.ingredients : [])
      .map((i) => text(i))
      .filter(Boolean);
    if (ingredients.length === 0) continue;
    return { name: text(r.name) || 'Rezept', portions: parseYield(r.recipeYield), ingredients, steps: steps(r.recipeInstructions), source: url };
  }
  return null;
}

// --------------------------------------------------------------------------- Zutatenzeilen

export type IngredientUnit = 'g' | 'ml' | 'el' | 'tl' | 'stueck' | 'prise' | 'scheibe' | 'tasse' | 'dose' | 'bund' | 'becher' | 'packung' | 'zehe' | 'handvoll';
export type IngredientLine = { raw: string; amount: number | null; unit: IngredientUnit | null; name: string };

const UNITS: [RegExp, IngredientUnit, number][] = [
  [/^kg$|^kilo(gramm)?$/i, 'g', 1000],
  [/^g$|^gr\.?$|^gramm$/i, 'g', 1],
  [/^l$|^liter$/i, 'ml', 1000],
  [/^cl$/i, 'ml', 10],
  [/^ml$|^milliliter$/i, 'ml', 1],
  [/^el\.?$|^essl(ö|oe)ffel$|^tbsp\.?$/i, 'el', 1],
  [/^tl\.?$|^teel(ö|oe)ffel$|^tsp\.?$/i, 'tl', 1],
  [/^st(ü|ue)ck$|^stk\.?$|^st\.?$/i, 'stueck', 1],
  [/^prise[n]?$/i, 'prise', 1],
  [/^scheibe[n]?$/i, 'scheibe', 1],
  [/^tasse[n]?$|^cups?$/i, 'tasse', 1],
  [/^dose[n]?$/i, 'dose', 1],
  [/^bund$/i, 'bund', 1],
  [/^becher$/i, 'becher', 1],
  [/^p(ä|ae)ckchen$|^pck\.?$|^packung(en)?$/i, 'packung', 1],
  [/^zehe[n]?$/i, 'zehe', 1],
  [/^handvoll$/i, 'handvoll', 1],
];

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

function parseAmount(token: string, grouping = true): number | null {
  // Tausenderpunkt wie in deutschen Rezepten („1.000 g“) – nicht mit Dezimalpunkt („1.5 kg“) verwechseln.
  const t = (grouping && /^\d{1,3}(\.\d{3})+$/.test(token) ? token.replace(/\./g, '') : token).replace(',', '.');
  if (FRACTIONS[t] !== undefined) return FRACTIONS[t];
  let m = t.match(/^(\d+)([½¼¾⅓⅔])$/);
  if (m) return Number(m[1]) + FRACTIONS[m[2]];
  m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  m = t.match(/^(\d+(?:\.\d+)?)(?:-\d+(?:\.\d+)?)?$/);
  return m ? Number(m[1]) : null;
}

/** „200 g Haferflocken (zart)“, „2 EL Olivenöl“, „1 ½ Zwiebeln, gewürfelt“, „Salz“ → Menge, Einheit, Name. */
export function parseIngredientLine(raw: string): IngredientLine {
  // „, in Scheiben“ abschneiden, aber Dezimalkomma („0,5 kg“) behalten
  let rest = raw
    .replace(/\(.*?\)/g, ' ')
    .replace(/,\s*(?!\d).*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  // „ca. 200 g“ → „200 g“; Spannen mit Gedankenstrich oder Leerzeichen („2–3“, „2 - 3“) → „2-3“ (Phase 1 Scan)
  rest = rest.replace(/^(etwa|ca\.?|circa|ungef(ä|ae)hr|evtl\.?)\s+(?=[\d½¼¾⅓⅔])/i, '').replace(/(\d)\s*[–—-]\s*(\d)/, '$1-$2');
  // „200g“ → „200 g“
  rest = rest.replace(/^(\d+(?:[.,]\d+)?)([a-zA-ZäöüÄÖÜ]+)\b/, '$1 $2');
  const words = rest.split(' ');
  let amount: number | null = null;
  let i = 0;
  // Tausenderpunkt nur bei g/ml oder ohne Einheit: „1.250 kg“ sind 1,25 kg, nicht 1250 kg.
  const next = words[1] ? UNITS.find(([re]) => re.test(words[1])) : undefined;
  const grouping = !next || ((next[1] === 'g' || next[1] === 'ml') && next[2] === 1);
  const first = words[0] ? parseAmount(words[0], grouping) : null;
  if (first !== null) {
    amount = first;
    i = 1;
    const second = words[1] ? parseAmount(words[1]) : null;
    if (second !== null && second < 1) {
      amount += second;
      i = 2;
    }
  }
  let unit: IngredientUnit | null = null;
  const u = words[i] ? UNITS.find(([re]) => re.test(words[i])) : undefined;
  if (u) {
    unit = u[1];
    if (amount !== null) amount *= u[2];
    i++;
  }
  const name = words
    .slice(i)
    .join(' ')
    .replace(/^(etwas|ca\.?|circa|evtl\.?)\s+/i, '')
    .trim();
  return { raw, amount, unit: amount !== null && unit === null ? 'stueck' : unit, name: name || raw };
}

/**
 * Menge in g/ml für ein Lebensmittel: g/ml direkt; Löffel, Stück, Scheiben über die Portionen des
 * Grundnahrungsmittels; Prise ≈ 0,5 g. Unbekannt → null (selbst eintragen).
 */
export function lineGrams(line: IngredientLine, portions: readonly Portion[], serving: number | null): number | null {
  if (line.amount === null) return line.unit === 'prise' ? 0.5 : null;
  if (line.unit === 'g' || line.unit === 'ml') return Math.round(line.amount);
  if (line.unit === 'prise') return Math.round(line.amount * 0.5 * 10) / 10;
  const per = portionGrams(line.unit, portions, serving);
  return per ? Math.round(line.amount * per) : null;
}
