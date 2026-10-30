# Prüfmappe für die Fachperson (Phase 10.1)

Stand 30.10.2026 · Regelfassungen: Coach 1, Check-in 1, Steigerung 1 · Register O3, TRAIN-018, TRAIN-022,
STRETCH-008, COACH-010, TRACK-006, CALC-003–005, COACH-005, GOAL-007 · Freigabematrix Kap. 18, Risiko **R3**.

**Wofür:** Die App macht Vorschläge zu Kalorien, Makros, Training, Steigerung und Dehnen nach festen Regeln, ohne KI.
Vor der Veröffentlichung muss eine qualifizierte Person (Sportwissenschaft/Trainer mit Lizenz und
Ernährungsfachkraft, z. B. Ökotrophologie oder Diätassistenz) jede Regel freigeben, ändern oder streichen. Erst mit
dieser **unterschriebenen Entscheidungstabelle** gilt R3 als erledigt.

**So geht's:** Jede Zeile hat eine ID. Bitte in der Spalte „Entscheidung“ eintragen: **F** = freigegeben,
**Ä** = ändern auf … (neuen Wert eintragen), **S** = streichen/deaktivieren. Rückfragen unter „Anmerkung“.
Geänderte Werte setzt Claude Code danach im Code um (eine Stelle je Wert, siehe „Fundstelle“), erhöht die
Regelfassung und ergänzt einen Test. Unterschrift am Ende.

**Zielgruppe der App:** gesunde Erwachsene ab 18 (Abfrage beim Erststart). Kalorienzahlen nur 19–78 Jahre
(Gültigkeit Mifflin-St Jeor). Bei „sensibler Situation“ (Schwangerschaft/Stillzeit, Essstörung jetzt oder früher,
Untergewicht, Erkrankung/Medikamente mit Einfluss auf Gewicht oder Ernährung) keine Zahlen und keine Abnehmziele.

---

## A. Energiebedarf und Kalorienziel

Fundstellen: `mobile/src/domain/energy.ts` (Rechner), `mobile/src/domain/coach.ts` (Coach).

| ID | Regel | Aktueller Wert | Quelle/Begründung | Frage an die Fachperson | Entscheidung | Anmerkung |
|---|---|---|---|---|---|---|
| A1 | Ruheenergie | Mifflin-St Jeor: 10·kg + 6,25·cm − 5·Alter + 5 bzw. −161 (Auswahl „Formel-Term“, nicht „Geschlecht“) | Validiert für gesunde Erwachsene 19–78 J. | Formel für die Zielgruppe geeignet? Formulierung der Auswahl in Ordnung? | | |
| A2 | Gültigkeitsbereich | Zahl nur bei 19–78 Jahren, sonst Hinweis ohne Zahl | Studienpopulation | Grenzen so lassen? | | |
| A3 | Aktivität (Rechner) | PAL nach DGE, Mitte der Spannen: sitzend 1,45 · sitzend+bewegt 1,65 · stehend/gehend 1,85 · körperlich schwer 2,2; Sport 4–5×/Woche +0,3 | DGE (nur Sekundärquelle abgerufen) | Stufen und Sportzuschlag freigeben? | | |
| A4 | Aktivität aus Schritten (Coach) | < 5000 → 1,4 · 5000–7499 → 1,5 · 7500–9999 → 1,6 · 10 000–12 499 → 1,7 · ab 12 500 → 1,8 | Schritt-Stufen nach Tudor-Locke; **Zuordnung zum PAL eigene Annahme** | Zuordnung Schritte → PAL vertretbar? | | |
| A5 | Gym-Zuschlag (Coach) | +0,065 PAL je Gym-Tag pro Woche (3 Tage = +0,195) | abgeleitet aus DGE +0,3 bei 4–5× Sport | Bei kurzen Einheiten zu hoch? Anderer Wert oder Deckel? | | |
| A6 | Tempo je Ziel | Abnehmen −500 (wählbar −250) · Halten 0 · Zunehmen +250 (wählbar +500) kcal/Tag | gängige Praxis | Vorschlag und Auswahl freigeben? Prozentual statt fest? | | |
| A7 | Untergrenze | nie unter max(1200 kcal, Ruheenergie) | Praxiswert; Ruheenergie als zweite Grenze | 1200 kcal für Männer zu niedrig? Getrennte Grenze? | | |
| A8 | Untergewicht | BMI < 18,5: kein Abnehmziel; Halten/Zunehmen mit Hinweis | WHO-Grenze | Schwelle und Verhalten freigeben? | | |
| A9 | Rundung | Ziel auf 10 kcal gerundet, Rechenweg sichtbar, „Schätzung“ | keine Scheingenauigkeit | – | | |

