/**
 * Bewegung, einheitlich für die ganze App. Grundsatz (taste-skill, App-Bildschirme): Bewegung ist Rückmeldung –
 * Drücken, Werte, die sich ändern, Timer, Seitenwechsel. Auf Lucs Wunsch (3.11.2026) dazu ein kurzes Intro beim
 * Start, weiche Seitenwechsel und federnde Knöpfe – alles kurz (unter 0,5 s pro Bewegung) und unterbrechbar.
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

/**
 * Muskelkarte: Ändert sich ein Wert (andere Woche, anderer Plantag), gleiten die Farben in 240 ms zum neuen Wert,
 * von oben nach unten je Muskelgruppe 28 ms versetzt. Beim Öffnen steht die Karte sofort (kein Auftritt). Einzige
 * Ausnahme ist der Abschluss-Bildschirm: Dort füllen sich die trainierten Muskeln einmal, nach 250 ms in 520 ms.
 * Kurve: ease-out cubic-bezier(0.22, 1, 0.36, 1) wie im taste-skill für kleine Bewegungen.
 */
export const MapFade = {
  durationMs: 240,
  staggerMs: 28,
  growDelayMs: 250,
  growMs: 520,
  easing: [0.22, 1, 0.36, 1] as const,
} as const;

/**
 * getlayers.ai Text Animations, Preset „Rise & Settle“: Buchstaben steigen aus 24 px hinter einer Wortmaske auf und
 * federn ein (Feder tension 220 / friction 22, 30 ms Versatz). Für das Wort „Myhealth“ im Start-Intro. Die Web-Bibliothek
 * (spring-text-engine) läuft nicht in React Native; die Werte sind 1:1 auf Reanimated übertragen.
 */
export const RiseSettle = {
  fromY: 24,
  staggerMs: 30,
  spring: { stiffness: 220, damping: 22, mass: 1 },
} as const;

/**
 * Start-Intro nach getlayers „Reveal choreography“: mindestens sichtbar (Schutz vor Flackern), feste Obergrenze, und der
 * Inhalt beginnt schon beim Start des Abgangs – die App gleitet durch den verschwindenden Vorhang herein.
 */
export const Intro = {
  /** Herz-Schlag und Schriftzug, dann Abgang. 1300 ms liegt in der Spanne 900–1600 ms der Vorlagen. */
  holdMs: 1300,
  exitMs: 420,
  wordDelayMs: 220,
} as const;

/**
 * Drücken: schnell hinein (fest), beim Loslassen mit leichtem Überschwingen zurück – der Knopf „klickt“.
 * scale: Knöpfe 0.95, Listenzeilen 0.98 (große Flächen bewegen sich weniger).
 */
export const Press = {
  button: 0.95,
  row: 0.98,
  in: { stiffness: 520, damping: 32, mass: 1 },
  out: { stiffness: 380, damping: 14, mass: 1 },
} as const;

/**
 * Seitenwechsel: Unterseiten gleiten 44 px von rechts herein (zurück: von links), Tabs steigen 14 px auf. Deckkraft in
 * 260 ms (ease-out), Weg über eine Feder ohne Überschwingen. Auf dem iPhone schiebt der native Stapel Unterseiten
 * selbst – dort gilt nur der Tab-Wechsel.
 */
export const ScreenEnter = {
  slideX: 44,
  riseY: 14,
  fadeMs: 260,
  spring: { stiffness: 210, damping: 26, mass: 1 },
} as const;

/** Zahlen zählen auf (Abschluss-Bildschirm): 900 ms, ease-out cubic, kurz nach dem Erscheinen. */
export const CountUp = { durationMs: 900, delayMs: 150 } as const;

/** Karten erscheinen gestaffelt (nur Abschluss-Bildschirm und Intro-Ende): 60 ms Versatz. */
export const CardStagger = { staggerMs: 60 } as const;
