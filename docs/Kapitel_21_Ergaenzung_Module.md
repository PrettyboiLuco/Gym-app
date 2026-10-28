# 21 | Ergänzung: Dehnung, Körperziele, Kalorienrechner, Kalorientracker

Ergänzung zur Arbeitsgrundlage v2.0 (28.10.2026), Wunsch von Luc vom 28.10.2026.
Status wie im Hauptdokument: **spezifiziert ist nicht implementiert**, Formeln und Zahlen sind
Kandidaten bis zur fachlichen Abnahme (R3, O3). Nichts aus dem bisherigen Umfang wird gestrichen.

Neue Registerpunkte: `register/Fachregister_Ergaenzung.csv` (STRETCH, GOAL, CALC, TRACK).
Neue Referenztests: `reference/Referenztests_Ergaenzung.py` – 22 von 22 bestanden (isoliert, synthetisch).

---

## 21.1 Gesamtumfang der App (Modulkarte)

| Modul | Inhalt | Wo spezifiziert |
|---|---|---|
| **Training** | Anfängereinstieg, eigene/übernommene Pläne, 2–6 Tage, Splits, Favoriten/Sperren, Satzprotokoll, Pausen-/Intervalltimer, Übungsdemos, adaptiver Planumbau | Kap. 07, 10, 12 · TRAIN |
| **Dehnung & Mobilität** *(neu)* | Aufwärmen vor dem Training, Cool-down danach, eigene Dehnroutinen, Halte-Timer mit Seitenwechsel, Beweglichkeitsziele | 21.2 · STRETCH |
| **Körperziele** *(neu, ausgebaut)* | Abnehmen / Halten / Zunehmen, Kraftziele, Beweglichkeitsziele, Körpermaße, Gewichtsverlauf, optionale Fortschrittsfotos | 21.3 · GOAL, COACH-004 |
| **Kalorienrechner** *(neu, ausgebaut)* | Ruheenergie (Mifflin-St Jeor) × Aktivitätsstufe → Schätzung → Zielvorschlag mit Untergrenze | 21.4 · CALC, COACH-002/003 |
| **Kalorientracker** *(neu, ausgebaut)* | Tagesübersicht gegessen / Ziel / übrig, Makros, Wochenansicht, unvollständige Tage markiert | 21.5 · TRACK, FOOD |
| **Ernährung** | Barcode, Suche (OFF/USDA), Rezepte, Mahlzeiten, Freitext, Essensfotos | Kap. 04–05 · FOOD |
| **Getränke** | Trinkziel, Wasser vs. Gesamtgetränke, eine Event-ID für beide Ansichten | Kap. 05–06 |
| **Coach** | Makro-/Energievorschläge, Check-in, KI-Erklärung mit Grenzen | Kap. 11 · COACH |
| **Schritte & Health** | HealthKit / Health Connect, Schritte, Schlaf als Kontext | Kap. 12 · HEALTH |
| **Konto, Daten, Geld** | Offline, Export, Löschung, Backup, optionaler Sync, Werbung, Pro/Abo, Community | Kap. 13–15 · TECH, BUS, LAW |

---

## 21.2 Dehnung & Mobilität (neu)

**Ziel:** Dehnen und Mobilität sind ein eigener Bereich *und* in Trainingspläne einbaubar.

Funktionen:

1. **Aufwärmen** vor einer Trainingseinheit – dynamische Mobilisation passend zu den Muskelgruppen
   des Tages (z. B. Beintag → Hüfte, Sprunggelenk). Wird in der Zeitschätzung des Planumbaus berücksichtigt
   (TRAIN-007 enthält „Aufwärmen“ bereits).
2. **Cool-down** nach der Einheit – kurze statische Dehnroutine, optional.
3. **Eigenständige Routinen** – z. B. „Morgens 10 Minuten“, „Büro-Nacken“, „Hüfte für Sitzberufe“
   (Beruf ist im Profil, COACH-001).
4. **Halte-Timer** – pro Übung Haltezeit, bei einseitigen Übungen automatisch *links → Seitenwechsel →
   rechts*, Wechselpause zwischen Übungen. Nutzt denselben persistenten `TimerState` wie Satzpausen
   (Kap. 12): Phase, Endzeit UTC, Alarmgeneration, Rekonstruktion nach Neustart.
5. **Protokoll** – absolvierte Routinen als eigene Session, getrennt von Kraft-Logs; optional
   Selbsteinschätzung (z. B. „Finger bis Boden: 10 cm fehlen“) für Beweglichkeitsziele.
6. **Abbruch bei Schmerz** – wie TRAIN-017: Schmerzmeldung beendet die Routine, keine Therapieempfehlung.