## B. Makronährstoffe

Fundstelle: `mobile/src/domain/coach.ts` (`PROTEIN_G_PER_KG`, `FAT_SHARE`, `LEAN`, `FIBER_MIN_G`, `macrosFor`).

| ID | Regel | Aktueller Wert | Quelle/Begründung | Frage an die Fachperson | Entscheidung | Anmerkung |
|---|---|---|---|---|---|---|
| B1 | Eiweiß „Standard“ | 1,6 g/kg; Abnehmen 2,0 g/kg; ohne regelmäßiges Training (< 2 Gym-Tage) 0,8 bzw. 1,2 g/kg | DGE 0,8 g/kg; Sportpraxis 1,2–2,0 g/kg | Werte und Schwelle „2 Gym-Tage“ freigeben? Bezug auf Körpergewicht auch bei hohem BMI? | | |
| B2 | Eiweiß „Lean/Bodybuilding“ | 2,0 g/kg; Abnehmen 2,2 g/kg; **unabhängig von den Gym-Tagen** | Wunsch Luc | Soll „Lean“ ohne regelmäßiges Training gesperrt oder abgesenkt werden? (Beispiel C unten: 140 g bei 0 Gym-Tagen) | | |
| B3 | Eiweiß „Eigene Werte“ | frei 0,8–2,5 g/kg | Rahmen gegen Tippfehler | Obergrenze 2,5 g/kg vertretbar? | | |
| B4 | Fett | Standard 30 % der Kalorien; Lean 20 %; eigene Werte 20–40 %; nie unter 20 % | DGE-Orientierung | Freigeben? | | |
| B5 | Kohlenhydrate | Rest nach Eiweiß und Fett, nie negativ | – | Mindestmenge nötig? | | |
| B6 | Ballaststoffe | mindestens 30 g/Tag | DGE | Freigeben? | | |
| B7 | Trainings-/Ruhetage | Trainingstag +200 kcal, Ruhetag so viel weniger, dass der Wochenschnitt gleich bleibt, höchstens −300; Ruhetag nie unter der Untergrenze; Unterschied nur über Kohlenhydrate | Wunsch Luc (COACH-002) | Freigeben? | | |

## C. Wöchentlicher Check-in

Fundstelle: `mobile/src/domain/checkin.ts`.

| ID | Regel | Aktueller Wert | Frage an die Fachperson | Entscheidung | Anmerkung |
|---|---|---|---|---|---|
| C1 | Genug Daten | in beiden Wochen ≥ 4 Gewichtsmessungen (7-Tage-Schnitt) und ≥ 5 vollständig erfasste Esstage | Schwellen freigeben? | | |
| C2 | Schrittweite | ±100 kcal je Check-in, höchstens ein Vorschlag pro Woche, nur nach Bestätigung | Freigeben? | | |
| C3 | Abnehmen | kein Rückgang → −100; Verlust > 1 % des Körpergewichts pro Woche → +100 | Grenzen freigeben? | | |
| C4 | Zunehmen | kein Anstieg → +100; Zunahme > 0,5 % pro Woche → −100 | Freigeben? | | |
| C5 | Halten | Abweichung > ±0,5 kg → ±100 in Gegenrichtung | Freigeben? | | |
| C6 | Essen über Ziel | Schnitt > 150 kcal über Ziel → kein Senken, erst „Ziel einhalten“ empfehlen | Freigeben? | | |
| C7 | Hinweise | Eiweiß bzw. Ballaststoffe < 80 % des Ziels → Hinweis; Schlaf < 6 h (≥ 3 Nächte erfasst) → Hinweis, nie Kalorienänderung | Freigeben? | | |
| C8 | Neu berechnen | Schritte ±2000 oder Gym-Tage ±2 gegenüber Einrichtung → „Neu berechnen“ anbieten | Freigeben? | | |
| C9 | Sperren | nie bei sensibler Situation, nie Abnehm-Vorschlag bei Untergewicht, nie unter die Untergrenze | Weitere Ausschlüsse nötig? | | |

## D. Trainingsvorlagen und Planqualität

Fundstellen: `mobile/src/domain/planner.ts` (`templateParams`, `SPLIT_FITS`, `TEMPLATE_SLOTS`, Kürzungsregeln),
`mobile/src/domain/exercises.ts` (Bewegungsmuster, Stufe, Ersatzübungen).

