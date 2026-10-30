// Freitext für den Planassistenten (Phase 8.7, Register TRAIN-020, TRAIN-021). Aus dem Text werden nur
// feste Werte gelesen (Tage, Minuten, Aufteilung, Dauer, Geräte, bekannte Übungen) – der Text selbst
// wird nie als Anweisung ausgeführt. Ein späteres Sprachmodell (Phase 9) muss genau dasselbe Schema
// liefern und durchläuft dieselbe Prüfung `validateWish`; unbekannte Felder, unbekannte Übungs-IDs und
// Werte außerhalb der Grenzen werden zurückgewiesen. Der Regelkern (planner.ts) entscheidet danach.

import { EQUIPMENT, type Equipment } from './exercises';
import { MINUTES_RANGE, SPLITS, type SplitChoice } from './planner';

export const DURATIONS = ['dauerhaft', 'woche', 'zwei_wochen'] as const;
export type Duration = (typeof DURATIONS)[number];

export type Wish = {
  days?: number;
  minutes?: number;
  split?: SplitChoice;
  duration?: Duration;
  blockedEquipment?: Equipment[];
  blockedExercises?: string[];
  lockedExercises?: string[];
  /** „Lieblingsübungen behalten“: die gesperrten Übungen bleiben (TRAIN-006). */
  keepFavorites?: boolean;
  /** Schmerzen erwähnt: Übung wird ersetzt, dazu ein Hinweis – keine Therapieempfehlung (TRAIN-017). */
  pain?: boolean;
};

export const MAX_WISH_LENGTH = 500;
const WISH_KEYS = ['days', 'minutes', 'split', 'duration', 'blockedEquipment', 'blockedExercises', 'lockedExercises', 'keepFavorites', 'pain'];

export type WishProblem =
  | 'keinObjekt'
  | 'unbekanntesFeld'
  | 'tage'
  | 'minuten'
  | 'aufteilung'
  | 'dauer'
  | 'geraet'
  | 'uebung'
  | 'typ';

/** Prüft einen Wunsch – egal ob aus dem lokalen Auswerter oder später aus einer KI-Antwort. */
export function validateWish(raw: unknown, knownExercises: ReadonlySet<string>): { wish: Wish | null; problems: WishProblem[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { wish: null, problems: ['keinObjekt'] };
  const input = raw as Record<string, unknown>;
  const problems = new Set<WishProblem>();
  if (Object.keys(input).some((k) => !WISH_KEYS.includes(k))) problems.add('unbekanntesFeld');
  const wish: Wish = {};
  if (input.days !== undefined) {
    if (typeof input.days === 'number' && Number.isInteger(input.days) && input.days >= 2 && input.days <= 6) wish.days = input.days;
    else problems.add('tage');
  }
  if (input.minutes !== undefined) {
    const m = input.minutes;
    if (typeof m === 'number' && Number.isInteger(m) && m >= MINUTES_RANGE.min && m <= MINUTES_RANGE.max) wish.minutes = m;
    else problems.add('minuten');
  }
  if (input.split !== undefined) {
    if (input.split === 'auto' || (SPLITS as readonly unknown[]).includes(input.split)) wish.split = input.split as SplitChoice;
    else problems.add('aufteilung');
  }
  if (input.duration !== undefined) {
    if ((DURATIONS as readonly unknown[]).includes(input.duration)) wish.duration = input.duration as Duration;
    else problems.add('dauer');
  }
  const list = <T extends string>(value: unknown, ok: (v: unknown) => v is T, problem: WishProblem): T[] | undefined => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.length > 100) {
      problems.add('typ');
      return undefined;
    }
    if (!value.every(ok)) {
      problems.add(problem);
      return undefined;
    }
    return [...new Set(value)];
  };
  const isEquipment = (v: unknown): v is Equipment => (EQUIPMENT as readonly unknown[]).includes(v);
  const isExercise = (v: unknown): v is string => typeof v === 'string' && knownExercises.has(v);
  const blockedEquipment = list(input.blockedEquipment, isEquipment, 'geraet');
  const blockedExercises = list(input.blockedExercises, isExercise, 'uebung');
  const lockedExercises = list(input.lockedExercises, isExercise, 'uebung');
  if (blockedEquipment) wish.blockedEquipment = blockedEquipment;
  if (blockedExercises) wish.blockedExercises = blockedExercises;
  if (lockedExercises) wish.lockedExercises = lockedExercises;
  for (const key of ['keepFavorites', 'pain'] as const) {
    if (input[key] === undefined) continue;
    if (typeof input[key] === 'boolean') wish[key] = input[key] as boolean;
    else problems.add('typ');
  }
  return problems.size > 0 ? { wish: null, problems: [...problems] } : { wish, problems: [] };
}

