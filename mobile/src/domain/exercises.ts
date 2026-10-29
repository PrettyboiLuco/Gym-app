// Startliste mit gängigen Übungen. Nur Namen und Zuordnungen, keine fremden Texte oder Medien,
// daher keine Lizenzfrage (Register TRAIN-003, TECH-009). Namen stehen in der Sprachdatei.

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
] as const;

export type Equipment = (typeof EQUIPMENT)[number];
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const STARTER_EXERCISES: { id: string; equipment: Equipment; muscleGroup: MuscleGroup }[] = [
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
