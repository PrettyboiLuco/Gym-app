// Feedback aus dem Pilot (Register BUS-002, BUS-015, BUS-016, O7). Nichts wird automatisch gesendet:
// Die App erzeugt einen Text, den du selbst über das Teilen-Menü verschickst.

export const AREAS = ['training', 'dehnen', 'hiit', 'ernaehrung', 'rechner', 'fortschritt'] as const;
export type Area = (typeof AREAS)[number];

/** Zahlungsbereitschaft für eine werbefreie Pro-Version (Hypothesen aus BUS-002: 4 €/Monat, 30 €/Jahr). */
export const PAY_OPTIONS = ['nichts', 'bis2', 'bis4', 'jahr30', 'mehr'] as const;
export type PayOption = (typeof PAY_OPTIONS)[number];

export type FeedbackAnswers = {
  used: Area[];
  missing: string;
  annoying: string;
  pay: PayOption | null;
  otherApps: string;
  /** 0–10, wie wahrscheinlich du die App weiterempfiehlst. */
  recommend: number | null;
};

export const EMPTY_FEEDBACK: FeedbackAnswers = { used: [], missing: '', annoying: '', pay: null, otherApps: '', recommend: null };

export type UsageSummary = {
  workouts: number;
  sets: number;
  diaryDays: number;
  stretchSessions: number;
  hiitSessions: number;
  activeGoals: number;
  weightEntries: number;
  firstUseDay: string | null;
};

export function isEmptyFeedback(a: FeedbackAnswers): boolean {
  return a.used.length === 0 && !a.missing.trim() && !a.annoying.trim() && a.pay === null && !a.otherApps.trim() && a.recommend === null;
}

/**
 * Text zum Teilen. `labels` übersetzt Schlüssel in lesbare Texte; die Nutzungsübersicht ist nur
 * enthalten, wenn sie ausdrücklich angehängt wird (nur Anzahlen, keine Inhalte).
 */
export function feedbackText(
  a: FeedbackAnswers,
  usage: UsageSummary | null,
  meta: { version: string; date: string },
  labels: (key: string, vars?: Record<string, unknown>) => string
): string {
  const lines = [labels('feedback.text.header', meta), ''];
  const add = (key: string, value: string) => {
    if (value.trim()) lines.push(`${labels(key)}: ${value.trim()}`);
  };
  add('feedback.text.used', a.used.map((u) => labels(`feedback.area.${u}`)).join(', '));
  add('feedback.text.missing', a.missing);
  add('feedback.text.annoying', a.annoying);
  add('feedback.text.pay', a.pay ? labels(`feedback.pay.${a.pay}`) : '');
  add('feedback.text.otherApps', a.otherApps);
  add('feedback.text.recommend', a.recommend === null ? '' : `${a.recommend}/10`);
  if (usage) {
    lines.push('', labels('feedback.text.usageHeader'));
    lines.push(labels('feedback.text.usage', usage));
  }
  return lines.join('\n');
}