// ------------------------------------------------------------------------- lokaler Auswerter

/** Kleinschreibung, Umlaute als ae/oe/ue/ss, Satzzeichen als Leerzeichen. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9/,.\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NUMBER_WORDS: Record<string, number> = { zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7 };
const NUM = '\\b(\\d{1,2}|zwei|drei|vier|fuenf|sechs|sieben)';

function toNumber(word: string): number {
  return NUMBER_WORDS[word] ?? Number(word);
}

function parseDays(text: string): number | undefined {
  const patterns = [
    new RegExp(`${NUM}\\s*(?:x|mal)\\s*(?:pro|die|in der|je)?\\s*woche`, 'g'),
    new RegExp(`${NUM}\\s*-?\\s*(?:trainings)?(?:tage|tag|einheiten)\\b`, 'g'),
    new RegExp(`\\b(zwei|drei|vier|fuenf|sechs|sieben)mal\\b`, 'g'),
  ];
  const found: { value: number; index: number; afterAuf: boolean }[] = [];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const index = m.index ?? 0;
      found.push({ value: toNumber(m[1]), index, afterAuf: /\b(auf|nur noch|kuenftig|ab jetzt)\s*$/.test(text.slice(Math.max(0, index - 12), index)) });
    }
  }
  if (found.length === 0) return undefined;
  // „von 6 auf 4 Tage“: die Zahl nach „auf“ zählt, sonst die zuletzt genannte.
  const chosen = found.find((f) => f.afterAuf) ?? found.sort((a, b) => a.index - b.index).at(-1)!;
  return chosen.value;
}

function parseMinutes(text: string): number | undefined {
  const minutes = /(\d{2,3})\s*(?:min|minuten)\b/.exec(text);
  if (minutes) return Number(minutes[1]);
  if (/dreiviertel\s*stunde/.test(text)) return 45;
  if (/(anderthalb|eineinhalb)\s*stunden?/.test(text)) return 90;
  if (/halbe\s*stunde/.test(text)) return 30;
  const hours = /(\d(?:[.,]5)?)\s*(?:std|stunden?)\b/.exec(text);
  if (hours) return Math.round(Number(hours[1].replace(',', '.')) * 60);
  if (/\beine[rn]?\s*stunde\b/.test(text)) return 60;
  return undefined;
}

function parseSplit(text: string): SplitChoice | undefined {
  if (/arnold/.test(text)) return 'arnold';
  const ppl = /push.{0,8}pull|\bppl\b/.test(text);
  const ou = /ober.{0,20}unter|upper.{0,8}lower/.test(text);
  if (ppl && ou) return 'ou_ppl';
  if (ppl) return 'ppl';
  if (ou) return 'ober_unter';
  if (/ganz\s*koerper|full\s*body/.test(text)) return 'ganzkoerper';
  return undefined;
}

function parseDuration(text: string): Duration | undefined {
  if (/(zwei|2)\s*wochen/.test(text)) return 'zwei_wochen';
  if (/diese woche|naechste woche|vorruebergehend|kurzfristig|urlaub|nur heute/.test(text)) return 'woche';
  if (/dauerhaft|kuenftig|ab jetzt|ab sofort|langfristig|fuer immer/.test(text)) return 'dauerhaft';
  return undefined;
}

const EQUIPMENT_WORDS: Record<Equipment, string> = {
  langhantel: 'langhantel\\w*',
  kurzhantel: 'kurzhantel\\w*',
  kabel: '(?:kabel\\w*|seilzug\\w*)',
  maschine: '(?:maschine\\w*|geraet\\w*)',
  koerpergewicht: '(?!x)x',
};
const NEGATION = '(?:ohne|kein|keine|keinen|nicht mit|statt|anstatt)';
const BLOCKED_AFTER = '(?:ist|sind)?\\s*(?:belegt|kaputt|besetzt|gesperrt|nicht verfuegbar|nicht da|fehlt|fehlen|geht nicht|gehen nicht|tut weh|tun weh|schmerzt|schmerzen)';

function parseEquipment(text: string): Equipment[] {
  const blocked = new Set<Equipment>();
  const home = /zu ?hause|daheim|ohne geraete|nur (?:mit )?(?:dem )?koerpergewicht|ohne studio|im hotel/.test(text);
  const onlyDumbbells = /nur (?:mit )?(?:den |meinen )?kurzhantel/.test(text);
  if (home || onlyDumbbells) {
    blocked.add('langhantel').add('kabel').add('maschine');
    const dumbbellsOk = onlyDumbbells || /mit (?:den |meinen |zwei )?kurzhantel/.test(text);
    if (!dumbbellsOk) blocked.add('kurzhantel');
  }
  for (const equipment of EQUIPMENT) {
    const word = EQUIPMENT_WORDS[equipment];
    if (new RegExp(`${NEGATION}\\s+(?:\\w+\\s+){0,2}?${word}`).test(text) || new RegExp(`${word}\\s+${BLOCKED_AFTER}`).test(text)) {
      blocked.add(equipment);
    }
  }
  return [...blocked];
}

export type NamedExercise = { id: string; name: string };

/** Suchbegriffe einer Übung: ganzer Name und Name ohne Klammerzusatz, z. B. „Schulterdrücken“. */
function namesFor(name: string): string[] {
  const full = normalize(name);
  const base = normalize(name.replace(/\(.*?\)/g, ''));
  return [...new Set([full, base])].filter((n) => n.length >= 4);
}

