// Cardio (Ausbauplan A2): Ausdauer im Training und für sich – Minuten, Strecke, Anstrengung. Ohne GPS und ohne
// Kalorien-Gutschrift (HEALTH-007): Der Kalorienbedarf rechnet Aktivität schon über den Aktivitätsfaktor ein.

export const CARDIO_ACTIVITIES = [
  // Geräte
  'laufband',
  'ergometer',
  'spinning',
  'crosstrainer',
  'rudergeraet',
  'treppensteiger',
  'stepper',
  'skiergometer',
  'seilspringen',
  // Ausdauer draußen
  'gehen',
  'laufen',
  'radfahren',
  'mountainbike',
  'schwimmen',
  'wandern',
  'inlineskaten',
  'rudern',
  'sup',
  'skilanglauf',
  'skifahren',
  // Ballsport und Schläger
  'fussball',
  'basketball',
  'volleyball',
  'handball',
  'tennis',
  'badminton',
  'tischtennis',
  'squash',
  'padel',
  'golf',
  // Kampfsport
  'boxen',
  'kickboxen',
  'kampfsport',
  // Kurse und Körper
  'yoga',
  'pilates',
  'tanzen',
  'zirkeltraining',
  'functional',
  'aerobic',
  // Draußen und Alltag
  'klettern',
  'bouldern',
  'gartenarbeit',
  'sonstiges',
] as const;
export type CardioActivity = (typeof CARDIO_ACTIVITIES)[number];

/** Gruppen für die Auswahl (Idee aus fin, 10.11.2026): Suche + Kategorie statt einer langen Chip-Wolke. */
export const CARDIO_CATEGORIES = ['geraete', 'ausdauer', 'ball', 'kampf', 'kurse', 'mehr'] as const;
export type CardioCategory = (typeof CARDIO_CATEGORIES)[number];

/** Strecke sinnvoll (Laufband, Rad, Rudern …)? Stufe/Steigung als Zusatzangabe? Gruppe für die Auswahl. */
export const CARDIO_INFO: Record<CardioActivity, { distance: boolean; level: 'steigung' | 'stufe' | null; category: CardioCategory }> = {
  laufband: { distance: true, level: 'steigung', category: 'geraete' },
  ergometer: { distance: true, level: 'stufe', category: 'geraete' },
  spinning: { distance: false, level: 'stufe', category: 'geraete' },
  crosstrainer: { distance: true, level: 'stufe', category: 'geraete' },
  rudergeraet: { distance: true, level: 'stufe', category: 'geraete' },
  treppensteiger: { distance: false, level: 'stufe', category: 'geraete' },
  stepper: { distance: false, level: 'stufe', category: 'geraete' },
  skiergometer: { distance: true, level: 'stufe', category: 'geraete' },
  seilspringen: { distance: false, level: null, category: 'geraete' },
  gehen: { distance: true, level: null, category: 'ausdauer' },
  laufen: { distance: true, level: null, category: 'ausdauer' },
  radfahren: { distance: true, level: null, category: 'ausdauer' },
  mountainbike: { distance: true, level: null, category: 'ausdauer' },
  schwimmen: { distance: true, level: null, category: 'ausdauer' },
  wandern: { distance: true, level: null, category: 'ausdauer' },
  inlineskaten: { distance: true, level: null, category: 'ausdauer' },
  rudern: { distance: true, level: null, category: 'ausdauer' },
  sup: { distance: true, level: null, category: 'ausdauer' },
  skilanglauf: { distance: true, level: null, category: 'ausdauer' },
  skifahren: { distance: false, level: null, category: 'ausdauer' },
  fussball: { distance: false, level: null, category: 'ball' },
  basketball: { distance: false, level: null, category: 'ball' },
  volleyball: { distance: false, level: null, category: 'ball' },
  handball: { distance: false, level: null, category: 'ball' },
  tennis: { distance: false, level: null, category: 'ball' },
  badminton: { distance: false, level: null, category: 'ball' },
  tischtennis: { distance: false, level: null, category: 'ball' },
  squash: { distance: false, level: null, category: 'ball' },
  padel: { distance: false, level: null, category: 'ball' },
  golf: { distance: true, level: null, category: 'ball' },
  boxen: { distance: false, level: null, category: 'kampf' },
  kickboxen: { distance: false, level: null, category: 'kampf' },
  kampfsport: { distance: false, level: null, category: 'kampf' },
  yoga: { distance: false, level: null, category: 'kurse' },
  pilates: { distance: false, level: null, category: 'kurse' },
  tanzen: { distance: false, level: null, category: 'kurse' },
  zirkeltraining: { distance: false, level: null, category: 'kurse' },
  functional: { distance: false, level: null, category: 'kurse' },
  aerobic: { distance: false, level: null, category: 'kurse' },
  klettern: { distance: false, level: null, category: 'mehr' },
  bouldern: { distance: false, level: null, category: 'mehr' },
  gartenarbeit: { distance: false, level: null, category: 'mehr' },
  sonstiges: { distance: true, level: null, category: 'mehr' },
};

