// Übungsbilder (Phase 9.1, Register MEDIA-001, -012, -013, STRETCH-009). Entscheidung 30.10.2026: später eigene
// Bilder, keine gekauften oder fremden Medien. Jedes Bild steht mit Herkunft im Verzeichnis
// `src/media/exercise-media.ts`; ohne Eintrag zeigt die App weiter nur die Textanleitung.

export type MediaEntry = {
  exerciseId: string;
  /** Ergebnis von require('@/assets/exercises/…') – nur so werden Bilder in die App gepackt. */
  source: number;
  kind: 'bild' | 'clip';
  /** Wer das Bild gemacht hat. */
  author: string;
  /** z. B. „eigenes Werk“; fremde Lizenzen nur nach Prüfung (MEDIA-002–011). */
  license: string;
  /** Wie es entstanden ist, z. B. „eigenes Foto, Studio X“ oder „Blender, eigenes Modell“. */
  origin: string;
  /** Prüfdatum YYYY-MM-DD (MEDIA-013). */
  checkedAt: string;
  /** Bewegung fachlich geprüft? Ein schönes Bild reicht nicht (MEDIA-012). */
  movementReviewed: boolean;
};

export type MediaProblem = 'unbekannteUebung' | 'herkunftFehlt' | 'datum' | 'doppelt';

/** Prüft das Verzeichnis; Tests schlagen fehl, wenn ein Bild ohne Herkunft eingetragen wird. */
export function validateMedia(entries: MediaEntry[], exerciseIds: ReadonlySet<string>): { index: number; problem: MediaProblem }[] {
  const problems: { index: number; problem: MediaProblem }[] = [];
  const seen = new Set<string>();
  entries.forEach((e, index) => {
    if (!exerciseIds.has(e.exerciseId)) problems.push({ index, problem: 'unbekannteUebung' });
    if (![e.author, e.license, e.origin].every((v) => v.trim().length > 0)) problems.push({ index, problem: 'herkunftFehlt' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.checkedAt)) problems.push({ index, problem: 'datum' });
    const key = `${e.exerciseId}:${e.kind}`;
    if (seen.has(key)) problems.push({ index, problem: 'doppelt' });
    seen.add(key);
  });
  return problems;
}

export function mediaFor(entries: MediaEntry[], exerciseId: string): MediaEntry | null {
  return entries.find((e) => e.exerciseId === exerciseId && e.kind === 'bild') ?? null;
}
