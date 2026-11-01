// Ernährungslogik ohne Oberfläche (Register FOOD-001–018, TIME-001–012, TRACK-001–006).
// Grundsätze: Ein fehlender Nährwert bleibt unbekannt (null) und wird nie als 0 behandelt.
// Gramm und Milliliter werden ohne bekannte Dichte nicht ineinander umgerechnet.

import { allergensFromOff, dietFromOff, type Allergen, type FoodDiet } from './diet';

export type NutrientBasis = 'g' | 'ml';

/** Nährwert für eine Menge aus einem Wert pro 100 g bzw. 100 ml. */
export function nutrientForAmount(
  valuePer100: number | null,
  amount: number,
  basis: NutrientBasis = 'g',
  unit: NutrientBasis = 'g'
): number | null {
  if (amount < 0) throw new Error('negative amount');
  if (basis !== unit) throw new Error('density required');
  return valuePer100 === null ? null : (valuePer100 * amount) / 100;
}

/** Portion eines Rezepts: Gesamtwert × Portionsgewicht / Endgewicht nach dem Kochen. */
export function recipePortion(total: number, endWeight: number | null, portion: number): number {
  if (endWeight === null || endWeight <= 0) throw new Error('end weight required');
  return (total * portion) / endWeight;
}

// ------------------------------------------------------------------------- Nährwert-Sätze

/** Ballaststoffe seit dem Coach (C4); ältere Einträge haben dafür „unbekannt“. */
/** Zucker, gesättigte Fettsäuren und Salz seit A3 (EU-Pflichtangaben); ältere Einträge: „unbekannt“. */
export const NUTRIENT_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'satFat', 'salt'] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
/** Zusatzwerte (A3): optional – fehlt der Wert, gilt er als unbekannt. */
export type ExtraNutrientKey = 'sugar' | 'satFat' | 'salt';
export type Nutrients = Record<Exclude<NutrientKey, ExtraNutrientKey>, number | null> & Partial<Record<ExtraNutrientKey, number | null>>;

export const EMPTY_NUTRIENTS: Nutrients = { kcal: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null, satFat: null, salt: null };

/** Alle Nährwerte für eine Menge (z. B. 60 g eines Produkts mit Werten pro 100 g). */
export function nutrientsForAmount(per100: Nutrients, amount: number, basis: NutrientBasis, unit: NutrientBasis): Nutrients {
  const result = nutrientResult();
  for (const key of NUTRIENT_KEYS) result[key] = nutrientForAmount(per100[key] ?? null, amount, basis, unit);
  return result;
}

export type NutrientTotals = { values: Record<NutrientKey, number>; unknown: Record<NutrientKey, number> };
const nutrientResult = (): Record<NutrientKey, number | null> => ({ ...EMPTY_NUTRIENTS }) as Record<NutrientKey, number | null>;

/** Summe über Einträge. Unbekannte Werte werden gezählt statt als 0 versteckt (TRACK-002). */
export function sumNutrients(items: Nutrients[]): NutrientTotals {
  const values = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, salt: 0 };
  const unknown = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, salt: 0 };
  for (const item of items) {
    for (const key of NUTRIENT_KEYS) {
      const v = item[key];
      if (v == null) unknown[key] += 1;
      else values[key] += v;
    }
  }
  return { values, unknown };
}

/** Werte pro 100 g eines gekochten Gerichts aus Gesamtwerten und Endgewicht (FOOD-017). */
export function per100FromTotal(total: Nutrients, endWeight: number): Nutrients {
  if (endWeight <= 0) throw new Error('end weight required');
  const result = nutrientResult();
  for (const key of NUTRIENT_KEYS) {
    const v = total[key];
    result[key] = v == null ? null : (v * 100) / endWeight;
  }
  return result;
}

/** Ein Anteil eines Gesamtwerts, z. B. 1 von 4 Portionen. */
export function fractionOf(total: Nutrients, fraction: number): Nutrients {
  if (fraction <= 0) throw new Error('fraction must be positive');
  const result = nutrientResult();
  for (const key of NUTRIENT_KEYS) {
    const v = total[key];
    result[key] = v == null ? null : v * fraction;
  }
  return result;
}

