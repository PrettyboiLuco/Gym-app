/**
 * Bewegung, einheitlich für die ganze App. Nach taste-skill (App-Bildschirme) nur als Rückmeldung:
 * Drücken, Werte, die sich ändern, Timer. Nichts bekommt einen Auftritt beim Öffnen.
 * Vorlage: getlayers.ai Text Animations, Preset „Word Rise“ – Wörter steigen gestaffelt auf
 * (aus 28 px, Feder tension 180 / friction 22, 70 ms Versatz). Die Web-Bibliothek dort (spring-text-engine)
 * läuft nicht in React Native; die Werte sind hier 1:1 auf Reanimated übertragen (tension = stiffness,
 * friction = damping, Masse 1). Bei „Bewegung reduzieren“ (iPhone-Einstellung) springt alles sofort ans Ziel.
 */
export const WordRise = {
  fromY: 28,
  staggerMs: 70,
  spring: { stiffness: 180, damping: 22, mass: 1 },
} as const;

/** Gleiche Feder für alles, was sich bewegt (Karten, Diagramme, Ringe), damit die App einen Rhythmus hat. */
export const Spring = WordRise.spring;

/**
 * getlayers.ai Text Animations, Preset „Pop Scale“ (Phase 1 Scan, U5): Buchstaben springen mit leichtem Überschwingen
 * auf (out: Deckkraft 0 / Größe 0 → in: 1 / 1, Feder tension 320 / friction 14, 25 ms Versatz). Die Web-Bibliothek
 * (spring-text-engine) läuft nicht in React Native; die Werte sind 1:1 auf Reanimated übertragen. Nur als Rückmeldung
 * auf dem Abschluss-Bildschirm („Training geschafft“), nie als Auftritt beim Öffnen eines Bildschirms.
 */
export const PopScale = {
  staggerMs: 25,
  spring: { stiffness: 320, damping: 14, mass: 1 },
} as const;