/** Suche ohne Groß-/Kleinschreibung und Umlaute („fussball“ findet „Fußball“). */
export function matchesActivity(name: string, query: string): boolean {
  const norm = (v: string) =>
    v
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const q = norm(query.trim());
  return q === '' || norm(name).includes(q);
}

export const isCardioActivity = (v: unknown): v is CardioActivity => typeof v === 'string' && (CARDIO_ACTIVITIES as readonly string[]).includes(v);

export const CARDIO_MAX_MINUTES = 600;
export const PLAN_CARDIO_MAX_MINUTES = 180;

export type CardioForm = { minutes: string; distance: string; avgHr: string; effort: number | null; level: string; note: string };
export type CardioValues = {
  minutes: number;
  distanceKm: number | null;
  avgHr: number | null;
  effort: number | null;
  level: string | null;
  note: string | null;
};
export type CardioProblem = 'minutes' | 'distance' | 'hr';

const decimal = (text: string) => {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
};

/** Prüft die Eingaben eines Cardio-Eintrags; Strecke und Puls sind freiwillig. */
export function parseCardioForm(form: CardioForm): { values: CardioValues | null; problems: CardioProblem[] } {
  const problems: CardioProblem[] = [];
  const minutes = decimal(form.minutes);
  if (minutes === null || Number.isNaN(minutes) || minutes <= 0 || minutes > CARDIO_MAX_MINUTES) problems.push('minutes');
  const distance = decimal(form.distance);
  if (distance !== null && (Number.isNaN(distance) || distance <= 0 || distance > 300)) problems.push('distance');
  const hr = decimal(form.avgHr);
  if (hr !== null && (Number.isNaN(hr) || !Number.isInteger(hr) || hr < 30 || hr > 240)) problems.push('hr');
  if (problems.length) return { values: null, problems };
  return {
    values: {
      minutes: Math.round(minutes! * 10) / 10,
      distanceKm: distance === null ? null : Math.round(distance * 100) / 100,
      avgHr: hr,
      effort: form.effort,
      level: form.level.trim() || null,
      note: form.note.trim() || null,
    },
    problems,
  };
}

/** Tempo in min/km (Laufen, Gehen) bzw. km/h (Rad, Rudern …) – nur zur Anzeige. */
export function pace(minutes: number, distanceKm: number | null): { minPerKm: number; kmh: number } | null {
  if (!distanceKm || distanceKm <= 0 || minutes <= 0) return null;
  return { minPerKm: minutes / distanceKm, kmh: (distanceKm / minutes) * 60 };
}

/** Minuten aus einer laufenden Stoppuhr (auf 0,1 min). */
export function elapsedMinutes(startedAtIso: string, nowMs: number): number {
  return Math.max(0.1, Math.round(((nowMs - Date.parse(startedAtIso)) / 60_000) * 10) / 10);
}

/**
 * Minuten, wenn nichts getippt wurde: eine laufende Stoppuhr zählt vor gespeicherten und geplanten Minuten
 * (sonst gingen beim Speichern die gemessene Zeit verloren oder es fehlten Minuten).
 */
export function defaultCardioMinutes(
  entry: { minutes: number | null; plannedMinutes: number | null; timerStartedAt: string | null } | null,
  nowMs: number
): number | null {
  if (entry?.timerStartedAt) return elapsedMinutes(entry.timerStartedAt, nowMs);
  return entry?.minutes ?? entry?.plannedMinutes ?? null;
}