/** Summiert Zutaten zu Gesamtwerten. Ist eine Zutat unbekannt, ist auch die Summe unbekannt. */
export function totalOf(items: Nutrients[]): Nutrients {
  const sum = sumNutrients(items);
  const result = nutrientResult();
  for (const key of NUTRIENT_KEYS) result[key] = sum.unknown[key] > 0 ? null : sum.values[key];
  return result;
}

// ------------------------------------------------------------------------------- Eingaben

/** Menge in g/ml (Komma erlaubt, > 0, höchstens 5000). */
export function parseAmount(input: string): number | null {
  const text = input.trim().replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  return value > 0 && value <= 5000 ? value : null;
}

/** Nährwert pro 100 (leer = unbekannt). Ungültige Eingabe ergibt 'invalid'. */
export function parseNutrient(input: string): number | null | 'invalid' {
  const text = input.trim().replace(',', '.');
  if (text === '') return null;
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(text)) return 'invalid';
  const value = Number(text);
  return value <= 1000 ? value : 'invalid';
}

/**
 * Prüft EAN-8, UPC-A (12), EAN-13 und GTIN-14 anhand der Prüfziffer. Der Barcode bleibt
 * Text, damit führende Nullen erhalten bleiben (FOOD-001).
 */
export function isValidBarcode(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * Produktnummer (GTIN) aus einem gescannten Code. Klassische Strichcodes (EAN/UPC) kommen unverändert zurück – ihre
 * Prüfziffer prüft die Kamera selbst. Dazu die 2D-Codes, die Hersteller ab 2027 drucken (GS1 „Sunrise 2027“):
 * GS1 Digital Link als QR-Code (https://…/01/04012345678901/…), Klammerform „(01)04012345678901(17)…“ und
 * GS1-Rohdaten aus DataMatrix-Codes („01“ + 14 Ziffern, ggf. mit Trennzeichen). Daraus wird nur die Produktnummer
 * genommen (Mindesthaltbarkeit, Charge usw. bleiben unbeachtet); eine GTIN-14 mit führender 0 wird zur EAN-13.
 * null = kein Produktcode, z. B. eine gewöhnliche Web-Adresse.
 */
export function productCodeFromScan(raw: string): string | null {
  const text = raw.trim();
  if (/^\d{8,14}$/.test(text)) return text;
  let gtin: string | undefined;
  if (/^https?:\/\//i.test(text)) {
    gtin = /\/01\/(\d{14}|\d{13}|\d{12}|\d{8})(?=[/?#]|$)/.exec(text)?.[1] ?? /[?&]01=(\d{8,14})(?=&|#|$)/.exec(text)?.[1];
  } else if (text.startsWith('(')) {
    gtin = /\(01\)(\d{14})/.exec(text)?.[1];
  } else {
    // DataMatrix: optional Symbologie-Kennung (z. B. „]d2“) und Trennzeichen FNC1 (GS, als Zeichen 29 oder „␝“).
    gtin = /^(?:\][A-Za-z]\d)?[\u001d␝]?01(\d{14})/.exec(text)?.[1];
  }
  if (!gtin) return null;
  const code = gtin.length === 14 && gtin.startsWith('0') ? gtin.slice(1) : gtin;
  return isValidBarcode(code) ? code : null;
}

/**
 * Schreibweisen derselben Nummer: UPC-A (12 Ziffern) und dieselbe Nummer als EAN-13 mit führender 0. Je nach Gerät
 * meldet die Kamera die eine oder andere Form; die eigene Liste soll das Produkt in beiden Fällen finden.
 */
export function barcodeVariants(code: string): string[] {
  if (/^\d{12}$/.test(code)) return [code, `0${code}`];
  if (/^0\d{12}$/.test(code)) return [code, code.slice(1)];
  return [code];
}

// ------------------------------------------------------------------------- Mahlzeiten / Zeit

export const MEALS = ['fruehstueck', 'mittag', 'abend', 'snack'] as const;
export type Meal = (typeof MEALS)[number];

// --------------------------------------------------------------------------------- Getränke

export const DRINK_TYPES = ['wasser', 'kaffee_tee', 'milch', 'saft', 'softdrink', 'alkohol', 'sonstiges'] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

/** Wasser und alle Getränke getrennt (TIME-004). Gesamtwasser aus Essen zählt hier nicht (TIME-009). */
export function drinkTotals(drinks: { drinkType: DrinkType | null; amount: number; unit: string }[]) {
  let waterMl = 0;
  let allMl = 0;
  for (const d of drinks) {
    if (d.unit !== 'ml') continue;
    allMl += d.amount;
    if (d.drinkType === 'wasser') waterMl += d.amount;
  }
  return { waterMl, allMl };
}

// -------------------------------------------------------------------------- Wochenansicht

/**
 * Durchschnitt nur über vollständig erfasste Tage; leere Tage und Tage mit unbekannten Werten
 * werden getrennt gezählt, damit sie den Schnitt nicht nach unten ziehen (TRACK-002, TRACK-004).
 */
export function weekAverage(days: { day: string; kcal: number | null; entries: number; unknownKcal?: number; flagged?: number | boolean }[]) {
  // Vom Nutzer als „nicht vollständig erfasst“ markiert (A7.2) zählt wie ein unvollständiger Tag.
  const incomplete = days.filter((d) => d.entries > 0 && (d.kcal === null || (d.unknownKcal ?? 0) > 0 || !!d.flagged));
  const tracked = days.filter((d) => d.entries > 0 && d.kcal !== null && (d.unknownKcal ?? 0) === 0 && !d.flagged);
  const average = tracked.length ? tracked.reduce((s, d) => s + (d.kcal ?? 0), 0) / tracked.length : null;
  return {
    average,
    trackedDays: tracked.length,
    incompleteDays: incomplete.length,
    emptyDays: days.filter((d) => d.entries === 0).length,
  };
}

// ------------------------------------------------------------------- Open Food Facts lesen

export const PREPS = ['roh', 'gekocht'] as const;
export type Prep = (typeof PREPS)[number];

export type FoodDraft = {
  name: string;
  brand: string | null;
  barcode: string | null;
  basis: NutrientBasis;
  /** Zubereitung, falls relevant (FOOD-011); fehlt = keine Angabe. */
  prep?: Prep | null;
  per100: Nutrients;
  servingAmount: number | null;
  /** Packungsinhalt in g/ml (A3); fehlt = unbekannt. */
  packageAmount?: number | null;
  /** Koffein in mg je 100 g/ml (A3). */
  caffeine?: number | null;
  /**
   * Allergene und Spuren laut Angabe (COACH-009); null = unbekannt, [] = keine angegeben.
   * Fehlt das Feld (undefined), bleibt beim Speichern der bisherige Wert.
   */
  allergens?: Allergen[] | null;
  traces?: Allergen[] | null;
  diet?: FoodDiet | null;
};

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) {
    return Number(value);
  }
  return null;
}

/**
 * Macht aus einer Open-Food-Facts-Antwort (API v2 oder v3) einen Lebensmittel-Entwurf.
 * Fehlende Werte bleiben unbekannt. kcal wird nur aus kJ berechnet, wenn kcal fehlt
 * (1 kcal = 4,184 kJ); als kJ-Quelle dient auch das ältere Feld `energy_100g`, das Open Food Facts immer in kJ
 * führt. Gibt null zurück, wenn kein Produkt enthalten ist.
 */
export function normalizeOffProduct(response: unknown, barcode: string): FoodDraft | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as Record<string, unknown>;
  const product = (r.product ?? null) as Record<string, unknown> | null;
  if (!product || typeof product !== 'object') return null;
  if (r.status === 0 || r.status === 'failure') return null;

  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const kj = num(nutriments['energy-kj_100g']) ?? num(nutriments.energy_100g);
  const kcal = num(nutriments['energy-kcal_100g']) ?? (kj !== null ? Math.round((kj / 4.184) * 10) / 10 : null);
  const name =
    [product.product_name_de, product.product_name, product.generic_name_de, product.generic_name]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .find((v) => v.length > 0) ?? '';
  const brands = typeof product.brands === 'string' ? product.brands.split(',')[0].trim() : '';
  const unit = typeof product.product_quantity_unit === 'string' ? product.product_quantity_unit.toLowerCase() : '';
  const basis: NutrientBasis = unit === 'ml' || unit === 'l' || unit === 'cl' ? 'ml' : 'g';

  return {
    name,
    brand: brands || null,
    barcode,
    basis,
    prep: null,
    per100: {
      kcal,
      protein: num(nutriments.proteins_100g),
      carbs: num(nutriments.carbohydrates_100g),
      fiber: num(nutriments.fiber_100g),
      fat: num(nutriments.fat_100g),
      sugar: num(nutriments.sugars_100g),
      satFat: num(nutriments['saturated-fat_100g']),
      salt: num(nutriments.salt_100g),
    },
    servingAmount: num(product.serving_quantity),
    // Packungsinhalt (z. B. 500 g) nur, wenn er in derselben Einheit wie die Nährwerte angegeben ist.
    packageAmount: num(product.product_quantity),
    // Koffein: OFF speichert g je 100 g/ml → mg.
    caffeine: num(nutriments.caffeine_100g) === null ? null : Math.round(num(nutriments.caffeine_100g)! * 1000 * 10) / 10,
    allergens: allergensFromOff(product.allergens_tags),
    traces: allergensFromOff(product.traces_tags),
    diet: dietFromOff(product.ingredients_analysis_tags),
  };
}

