// Cardio (Ausbauplan A2): Ausdauer im Training und für sich – Minuten, Strecke, Anstrengung. Ohne GPS und ohne
// Kalorien-Gutschrift (HEALTH-007): Der Kalorienbedarf rechnet Aktivität schon über den Aktivitätsfaktor ein.

export const CARDIO_ACTIVITIES = [
  'laufband',
  'ergometer',
  'spinning',
  'crosstrainer',
  'rudergeraet',
  'treppensteiger',
  'stepper',
  'seilspringen',
  'gehen',
  'laufen',
  'radfahren',
  'schwimmen',
  'wandern',
  'sonstiges',
] as const;
export type CardioActivity = (typeof CARDIO_ACTIVITIES)[number];

/** Strecke sinnvoll (Laufband, Rad, Rudern …)? Stufe/Steigung als Zusatzangabe? */
export const CARDIO_INFO: Record<CardioActivity, { distance: boolean; level: 'steigung' | 'stufe' | null }> = {
  laufband: { distance: true, level: 'steigung' },
  ergometer: { distance: true, level: 'stufe' },
  spinning: { distance: false, level: 'stufe' },
  crosstrainer: { distance: true, level: 'stufe' },
  rudergeraet: { distance: true, level: 'stufe' },
  treppensteiger: { distance: false, level: 'stufe' },
  stepper: { distance: false, level: 'stufe' },
  seilspringen: { distance: false, level: null },
  gehen: { distance: true, level: null },
  laufen: { distance: true, level: null },
  radfahren: { distance: true, level: null },
  schwimmen: { distance: true, level: null },
  wandern: { distance: true, level: null },
  sonstiges: { distance: true, level: null },
};

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
