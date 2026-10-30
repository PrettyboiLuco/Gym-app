// Prüfung auf unzulässige Versprechen (Phase 10.4, Register COACH-011, HIIT-006, UX-009, LAW-010). Läuft als Test
// über alle App-Texte und die Store-Texte, damit kein „Bauchfett wegtrainieren“ oder „garantiert 5 kg“ durchrutscht.
//
// Geprüft wird je Satz. Ein Satz mit Verneinung („kann keine Übung“, „nie allergenfrei zusichern“) oder eine Frage
// ist erlaubt: Genau so klären die Texte Mythen auf. Die Liste ersetzt keine rechtliche Prüfung (10.2).

import { normalize } from './wish';

export const CLAIM_RULES = [
  { id: 'bauchfett', pattern: /(bauch|fett|problemzonen?)\w* .*(weg|verbrenn|abbau|schmelz|los ?werden)|gezielt.* fett/ },
  { id: 'cardio', pattern: /cardio.*(bringt nichts|nutzlos|sinnlos|unnoetig|zwanzig ?mal|20 ?x)/ },
  { id: 'garantie', pattern: /garantiert|garantie|100 prozent|in \d+ (tagen|wochen).*(kg|kilo)|ohne diaet|muehelos/ },
  { id: 'medizin', pattern: /\bheilt|heilung|therapie|diagnos|medizinprodukt|klinisch/ },
  { id: 'geprueft', pattern: /(fachlich|wissenschaftlich|aerztlich|medizinisch) (gepruef|bewiesen|belegt|freigegeben|empfohlen|anerkannt)/ },
  { id: 'allergenfrei', pattern: /allergenfrei|frei von allergenen/ },
  { id: 'entgiften', pattern: /entgift|detox|stoffwechsel ankurbeln/ },
  { id: 'superlativ', pattern: /beste app|\bnr\.? ?1\b|nummer (1|eins)/ },
] as const;

export type ClaimRule = (typeof CLAIM_RULES)[number]['id'];
export type ClaimHit = { rule: ClaimRule; sentence: string };

const NEGATION = /\b(kein|keine|keinen|keiner|nicht|nie|niemals|ohne|weder|kann keine)\b/;

/** Sätze eines Texts (an . ! ? und Zeilenumbrüchen getrennt, Abkürzungen wie „z. B.“ grob mitgenommen). */
function sentences(text: string): string[] {
  return text
    .replace(/\b(z|d|u|s|ca|bzw|inkl|ggf|evtl|nr)\. ?/gi, (m) => m.replace('.', '·'))
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Alle Sätze, die eine Regel verletzen und weder verneint noch als Frage formuliert sind. */
export function findClaims(text: string): ClaimHit[] {
  const hits: ClaimHit[] = [];
  for (const sentence of sentences(text)) {
    if (sentence.endsWith('?')) continue;
    const plain = normalize(sentence.replace(/[„“"]/g, ' ').replace(/%/g, ' prozent'));
    if (NEGATION.test(plain)) continue;
    for (const rule of CLAIM_RULES) if (rule.pattern.test(plain)) hits.push({ rule: rule.id, sentence });
  }
  return hits;
}
