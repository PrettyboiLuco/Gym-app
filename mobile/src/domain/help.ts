// Hilfe und häufige Fragen (Phase 10.5, Register UX-005). Nur Text auf dem Gerät, ohne Internet. Die Fragen
// stehen hier als Schlüssel, die Texte in der Sprachdatei (help.q.<id>.q / .a), damit weitere Sprachen nur
// Übersetzungen brauchen.

import { normalize } from './wish';

export const HELP_SECTIONS = [
  { id: 'start', questions: ['wasKann', 'coachStart', 'coachAendern', 'keinKonto'] },
  { id: 'training', questions: ['planAnlegen', 'planassistent', 'geraetBelegt', 'steigerung', 'pausenTimer', 'dehnenHiit'] },
  { id: 'ernaehrung', questions: ['eintragen', 'eigeneWorte', 'scanFalsch', 'allergene', 'ohneZahlen', 'supplements'] },
  { id: 'ziele', questions: ['kalorienSchaetzung', 'trainingsRuhetag', 'checkin', 'schritte', 'sensibel'] },
  { id: 'daten', questions: ['wasGesendet', 'sicherung', 'neuesHandy', 'loeschen', 'appSperre'] },
  { id: 'probleme', questions: ['mitteilungen', 'fehler', 'appleHealth', 'fachlichGeprueft'] },
] as const;

export type HelpQuestion = (typeof HELP_SECTIONS)[number]['questions'][number];

export const HELP_QUESTIONS: HelpQuestion[] = HELP_SECTIONS.flatMap((s) => [...s.questions]);

/**
 * Fragen, deren Frage oder Antwort alle Suchwörter enthält (Groß-/Kleinschreibung und Umlaute egal).
 * Leere Suche = alle Fragen. `text` liefert Frage und Antwort in der aktuellen Sprache.
 */
export function searchHelp(query: string, text: (id: HelpQuestion) => { q: string; a: string }): HelpQuestion[] {
  const words = normalize(query).split(' ').filter((w) => w.length > 0);
  if (words.length === 0) return HELP_QUESTIONS;
  return HELP_QUESTIONS.filter((id) => {
    const { q, a } = text(id);
    const haystack = normalize(`${q} ${a}`);
    return words.every((w) => haystack.includes(w));
  });
}
