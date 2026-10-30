// Einheiten (Register UX-003). Gespeichert wird immer in kg und cm; umgerechnet wird nur für
// Anzeige und Eingabe. So bleiben Verlauf und Vergleiche gleich, egal welche Einheit gewählt ist.

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';
export type Units = { weight: WeightUnit; length: LengthUnit };

export const DEFAULT_UNITS: Units = { weight: 'kg', length: 'cm' };

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function cmToUnit(cm: number, unit: LengthUnit): number {
  return unit === 'cm' ? cm : cm / CM_PER_IN;
}

export function unitToCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_IN;
}

/** Dezimalzahl mit Komma oder Punkt, höchstens `decimals` Nachkommastellen. */
export function parseDecimal(input: string, decimals = 2): number | null {
  const text = input.trim().replace(',', '.');
  const pattern = new RegExp(`^\\d{1,4}(\\.\\d{1,${decimals}})?$`);
  return pattern.test(text) ? Number(text) : null;
}

/**
 * Liest ein Gewicht in der gewählten Einheit und gibt kg zurück. Die Grenzen sind nur
 * Tippfehler-Schutz; `range` gilt in kg.
 */
export function parseWeightIn(input: string, unit: WeightUnit, range: { min: number; max: number }): number | null {
  const value = parseDecimal(input);
  if (value === null) return null;
  const kg = unitToKg(value, unit);
  // Kleine Toleranz, damit z. B. 44 lb (19,96 kg) bei einer Untergrenze von 20 kg nicht scheitert.
  return kg >= range.min - 0.05 && kg <= range.max + 0.05 ? kg : null;
}

/** Liest eine Länge in der gewählten Einheit und gibt cm zurück; `range` gilt in cm. */
export function parseLengthIn(input: string, unit: LengthUnit, range: { min: number; max: number }): number | null {
  const value = parseDecimal(input, 1);
  if (value === null) return null;
  const cm = unitToCm(value, unit);
  return cm >= range.min - 0.05 && cm <= range.max + 0.05 ? cm : null;
}

/** Eingabetext für ein gespeichertes kg-Gewicht in der gewählten Einheit (z. B. „62,5“). */
export function weightInputText(kg: number, unit: WeightUnit): string {
  return String(Math.round(kgToUnit(kg, unit) * 100) / 100).replace('.', ',');
}

export function lengthInputText(cm: number, unit: LengthUnit): string {
  return String(Math.round(cmToUnit(cm, unit) * 10) / 10).replace('.', ',');
}

/** Gültigkeitsbereiche in kg/cm (Tippfehler-Schutz, keine Empfehlung). */
export const BODY_WEIGHT_RANGE = { min: 20, max: 400 } as const;
export const HEIGHT_RANGE = { min: 100, max: 250 } as const;
export const MEASURE_RANGE = { min: 10, max: 300 } as const;
export const LIFT_RANGE = { min: 0, max: 1000 } as const;
