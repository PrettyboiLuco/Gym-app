// Namensvorschläge für den Supplement-Tracker (Entscheidung Luc 31.10.2026). Nur Namen zum schnelleren Eintippen –
// keine Mengen, keine Beschreibung, kein „wofür“. Freie Eingabe bleibt immer möglich.
//
// Aufgenommen sind nur Stoffe mit klarem Status als Nahrungsergänzung:
// - Vitamine und Mineralstoffe aus Anhang I der Richtlinie 2002/46/EG (Nahrungsergänzungsmittel),
// - gängige weitere Stoffe ohne bekannte Einschränkung.
// Stoffe mit unklarem oder fehlendem Lebensmittelstatus, Warnungen oder Arzneimittel-/Dopingbezug stehen in
// NOT_SUGGESTED und werden nicht vorgeschlagen, bis die Rechtsprüfung entschieden hat (docs/Rechtspruefung_Mappe.md).

import { normalize } from './wish';

export type SupplementGroup = 'vitamin' | 'mineral' | 'weitere';
export type SupplementName = { name: string; group: SupplementGroup; aliases?: string[] };

export const SUPPLEMENT_NAMES: SupplementName[] = [
  // Vitamine (Richtlinie 2002/46/EG, Anhang I)
  { name: 'Vitamin A', group: 'vitamin', aliases: ['Retinol'] },
  { name: 'Vitamin D', group: 'vitamin', aliases: ['D3', 'Cholecalciferol'] },
  { name: 'Vitamin E', group: 'vitamin', aliases: ['Tocopherol'] },
  { name: 'Vitamin K', group: 'vitamin', aliases: ['K2', 'K1'] },
  { name: 'Vitamin B1 (Thiamin)', group: 'vitamin' },
  { name: 'Vitamin B2 (Riboflavin)', group: 'vitamin' },
  { name: 'Niacin (Vitamin B3)', group: 'vitamin' },
  { name: 'Pantothensäure (Vitamin B5)', group: 'vitamin' },
  { name: 'Vitamin B6', group: 'vitamin', aliases: ['Pyridoxin'] },
  { name: 'Folsäure', group: 'vitamin', aliases: ['Folat', 'B9'] },
  { name: 'Vitamin B12', group: 'vitamin', aliases: ['Cobalamin'] },
  { name: 'Biotin', group: 'vitamin', aliases: ['B7'] },
  { name: 'Vitamin C', group: 'vitamin', aliases: ['Ascorbinsäure'] },
  { name: 'Vitamin-B-Komplex', group: 'vitamin' },
  { name: 'Multivitamin', group: 'vitamin' },
  // Mineralstoffe und Spurenelemente (Richtlinie 2002/46/EG, Anhang I)
  { name: 'Calcium', group: 'mineral', aliases: ['Kalzium'] },
  { name: 'Magnesium', group: 'mineral' },
  { name: 'Eisen', group: 'mineral' },
  { name: 'Kupfer', group: 'mineral' },
  { name: 'Jod', group: 'mineral' },
  { name: 'Zink', group: 'mineral' },
  { name: 'Mangan', group: 'mineral' },
  { name: 'Natrium', group: 'mineral' },
  { name: 'Kalium', group: 'mineral' },
  { name: 'Selen', group: 'mineral' },
  { name: 'Chrom', group: 'mineral' },
  { name: 'Molybdän', group: 'mineral' },
  { name: 'Fluorid', group: 'mineral' },
  { name: 'Chlorid', group: 'mineral' },
  { name: 'Phosphor', group: 'mineral' },
  { name: 'Bor', group: 'mineral' },
  { name: 'Silizium', group: 'mineral' },
  { name: 'Elektrolyte', group: 'mineral' },
  // Weitere gängige Stoffe
  { name: 'Kreatin', group: 'weitere', aliases: ['Creatin', 'Kreatin-Monohydrat'] },
  { name: 'Omega-3 (Fischöl)', group: 'weitere', aliases: ['Fischöl', 'EPA', 'DHA'] },
  { name: 'Omega-3 (Algenöl)', group: 'weitere', aliases: ['Algenöl'] },
  { name: 'Koffein', group: 'weitere', aliases: ['Coffein'] },
  { name: 'Beta-Alanin', group: 'weitere' },
  { name: 'L-Citrullin', group: 'weitere', aliases: ['Citrullin', 'Citrullin-Malat'] },
  { name: 'L-Arginin', group: 'weitere', aliases: ['Arginin'] },
  { name: 'L-Glutamin', group: 'weitere', aliases: ['Glutamin'] },
  { name: 'L-Carnitin', group: 'weitere', aliases: ['Carnitin'] },
  { name: 'Taurin', group: 'weitere' },
  { name: 'BCAA', group: 'weitere', aliases: ['Aminosäuren'] },
  { name: 'EAA', group: 'weitere', aliases: ['essentielle Aminosäuren'] },
  { name: 'Kollagen', group: 'weitere', aliases: ['Collagen'] },
  { name: 'Coenzym Q10', group: 'weitere', aliases: ['Q10', 'Ubiquinol'] },
  { name: 'Lutein', group: 'weitere' },
  { name: 'Glucosamin', group: 'weitere' },
  { name: 'Ballaststoffe (z. B. Flohsamenschalen)', group: 'weitere', aliases: ['Flohsamen', 'Psyllium', 'Inulin'] },
];

/**
 * Bewusst NICHT vorgeschlagen, bis die Rechtsprüfung entschieden hat (Status als Lebensmittel unklar oder nicht
 * zugelassen, behördliche Warnungen, Arzneimittel- oder Dopingbezug). Eintippen bleibt möglich; die App schlägt sie
 * nur nicht selbst vor. Liste mit Gründen: docs/Rechtspruefung_Mappe.md.
 */
export const NOT_SUGGESTED = [
  'TUDCA',
  'UDCA',
  'Melatonin',
  'Ashwagandha',
  'Yohimbe',
  'Kurkuma',
  'Curcumin',
  'Grüntee-Extrakt',
  'Rotschimmelreis',
  'Synephrin',
  'Bitterorange',
  'Johanniskraut',
  'CBD',
  'NMN',
  'DHEA',
  'Berberin',
  'Garcinia',
  'Probiotika',
  'Tongkat Ali',
  'Kratom',
  'DMAA',
  'SARMs',
  'Prohormone',
] as const;

/** Bis zu `max` Vorschläge, deren Name oder anderer Name mit dem Getippten beginnt oder es enthält. */
export function suggestSupplementNames(query: string, max = 6): string[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const score = (s: SupplementName) => {
    const names = [s.name, ...(s.aliases ?? [])].map(normalize);
    if (names.some((n) => n.startsWith(q))) return 0;
    // Jedes getippte Wort ist der Anfang eines Worts im Namen („vit c“ → Vitamin C).
    const typed = q.split(' ');
    if (names.some((n) => typed.every((t) => n.split(/[ -]/).some((w) => w.startsWith(t))))) return 1;
    if (names.some((n) => n.includes(q))) return 2;
    return 3;
  };
  return SUPPLEMENT_NAMES.map((s) => ({ s, rank: score(s) }))
    .filter((x) => x.rank < 3)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, max)
    .map((x) => x.s.name);
}
