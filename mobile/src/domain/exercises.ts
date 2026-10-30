// Startliste mit gängigen Übungen. Nur Namen, Zuordnungen und eigene kurze Anleitungen, keine fremden
// Texte oder Medien, daher keine Lizenzfrage (Register TRAIN-003, TECH-009, STRETCH-009).
// Namen und Anleitungen stehen in der Sprachdatei.

export const EQUIPMENT = ['langhantel', 'kurzhantel', 'kabel', 'maschine', 'koerpergewicht'] as const;
export const MUSCLE_GROUPS = [
  'brust',
  'ruecken',
  'schultern',
  'arme',
  'beine',
  'gesaess',
  'waden',
  'bauch',
  'huefte',
  'nacken',
  'ganzkoerper',
] as const;

/** Art der Übung (Kap. 21.2, STRETCH-007). */
export const EXERCISE_KINDS = ['kraft', 'dehnung_statisch', 'dehnung_dynamisch', 'mobilitaet'] as const;
/** Wird ein Satz in Wiederholungen oder in Sekunden gemessen (UX-011, z. B. Plank)? */
export const MEASURES = ['wdh', 'zeit'] as const;
/** Einseitig = wird erst links, dann rechts ausgeführt. */
export const SIDES = ['beidseitig', 'einseitig'] as const;

export type Equipment = (typeof EQUIPMENT)[number];
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];
export type Measure = (typeof MEASURES)[number];
export type Sides = (typeof SIDES)[number];

export function isStretchKind(kind: ExerciseKind): boolean {
  return kind !== 'kraft';
}

type Starter = { id: string; equipment: Equipment; muscleGroup: MuscleGroup };

export const STARTER_EXERCISES: Starter[] = [
  { id: 'kniebeuge', equipment: 'langhantel', muscleGroup: 'beine' },
  { id: 'bankdruecken', equipment: 'langhantel', muscleGroup: 'brust' },
  { id: 'kreuzheben', equipment: 'langhantel', muscleGroup: 'ruecken' },
  { id: 'rumaenisches_kreuzheben', equipment: 'langhantel', muscleGroup: 'beine' },
  { id: 'langhantelrudern', equipment: 'langhantel', muscleGroup: 'ruecken' },
  { id: 'schulterdruecken_kh', equipment: 'kurzhantel', muscleGroup: 'schultern' },
  { id: 'schraegbankdruecken_kh', equipment: 'kurzhantel', muscleGroup: 'brust' },
  { id: 'seitheben', equipment: 'kurzhantel', muscleGroup: 'schultern' },
  { id: 'bizepscurls_kh', equipment: 'kurzhantel', muscleGroup: 'arme' },
  { id: 'ausfallschritte', equipment: 'kurzhantel', muscleGroup: 'beine' },
  { id: 'latzug', equipment: 'kabel', muscleGroup: 'ruecken' },
  { id: 'rudern_kabel', equipment: 'kabel', muscleGroup: 'ruecken' },
  { id: 'trizepsdruecken_kabel', equipment: 'kabel', muscleGroup: 'arme' },
  { id: 'face_pulls', equipment: 'kabel', muscleGroup: 'schultern' },
  { id: 'beinpresse', equipment: 'maschine', muscleGroup: 'beine' },
  { id: 'beinstrecker', equipment: 'maschine', muscleGroup: 'beine' },
  { id: 'beinbeuger', equipment: 'maschine', muscleGroup: 'beine' },
  { id: 'butterfly', equipment: 'maschine', muscleGroup: 'brust' },
  { id: 'wadenheben', equipment: 'maschine', muscleGroup: 'waden' },
  { id: 'hip_thrust', equipment: 'langhantel', muscleGroup: 'gesaess' },
  { id: 'klimmzuege', equipment: 'koerpergewicht', muscleGroup: 'ruecken' },
  { id: 'dips', equipment: 'koerpergewicht', muscleGroup: 'arme' },
  { id: 'liegestuetze', equipment: 'koerpergewicht', muscleGroup: 'brust' },
  { id: 'plank', equipment: 'koerpergewicht', muscleGroup: 'bauch' },
  { id: 'crunches', equipment: 'koerpergewicht', muscleGroup: 'bauch' },
];

