# Athletikplan S1–S6 – „Gym für Leute, die eigentlich einen anderen Sport machen“

Stand 11.11.2026 · Entwurf, noch nicht freigegeben · Grundlage: Gespräch zu Alleinstellungsmerkmalen (Apple Health
ist Pflicht, kein Unterschied) und eine Bestandsaufnahme im Code.

**Der Satz, um den es geht:** „Kraft und Athletik passend zu deinem Sport. Kostenlos, ohne Konto.“

**Grundsätze bleiben:** kein Konto, kein Server, keine KI-Kosten, alles lokal. Neue Automatikregeln laufen
versioniert und kommen gesammelt in `docs/Fachpruefung_Mappe.md` (neuer Abschnitt **N**). Arbeitsweise wie im
Ausbauplan: Phase bauen → Tests, Lint, Browser-Durchlauf → Expo-Go-Link → Luc testet → erst bei „Fertig, wenn“ die
nächste Phase. Jede Datenbank-Änderung ist eine eigene Migration mit Test „alte Daten bleiben erhalten“ und kommt in
Sicherung und Export.

---

## Korrektur zur letzten Einschätzung

Ich hatte geschrieben, der Katalog habe „praktisch keine Explosivkraft“. **Das stimmt nicht.** Beim genauen
Nachzählen ist schon viel da, nur ohne Kennzeichnung und verteilt über „Ganzkörper“:

| Bereich | Schon im Katalog (Beispiele) |
|---|---|
| Sprünge (ca. 14) | Box Jumps, seitliche Box Jumps, Hocksprünge, Weitsprung aus dem Stand, Niedersprünge, Skater-, Ausfallschritt- und einbeinige Sprünge, Pogo-Sprünge, Sprungkniebeuge, Sprung-Liegestütze |
| Würfe (ca. 8) | Ball Slams, seitliche Slams, Wall Balls, Brustpass, Überkopfwurf, Rotationswurf, Sit-up mit Wurf |
| Gewichtheben (ca. 15) | Umsetzen, Reißen, aus dem Hang, Push/Split Jerk, Clean/Snatch Pull, Kettlebell Clean/Snatch/Swing |
| Verletzungsvorbeugung | Nordic Curls, Reverse Nordic, Copenhagen, Schienbeinheben, Außenrotation (Kabel/Band/90-90) |
| Nacken, Griff, Tragen | 6 Nackenübungen, Handgelenkcurls, Hängen an der Stange (auch einarmig), Farmers Walk, Koffer tragen, Turkish Get-up |

**Was wirklich fehlt:** Sprints, Richtungswechsel und Agility, Schlitten, Hürden- und Sprunglauf-Übungen, Landetraining,
Balance. Außerdem kann die App heute nur **Wiederholungen oder Zeit** messen, keine **Strecke**. Die braucht man für
Sprints, Schlitten und Tragen. Statt 60–80 neuer Übungen sind es deshalb **etwa 35 neue plus eine Kennzeichnung** der
vorhandenen.

---

## Überblick

| Phase | Inhalt | Migration | Fachprüfung | Aufwand Bau | Test durch Luc |
|---|---|---|---|---|---|
| **S1** | Athletik im Katalog: Kennzeichnung, Messart Strecke, ca. 35 neue Übungen | ja | Explosiv-Regeln (N1–N3) | mittel | 1 Gym-Einheit |
| **S2** | Sportarten und feste Sport-Termine | ja | nein | mittel | 2 Wochen |
| **S3** | Gym-Woche richtet sich nach dem Sport | klein | **ja** (N4–N8) | mittel bis groß | 2 Wochen |
| **S4** | 5 Vorlagen je Sportart | nein | **ja** (N9) | klein im Code, groß im Inhalt | je 1 Woche |
| **S5** | Belastung über alles und Athletik-Tests | klein | Testabstände (N10) | klein bis mittel | 6 Wochen nebenher |
| **S6** | Einstieg, Store-Texte, Pilot mit Sportlern | nein | nein | klein | Pilot |

**Reihenfolge und warum:** S1 liefert die Übungen und die Messart, die S4 braucht. S2 liefert die Sport-Termine, auf
die S3 reagiert. S4 nutzt die Regeln aus S3 (z. B. Saisonphase). S5 wertet aus, was S2 und S3 erfassen. S6 kommt
zuletzt, weil Store-Texte nur versprechen dürfen, was gebaut und geprüft ist. Die Vorlagen (S4) kann ich schon
**während S2** als Entwurf schreiben, damit die Fachperson alles in einem Termin bekommt.

**Gesamtaufwand grob:** fünf bis sechs Bauphasen in der Größe einer A-Phase, dazu **ein** Termin mit der Fachperson
und etwa sechs Wochen Test durch Luc und Pilotnutzer.

---

## S1 – Athletik im Katalog

