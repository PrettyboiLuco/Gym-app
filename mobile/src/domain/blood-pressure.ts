// Blutdruck-Tagebuch (A10.4): Eingabe prüfen und Schnitt bilden. Die App bewertet die Werte nicht.

export const BP_RANGE = { systolic: { min: 50, max: 260 }, diastolic: { min: 30, max: 180 }, pulse: { min: 25, max: 220 } } as const;

export type BpProblem = 'systolic' | 'diastolic' | 'order' | 'pulse';

const int = (s: string) => (/^\d{2,3}$/.test(s.trim()) ? Number(s.trim()) : null);

/** Liest „128“, „82“, optional Puls; oberer Wert muss über dem unteren liegen (Tippfehler-Schutz). */
export function parseBloodPressure(form: { systolic: string; diastolic: string; pulse: string }): { value: { systolic: number; diastolic: number; pulse: number | null } | null; problems: BpProblem[] } {
  const problems: BpProblem[] = [];
  const sys = int(form.systolic);
  const dia = int(form.diastolic);
  const pulse = form.pulse.trim() ? int(form.pulse) : null;
  if (sys === null || sys < BP_RANGE.systolic.min || sys > BP_RANGE.systolic.max) problems.push('systolic');
  if (dia === null || dia < BP_RANGE.diastolic.min || dia > BP_RANGE.diastolic.max) problems.push('diastolic');
  if (sys !== null && dia !== null && sys <= dia) problems.push('order');
  if (form.pulse.trim() && (pulse === null || pulse < BP_RANGE.pulse.min || pulse > BP_RANGE.pulse.max)) problems.push('pulse');
  return problems.length ? { value: null, problems } : { value: { systolic: sys!, diastolic: dia!, pulse }, problems };
}

/** Schnitt der Messungen (gerundet), z. B. der letzten 7 Tage; leer → null. */
export function bpAverage(list: { systolic: number; diastolic: number; pulse: number | null }[]) {
  if (!list.length) return null;
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const pulses = list.map((m) => m.pulse).filter((p): p is number => p !== null);
  return { systolic: avg(list.map((m) => m.systolic)), diastolic: avg(list.map((m) => m.diastolic)), pulse: pulses.length ? avg(pulses) : null, count: list.length };
}
