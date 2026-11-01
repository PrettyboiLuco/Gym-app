// Beispiel-Exporte im Aufbau von Hevy und Strong (Spaltennamen laut deren CSV-Export) für Tests.

export const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Push","26 Jan 2026, 18:05","26 Jan 2026, 19:10","","Bench Press (Barbell)","","Pausiert","0","warmup","40","10","","",""
"Push","26 Jan 2026, 18:05","26 Jan 2026, 19:10","","Bench Press (Barbell)","","","1","normal","80","8","","","8"
"Push","26 Jan 2026, 18:05","26 Jan 2026, 19:10","","Bench Press (Dumbbell)","","","0","dropset","30","12","","","9.5"
"Push","26 Jan 2026, 18:05","26 Jan 2026, 19:10","","Treadmill","","","0","normal","","","2.5","1200",""
"Legs","28 Jan 2026, 07:30","28 Jan 2026, 08:20","Gut","Squat (Barbell)","","","0","failure","100","5","","",""
`;

export const STRONG = `Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE
2026-01-20 17:00:00;Oberkörper;1h 5m;Lat Pulldown (Cable);1;135;10;0;0;;;
2026-01-20 17:00:00;Oberkörper;1h 5m;Lat Pulldown (Cable);2;135;9;0;0;;;7
2026-01-20 17:00:00;Oberkörper;1h 5m;Plank;1;0;0;0;60;;;
2026-01-20 17:00:00;Oberkörper;1h 5m;Rest Timer;1;0;0;0;0;;;
`;