Fachlicher Kandidat (vor Freigabe prüfen, nicht als feste Regel ausliefern):
ACSM-Empfehlungen für Erwachsene nennen Beweglichkeitstraining an mindestens 2–3 Tagen pro Woche mit
statischen Haltezeiten im Bereich von etwa 10–30 Sekunden je Dehnung. Längeres statisches Dehnen direkt vor
Kraft-/Schnellkraftleistung kann die Leistung kurzfristig mindern; deshalb vor dem Training eher dynamisch,
statisch eher danach oder separat. **Quellen sind in diesem Durchlauf nicht neu abgerufen worden** und müssen
wie alle anderen Punkte gegen aktuelle Primärquellen geprüft werden (STRETCH-008).

Medien: Für Dehnübungen gelten dieselben Lizenzregeln wie Kap. 07. Ob RepDB/Free Exercise DB/gekaufte
Pakete Dehnübungen in ausreichender Zahl und mit Animation enthalten, ist offen (STRETCH-009). Statische
Halteübungen brauchen oft nur ein Standbild plus Beschriftung – das kann Medienkosten senken.

Datenmodell (Ergänzung zu Kap. 13): `ExerciseVariant` erhält `kind` (kraft | dehnung_statisch |
dehnung_dynamisch | mobilitaet), `sides` (beidseitig | einseitig) und `default_hold_s`;
neu `StretchRoutine/RoutineItem` (versioniert wie Plan) und `StretchSession/StretchLog`.

---

## 21.3 Körperziele (ausgebaut)

`GoalVersion` (Kap. 13) wird konkretisiert. Ein Nutzer kann **mehrere Ziele gleichzeitig** haben:

| Zieltyp | Messgröße | Fortschritt |
|---|---|---|
| Gewicht: abnehmen / halten / zunehmen | kg | 7-Tage-Mittel statt Einzelwert |
| Muskelaufbau | kg + Kraftwerte + Maße | Trend über Wochen |
| Kraftziel (z. B. Kniebeuge 100 kg × 5) | SetLog derselben Variante | letzte vergleichbare Leistung (TRAIN-014) |
| Körpermaße | Taille, Hüfte, Brust, Arm, Oberschenkel (cm) | Verlauf |
| Beweglichkeitsziel | Selbsttest aus 21.2 | Verlauf |
| Gewohnheitsziele | Trainingstage/Woche, Schritte, Trinken, Dehnroutinen | Wochenquote |

Regeln:

- **Versioniert:** Zieländerung erzeugt eine neue Version; alte Tage behalten ihr damaliges Ziel
  (Referenztest „neue Zielversion ändert alte Einträge nicht“).
- **Trend statt Tageswaage:** Wassereinlagerung schwankt; der Coach reagiert nicht auf Einzelwerte
  (Kap. 11). Ohne genug Messungen wird *kein* Trend angezeigt statt eines erfundenen.
- **Keine Erfolgsgarantie, kein Zieldatum als Versprechen** (COACH-004). Eine Prognose darf höchstens
  als grobe Schätzung mit Unsicherheit erscheinen.
- **Zielgewicht-Plausibilität:** Ein Zielgewicht, das in einen Untergewichtsbereich führt, wird nicht
  als Abnehmziel unterstützt, sondern auf fachliche Hilfe verwiesen (COACH-010). Schwellen sind offen.
- **Fortschrittsfotos optional**, nur lokal, kein Upload ohne Einwilligung, kein Einsatz für Werbung/KI
  (Kap. 13, 14).
- Körperfettanteil-Schätzungen (z. B. Umfangsformeln) nur, wenn fachlich freigegeben; sonst nur Maße zeigen.

---

## 21.4 Kalorienrechner (ausgebaut)

Ablauf (Kap. 11 konkretisiert):

1. **Eingaben:** Gewicht, Größe, Alter, Formelvariable (+5 / −161 laut Originalstudie), Aktivitätsstufe,
   Ziel. Nur Erwachsene innerhalb der Studienpopulation 19–78 Jahre; außerhalb kein Automatikwert.
2. **Ruheenergie:** Mifflin-St Jeor: `10 × kg + 6,25 × cm − 5 × Alter + s` [web:106].
   Beispiel: 80 kg, 180 cm, 30 J, s = +5 → **1.780 kcal**.
3. **Tagesbedarf-Schätzung:** Ruheenergie × Aktivitätsfaktor aus *einer* dokumentierten Tabelle.
   Beispiel mit Testfaktor 1,55 → 2.759 kcal. Welche Tabelle und welche Stufen gelten, ist **offen** (CALC-003).
   Schritte helfen bei der Einstufung, werden aber nicht zusätzlich gutgeschrieben.
4. **Zielvorschlag:** Schätzung ± gewähltes Delta (abnehmen = Defizit, zunehmen = Überschuss,
   halten = 0). Beispiel −500 → 2.259 kcal.