function parseExercises(text: string, exercises: NamedExercise[]) {
  const phrases = exercises.flatMap((e) => namesFor(e.name).map((phrase) => ({ phrase, id: e.id })));
  // Längere Namen zuerst, damit „rumänisches kreuzheben“ nicht als „kreuzheben“ zählt.
  phrases.sort((a, b) => b.phrase.length - a.phrase.length);
  const taken: [number, number][] = [];
  const blocked = new Set<string>();
  const locked = new Set<string>();
  let pain = false;
  const hits = new Map<string, { start: number; end: number; ids: string[] }>();
  for (const { phrase, id } of phrases) {
    let from = 0;
    for (;;) {
      const start = text.indexOf(phrase, from);
      if (start < 0) break;
      const end = start + phrase.length;
      from = end;
      const key = `${start}:${end}`;
      const existing = hits.get(key);
      if (existing) {
        existing.ids.push(id);
        continue;
      }
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      hits.set(key, { start, end, ids: [id] });
    }
  }
  for (const { start, end, ids } of hits.values()) {
    const before = text.slice(Math.max(0, start - 20), start);
    const after = text.slice(end, end + 30);
    if (new RegExp(`${NEGATION}\\s*(?:\\w+\\s+)?$`).test(before) || new RegExp(`^\\s*${BLOCKED_AFTER}`).test(after)) {
      ids.forEach((id) => blocked.add(id));
      if (/tut weh|tun weh|schmerz/.test(after)) pain = true;
    } else if (/^\s*(?:\w+\s+)?(?:behalten|bleibt|bleiben|sperren|muss bleiben|unbedingt)/.test(after) || /(?:unbedingt|behalte|lieblingsuebung\w*)\s*$/.test(before)) {
      ids.forEach((id) => locked.add(id));
    }
  }
  return { blocked: [...blocked], locked: [...locked].filter((id) => !blocked.has(id)), pain };
}

/** Liest einen Wunsch wie „Künftig 4 Tage, je 60 Minuten, Ober/Unter; Lieblingsübungen behalten“. */
export function parseWish(input: string, exercises: NamedExercise[]): Wish {
  const text = normalize(input.slice(0, MAX_WISH_LENGTH));
  const wish: Wish = {};
  const days = parseDays(text);
  if (days !== undefined) wish.days = days;
  const minutes = parseMinutes(text);
  if (minutes !== undefined) wish.minutes = minutes;
  const split = parseSplit(text);
  if (split) wish.split = split;
  const duration = parseDuration(text);
  if (duration) wish.duration = duration;
  const equipment = parseEquipment(text);
  if (equipment.length > 0) wish.blockedEquipment = equipment;
  const ex = parseExercises(text, exercises);
  if (ex.blocked.length > 0) wish.blockedExercises = ex.blocked;
  if (ex.locked.length > 0) wish.lockedExercises = ex.locked;
  if (/lieblings|favorit/.test(text) && /behalt|bleib|sperr|nicht (?:aendern|anfassen|weg)/.test(text)) wish.keepFavorites = true;
  if (ex.pain || /schmerz|tut weh/.test(text)) wish.pain = true;
  return wish;
}

export function isEmptyWish(wish: Wish): boolean {
  return Object.keys(wish).length === 0;
}