/**
 * Weitere Kraftübungen für Vorlagen und Ersatzübungen (Phase 8, TRAIN-016): je Bewegungsmuster
 * mehrere Geräte, damit bei belegtem Gerät oder Training zu Hause eine Alternative da ist.
 */
export const MORE_STRENGTH_EXERCISES: (Starter & { sides: Sides })[] = [
  { id: 'bankdruecken_kh', equipment: 'kurzhantel', muscleGroup: 'brust', sides: 'beidseitig' },
  { id: 'brustpresse', equipment: 'maschine', muscleGroup: 'brust', sides: 'beidseitig' },
  { id: 'schulterdruecken_lh', equipment: 'langhantel', muscleGroup: 'schultern', sides: 'beidseitig' },
  { id: 'schulterpresse_maschine', equipment: 'maschine', muscleGroup: 'schultern', sides: 'beidseitig' },
  { id: 'pike_liegestuetze', equipment: 'koerpergewicht', muscleGroup: 'schultern', sides: 'beidseitig' },
  { id: 'seitheben_kabel', equipment: 'kabel', muscleGroup: 'schultern', sides: 'einseitig' },
  { id: 'goblet_kniebeuge', equipment: 'kurzhantel', muscleGroup: 'beine', sides: 'beidseitig' },
  { id: 'bulgarische_kniebeuge', equipment: 'kurzhantel', muscleGroup: 'beine', sides: 'einseitig' },
  { id: 'rumaenisches_kreuzheben_kh', equipment: 'kurzhantel', muscleGroup: 'beine', sides: 'beidseitig' },
  { id: 'rudern_kh', equipment: 'kurzhantel', muscleGroup: 'ruecken', sides: 'einseitig' },
  { id: 'rudern_maschine', equipment: 'maschine', muscleGroup: 'ruecken', sides: 'beidseitig' },
  { id: 'rudern_koerpergewicht', equipment: 'koerpergewicht', muscleGroup: 'ruecken', sides: 'beidseitig' },
  { id: 'klimmzuege_unterstuetzt', equipment: 'maschine', muscleGroup: 'ruecken', sides: 'beidseitig' },
  { id: 'bizepscurls_kabel', equipment: 'kabel', muscleGroup: 'arme', sides: 'beidseitig' },
  { id: 'bizepscurls_lh', equipment: 'langhantel', muscleGroup: 'arme', sides: 'beidseitig' },
  { id: 'trizeps_ueberkopf_kh', equipment: 'kurzhantel', muscleGroup: 'arme', sides: 'beidseitig' },
  { id: 'bankdips', equipment: 'koerpergewicht', muscleGroup: 'arme', sides: 'beidseitig' },
  { id: 'wadenheben_koerpergewicht', equipment: 'koerpergewicht', muscleGroup: 'waden', sides: 'beidseitig' },
  { id: 'kabelcrunch', equipment: 'kabel', muscleGroup: 'bauch', sides: 'beidseitig' },
  { id: 'ytw_bauchlage', equipment: 'koerpergewicht', muscleGroup: 'schultern', sides: 'beidseitig' },
];

// ----------------------------------------------------------------------------------------------
// Metadaten für den Planassistenten (Phase 8.1, Kap. 4 „Metadaten selbst kuratieren“). Eigene
// Zuordnung, keine fremde Datenbank (RepDB/wger nur zum Vergleich, Entscheidung 30.10.2026).
// Alle Zuordnungen und Ersatzübungen sind Vorschläge ohne Fachprüfung (Phase 10.1, TRAIN-016).