| # | Schritt |
|---|---|
| S1.1 | Kennzeichen **„Athletik“** je Übung mit Unterart: `sprung` · `wurf` · `sprint` · `agility` · `gewichtheben` · `vorbeugung` · `griff_nacken` · `balance`. Vorhandene ca. 45 Übungen bekommen das Kennzeichen; neue Muskelgruppe ist nicht nötig. |
| S1.2 | Migration: Messart **`strecke`** (Meter) neben `wdh` und `zeit`. Im Training Eingabe „20 m“, optional mit Zeit (Sprint) oder Gewicht (Schlitten, Tragen). Bestleistung bei Sprints = kürzeste Zeit auf gleicher Strecke. |
| S1.3 | **Explosiv-Regeln** (Fachprüfung N1–N3): Übungen mit Kennzeichen `sprung`/`wurf`/`sprint`/`gewichtheben` stehen im Plan vorn, haben wenige Wiederholungen (3–6), lange Pausen (90–180 s), **keine** Steigerung über Gewicht oder Wiederholungen, keine RIR-Frage und keinen Versagenssatz. Sie zählen nicht als „harter Satz“ fürs Wochenvolumen. |
| S1.4 | **Sprungkontakte je Woche** als eigene Zahl (Wiederholungen × Kontakte je Wiederholung). Hinweis ab einer Obergrenze (N3, Vorschlag: Einsteiger 60, Fortgeschrittene 120). |
| S1.5 | Neue Übungen mit eigener deutscher Kurzanleitung, Suchbegriffen und Ersatzübungen (Liste unten). |
| S1.6 | Filter „Athletik“ in der Übungsauswahl, Kennzeichen in Plan-Dateien (`myhealth-plan`) und im CSV-Export. |
| S1.7 | Übungsbilder: die neuen Übungen kommen ans Ende der Higgsfield-Liste (`docs/Uebungsbilder_Top150.md`). |

**Neue Übungen (ca. 35), Vorschlag:**

| Unterart | Übungen |
|---|---|
| Sprint (Strecke) | Antritt 10 m · Sprint 20 m · Sprint 30 m · fliegender Sprint 20 m · Bergsprint · Antritt aus der Bauchlage · Sprint mit Widerstandsband |
| Schlitten und Tragen (Strecke) | Schlitten schieben · Schlitten ziehen (vorwärts, rückwärts) · Sandsack-Ausfallschritte · Sandsack tragen · Farmers Walk über Strecke |
| Agility | Koordinationsleiter (3 Muster) · 5-10-5 Pendellauf · T-Test · Seitwärts-Shuffle · Richtungswechsel 45° und 90° · Reaktionsstarts |
| Sprung | Hürdensprünge · seitliche Hürdensprünge · Sprunglauf (Bounds) · seitliche einbeinige Sprünge · Landen und halten (Drop & Stick) · einbeiniger Box Jump · Sprung mit Trap-Bar |
| Wurf | Seitwurf aus der Schrittstellung an die Wand · Rückwärts-Überkopfwurf · Stoß einarmig · Wurf von unten nach vorn |
| Griff | Scheiben-Kneifgriff halten · Handtuch-Hängen |
| Balance | Einbeinstand mit Augen zu · Sternreichen (Y-Balance) einbeinig |
| Hyrox-Stationen | SkiErg (Strecke) · Burpee-Weitsprung über Strecke |

**Fertig, wenn:** Luc eine Einheit mit Box Jumps, einem 20-m-Sprint und Schlittenschieben loggt, die Sprints eine
Bestzeit zeigen, keine Steigerung auf die Sprünge vorgeschlagen wird und die Sprungkontakte der Woche stimmen.

## S2 – Sportarten und feste Sport-Termine

Heute geht Sport nur als Cardio „Sonstiges“ mit freiem Namen („Boxen“). Das zählt schon in die Trainingslast, die App
weiß aber nicht, *was* es ist und *wann* es regelmäßig stattfindet.

| # | Schritt |
|---|---|
| S2.1 | **Sportarten** als feste Liste: Fußball · Handball · Basketball · Volleyball · Tennis/Padel · Boxen/Kickboxen · MMA · Judo/Ringen/BJJ · Laufen · Radfahren · Schwimmen · Klettern/Bouldern · Hyrox · Tanzen · Sonstiges. Je Sportart: typische Belastung (Beine, Oberkörper, Ganzkörper) und ob es Sprünge/Sprints enthält. |
| S2.2 | Migration `sport_slot`: **feste Termine** (Wochentag, Sportart, Uhrzeit optional, Minuten, Art: Training · Spiel/Wettkampf, gewohnte Härte leicht/mittel/hart). Mehrere je Woche. |
| S2.3 | Migration: `cardio_log.sport` für Einträge mit Sportart. Alte Einträge „Sonstiges: Boxen“ werden **nicht** automatisch umgedeutet; die App bietet einmal an, sie zuzuordnen. |
| S2.4 | „Heute“ zeigt den Termin: „Fußball 19:00, 90 min“. Danach **ein Tippen** zum Eintragen; Minuten aus dem Termin vorbelegt, **Anstrengung muss man selbst wählen** (gleiche Haltung wie bei RIR: kein Wert, den niemand bestätigt hat). |
| S2.5 | Ausgefallen? „Heute kein Fußball“ – zählt nicht, kein Vorwurf. |
| S2.6 | Wochenansicht im Training-Tab: Gym-Tage und Sport-Termine zusammen in einer Zeile pro Woche. |
| S2.7 | Sicherung, Export und Plan-Dateien enthalten Termine und Sportart. |

