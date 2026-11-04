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

/**
 * Satztabelle im Training (O3, N3, N4): Zeilen blenden beim Hinzufügen/Löschen weich ein und aus, die übrigen rücken mit
 * einer Feder nach. Erledigt füllt sich der Zeilengrund von links in Lime (ease-out wie MapFade), danach scrollt die
 * nächste offene Zeile sanft in Sicht. Löschen per Wischen: Zeile folgt dem Finger halb so schnell (friction 2), über die
 * Aktion hinaus zieht sie wie ein Gummiband (overshootFriction 8).
 */
export const SetRowMotion = {
  enterMs: 220,
  exitMs: 180,
  fillMs: 420,
  unfillMs: 160,
  scrollDelayMs: 480,
  /** Zeile gilt als sichtbar, wenn sie so weit vom oberen bzw. unteren Rand entfernt ist (Pausenleiste unten). */
  visibleTop: 120,
  visibleBottom: 260,
  swipeFriction: 2,
  overshootFriction: 8,
  actionWidth: 80,
} as const;

/**
 * Pausen-Timer (N5): Vollbild wächst aus dem kleinen Ring der Leiste (Ring fliegt an seinen Platz und wird groß),
 * Text und Knöpfe blenden nach; Zuklappen läuft zurück in die Leiste. Letzte 3 Sekunden: Ring schlägt je Sekunde einmal.
 */
export const RestMorph = {
  spring: { stiffness: 240, damping: 26, mass: 1 },
  closeMs: 240,
  /** Ohne bekannten Ausgangspunkt (Vollbild öffnet sich nach einem Satz von selbst): von unten, so weit verkleinert. */
  fallbackScale: 0.6,
  fallbackRise: 160,
  pulseScale: 1.06,
  pulseUpMs: 110,
  pulseSeconds: 3,
} as const;

/**
 * Bestleistung (N6): kurzer Partikel-Burst um die Medaille, die sich einmal um sich selbst dreht. Startet, wenn die
 * Karte der Bestleistungen erscheint (nach ihrem Versatz), insgesamt unter einer Sekunde.
 */
export const RecordBurst = {
  delayMs: 240,
  particles: 14,
  distance: 56,
  durationMs: 720,
  spinMs: 900,
} as const;

/** Ladeflächen (N8): atmen ruhig zwischen voller und halber Deckkraft statt eines wandernden Glanzstreifens. */
export const Shimmer = { durationMs: 900, minOpacity: 0.5 } as const;

/**
 * Scanner-Rahmen (N9): bei Erkennung ziehen sich die Ecken federnd auf den Code zusammen, danach wird der Rahmen zum
 * Haken (Kreis wächst, Haken zeichnet sich). holdMs: so lange bleibt das Kamerabild danach stehen.
 */
export const ScanLock = {
  spring: { stiffness: 300, damping: 24, mass: 1 },
  checkDelayMs: 220,
  checkMs: 320,
  holdMs: 720,
} as const;

/** Tab-Leiste (N7, Web): die helle Pille des gewählten Tabs gleitet zum neuen Tab – Feder ohne Überschwingen. */
export const TabPill = { spring: { stiffness: 320, damping: 32, mass: 1 } } as const;

/**
 * Fenster „Platte federt auf“ (getlayers Section `loader-lumora`, Bewegung 1:1 übernommen; tension = stiffness,
 * friction = damping, Masse 1). Die Platte federt von ihrer Höhe auf 0; der Inhalt steigt Zeile für Zeile durch die
 * Bewegung herein (getlayers „Reveal choreography“: Gate beim START der Bewegung). Schließen: Inhalt zuerst (12 px nach
 * unten, Deckkraft 0), die Platte folgt `exitLagMs` später. Wischen nach unten schließt ab `dismissPx` oder `dismissVelocity`.
 */
export const SheetMotion = {
  slab: { stiffness: 220, damping: 30, mass: 1 },
  content: { stiffness: 260, damping: 26, mass: 1 },
  contentDrift: 12,
  row: { stiffness: 170, damping: 26, mass: 1 },
  rowFromY: 10,
  rowLadderMs: [150, 200, 250, 300, 400, 550, 650, 750, 900],
  rowStepMs: 100,
  rowMaxMs: 1200,
  /** Die Platte folgt dem Inhalt so viel später (die Vorlage lässt den Inhalt zuerst gehen). */
  exitLagMs: 80,
  backdropMs: 220,
  dismissPx: 120,
  dismissVelocity: 800,
} as const;