/** Bewegungsmuster: bestimmt Aufteilung im Plan, Reihenfolge und passende Ersatzübungen. */
export const MOVEMENT_PATTERNS = [
  'kniebeuge',
  'hueftstreckung',
  'ausfallschritt',
  'bein_isolation',
  'waden',
  'druecken_horizontal',
  'druecken_vertikal',
  'brust_isolation',
  'schulter_isolation',
  'trizeps',
  'ziehen_horizontal',
  'ziehen_vertikal',
  'hintere_schulter',
  'bizeps',
  'rumpf',
  'ganzkoerper',
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

/** Grobe Gruppe für die Aufteilung (Push/Pull/Beine, Ober-/Unterkörper). */
export type PatternGroup = 'push' | 'pull' | 'beine' | 'rumpf' | 'ganzkoerper';

export const PATTERN_GROUP: Record<MovementPattern, PatternGroup> = {
  kniebeuge: 'beine',
  hueftstreckung: 'beine',
  ausfallschritt: 'beine',
  bein_isolation: 'beine',
  waden: 'beine',
  druecken_horizontal: 'push',
  druecken_vertikal: 'push',
  brust_isolation: 'push',
  schulter_isolation: 'push',
  trizeps: 'push',
  ziehen_horizontal: 'pull',
  ziehen_vertikal: 'pull',
  hintere_schulter: 'pull',
  bizeps: 'pull',
  rumpf: 'rumpf',
  ganzkoerper: 'ganzkoerper',
};

/** Mehrgelenkige Grundübungen kommen im Plan zuerst und werden zuletzt gekürzt. */
export const COMPOUND_PATTERNS: readonly MovementPattern[] = [
  'kniebeuge',
  'hueftstreckung',
  'druecken_horizontal',
  'ziehen_vertikal',
  'druecken_vertikal',
  'ziehen_horizontal',
  'ausfallschritt',
];

export function isCompound(pattern: MovementPattern): boolean {
  return COMPOUND_PATTERNS.includes(pattern);
}

/** Einsteiger = Technik gut alleine lernbar; Fortgeschritten = eher mit Anleitung/Erfahrung. */
export type Level = 'einsteiger' | 'fortgeschritten';

type Meta = { pattern: MovementPattern; level: Level; alternatives: string[] };

/**
 * Bewegungsmuster, Schwierigkeit und Ersatzübungen (in dieser Reihenfolge vorgeschlagen). Ersatz
 * heißt: ähnliches Muster, andere Geräte. Leistungswerte sind nicht übertragbar (TRAIN-014).
 */
export const EXERCISE_META: Record<string, Meta> = {
  kniebeuge: { pattern: 'kniebeuge', level: 'fortgeschritten', alternatives: ['beinpresse', 'goblet_kniebeuge', 'bulgarische_kniebeuge', 'kniebeuge_koerpergewicht'] },
  beinpresse: { pattern: 'kniebeuge', level: 'einsteiger', alternatives: ['goblet_kniebeuge', 'kniebeuge', 'bulgarische_kniebeuge', 'kniebeuge_koerpergewicht'] },
  goblet_kniebeuge: { pattern: 'kniebeuge', level: 'einsteiger', alternatives: ['beinpresse', 'kniebeuge', 'kniebeuge_koerpergewicht'] },
  kniebeuge_koerpergewicht: { pattern: 'kniebeuge', level: 'einsteiger', alternatives: ['goblet_kniebeuge', 'beinpresse', 'ausfallschritte_wechsel'] },
  sprungkniebeuge: { pattern: 'kniebeuge', level: 'fortgeschritten', alternatives: ['kniebeuge_koerpergewicht', 'goblet_kniebeuge'] },
  kreuzheben: { pattern: 'hueftstreckung', level: 'fortgeschritten', alternatives: ['rumaenisches_kreuzheben', 'rumaenisches_kreuzheben_kh', 'hip_thrust', 'beckenheben'] },
  rumaenisches_kreuzheben: { pattern: 'hueftstreckung', level: 'fortgeschritten', alternatives: ['rumaenisches_kreuzheben_kh', 'beinbeuger', 'hip_thrust', 'beckenheben'] },
  rumaenisches_kreuzheben_kh: { pattern: 'hueftstreckung', level: 'einsteiger', alternatives: ['rumaenisches_kreuzheben', 'beinbeuger', 'hip_thrust', 'beckenheben'] },
  hip_thrust: { pattern: 'hueftstreckung', level: 'einsteiger', alternatives: ['beckenheben', 'rumaenisches_kreuzheben_kh', 'rumaenisches_kreuzheben'] },
  beckenheben: { pattern: 'hueftstreckung', level: 'einsteiger', alternatives: ['hip_thrust', 'rumaenisches_kreuzheben_kh'] },
  ausfallschritte: { pattern: 'ausfallschritt', level: 'einsteiger', alternatives: ['bulgarische_kniebeuge', 'ausfallschritte_wechsel', 'beinpresse'] },
  bulgarische_kniebeuge: { pattern: 'ausfallschritt', level: 'fortgeschritten', alternatives: ['ausfallschritte', 'ausfallschritte_wechsel', 'beinpresse'] },
  ausfallschritte_wechsel: { pattern: 'ausfallschritt', level: 'einsteiger', alternatives: ['ausfallschritte', 'bulgarische_kniebeuge'] },
  beinstrecker: { pattern: 'bein_isolation', level: 'einsteiger', alternatives: ['goblet_kniebeuge', 'bulgarische_kniebeuge', 'kniebeuge_koerpergewicht'] },
  beinbeuger: { pattern: 'bein_isolation', level: 'einsteiger', alternatives: ['rumaenisches_kreuzheben_kh', 'beckenheben'] },
  wadenheben: { pattern: 'waden', level: 'einsteiger', alternatives: ['wadenheben_koerpergewicht'] },
  wadenheben_koerpergewicht: { pattern: 'waden', level: 'einsteiger', alternatives: ['wadenheben'] },

  bankdruecken: { pattern: 'druecken_horizontal', level: 'einsteiger', alternatives: ['bankdruecken_kh', 'brustpresse', 'schraegbankdruecken_kh', 'liegestuetze'] },
  bankdruecken_kh: { pattern: 'druecken_horizontal', level: 'einsteiger', alternatives: ['bankdruecken', 'brustpresse', 'liegestuetze'] },
  brustpresse: { pattern: 'druecken_horizontal', level: 'einsteiger', alternatives: ['bankdruecken_kh', 'bankdruecken', 'liegestuetze'] },
  schraegbankdruecken_kh: { pattern: 'druecken_horizontal', level: 'einsteiger', alternatives: ['bankdruecken_kh', 'brustpresse', 'liegestuetze'] },
  liegestuetze: { pattern: 'druecken_horizontal', level: 'einsteiger', alternatives: ['liegestuetze_knie', 'bankdruecken_kh', 'brustpresse'] },
  liegestuetze_knie: { pattern: 'druecken_horizontal', level: 'einsteiger', alternatives: ['liegestuetze', 'brustpresse'] },
  schulterdruecken_kh: { pattern: 'druecken_vertikal', level: 'einsteiger', alternatives: ['schulterpresse_maschine', 'schulterdruecken_lh', 'pike_liegestuetze'] },
  schulterdruecken_lh: { pattern: 'druecken_vertikal', level: 'fortgeschritten', alternatives: ['schulterdruecken_kh', 'schulterpresse_maschine', 'pike_liegestuetze'] },
  schulterpresse_maschine: { pattern: 'druecken_vertikal', level: 'einsteiger', alternatives: ['schulterdruecken_kh', 'schulterdruecken_lh', 'pike_liegestuetze'] },
  pike_liegestuetze: { pattern: 'druecken_vertikal', level: 'fortgeschritten', alternatives: ['schulterdruecken_kh', 'schulterpresse_maschine'] },
  butterfly: { pattern: 'brust_isolation', level: 'einsteiger', alternatives: ['bankdruecken_kh', 'liegestuetze'] },
  seitheben: { pattern: 'schulter_isolation', level: 'einsteiger', alternatives: ['seitheben_kabel'] },
  seitheben_kabel: { pattern: 'schulter_isolation', level: 'einsteiger', alternatives: ['seitheben'] },
  trizepsdruecken_kabel: { pattern: 'trizeps', level: 'einsteiger', alternatives: ['trizeps_ueberkopf_kh', 'bankdips', 'dips'] },
  trizeps_ueberkopf_kh: { pattern: 'trizeps', level: 'einsteiger', alternatives: ['trizepsdruecken_kabel', 'bankdips'] },
  dips: { pattern: 'trizeps', level: 'fortgeschritten', alternatives: ['bankdips', 'trizepsdruecken_kabel', 'trizeps_ueberkopf_kh'] },
  bankdips: { pattern: 'trizeps', level: 'einsteiger', alternatives: ['trizepsdruecken_kabel', 'trizeps_ueberkopf_kh'] },

  latzug: { pattern: 'ziehen_vertikal', level: 'einsteiger', alternatives: ['klimmzuege_unterstuetzt', 'klimmzuege', 'rudern_kh'] },
  klimmzuege: { pattern: 'ziehen_vertikal', level: 'fortgeschritten', alternatives: ['klimmzuege_unterstuetzt', 'latzug', 'rudern_koerpergewicht'] },
  klimmzuege_unterstuetzt: { pattern: 'ziehen_vertikal', level: 'einsteiger', alternatives: ['latzug', 'klimmzuege'] },
  langhantelrudern: { pattern: 'ziehen_horizontal', level: 'fortgeschritten', alternatives: ['rudern_kh', 'rudern_kabel', 'rudern_maschine'] },
  rudern_kabel: { pattern: 'ziehen_horizontal', level: 'einsteiger', alternatives: ['rudern_maschine', 'rudern_kh', 'langhantelrudern'] },
  rudern_kh: { pattern: 'ziehen_horizontal', level: 'einsteiger', alternatives: ['rudern_kabel', 'rudern_maschine', 'rudern_koerpergewicht'] },
  rudern_maschine: { pattern: 'ziehen_horizontal', level: 'einsteiger', alternatives: ['rudern_kabel', 'rudern_kh'] },
  rudern_koerpergewicht: { pattern: 'ziehen_horizontal', level: 'einsteiger', alternatives: ['rudern_kh', 'rudern_kabel'] },
  face_pulls: { pattern: 'hintere_schulter', level: 'einsteiger', alternatives: ['ytw_bauchlage', 'rudern_kabel', 'rudern_kh'] },
  ytw_bauchlage: { pattern: 'hintere_schulter', level: 'einsteiger', alternatives: ['face_pulls', 'rudern_koerpergewicht'] },
  bizepscurls_kh: { pattern: 'bizeps', level: 'einsteiger', alternatives: ['bizepscurls_kabel', 'bizepscurls_lh'] },
  bizepscurls_kabel: { pattern: 'bizeps', level: 'einsteiger', alternatives: ['bizepscurls_kh', 'bizepscurls_lh'] },
  bizepscurls_lh: { pattern: 'bizeps', level: 'einsteiger', alternatives: ['bizepscurls_kh', 'bizepscurls_kabel'] },

  plank: { pattern: 'rumpf', level: 'einsteiger', alternatives: ['seitstuetz'] },
  seitstuetz: { pattern: 'rumpf', level: 'einsteiger', alternatives: ['plank'] },
  crunches: { pattern: 'rumpf', level: 'einsteiger', alternatives: ['kabelcrunch', 'beinheben', 'fahrradcrunch'] },
  kabelcrunch: { pattern: 'rumpf', level: 'einsteiger', alternatives: ['crunches', 'beinheben'] },
  beinheben: { pattern: 'rumpf', level: 'einsteiger', alternatives: ['crunches', 'kabelcrunch'] },
  fahrradcrunch: { pattern: 'rumpf', level: 'einsteiger', alternatives: ['crunches', 'russian_twist'] },
  russian_twist: { pattern: 'rumpf', level: 'einsteiger', alternatives: ['fahrradcrunch', 'crunches'] },
  mountain_climbers: { pattern: 'rumpf', level: 'einsteiger', alternatives: ['plank', 'beinheben'] },

  hampelmann: { pattern: 'ganzkoerper', level: 'einsteiger', alternatives: ['kniehebelauf'] },
  kniehebelauf: { pattern: 'ganzkoerper', level: 'einsteiger', alternatives: ['hampelmann'] },
  burpees: { pattern: 'ganzkoerper', level: 'fortgeschritten', alternatives: ['hampelmann', 'mountain_climbers'] },
};

/** Muster einer eigenen Übung ohne Angabe: aus der Muskelgruppe abgeleitet (grob). */
const PATTERN_BY_GROUP: Record<MuscleGroup, MovementPattern> = {
  brust: 'druecken_horizontal',
  ruecken: 'ziehen_horizontal',
  schultern: 'druecken_vertikal',
  arme: 'bizeps',
  beine: 'kniebeuge',
  gesaess: 'hueftstreckung',
  waden: 'waden',
  bauch: 'rumpf',
  huefte: 'hueftstreckung',
  nacken: 'hintere_schulter',
  ganzkoerper: 'ganzkoerper',
};

/** Bewegungsmuster einer Übung: kuratiert, sonst eigene Angabe, sonst aus der Muskelgruppe. */
export function patternOf(exercise: { id: string; muscleGroup: MuscleGroup; pattern?: MovementPattern | null }): MovementPattern {
  return EXERCISE_META[exercise.id]?.pattern ?? exercise.pattern ?? PATTERN_BY_GROUP[exercise.muscleGroup];
}

export function levelOf(exerciseId: string): Level {
  return EXERCISE_META[exerciseId]?.level ?? 'einsteiger';
}

/** Übungen, die in Sekunden statt Wiederholungen gemessen werden (UX-011). */
export const TIMED_EXERCISES = ['plank', 'seitstuetz'];

/** Zusätzliche Kraft-/HIIT-Übungen ohne Gerät (Phase 5, HIIT-001). */
export const HIIT_EXERCISES: (Starter & { measure: Measure; sides: Sides })[] = [
  { id: 'hampelmann', equipment: 'koerpergewicht', muscleGroup: 'ganzkoerper', measure: 'wdh', sides: 'beidseitig' },
  { id: 'kniehebelauf', equipment: 'koerpergewicht', muscleGroup: 'ganzkoerper', measure: 'wdh', sides: 'beidseitig' },
  { id: 'burpees', equipment: 'koerpergewicht', muscleGroup: 'ganzkoerper', measure: 'wdh', sides: 'beidseitig' },
  { id: 'mountain_climbers', equipment: 'koerpergewicht', muscleGroup: 'bauch', measure: 'wdh', sides: 'beidseitig' },
  { id: 'kniebeuge_koerpergewicht', equipment: 'koerpergewicht', muscleGroup: 'beine', measure: 'wdh', sides: 'beidseitig' },
  { id: 'sprungkniebeuge', equipment: 'koerpergewicht', muscleGroup: 'beine', measure: 'wdh', sides: 'beidseitig' },
  { id: 'ausfallschritte_wechsel', equipment: 'koerpergewicht', muscleGroup: 'beine', measure: 'wdh', sides: 'beidseitig' },
  { id: 'beckenheben', equipment: 'koerpergewicht', muscleGroup: 'gesaess', measure: 'wdh', sides: 'beidseitig' },
  { id: 'liegestuetze_knie', equipment: 'koerpergewicht', muscleGroup: 'brust', measure: 'wdh', sides: 'beidseitig' },
  { id: 'beinheben', equipment: 'koerpergewicht', muscleGroup: 'bauch', measure: 'wdh', sides: 'beidseitig' },
  { id: 'fahrradcrunch', equipment: 'koerpergewicht', muscleGroup: 'bauch', measure: 'wdh', sides: 'beidseitig' },
  { id: 'russian_twist', equipment: 'koerpergewicht', muscleGroup: 'bauch', measure: 'wdh', sides: 'beidseitig' },
  { id: 'seitstuetz', equipment: 'koerpergewicht', muscleGroup: 'bauch', measure: 'zeit', sides: 'einseitig' },
];

/**
 * Dehn- und Mobilitätsübungen (STRETCH-001–003). Haltezeit 30 s als Voreinstellung (Kandidat
 * ACSM ca. 10–30 s, STRETCH-008, fachlich nicht abgenommen); in jeder Routine änderbar.
 */
export const STRETCH_EXERCISES: (Starter & { kind: ExerciseKind; sides: Sides; holdSeconds: number })[] = [
  // statisch – eher nach dem Training oder separat
  { id: 'dehn_brust_tuer', equipment: 'koerpergewicht', muscleGroup: 'brust', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_schulter_quer', equipment: 'koerpergewicht', muscleGroup: 'schultern', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_trizeps', equipment: 'koerpergewicht', muscleGroup: 'arme', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_nacken_seitlich', equipment: 'koerpergewicht', muscleGroup: 'nacken', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_oberer_ruecken', equipment: 'koerpergewicht', muscleGroup: 'ruecken', kind: 'dehnung_statisch', sides: 'beidseitig', holdSeconds: 30 },
  { id: 'dehn_kindhaltung', equipment: 'koerpergewicht', muscleGroup: 'ruecken', kind: 'dehnung_statisch', sides: 'beidseitig', holdSeconds: 45 },
  { id: 'dehn_hueftbeuger', equipment: 'koerpergewicht', muscleGroup: 'huefte', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_oberschenkel_vorn', equipment: 'koerpergewicht', muscleGroup: 'beine', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_oberschenkel_hinten', equipment: 'koerpergewicht', muscleGroup: 'beine', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_gesaess_figur4', equipment: 'koerpergewicht', muscleGroup: 'gesaess', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_wade_wand', equipment: 'koerpergewicht', muscleGroup: 'waden', kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'dehn_schmetterling', equipment: 'koerpergewicht', muscleGroup: 'huefte', kind: 'dehnung_statisch', sides: 'beidseitig', holdSeconds: 30 },
  { id: 'dehn_kobra', equipment: 'koerpergewicht', muscleGroup: 'bauch', kind: 'dehnung_statisch', sides: 'beidseitig', holdSeconds: 20 },
  // dynamisch / Mobilität – eher vor dem Training
  { id: 'mob_armkreisen', equipment: 'koerpergewicht', muscleGroup: 'schultern', kind: 'dehnung_dynamisch', sides: 'beidseitig', holdSeconds: 30 },
  { id: 'mob_schulterkreisen', equipment: 'koerpergewicht', muscleGroup: 'schultern', kind: 'dehnung_dynamisch', sides: 'beidseitig', holdSeconds: 30 },
  { id: 'mob_arme_oeffnen', equipment: 'koerpergewicht', muscleGroup: 'brust', kind: 'dehnung_dynamisch', sides: 'beidseitig', holdSeconds: 30 },
  { id: 'mob_katze_kuh', equipment: 'koerpergewicht', muscleGroup: 'ruecken', kind: 'mobilitaet', sides: 'beidseitig', holdSeconds: 40 },
  { id: 'mob_rumpfrotation', equipment: 'koerpergewicht', muscleGroup: 'ruecken', kind: 'dehnung_dynamisch', sides: 'beidseitig', holdSeconds: 30 },
  { id: 'mob_hueftkreisen', equipment: 'koerpergewicht', muscleGroup: 'huefte', kind: 'mobilitaet', sides: 'beidseitig', holdSeconds: 30 },
  { id: 'mob_beinpendel', equipment: 'koerpergewicht', muscleGroup: 'beine', kind: 'dehnung_dynamisch', sides: 'einseitig', holdSeconds: 20 },
  { id: 'mob_sprunggelenk', equipment: 'koerpergewicht', muscleGroup: 'waden', kind: 'mobilitaet', sides: 'einseitig', holdSeconds: 20 },
  { id: 'mob_tiefe_hocke', equipment: 'koerpergewicht', muscleGroup: 'beine', kind: 'mobilitaet', sides: 'beidseitig', holdSeconds: 30 },
  { id: 'mob_ausfallschritt_rotation', equipment: 'koerpergewicht', muscleGroup: 'huefte', kind: 'dehnung_dynamisch', sides: 'einseitig', holdSeconds: 30 },
  { id: 'mob_nacken_halbkreise', equipment: 'koerpergewicht', muscleGroup: 'nacken', kind: 'mobilitaet', sides: 'beidseitig', holdSeconds: 30 },
];
