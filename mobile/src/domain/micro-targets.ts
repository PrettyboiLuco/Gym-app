// Ziele für Vitamine und Mineralstoffe (Ausbauplan B2, W2): Untergrenze, Ziel und – wo es eine gibt – Obergrenze je
// Nährstoff aus den Grundnahrungsmitteln (A4). Anzeige als Balken, ohne Bewertung „gut/schlecht“.
//
// Quellen – VORLÄUFIG, FACHPRÜFUNG OFFEN (docs/Fachpruefung_Mappe.md, Abschnitt N), Werte für Erwachsene 25 bis unter
// 51 Jahre:
// - Ziel: DGE-Referenzwerte für die Nährstoffzufuhr (Deutsche Gesellschaft für Ernährung, Online-Ausgabe, Stand der
//   jeweiligen Überarbeitung: Calcium 2013, Eisen 2023, Magnesium 2021, Kalium 2017, Zink 2019 bei mittlerer
//   Phytatzufuhr, Vitamin C 2015, Vitamin D 2012 (Schätzwert ohne körpereigene Bildung), Vitamin B12 2018, Folat 2013,
//   Vitamin A 2020, Vitamin E Schätzwert). Für Frauen gilt beim Eisen der Wert vor der Menopause.
// - Untergrenze: EFSA Average Requirement (AR, Durchschnittsbedarf), Dietary Reference Values 2013–2017; nur wo die
//   EFSA einen AR festgelegt hat (Calcium, Eisen, Zink bei 600 mg Phytat, Vitamin C, Folat, Vitamin A).
// - Obergrenze: EFSA Tolerable Upper Intake Level (UL): Calcium, Zink, Vitamin D (2023), Vitamin E; Eisen „sichere
//   Aufnahmemenge“ 40 mg (EFSA 2024). Keine Obergrenze, wo der UL nur für Nahrungsergänzung oder Zusätze gilt
//   (Magnesium, Folsäure) oder nur für vorgeformtes Retinol (Vitamin A – die Lebensmitteldaten trennen das nicht).
// Auswahl nach dem Formel-Term aus dem Profil (+5 bzw. −161, wie beim Energiebedarf); ohne Angabe gilt je der höhere Wert.
// Gezählt wird nur, was erfasst ist: Einträge ohne Angaben sind unbekannt, nicht 0.

import type { MicroKey } from './basis-foods';
import type { FormulaTerm } from './energy';

export const MICRO_TARGETS_VERSION = 1;
export const MAX_PINNED = 3;

export type MicroRef = { lower: number | null; target: number; upper: number | null };

type Pair = [number, number];
/** [Formel-Term +5, Formel-Term −161] */
const REFS: Record<MicroKey, { lower: Pair | null; target: Pair; upper: number | null }> = {
  calcium: { lower: [750, 750], target: [1000, 1000], upper: 2500 },
  iron: { lower: [6, 7], target: [11, 16], upper: 40 },
  magnesium: { lower: null, target: [350, 300], upper: null },
  potassium: { lower: null, target: [4000, 4000], upper: null },
  zinc: { lower: [9.3, 7.6], target: [14, 8], upper: 25 },
  vitC: { lower: [90, 80], target: [110, 95], upper: null },
  vitD: { lower: null, target: [20, 20], upper: 100 },
  vitB12: { lower: null, target: [4, 4], upper: null },
  folate: { lower: [250, 250], target: [300, 300], upper: null },
  vitA: { lower: [570, 490], target: [850, 700], upper: null },
  vitE: { lower: null, target: [14, 12], upper: 300 },
};

const pick = (pair: Pair, term: FormulaTerm | null) => (term === '+5' ? pair[0] : term === '-161' ? pair[1] : Math.max(pair[0], pair[1]));

/** Referenzwerte je Nährstoff für den Formel-Term (ohne Angabe: je der höhere Wert). */
export function microRefs(term: FormulaTerm | null): Record<MicroKey, MicroRef> {
  const out = {} as Record<MicroKey, MicroRef>;
  for (const [key, r] of Object.entries(REFS) as [MicroKey, (typeof REFS)[MicroKey]][]) {
    out[key] = { lower: r.lower ? pick(r.lower, term) : null, target: pick(r.target, term), upper: r.upper };
  }
  return out;
}

/** Wo die Tagessumme steht – beschreibend, ohne Wertung. */
export type MicroZone = 'unterUntergrenze' | 'unterZiel' | 'ziel' | 'ueberObergrenze';

export function microZone(value: number, ref: MicroRef): MicroZone {
  if (ref.upper !== null && value > ref.upper) return 'ueberObergrenze';
  if (value >= ref.target) return 'ziel';
  if (ref.lower !== null && value < ref.lower) return 'unterUntergrenze';
  return 'unterZiel';
}

/**
 * Positionen für den Balken (0–1): die Skala reicht bis zur Obergrenze bzw. 1,5 × Ziel, mindestens bis zum Wert.
 * `fill` = Wert, `lower`/`target`/`upper` = Markierungen (null = keine).
 */
export function microBar(value: number, ref: MicroRef): { fill: number; lower: number | null; target: number; upper: number | null; share: number } {
  const max = Math.max(ref.upper !== null ? Math.min(ref.upper, ref.target * 3) : ref.target * 1.5, value, ref.target);
  const at = (v: number) => Math.min(1, Math.max(0, v / max));
  return {
    fill: at(value),
    lower: ref.lower !== null ? at(ref.lower) : null,
    target: at(ref.target),
    upper: ref.upper !== null && ref.upper <= max ? at(ref.upper) : null,
    share: ref.target > 0 ? value / ref.target : 0,
  };
}

/** Anheften/Lösen; höchstens MAX_PINNED (ein weiterer wird dann nicht angeheftet). */
export function togglePin(pinned: readonly MicroKey[], key: MicroKey): MicroKey[] {
  if (pinned.includes(key)) return pinned.filter((k) => k !== key);
  return pinned.length >= MAX_PINNED ? [...pinned] : [...pinned, key];
}

/** Gespeicherte Liste bereinigen: nur bekannte Schlüssel, ohne Doppelte, höchstens MAX_PINNED. */
export function sanitizePins(raw: unknown, keys: readonly MicroKey[]): MicroKey[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((k): k is MicroKey => keys.includes(k as MicroKey)))].slice(0, MAX_PINNED);
}

/** Größte Quellen eines Nährstoffs unter den Einträgen eines Tages (nur Einträge mit Angabe über 0). */
export function topSources<T>(entries: T[], valueOf: (entry: T) => number | null | undefined, limit = 3): { entry: T; value: number }[] {
  return entries
    .map((entry) => ({ entry, value: valueOf(entry) ?? 0 }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