**Fertig, wenn:** Luc zwei Termine anlegt, zwei Wochen lang Sport mit einem Tippen einträgt und Woche, Verlauf und
Trainingslast den Sport zeigen.

## S3 – Gym-Woche richtet sich nach dem Sport (Fachprüfung)

| # | Schritt |
|---|---|
| S3.1 | **Saisonphase** je Sportart: Vorbereitung · Saison · Pause. Einstellung im Plan, Wechsel jederzeit. |
| S3.2 | **Regeln für die Woche** (Fachprüfung N4–N7, Vorschläge): kein schwerer Unterkörper und keine Sprünge am Tag vor einem Spiel/Wettkampf (N4) · am Tag nach einem Spiel nur leicht oder Oberkörper (N5) · Gym und Sport am selben Tag nur mit Abstand oder als kurze Einheit, Explosives dann vor dem Sport (N6) · in der Saison weniger Sätze (Vorschlag −30 %) und keine Einheit bis zum Versagen; in der Vorbereitung mehr Volumen; in der Pause der normale Gym-Plan (N7). |
| S3.3 | **Planassistent** nimmt Sport-Termine als belegt und verteilt die Gym-Tage um sie herum (baut auf den bevorzugten Wochentagen aus A8.3 auf). |
| S3.4 | **Angebot statt Automatik**, wie bei der Bereitschaft: „Morgen Spiel – heute Oberkörper statt Beine?“ oder „Gestern Spiel – heute leicht?“. Annahme erzeugt eine befristete Planfassung nur für diesen Tag. |
| S3.5 | **Bereitschaft** bekommt Sport als Grund in der Begründung („Last diese Woche hoch: 2 × Fußball, 1 Spiel“). Die Rechnung selbst bleibt Dauer × Anstrengung (A6.4). (N8: Spiele mit Faktor höher gewichten, ja/nein?) |
| S3.6 | Regeln versioniert (`ATHLETIC_RULES_VERSION`), jede Regel mit Test, Wortwahl als Trainingsempfehlung, Begriffe in die Claims-Prüfung. |

**Fertig, wenn:** Luc mit einem Samstagsspiel plant, die App ihm Freitag keine Beine legt bzw. es anbietet, und er
jedes Angebot nachvollziehbar findet.

## S4 – Vorlagen je Sportart (Fachprüfung)

Wenige, gute Vorlagen statt vieler. Jede als `myhealth-plan`-Datei neben den bisherigen sechs, je **2 Gym-Tage**
(A/B), optional 3. Tag in der Pause. Eigene, neutrale Namen. Aufbau jedes Tages gleich: **Explosiv → Hauptübung
Kraft → einseitige Übung → Vorbeugung passend zum Sport → Rumpf**, 45–60 min.

| Vorlage | Schwerpunkt | Vorbeugung, die rein muss |
|---|---|---|
| Athletik Ballsport (Fußball, Handball, Basketball) | Antritt, Sprung, Richtungswechsel, einbeinige Kraft | Nordic Curls, Copenhagen, Waden/Schienbein |
| Athletik Kampfsport | Hüftkraft, Rotation, Zugkraft, Kraftausdauer | Nacken, Griff, Schulter-Außenrotation |
| Athletik Laufen | einbeinige Kraft, Steifigkeit Fuß/Wade, Rumpf | Waden, Schienbein, Hüftabduktoren |
| Athletik Rückschlag (Tennis, Padel) | Rotation, Seitwärtsbewegung, Schulter | Außenrotation, Unterarm, Copenhagen |
| Hyrox | Kraftausdauer, Stationen, Laufen unter Ermüdung | Griff, Tragen, Waden |

Jede Vorlage gibt es in zwei Fassungen: **Vorbereitung** und **Saison** (weniger Sätze, gleiche Übungen). Die
Saisonphase aus S3.1 wählt automatisch die passende.

**Fertig, wenn:** jede Vorlage fachlich freigegeben ist (N9) und Luc oder ein Pilotnutzer aus der Sportart eine Woche
damit trainiert hat.