// ------------------------------------------------------------------- Formular Lebensmittel

/** Formularwerte als Text, so wie sie getippt werden. */
export type FoodForm = {
  name: string;
  brand: string;
  barcode: string;
  basis: NutrientBasis;
  prep: Prep | 'keine';
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  /** Ballaststoffe in g pro 100 g/ml; leer = unbekannt (C4). */
  fiber: string;
  /** Zucker, gesättigte Fettsäuren, Salz in g pro 100 g/ml (A3). */
  sugar?: string;
  satFat?: string;
  salt?: string;
  /** Packungsinhalt in g/ml (A3). */
  package?: string;
  serving: string;
  /** null = keine Angabe zu Allergenen (COACH-009). */
  allergens: Allergen[] | null;
};

export type FoodProblem = 'name' | 'nutrient' | 'serving' | 'barcode' | 'macros';

export function foodToForm(food: FoodDraft): FoodForm {
  const text = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));
  return {
    name: food.name,
    brand: food.brand ?? '',
    barcode: food.barcode ?? '',
    basis: food.basis,
    prep: food.prep ?? 'keine',
    kcal: text(food.per100.kcal),
    protein: text(food.per100.protein),
    carbs: text(food.per100.carbs),
    fat: text(food.per100.fat),
    fiber: text(food.per100.fiber),
    sugar: text(food.per100.sugar ?? null),
    satFat: text(food.per100.satFat ?? null),
    salt: text(food.per100.salt ?? null),
    package: text(food.packageAmount ?? null),
    serving: text(food.servingAmount),
    allergens: food.allergens ?? null,
  };
}