| ID | Regel | Aktueller Wert | Frage an die Fachperson | Entscheidung | Anmerkung |
|---|---|---|---|---|---|
| D1 | Aufteilung je Tageszahl | Ganzkörper 2–4 · Ober/Unter 2 oder 4 · PPL 3 oder 6 · Arnold 3 oder 6 · Ober/Unter+PPL 5; automatisch: ≤ 3 Ganzkörper, 4 Ober/Unter, 5 OU+PPL, 6 PPL | Zuordnung freigeben? | | |
| D2 | Kraft | Grundübung Einsteiger 3×6–8, 150 s Pause; Fortgeschritten 4×4–6, 180 s; Isolation 3×8–12, 90 s | Freigeben? | | |
| D3 | Muskelaufbau | Grundübung 3×8–12, 120 s; Isolation 3×10–15, 60 s | Freigeben? | | |
| D4 | Fitness | Grundübung 2×10–15, 90 s; Isolation 2×12–15, 60 s | Freigeben? | | |
| D5 | Zeit-Übungen | Einsteiger 2×30 s, Fortgeschritten 3×45 s, 60 s Pause | Freigeben? | | |
| D6 | Einsteiger | nur Übungen der Stufe „Einsteiger“; Geräte-Reihenfolge Maschine → Kurzhantel → Kabel → Langhantel → Körpergewicht | Freigeben? | | |
| D7 | Kürzen bei Zeitmangel | Reihenfolge: Doppeltes → ähnliche Übung am selben Tag → Sätze bis min. 2 → Isolation → Grundübungen; Pausen werden nie gekürzt | Freigeben? | | |
| D8 | Übungsdaten | 80 Kraftübungen mit 16 Bewegungsmustern, Stufe, Ersatzübungen und Kurzanleitung (Liste: `exercises.ts`, Texte `i18n/de.ts` → `exerciseHow`) | Stichprobe oder Komplettprüfung der Kurzanleitungen und Ersatzübungen | | |
| D9 | Schmerz im Freitext | Übung wird ersetzt plus Hinweis, keine Behandlungstipps | Hinweistext freigeben? | | |

## E. Steigerung (Progression)

Fundstelle: `mobile/src/domain/progression.ts` (Fassung 1, Entscheidungstabelle im Kopf der Datei).

| ID | Regel | Aktueller Wert | Frage an die Fachperson | Entscheidung | Anmerkung |
|---|---|---|---|---|---|
| E1 | Doppelte Progression | alle Sätze am oberen Ende → kleinster Gewichtsschritt (2,5 kg; Kurzhantel 2 kg; 5 lb), wieder unteres Ende; sonst +1 Wdh. | Freigeben? | | |
| E2 | Halten | mehr als die Hälfte der Sätze unter dem Bereich → Gewicht halten | Freigeben? | | |
| E3 | Stagnation | 3 Einheiten gleiches Gewicht ohne mehr Wiederholungen → ca. 10 % leichter neu aufbauen | Freigeben? | | |
| E4 | Wiedereinstieg | Pause ≥ 14 Tage → −10 %, ≥ 28 Tage → −20 %; Hinweis auf „Heute“ ab 14 Tagen | Freigeben? | | |
| E5 | Zeit-Übung | alle Sätze geschafft → +5 s (höchstens 600 s) | Freigeben? | | |
| E6 | Körpergewicht | mehr Wiederholungen oder schwerere Variante | Freigeben? | | |

## F. Dehnen, Mobilität, HIIT

Fundstelle: `mobile/src/domain/routines.ts`.

| ID | Regel | Aktueller Wert | Frage an die Fachperson | Entscheidung | Anmerkung |
|---|---|---|---|---|---|
| F1 | Haltezeiten | Vorlagen 30–45 s je Seite, Seitenwechsel 5 s, Übergang 10 s; Text „ca. 20–45 s“ | ACSM-Kandidat 10–30 s – freigeben oder anpassen? (STRETCH-008) | | |
| F2 | Vorlagen | Morgens (8 Übungen), Büro/Nacken (6), Hüfte/Sitzen (6) | Inhalte freigeben? | | |
| F3 | Vor/nach Training | vor dem Training dynamisch, längeres Halten danach oder separat | Freigeben? | | |
| F4 | HIIT Einsteiger | 20 s Belastung / 40 s Pause, 2 Runden, 60 s Rundenpause | Freigeben? | | |
| F5 | HIIT Fortgeschritten | 40 s / 20 s, 3 Runden, 60 s Rundenpause; u. a. Burpees, Sprungkniebeugen | Freigeben? Warnhinweise nötig? | | |
| F6 | Aussage Bauch | „Bauchübungen trainieren die Bauchmuskeln. Gezielt Bauchfett abbauen kann man damit nicht.“ | Freigeben? (HIIT-006) | | |

## G. Schutz sensibler Gruppen und Modus „ohne Zahlen“