## S5 – Belastung über alles und Athletik-Tests

| # | Schritt |
|---|---|
| S5.1 | **Wochenlast** als Balken: Gym und Sport gestapelt, dazu der eigene 4-Wochen-Schnitt. Nutzt die vorhandene Last-Rechnung. |
| S5.2 | **Athletik-Tests** freiwillig alle 6 Wochen (N10): Weitsprung aus dem Stand (cm), 10-m- und 20-m-Sprint (Stoppuhr, Partner misst), 5-10-5 (s), Hängen an der Stange (s). Verlauf je Test, Hinweis „Handzeiten schwanken um ± 0,2 s“. |
| S5.3 | Einblicke (B4) um ein Muster erweitern: „In Wochen mit Spiel war deine Energie im Schnitt …“, erst ab genug Daten, mit Hinweis auf Zufall. |
| S5.4 | **Später mit Apple Health (D3):** Workouts der Uhr (z. B. Fußball, Boxen) als Vorschlag zum Übernehmen, Puls in die Anstrengung. Erst mit Development Build. |

**Fertig, wenn:** Luc nach sechs Wochen Wochenlast und zwei Testrunden sieht und die Werte stimmen.

## S6 – Einstieg, Store-Texte und Pilot

| # | Schritt |
|---|---|
| S6.1 | Beim Erststart eine Frage mehr: „Machst du einen Sport neben dem Gym?“ → Sportart, Termine, Saisonphase → passende Vorlage vorschlagen. Überspringbar. |
| S6.2 | Store-Texte (`docs/Store_Texte.md`) um den Satz und drei Bilder ergänzen; jede Aussage durch die Claims-Prüfung. |
| S6.3 | Pilot: 3–5 Leute je Sportart (Verein, Kampfsportschule, Laufgruppe). Fragen: Passen die Gym-Tage zum Sport? Fehlt eine Übung? Würdest du wechseln? |

---

## Fachprüfung – neuer Abschnitt N in der Mappe

Am besten prüft das eine Person mit **Schwerpunkt Athletik/Leistungssport** (z. B. Athletiktrainer oder
Sportwissenschaft mit Trainerlizenz). Das kann dieselbe Fachperson wie für A–M sein, wenn sie das abdeckt.

| ID | Regel (Vorschlag, alles anpassbar) | Phase |
|---|---|---|
| N1 | Explosive Übungen: 3–6 Wdh., 90–180 s Pause, immer am Anfang der Einheit | S1 |
| N2 | Keine Steigerung, keine RIR-Frage und kein Versagen bei explosiven Übungen | S1 |
| N3 | Sprungkontakte je Woche: Hinweis ab 60 (Einsteiger) bzw. 120 (Fortgeschrittene) | S1 |
| N4 | Am Tag vor Spiel/Wettkampf keine schweren Beine, keine Sprünge | S3 |
| N5 | Am Tag nach Spiel/Wettkampf nur leicht oder Oberkörper | S3 |
| N6 | Gym und Sport am selben Tag: Abstand bzw. kurze Einheit, Explosives zuerst | S3 |
| N7 | Saison −30 % Sätze, kein Versagen; Vorbereitung mehr Volumen; Pause normaler Plan | S3 |
| N8 | Spiele in der Trainingslast höher gewichten: ja/nein, wenn ja, welcher Faktor | S3 |
| N9 | Die 5 Vorlagen inkl. Saisonfassung, Übungswahl und Reihenfolge | S4 |
| N10 | Athletik-Tests: Auswahl, Abstand 6 Wochen, Durchführungsanleitung | S5 |

## Offene Entscheidungen von Luc

| # | Frage | Mein Vorschlag |
|---|---|---|
| E6 | Sind Sport-Vorlagen und Sport-Termine kostenlos? (`docs/Monetarisierung_Entscheidung.md`) | Ja. Der Satz „kostenlos“ ist der Unterschied zu fin und zu Volt/TrainHeroic. |
| E7 | Mit welcher Sportart starten, falls nicht alle fünf Vorlagen auf einmal? | Ballsport und Kampfsport zuerst (viele Leute, wenig gute Angebote); Hyrox als dritte. |
| E8 | Jugendliche Sportler? Viele Vereinsspieler sind unter 18. | Nein, Zielgruppe bleibt ab 18 (sonst Rechts- und Fachprüfung neu). |

## Bewusst weglassen (W)

Technik-Training einzelner Sportarten (Schlagkombinationen, Fußball-Drills, Würfe im Judo) · Videos · Mannschafts-
und Trainerfunktionen, Konten · Spielplan-Import aus Vereinsseiten · Sprintmessung per Kamera oder GPS ·
Direktanbindung Whoop/Garmin/Strava (läuft über Apple Health / Health Connect, D3/D9) · Reha nach Verletzungen ·
eigene Vorlagen für jede einzelne Sportart.