5. **Untergrenze:** Liegt das Ergebnis unter einer fachlich festgelegten Untergrenze, gibt der Rechner
   **keine Zahl** aus, sondern verweist auf individuelle Prüfung. Die Grenze im Test (1.200) ist ein
   Testparameter, kein freigegebener Wert (CALC-005).
6. **Darstellung:** immer „Schätzung“, mit Erklärung, wie sie entsteht. Nach einigen Wochen kann der
   Coach anhand von Gewichtstrend + Tracker einen begründeten Anpassungsvorschlag machen (Kap. 11, COACH-008).
7. **Makros:** Protein als kontextabhängiger Bereich (DGE 1,2–2,0 g/kg Sport), keine erfundene
   Komplettverteilung (COACH-005).

Free/Pro-Grenze: Rechner und Tracker gehören vermutlich in die kostenlose Basis; adaptive Anpassung
und Coach-Erklärungen könnten Pro sein – Entscheidung offen (O5).

---

## 21.5 Kalorientracker (ausgebaut)

Baut auf `ConsumptionEvent` und den FOOD-Punkten auf; hier die Ansichten:

- **Tagesring/-balken:** gegessen · Ziel · übrig, plus Protein/Kohlenhydrate/Fett. Überschreitung wird
  neutral als negativer Rest angezeigt, ohne Schuldtexte.
- **Unvollständige Tage:** Fehlt bei einem Eintrag die Energie, wird nur Bekanntes summiert und der Tag als
  „unvollständig“ markiert – nie als 0 kcal (FOOD-002, Referenztest).
- **Keine Trainingskalorien-Gutschrift:** Training/Schritte erhöhen das Tagesbudget nicht zusätzlich, weil
  sie bereits in der Aktivitätsstufe stecken (Kap. 11).
- **Wochen-/Monatsansicht:** Durchschnitt pro Tag, nur aus erfassten Tagen; leere Tage separat zählen.
- **Schnelleingabe:** Favoriten, zuletzt gegessen, Mahlzeit kopieren („wie gestern“), Rezepte, Barcode,
  Freitext, Foto-Vorschlag (alles Kap. 04–05).
- **Diary-Datum:** Nachträge gehören zum gewählten Tag (Kap. 05, Zeitzonen-Referenztests).
- **Sensible Nutzung:** Optionaler „ohne Zahlen“-Modus und keine Streak-Bestrafung als Vorschlag für
  Essstörungs-Risiken (COACH-010); fachlich zu prüfen.

---

## 21.6 Einordnung in die Baufolge (Kap. 16)

| Phase | Neu hinzugefügt |
|---|---|
| P1 | Halte-Timer mit Seitenwechsel in denselben Timer-Spike aufnehmen |
| P2 | Kalorientracker-Ansichten, Gewichts-/Maßeingabe, manuelle Ziele, eigene Dehnroutinen, Aufwärm-/Cool-down-Bausteine |
| P3 | Aufwärmen automatisch passend zum Trainingstag im Planassistenten |
| P4 | Kalorienrechner mit freigegebenen Faktoren/Untergrenzen, Zielvorschläge, Anpassungen, Beweglichkeitsziele |

---

## 21.7 Neue offene Entscheidungen für Luc

1. Dehnung als eigener Tab oder Teil von „Training“?
2. Welche Zieltypen im ersten Pilot (Vorschlag: Gewicht + Kraftziel + Gewohnheit)?
3. Fortschrittsfotos ja/nein im Pilot?
4. Rechner/Tracker kostenlos, Coach-Anpassung Pro?
5. Fachperson für Aktivitätsfaktoren, Untergrenzen und Dehnempfehlungen (erweitert O3).

---

## 21.8 Fertige HIIT-Programme (Wunsch vom 28.10.2026)

Bisher gab es nur den HIIT-*Timer* (HEALTH-010). Neu: **fertige Abläufe**, z. B. „Bauch“ und „Ganzkörper“,
jeweils in Anfänger- und Fortgeschrittenenstufe, plus eigene Abläufe. Ablauf: nächste Übung mit Demo
ankündigen → Belastung → Pause → nächste Übung → Runden. Nutzt dieselbe Timer-Engine wie Dehnroutinen.

Wichtig für Texte und Werbung: Bauchübungen trainieren die Bauchmuskeln, sie bauen aber nicht gezielt
Bauchfett ab. Das wird nicht versprochen (HIIT-006). Register: HIIT-001 bis HIIT-007.

## 21.9 Fokus der ersten Version (Luc, 28.10.2026)

Dehnen · Kalorientracker · Kalorienrechner aus Gewicht, Bewegung und Erhaltungskalorien · Trainingspläne,
fertig und selbst erstellt · Timer zwischen den Sätzen · fertige HIIT-Abläufe (z. B. Bauch).
Alles andere bleibt im Gesamtumfang und folgt später.
