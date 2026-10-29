// Ernährungslogik ohne Oberfläche (Register FOOD-001–018, TIME-001–012, TRACK-001–006).
// Grundsätze: Ein fehlender Nährwert bleibt unbekannt (null) und wird nie als 0 behandelt.
// Gramm und Milliliter werden ohne bekannte Dichte nicht ineinander umgerechnet.

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

export const NUTRIENT_KEYS = ['kcal', 'protein', 'carbs', 'fat'] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrients = Record<NutrientKey, number | null>;

export const EMPTY_NUTRIENTS: Nutrients = { kcal: null, protein: null, carbs: null, fat: null };

/** Alle Nährwerte für eine Menge (z. B. 60 g eines Produkts mit Werten pro 100 g). */
export function nutrientsForAmount(per100: Nutrients, amount: number, basis: NutrientBasis, unit: NutrientBasis): Nutrients {
  const result = { ...EMPTY_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) result[key] = nutrientForAmount(per100[key], amount, basis, unit);
  return result;
}

export type NutrientTotals = { values: Record<NutrientKey, number>; unknown: Record<NutrientKey, number> };

/** Summe über Einträge. Unbekannte Werte werden gezählt statt als 0 versteckt (TRACK-002). */
export function sumNutrients(items: Nutrients[]): NutrientTotals {
  const values = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const unknown = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const item of items) {
    for (const key of NUTRIENT_KEYS) {
      const v = item[key];
      if (v === null) unknown[key] += 1;
      else values[key] += v;
    }
  }
  return { values, unknown };
}

/** Werte pro 100 g eines gekochten Gerichts aus Gesamtwerten und Endgewicht (FOOD-017). */
export function per100FromTotal(total: Nutrients, endWeight: number): Nutrients {
  if (endWeight <= 0) throw new Error('end weight required');
  const result = { ...EMPTY_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) {
    const v = total[key];
    result[key] = v === null ? null : (v * 100) / endWeight;
  }
  return result;
}

/** Ein Anteil eines Gesamtwerts, z. B. 1 von 4 Portionen. */
export function fractionOf(total: Nutrients, fraction: number): Nutrients {
  if (fraction <= 0) throw new Error('fraction must be positive');
  const result = { ...EMPTY_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) {
    const v = total[key];
    result[key] = v === null ? null : v * fraction;
  }
  return result;
}

/** Summiert Zutaten zu Gesamtwerten. Ist eine Zutat unbekannt, ist auch die Summe unbekannt. */
export function totalOf(items: Nutrients[]): Nutrients {
  const sum = sumNutrients(items);
  const result = { ...EMPTY_NUTRIENTS };
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

// ------------------------------------------------------------------------- Mahlzeiten / Zeit

export const MEALS = ['fruehstueck', 'mittag', 'abend', 'snack'] as const;
export type Meal = (typeof MEALS)[number];

/** Nur ein Vorschlag aus der Uhrzeit; die Kategorie bleibt frei wählbar (TIME-002). */
export function suggestMeal(hour: number): Meal {
  if (hour >= 4 && hour < 11) return 'fruehstueck';
  if (hour >= 11 && hour < 15) return 'mittag';
  if (hour >= 17 && hour < 22) return 'abend';
  return 'snack';
}

/** Tag verschieben (YYYY-MM-DD), ohne Zeitzonen-Effekte. */
export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// --------------------------------------------------------------------------------- Getränke

export const DRINK_TYPES = ['wasser', 'kaffee_tee', 'milch', 'saft', 'softdrink', 'alkohol', 'sonstiges'] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

/** Wasser und alle Getränke getrennt (TIME-004). Gesamtwasser aus Essen zählt hier nicht (TIME-009). */
export function drinkTotals(drinks: { drinkType: DrinkType | null; amount: number; unit: NutrientBasis }[]) {
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

/** Durchschnitt nur über erfasste Tage; leere Tage werden getrennt gezählt (TRACK-004). */
export function weekAverage(days: { day: string; kcal: number | null; entries: number }[]) {
  const tracked = days.filter((d) => d.entries > 0 && d.kcal !== null);
  const average = tracked.length ? tracked.reduce((s, d) => s + (d.kcal ?? 0), 0) / tracked.length : null;
  return { average, trackedDays: tracked.length, emptyDays: days.filter((d) => d.entries === 0).length };
}

// ------------------------------------------------------------------- Open Food Facts lesen

export type FoodDraft = {
  name: string;
  brand: string | null;
  barcode: string | null;
  basis: NutrientBasis;
  per100: Nutrients;
  servingAmount: number | null;
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
 * (1 kcal = 4,184 kJ). Gibt null zurück, wenn kein Produkt enthalten ist.
 */
export function normalizeOffProduct(response: unknown, barcode: string): FoodDraft | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as Record<string, unknown>;
  const product = (r.product ?? null) as Record<string, unknown> | null;
  if (!product || typeof product !== 'object') return null;
  if (r.status === 0 || r.status === 'failure') return null;

  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const kj = num(nutriments['energy-kj_100g']);
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
    per100: {
      kcal,
      protein: num(nutriments.proteins_100g),
      carbs: num(nutriments.carbohydrates_100g),
      fat: num(nutriments.fat_100g),
    },
    servingAmount: num(product.serving_quantity),
  };
}