| ID | Regel | Aktueller Wert | Frage an die Fachperson | Entscheidung | Anmerkung |
|---|---|---|---|---|---|
| G1 | Mindestalter | Nutzung ab 18 (Ja/Nein beim Erststart) | Reicht eine Selbstauskunft? | | |
| G2 | Sensible Situation | Liste siehe oben; dann keine Kalorienzahlen, keine Abnehmziele, keine Check-in-Vorschläge; gespeichert nur „ja/nein“ | Liste vollständig? Text freigeben? | | |
| G3 | Ohne Zahlen (TRACK-006) | Tagebuch, Coach und Check-in ohne Kalorien/Makros; Werte werden weiter gespeichert; keine Streak-Bestrafung | Freigeben? Weitere Schutzmaßnahmen? | | |
| G4 | Tipps auf „Heute“ | nur auf Klick; nie Aufforderung zu „mehr“ nach Zielerreichung; über Ziel (> 200 kcal) „ohne Druck“ | Texte (`i18n/de.ts` → `coach.tips`) freigeben? | | |
| G5 | Trinkziel | frei 250–10 000 ml, kein gewichtsabhängiger Vorschlag | Gewichtsabhängige Grenzen gewünscht? (O3) | | |

## H. Beispielrechnungen zum Nachprüfen

Mit dem echten Code der App berechnet (30.10.2026). Werte in kcal bzw. g pro Tag.

| Person | Ruhe­energie | PAL (Schritte + Gym) | Erhalt | Ziel | Trainings-/Ruhetag | Makros Standard (E/F/KH/Bal.) | Makros Lean |
|---|---|---|---|---|---|---|---|
| A: Mann, 30 J., 80 kg, 180 cm, 8000 Schritte, 3 Gym-Tage, Abnehmen −500 | 1780 | 1,6 + 0,195 = 1,795 | 3200 | 2700 | 2900 / 2550 | 160 / 90 / 313 / 30 | 176 / 60 / 364 / 30 |
| B: Frau, 25 J., 60 kg, 165 cm, 6000 Schritte, 4 Gym-Tage, Zunehmen +250 | 1345 | 1,5 + 0,26 = 1,76 | 2370 | 2620 | 2820 / 2350 | 96 / 87 / 363 / 30 | 120 / 58 / 404 / 30 |
| C: Frau, 55 J., 70 kg, 160 cm, 4000 Schritte, 0 Gym-Tage, Halten | 1264 | 1,4 + 0 = 1,4 | 1770 | 1770 | – | 56 / 59 / 254 / 30 | **140** / 39 / 214 / 30 |
| D: Frau, 40 J., 52 kg, 158 cm, 3000 Schritte, 2 Gym-Tage, Abnehmen −500 | 1147 | 1,4 + 0,13 = 1,53 | 1750 | 1250 | 1380 / **1200** | 104 / 42 / 115 / 30 | 114 / 28 / 136 / 30 |

Rechner (ohne Coach) für Person A mit „sitzend, bewegt“ und Sport: Faktor 1,95, Bedarf 3471, Ziel 2970,
Eiweiß-Spanne 96–160 g.

**Auffälligkeiten zur Bewertung:**
1. Person A: Erhalt 3200 kcal bei 8000 Schritten und 3 Gym-Tagen – ist die Summe aus Schritt-PAL und Gym-Zuschlag
   zu hoch (A4/A5)?
2. Person C mit „Lean“: 140 g Eiweiß (2,0 g/kg) ohne Training – sinnvoll (B2)?
3. Person D: Ruhetag landet genau auf 1200 kcal (Untergrenze) – vertretbar (A7/B7)?
4. Rechner und Coach rechnen Aktivität verschieden (Alltagsstufe vs. Schritte) und kommen für dieselbe Person auf
   unterschiedliche Ziele (A 2970 vs. 2700). Soll ein Weg der maßgebliche sein?

---

## Freigabe

| | |
|---|---|
| Name, Qualifikation | |
| Geprüfte Regelfassungen | Coach 1 · Check-in 1 · Steigerung 1 · Vorlagen/Dehnen/HIIT Stand 30.10.2026 |
| Geltungsbereich | gesunde Erwachsene 18+ (Kalorien 19–78 J.), Ausschlüsse siehe G2 |
| Datum, Unterschrift | |

Nach der Freigabe: Werte im Code anpassen, Regelfassungen erhöhen, Hinweise „noch nicht fachlich geprüft“ in der
App (`calculator.intro`, `coach.resultHint`, `checkin.rules`, `hiit.note`, `help.q.fachlichGeprueft`) und die
Prüfregel `geprueft` in `domain/claims.ts` auf den neuen Stand bringen, Register-Einträge auf „freigegeben“ setzen.