/**
 * Prüft das Formular (FOOD-002, FOOD-010, FOOD-011). Leere Nährwerte bleiben unbekannt.
 * Mehr als 100 g Makros pro 100 g sind physikalisch unmöglich und deuten auf einen Tippfehler.
 */
export function parseFoodForm(form: FoodForm): { draft: FoodDraft | null; problems: FoodProblem[] } {
  const problems: FoodProblem[] = [];
  if (!form.name.trim()) problems.push('name');
  const values = [form.kcal, form.protein, form.carbs, form.fat, form.fiber, form.sugar ?? '', form.satFat ?? '', form.salt ?? ''].map(parseNutrient);
  if (values.includes('invalid')) problems.push('nutrient');
  const serving = form.serving.trim() === '' ? null : parseAmount(form.serving);
  if (form.serving.trim() !== '' && serving === null) problems.push('serving');
  const barcode = form.barcode.trim();
  if (barcode && !isValidBarcode(barcode)) problems.push('barcode');
  const [kcal, protein, carbs, fat, fiber, sugar, satFat, salt] = values as (number | null)[];
  const packageText = (form.package ?? '').trim();
  const packageAmount = packageText === '' ? null : parseAmount(packageText);
  if (packageText !== '' && packageAmount === null) problems.push('serving');
  if (form.basis === 'g' && !values.includes('invalid') && (protein ?? 0) + (carbs ?? 0) + (fat ?? 0) > 100) {
    problems.push('macros');
  }
  if (problems.length > 0) return { draft: null, problems };
  return {
    draft: {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      barcode: barcode || null,
      basis: form.basis,
      prep: form.prep === 'keine' ? null : form.prep,
      per100: { kcal, protein, carbs, fat, fiber, sugar, satFat, salt },
      servingAmount: serving,
      packageAmount,
      allergens: form.allergens,
    },
    problems,
  };
}

