// Erweiterter Übungskatalog (Wunsch Luc 31.10.2026: „alle, die es gibt“). Eigene Zuordnung und eigene deutsche
// Kurzanleitungen (Texte in i18n/de-exercises.ts), keine fremden Texte oder Medien. Wie die Startliste: Vorschläge
// ohne Fachprüfung (Phase 10.1). Ersatzübungen werden aus Muster, Messart und Gerät abgeleitet.

import type { Equipment, Level, Measure, MovementPattern, MuscleGroup, Sides } from './exercises';

export type CatalogExercise = {
  id: string;
  equipment: Equipment;
  muscleGroup: MuscleGroup;
  pattern: MovementPattern;
  level: Level;
  sides: Sides;
  measure: Measure;
};

type Row = [id: string, equipment: Equipment, muscleGroup: MuscleGroup, pattern: MovementPattern, level: Level, sides?: Sides, measure?: Measure];

const E = 'einsteiger' as const;
const F = 'fortgeschritten' as const;
const ONE = 'einseitig' as const;
const BOTH = 'beidseitig' as const;

const ROWS: Row[] = [
  // ------------------------------------------------------------------------------------- Brust
  ['schraegbankdruecken_lh', 'langhantel', 'brust', 'druecken_horizontal', E],
  ['negativbankdruecken_lh', 'langhantel', 'brust', 'druecken_horizontal', F],
  ['negativbankdruecken_kh', 'kurzhantel', 'brust', 'druecken_horizontal', F],
  ['bankdruecken_smith', 'smith', 'brust', 'druecken_horizontal', E],
  ['schraegbankdruecken_smith', 'smith', 'brust', 'druecken_horizontal', E],
  ['schraegbankpresse_maschine', 'maschine', 'brust', 'druecken_horizontal', E],
  ['brustpresse_kabel', 'kabel', 'brust', 'druecken_horizontal', E],
  ['brustpresse_band', 'band', 'brust', 'druecken_horizontal', E],
  ['squeeze_press_kh', 'kurzhantel', 'brust', 'druecken_horizontal', E],
  ['bodendruecken_kh', 'kurzhantel', 'brust', 'druecken_horizontal', E],
  ['bodendruecken_kb', 'kettlebell', 'brust', 'druecken_horizontal', E, ONE],
  ['liegestuetze_schraeg', 'koerpergewicht', 'brust', 'druecken_horizontal', E],
  ['liegestuetze_erhoeht', 'koerpergewicht', 'brust', 'druecken_horizontal', F],
  ['liegestuetze_breit', 'koerpergewicht', 'brust', 'druecken_horizontal', E],
  ['dips_brust', 'koerpergewicht', 'brust', 'druecken_horizontal', F],
  ['fliegende_kh', 'kurzhantel', 'brust', 'brust_isolation', E],
  ['fliegende_schraeg_kh', 'kurzhantel', 'brust', 'brust_isolation', E],
  ['cable_crossover', 'kabel', 'brust', 'brust_isolation', E],
  ['cable_crossover_unten', 'kabel', 'brust', 'brust_isolation', E],
  ['cable_crossover_oben', 'kabel', 'brust', 'brust_isolation', E],
  ['cable_flys_sitzend', 'kabel', 'brust', 'brust_isolation', E],
  ['cable_flys_flachbank', 'kabel', 'brust', 'brust_isolation', E],
  ['cable_flys_schraegbank', 'kabel', 'brust', 'brust_isolation', E],
  ['cable_flys_einarmig', 'kabel', 'brust', 'brust_isolation', E, ONE],
  ['fliegende_band', 'band', 'brust', 'brust_isolation', E],
  ['pullover_kh', 'kurzhantel', 'brust', 'brust_isolation', E],
  ['pullover_sz', 'sz_stange', 'brust', 'brust_isolation', E],

  // ------------------------------------------------------------------------------------ Rücken
  ['t_bar_rudern', 'langhantel', 'ruecken', 'ziehen_horizontal', F],
  ['t_bar_rudern_maschine', 'maschine', 'ruecken', 'ziehen_horizontal', E],
  ['pendlay_rudern', 'langhantel', 'ruecken', 'ziehen_horizontal', F],
  ['rudern_untergriff_lh', 'langhantel', 'ruecken', 'ziehen_horizontal', F],
  ['rudern_smith', 'smith', 'ruecken', 'ziehen_horizontal', E],
  ['rudern_brustgestuetzt_kh', 'kurzhantel', 'ruecken', 'ziehen_horizontal', E],
  ['rudern_vorgebeugt_kh', 'kurzhantel', 'ruecken', 'ziehen_horizontal', E],
  ['rudern_kabel_einarmig', 'kabel', 'ruecken', 'ziehen_horizontal', E, ONE],
  ['rudern_kabel_breit', 'kabel', 'ruecken', 'ziehen_horizontal', E],
  ['rudern_band', 'band', 'ruecken', 'ziehen_horizontal', E],
  ['rudern_kb', 'kettlebell', 'ruecken', 'ziehen_horizontal', E, ONE],
  ['latzug_eng', 'kabel', 'ruecken', 'ziehen_vertikal', E],
  ['latzug_untergriff', 'kabel', 'ruecken', 'ziehen_vertikal', E],
  ['latzug_einarmig', 'kabel', 'ruecken', 'ziehen_vertikal', E, ONE],
  ['latzug_maschine', 'maschine', 'ruecken', 'ziehen_vertikal', E],
  ['latzug_band', 'band', 'ruecken', 'ziehen_vertikal', E],
  ['ueberzuege_kabel', 'kabel', 'ruecken', 'ziehen_vertikal', E],
  ['klimmzuege_untergriff', 'koerpergewicht', 'ruecken', 'ziehen_vertikal', F],
  ['klimmzuege_neutral', 'koerpergewicht', 'ruecken', 'ziehen_vertikal', F],
  ['klimmzuege_negativ', 'koerpergewicht', 'ruecken', 'ziehen_vertikal', E],
  ['klimmzuege_band', 'band', 'ruecken', 'ziehen_vertikal', E],
  ['rueckenstrecker', 'maschine', 'ruecken', 'hueftstreckung', E],
  ['rueckenstrecker_maschine', 'maschine', 'ruecken', 'hueftstreckung', E],
  ['rack_pulls', 'langhantel', 'ruecken', 'hueftstreckung', F],
  ['superman', 'koerpergewicht', 'ruecken', 'rumpf', E],
  ['shrugs_lh', 'langhantel', 'nacken', 'hintere_schulter', E],
  ['shrugs_kh', 'kurzhantel', 'nacken', 'hintere_schulter', E],
  ['shrugs_smith', 'smith', 'nacken', 'hintere_schulter', E],

  // --------------------------------------------------------------------------------- Schultern
  ['arnold_press', 'kurzhantel', 'schultern', 'druecken_vertikal', E],
  ['schulterdruecken_smith', 'smith', 'schultern', 'druecken_vertikal', E],
  ['schulterdruecken_kb', 'kettlebell', 'schultern', 'druecken_vertikal', E, ONE],
  ['schulterdruecken_band', 'band', 'schultern', 'druecken_vertikal', E],
  ['push_press', 'langhantel', 'schultern', 'druecken_vertikal', F],
  ['landmine_press', 'langhantel', 'schultern', 'druecken_vertikal', E, ONE],
  ['handstand_liegestuetze', 'koerpergewicht', 'schultern', 'druecken_vertikal', F],
  ['frontheben_kh', 'kurzhantel', 'schultern', 'schulter_isolation', E],
  ['frontheben_kabel', 'kabel', 'schultern', 'schulter_isolation', E],
  ['seitheben_maschine', 'maschine', 'schultern', 'schulter_isolation', E],
  ['seitheben_band', 'band', 'schultern', 'schulter_isolation', E],
  ['aufrechtes_rudern_lh', 'langhantel', 'schultern', 'schulter_isolation', F],
  ['aufrechtes_rudern_kabel', 'kabel', 'schultern', 'schulter_isolation', E],
  ['aufrechtes_rudern_sz', 'sz_stange', 'schultern', 'schulter_isolation', E],
  ['reverse_flys_kh', 'kurzhantel', 'schultern', 'hintere_schulter', E],
  ['reverse_butterfly', 'maschine', 'schultern', 'hintere_schulter', E],
  ['reverse_flys_kabel', 'kabel', 'schultern', 'hintere_schulter', E],
  ['band_pull_apart', 'band', 'schultern', 'hintere_schulter', E],
  ['aussenrotation_kabel', 'kabel', 'schultern', 'hintere_schulter', E, ONE],
  ['aussenrotation_band', 'band', 'schultern', 'hintere_schulter', E, ONE],

  // ------------------------------------------------------------------------------------ Bizeps
  ['hammercurls', 'kurzhantel', 'arme', 'bizeps', E],
  ['hammercurls_seil', 'kabel', 'arme', 'bizeps', E],
  ['konzentrationscurls', 'kurzhantel', 'arme', 'bizeps', E, ONE],
  ['schraegbankcurls_kh', 'kurzhantel', 'arme', 'bizeps', E],
  ['scottcurls_sz', 'sz_stange', 'arme', 'bizeps', E],
  ['scottcurls_kh', 'kurzhantel', 'arme', 'bizeps', E, ONE],
  ['scottcurls_maschine', 'maschine', 'arme', 'bizeps', E],
  ['bizepscurls_sz', 'sz_stange', 'arme', 'bizeps', E],
  ['reverse_curls_sz', 'sz_stange', 'arme', 'bizeps', E],
  ['spider_curls_sz', 'sz_stange', 'arme', 'bizeps', E],
  ['drag_curls_sz', 'sz_stange', 'arme', 'bizeps', F],
  ['bayesian_curls', 'kabel', 'arme', 'bizeps', E, ONE],
  ['bizepscurls_band', 'band', 'arme', 'bizeps', E],
  ['bizepscurls_maschine', 'maschine', 'arme', 'bizeps', E],
  ['bizepscurls_kb', 'kettlebell', 'arme', 'bizeps', E],
  ['zottman_curls', 'kurzhantel', 'arme', 'bizeps', F],
  ['handgelenkcurls', 'kurzhantel', 'arme', 'bizeps', E],
  ['handgelenkcurls_reverse', 'kurzhantel', 'arme', 'bizeps', E],

  // ----------------------------------------------------------------------------------- Trizeps
  ['enges_bankdruecken', 'langhantel', 'arme', 'trizeps', F],
  ['french_press_sz', 'sz_stange', 'arme', 'trizeps', E],
  ['french_press_kh', 'kurzhantel', 'arme', 'trizeps', E],
  ['trizeps_ueberkopf_kabel', 'kabel', 'arme', 'trizeps', E],
  ['trizeps_ueberkopf_sz', 'sz_stange', 'arme', 'trizeps', E],
  ['french_press_schraeg_sz', 'sz_stange', 'arme', 'trizeps', E],
  ['trizepsdruecken_seil', 'kabel', 'arme', 'trizeps', E],
  ['trizepsdruecken_einarmig', 'kabel', 'arme', 'trizeps', E, ONE],
  ['kickbacks_kh', 'kurzhantel', 'arme', 'trizeps', E, ONE],
  ['kickbacks_kabel', 'kabel', 'arme', 'trizeps', E, ONE],
  ['trizeps_maschine', 'maschine', 'arme', 'trizeps', E],
  ['dips_maschine', 'maschine', 'arme', 'trizeps', E],
  ['trizepsdruecken_band', 'band', 'arme', 'trizeps', E],
  ['liegestuetze_eng', 'koerpergewicht', 'arme', 'trizeps', F],

  // -------------------------------------------------------------------------- Beine: Kniebeuge
  ['frontkniebeuge', 'langhantel', 'beine', 'kniebeuge', F],
  ['box_squat', 'langhantel', 'beine', 'kniebeuge', F],
  ['kniebeuge_smith', 'smith', 'beine', 'kniebeuge', E],
  ['hackenschmidt', 'maschine', 'beine', 'kniebeuge', E],
  ['pendel_kniebeuge', 'maschine', 'beine', 'kniebeuge', E],
  ['beinpresse_einbeinig', 'maschine', 'beine', 'kniebeuge', E, ONE],
  ['goblet_kniebeuge_kb', 'kettlebell', 'beine', 'kniebeuge', E],
  ['kniebeuge_kh', 'kurzhantel', 'beine', 'kniebeuge', E],
  ['sumo_kniebeuge', 'kurzhantel', 'beine', 'kniebeuge', E],
  ['kniebeuge_band', 'band', 'beine', 'kniebeuge', E],
  ['pistol_squat', 'koerpergewicht', 'beine', 'kniebeuge', F, ONE],

  // ----------------------------------------------------------------------- Beine: Ausfallschritt
  ['ausfallschritte_lh', 'langhantel', 'beine', 'ausfallschritt', F],
  ['ausfallschritte_gehend', 'kurzhantel', 'beine', 'ausfallschritt', E],
  ['ausfallschritte_rueckwaerts', 'kurzhantel', 'beine', 'ausfallschritt', E],
  ['ausfallschritte_seitlich', 'kurzhantel', 'beine', 'ausfallschritt', E],
  ['ausfallschritte_smith', 'smith', 'beine', 'ausfallschritt', E, ONE],
  ['bulgarische_kniebeuge_smith', 'smith', 'beine', 'ausfallschritt', E, ONE],
  ['split_squat', 'koerpergewicht', 'beine', 'ausfallschritt', E, ONE],
  ['step_ups', 'kurzhantel', 'beine', 'ausfallschritt', E, ONE],
  ['ausfallschritte_kb', 'kettlebell', 'beine', 'ausfallschritt', E],

  // ------------------------------------------------------------------------ Hüftstreckung/Gesäß
  ['sumo_kreuzheben', 'langhantel', 'beine', 'hueftstreckung', F],
  ['trap_bar_kreuzheben', 'langhantel', 'beine', 'hueftstreckung', E],
  ['good_morning', 'langhantel', 'beine', 'hueftstreckung', F],
  ['kreuzheben_kh', 'kurzhantel', 'beine', 'hueftstreckung', E],
  ['kreuzheben_kb', 'kettlebell', 'beine', 'hueftstreckung', E],
  ['rumaenisches_kreuzheben_einbeinig', 'kurzhantel', 'beine', 'hueftstreckung', F, ONE],
  ['rumaenisches_kreuzheben_smith', 'smith', 'beine', 'hueftstreckung', E],
  ['kettlebell_swing', 'kettlebell', 'gesaess', 'hueftstreckung', F],
  ['hip_thrust_maschine', 'maschine', 'gesaess', 'hueftstreckung', E],
  ['hip_thrust_smith', 'smith', 'gesaess', 'hueftstreckung', E],
  ['beckenheben_band', 'band', 'gesaess', 'hueftstreckung', E],
  ['beckenheben_einbeinig', 'koerpergewicht', 'gesaess', 'hueftstreckung', E, ONE],
  ['pull_through_kabel', 'kabel', 'gesaess', 'hueftstreckung', E],

  // ------------------------------------------------------------------------- Beine: Isolation
  ['glute_kickback_kabel', 'kabel', 'gesaess', 'bein_isolation', E, ONE],
  ['glute_kickback_maschine', 'maschine', 'gesaess', 'bein_isolation', E, ONE],
  ['abduktoren_maschine', 'maschine', 'huefte', 'bein_isolation', E],
  ['adduktoren_maschine', 'maschine', 'huefte', 'bein_isolation', E],
  ['abduktion_kabel', 'kabel', 'huefte', 'bein_isolation', E, ONE],
  ['adduktion_kabel', 'kabel', 'huefte', 'bein_isolation', E, ONE],
  ['seitgehen_band', 'band', 'huefte', 'bein_isolation', E],
  ['beinbeuger_sitzend', 'maschine', 'beine', 'bein_isolation', E],
  ['beinbeuger_stehend', 'maschine', 'beine', 'bein_isolation', E, ONE],
  ['beinbeuger_band', 'band', 'beine', 'bein_isolation', E],
  ['nordic_curls', 'koerpergewicht', 'beine', 'bein_isolation', F],
  ['beinstrecker_einbeinig', 'maschine', 'beine', 'bein_isolation', E, ONE],
  ['wandsitzen', 'koerpergewicht', 'beine', 'bein_isolation', E, BOTH, 'zeit'],

  // ------------------------------------------------------------------------------------ Waden
  ['wadenheben_sitzend', 'maschine', 'waden', 'waden', E],
  ['wadenheben_beinpresse', 'maschine', 'waden', 'waden', E],
  ['wadenheben_smith', 'smith', 'waden', 'waden', E],
  ['wadenheben_einbeinig_kh', 'kurzhantel', 'waden', 'waden', E, ONE],

  // ------------------------------------------------------------------------------- Bauch/Rumpf
  ['beinheben_haengend', 'koerpergewicht', 'bauch', 'rumpf', F],
  ['knieheben_haengend', 'koerpergewicht', 'bauch', 'rumpf', E],
  ['knieheben_dipstation', 'maschine', 'bauch', 'rumpf', E],
  ['ab_roller', 'koerpergewicht', 'bauch', 'rumpf', F],
  ['holzhacker_kabel', 'kabel', 'bauch', 'rumpf', E, ONE],
  ['pallof_press', 'kabel', 'bauch', 'rumpf', E, ONE],
  ['pallof_press_band', 'band', 'bauch', 'rumpf', E, ONE],
  ['bauchmaschine', 'maschine', 'bauch', 'rumpf', E],
  ['dead_bug', 'koerpergewicht', 'bauch', 'rumpf', E],
  ['bird_dog', 'koerpergewicht', 'bauch', 'rumpf', E],
  ['sit_ups', 'koerpergewicht', 'bauch', 'rumpf', E],
  ['reverse_crunch', 'koerpergewicht', 'bauch', 'rumpf', E],
  ['v_ups', 'koerpergewicht', 'bauch', 'rumpf', F],
  ['seitbeugen_kh', 'kurzhantel', 'bauch', 'rumpf', E, ONE],
  ['russian_twist_kb', 'kettlebell', 'bauch', 'rumpf', E],
  ['hollow_hold', 'koerpergewicht', 'bauch', 'rumpf', F, BOTH, 'zeit'],
  ['l_sit', 'koerpergewicht', 'bauch', 'rumpf', F, BOTH, 'zeit'],
  ['koffer_tragen', 'kettlebell', 'bauch', 'rumpf', E, ONE, 'zeit'],

  // ------------------------------------------------------------------------------ Ganzkörper
  ['farmers_walk', 'kurzhantel', 'ganzkoerper', 'ganzkoerper', E, BOTH, 'zeit'],
  ['thruster_kh', 'kurzhantel', 'ganzkoerper', 'ganzkoerper', F],
  ['power_clean', 'langhantel', 'ganzkoerper', 'ganzkoerper', F],
  ['kb_clean', 'kettlebell', 'ganzkoerper', 'ganzkoerper', F, ONE],
  ['kb_snatch', 'kettlebell', 'ganzkoerper', 'ganzkoerper', F, ONE],
  ['turkish_get_up', 'kettlebell', 'ganzkoerper', 'ganzkoerper', F, ONE],
  ['baerengang', 'koerpergewicht', 'ganzkoerper', 'ganzkoerper', E],
];

/**
 * Später ergänzte Übungen je Datenbank-Version. Eine Version wird nach der Auslieferung nie mehr geändert; neue
 * Übungen bekommen deshalb eine eigene Version (Version 12 = Rest des Katalogs).
 */
export const CATALOG_ADDED: Record<number, readonly string[]> = {
  13: ['cable_flys_sitzend', 'cable_flys_flachbank', 'cable_flys_schraegbank', 'cable_flys_einarmig'],
};

export const CATALOG_EXERCISES: CatalogExercise[] = ROWS.map(([id, equipment, muscleGroup, pattern, level, sides = BOTH, measure = 'wdh']) => ({
  id,
  equipment,
  muscleGroup,
  pattern,
  level,
  sides,
  measure,
}));
