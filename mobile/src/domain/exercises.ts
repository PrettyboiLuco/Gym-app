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