// ---------------------------------------------------------------------- Formular Rezept

export type RecipeForm = {
  name: string;
  endWeight: string;
  portions: string;
  ingredients: { foodId: string; amount: string }[];
};

export type RecipeProblem = 'name' | 'ingredients' | 'amount' | 'endWeight' | 'portions' | 'needOne';

/** Prüft ein Rezept: Endgewicht und Portionen getrennt, mindestens eins davon (FOOD-017). */
export function parseRecipeForm(form: RecipeForm) {
  const problems: RecipeProblem[] = [];
  if (!form.name.trim()) problems.push('name');
  if (form.ingredients.length === 0) problems.push('ingredients');
  const amounts = form.ingredients.map((i) => parseAmount(i.amount));
  if (amounts.includes(null)) problems.push('amount');
  const endWeight = form.endWeight.trim() === '' ? null : parseAmount(form.endWeight);
  if (form.endWeight.trim() !== '' && endWeight === null) problems.push('endWeight');
  const portionsText = form.portions.trim();
  const portions = portionsText === '' ? null : /^\d{1,3}$/.test(portionsText) ? Number(portionsText) : NaN;
  if (portions !== null && (Number.isNaN(portions) || portions < 1 || portions > 100)) problems.push('portions');
  if (portionsText === '' && form.endWeight.trim() === '') problems.push('needOne');
  if (problems.length > 0) return { draft: null, problems };
  return {
    draft: {
      name: form.name.trim(),
      endWeightG: endWeight,
      portions,
      ingredients: form.ingredients.map((i, index) => ({ foodId: i.foodId, amount: amounts[index]! })),
    },
    problems,
  };
}

// ------------------------------------------------------------------ Formular Einstellungen

export type SettingsForm = { kcalGoal: string; drinkGoal: string; glassSizes: number[]; hideNumbers: boolean };
export type SettingsProblem = 'kcal' | 'drink' | 'glasses' | 'glass';

/**
 * Prüft die Ernährungs-Einstellungen. Die Grenzen sind nur Tippfehler-Schutz, keine Empfehlung;
 * eigene Vorgaben werden nie automatisch überschrieben (TIME-008, TIME-010).
 */
export function parseSettingsForm(form: SettingsForm) {
  const problems: SettingsProblem[] = [];
  const whole = (text: string, min: number, max: number) => {
    if (text.trim() === '') return null;
    const n = /^\d{1,5}$/.test(text.trim()) ? Number(text.trim()) : NaN;
    return n >= min && n <= max ? n : NaN;
  };
  const kcalGoal = whole(form.kcalGoal, 500, 10000);
  const drinkGoalMl = whole(form.drinkGoal, 250, 10000);
  if (Number.isNaN(kcalGoal)) problems.push('kcal');
  if (Number.isNaN(drinkGoalMl)) problems.push('drink');
  if (form.glassSizes.length === 0) problems.push('glasses');
  if (problems.length > 0) return { settings: null, kcalGoal: null, problems };
  return {
    settings: { drinkGoalMl, glassSizes: form.glassSizes, hideNumbers: form.hideNumbers },
    kcalGoal,
    problems,
  };
}
