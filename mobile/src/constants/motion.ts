/**
 * Bewegung, einheitlich für die ganze App.
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

export const Durations = { fast: 150, base: 300, slow: 700 } as const;
