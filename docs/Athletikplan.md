# Athletikplan S1–S9 – „Der Coach für dein Training neben dem Sport“

Stand 11.11.2026, zweite Fassung · Entwurf, noch nicht freigegeben · Grundlage: Gespräch zu Alleinstellungsmerkmalen
und Lucs Wunsch vom 11.11.2026: Trainingstipps und angepasste Gym-Pläne für viele Sportarten, 1–2 kostenlose Pläne,
die individuellen Pläne über den Coach als bezahlte Funktion.

**Der Satz, um den es geht:** „Dein Gym-Training passend zu deinem Sport: Fußball, Kampfsport, Basketball, Hyrox,
Laufen und mehr. Der Coach stellt sich auf dich ein.“

**Warum das trägt:** Kalorien zählen und normales Krafttraining kann jede App. Ein Coach, der weiß, dass du Dienstag
Fußball hast, Samstag spielst, gerade in der Saison bist und Probleme mit der Leiste hattest, und daraus deine
Gym-Woche baut, ist selten und ohne Trainer sonst teuer (Volt, TrainHeroic, Personal Trainer).

**Grundsätze bleiben:** kein Konto, kein Server, keine KI-Kosten, alles lokal. Der Coach arbeitet mit **festen,
geprüften Regeln** (wie der Planassistent heute), nicht mit einer KI. Neue Regeln kommen gesammelt in
`docs/Fachpruefung_Mappe.md` (Abschnitt **N**). Arbeitsweise wie im Ausbauplan: Phase bauen → Tests, Lint,
Browser-Durchlauf → Expo-Go-Link → Luc testet → erst bei „Fertig, wenn“ die nächste Phase.

**Grenze bleibt:** Technik der Sportart (Schlagkombinationen, Dribbling, Würfe im Judo) lernt man im Verein. Die App
macht den Körper fit **für** den Sport: Kraft, Schnelligkeit, Sprungkraft, Rumpf, Ausdauer, Verletzungsvorbeugung.

---

## 1. Was heute schon da ist

| Bereich | Stand |
|---|---|
| Übungen | 894 im Katalog, darunter ca. 14 Sprungübungen, ca. 8 Medizinball-Würfe, ca. 15 Gewichthebe-Übungen, ca. 90 Bauch-/Rumpfübungen, Nordic Curls, Copenhagen, Schienbeinheben, Außenrotation, Nacken, Griff, Tragen |
| Was fehlt | Sprints, Agility, Schlitten, Hürdensprünge, Landetraining, Balance; Messart **Strecke**; Kennzeichnung „Athletik“ |
| Planassistent | erzeugt Pläne aus Ziel (Muskelaufbau, Kraft, Fitness), Erfahrung, Tagen, Minuten, Geräten, Ausschlüssen; mit Vorschau, Begründung und Konflikten. **Darauf baut der Sport-Coach auf.** |
| Sport | nur als Cardio „Sonstiges“ mit freiem Namen; zählt schon in die Trainingslast und die Bereitschaft |
| Bezahlen | noch nicht möglich: Entscheidung offen (`docs/Monetarisierung_Entscheidung.md`), In-App-Kauf braucht den Development Build (D1, D12) |

---

## 2. Das Modell: Sportprofile plus Athletik-Bausteine

Statt für jede Sportart einen festen Plan zu schreiben, bekommt jede Sportart ein **Sportprofil**: Welche
Eigenschaften braucht sie wie stark, wo verletzt man sich typisch, welche Belastung bringt der Sport schon mit. Der
Coach baut aus Profil + persönlichen Angaben den Plan. **Eine neue Sportart ist dann eine neue Zeile Daten plus
Fachprüfung, kein neuer Code.**

### Athletik-Bausteine (auch einzeln wählbar, ohne Sportart)

| Baustein | Inhalt |
|---|---|
| **Explosivkraft / Plyometrie** | Sprünge, Würfe, Gewichtheben, Sprungkontakte je Woche |
| **Sprint und Schnelligkeit** | Antritt, Höchstgeschwindigkeit, Richtungswechsel, Agility |
| **Maximalkraft** | schwere Grundübungen, wenige Wiederholungen |
| **Kraftausdauer** | Zirkel, Stationen, Tragen, Schlitten |
| **Rumpf und Bauchstabilität** | Anti-Streckung, Anti-Rotation, Seitstütz, Tragen, Rotation mit Kraft |
| **Laufkraft** | einbeinige Kraft, Waden, Fuß, Hüftstabilität |
| **Verletzungsvorbeugung** | je Sportart: Oberschenkelrückseite, Leiste, Knie, Sprunggelenk, Schulter, Nacken |

### Sportprofile (erste Fassung, 11 Stück)

Gewichtung 0–3 je Baustein (Vorschlag, wird fachlich geprüft):

| Sportart | Explosiv | Sprint | Max.-Kraft | Kraftausd. | Rumpf | Laufkraft | Vorbeugung vor allem |
|---|---|---|---|---|---|---|---|
| Fußball | 2 | 3 | 2 | 1 | 2 | 2 | Oberschenkelrückseite, Leiste, Sprunggelenk |
| Basketball | 3 | 2 | 2 | 1 | 2 | 1 | Knie, Sprunggelenk, Landen |
| Handball / Volleyball | 3 | 2 | 2 | 1 | 2 | 1 | Schulter, Knie, Landen |
| American Football | 3 | 3 | 3 | 1 | 2 | 1 | Nacken, Schulter, Oberschenkelrückseite |
| Boxen / Kickboxen / MMA | 2 | 1 | 1 | 3 | 3 | 1 | Nacken, Schulter, Hüfte |
| Ringen / Judo / BJJ | 2 | 0 | 3 | 3 | 3 | 0 | Nacken, Griff, Schulter, Knie |
| Tennis / Padel | 2 | 2 | 1 | 2 | 3 | 1 | Schulter, Ellbogen/Unterarm, Leiste |
| Hyrox | 1 | 0 | 2 | 3 | 2 | 3 | Waden, Griff, unterer Rücken |
| Laufen / Joggen | 1 | 1 | 1 | 1 | 2 | 3 | Waden/Achillessehne, Knie, Hüfte |
| Sprint / Leichtathletik | 3 | 3 | 2 | 0 | 2 | 2 | Oberschenkelrückseite, Hüftbeuger |
| Klettern / Bouldern | 1 | 0 | 2 | 2 | 2 | 0 | Finger/Griff, Schulter |

Weitere Sportarten später nach Bedarf aus dem Pilot (Radfahren, Schwimmen, Ski, Rugby, Eishockey, Tanzen …).

---

## 3. Kostenlos und Pro

**Leitlinie:** Erfassen und Grundlagen sind kostenlos, das **Individuelle** ist Pro. So bleibt die bisherige Regel
erfüllt: Rechner und Tracker gehören in die kostenlose Basis, nichts wird nachträglich weggenommen (BUS-010).

| Kostenlos | Pro „Sport-Coach“ |
|---|---|
| Alle Athletik-Übungen mit Anleitung (S1) | Coach baut den Plan aus **Sportprofil**, Saisonphase, Terminen, Erfahrung, Geräten, Minuten und Verletzungsvorgeschichte (S5) |
| Sportarten und Sport-Termine eintragen, Trainingslast mit Sport (S2) | **Wochenregeln** um Spiele und Training: „Morgen Spiel – heute Oberkörper?“ (S3) |
| **2 feste Pläne:** „Athletik-Grundlage“ und „Rumpf und Stabilität“ (S4) | Automatischer Wechsel Vorbereitung / Saison / Pause, geplante leichte Wochen |
| Je Sportart **3 Grundtipps** (S6) | Alle Tipps je Sportart, Ablauf vor dem Spiel (Aufwärmen), nach dem Spiel |
| Bisheriger Planassistent, alle bisherigen Vorlagen | **Athletik-Bausteine** einzeln kombinieren (z. B. Fußball + Sprint-Schwerpunkt) |
| | Athletik-Tests mit Auswertung, Coach passt den Plan nach jedem Test an (S7) |

**Warum genau diese zwei kostenlosen Pläne:** „Athletik-Grundlage“ (2 Tage: Sprung, Sprint-Basis, Kraft, Rumpf,
Vorbeugung) passt zu **jeder** Sportart und zeigt, was die App kann. „Rumpf und Stabilität“ (kurz, 20–30 min, auch
zuhause) ist ein häufiger Wunsch und ein guter Einstieg. Wer mehr will, sieht den Unterschied zum Coach sofort: dort
steht die eigene Sportart, die eigenen Termine, die eigene Saison.

---

## 4. Überblick der Phasen

| Phase | Inhalt | Free/Pro | Fachprüfung | Aufwand Bau |
|---|---|---|---|---|
| **S1** | Athletik im Katalog: Kennzeichnung, Messart Strecke, ca. 35 neue Übungen | Free | N1–N3 | mittel |
| **S2** | Sportarten und feste Sport-Termine, Sport in der Trainingslast | Free | nein | mittel |
| **S3** | Wochenregeln um Spiele und Saisonphase | Pro | N4–N8 | mittel bis groß |
| **S4** | 2 kostenlose Pläne | Free | N9 | klein |
| **S5** | **Sport-Coach**: Sportprofile + Bausteine → individueller Plan | Pro | N10–N12 | **groß** |
| **S6** | Trainingstipps je Sportart | Free (Grundtipps) / Pro | N13 | mittel (vor allem Text) |
| **S7** | Athletik-Tests und Auswertung, Coach passt an | Pro | N14 | mittel |
| **S8** | Bezahlen: Pro freischalten | – | Rechtsprüfung | mittel, **braucht Development Build** |
| **S9** | Einstieg, Store-Texte, Pilot mit Sportlern | – | nein | klein |

**Reihenfolge und warum:** S1 und S2 sind die Grundlage und kostenlos, sie lohnen sich auch ohne Pro. S4 ist schnell
und zeigt den Nutzen früh. S3 und S5 sind der Kern des Coaches. S6 kann parallel geschrieben werden. S8 kommt erst,
wenn der Development Build steht und du dich für ein Bezahlmodell entschieden hast; bis dahin ist Pro im Pilot
**sichtbar markiert, aber frei** (siehe E9). Die Fachperson bekommt N1–N14 gesammelt in **einem** Termin, sobald S5
als Entwurf steht.

**Gesamtaufwand grob:** acht bis neun Bauphasen in der Größe einer A-Phase. Der größte Brocken ist nicht der Code,
sondern der **Inhalt**: 11 Sportprofile, Tipps und Regeln, die fachlich stimmen müssen.

---

## S1 – Athletik im Katalog (Free)

| # | Schritt |
|---|---|
| S1.1 | Kennzeichen **„Athletik“** je Übung mit Unterart: `sprung` · `wurf` · `sprint` · `agility` · `gewichtheben` · `vorbeugung` · `rumpf` · `griff_nacken` · `balance`. Die vorhandenen ca. 45 Athletik-Übungen und die Rumpfübungen werden zugeordnet, Rumpf zusätzlich nach Art (Anti-Streckung, Anti-Rotation, seitlich, Rotation). |
| S1.2 | Migration: Messart **`strecke`** (Meter) neben `wdh` und `zeit`. Eingabe „20 m“, optional Zeit (Sprint) oder Gewicht (Schlitten, Tragen). Bestleistung bei Sprints = kürzeste Zeit auf gleicher Strecke. |
| S1.3 | **Explosiv-Regeln** (N1–N2): Sprung, Wurf, Sprint, Gewichtheben stehen vorn, 3–6 Wdh., 90–180 s Pause, keine Steigerung über Gewicht/Wdh., keine RIR-Frage, kein Versagenssatz, zählen nicht als „harter Satz“. |
| S1.4 | **Sprungkontakte je Woche** als eigene Zahl, Hinweis ab Obergrenze (N3, Vorschlag 60 Einsteiger / 120 Fortgeschrittene). |
| S1.5 | Ca. 35 neue Übungen (Liste unten), mit Kurzanleitung, Suchbegriffen, Ersatzübungen. |
| S1.6 | Filter „Athletik“ und „Rumpf“ in der Übungsauswahl; Kennzeichen in Plan-Dateien und CSV-Export. |
| S1.7 | Neue Übungen ans Ende der Higgsfield-Bilderliste (`docs/Uebungsbilder_Top150.md`). |

| Unterart | Neue Übungen (Vorschlag) |
|---|---|
| Sprint (Strecke) | Antritt 10 m · Sprint 20 m · Sprint 30 m · fliegender Sprint 20 m · Bergsprint · Antritt aus der Bauchlage · Sprint mit Widerstandsband |
| Schlitten und Tragen | Schlitten schieben · Schlitten ziehen (vorwärts, rückwärts) · Sandsack-Ausfallschritte · Sandsack tragen · Farmers Walk über Strecke |
| Agility | Koordinationsleiter (3 Muster) · 5-10-5 Pendellauf · T-Test · Seitwärts-Shuffle · Richtungswechsel 45° und 90° · Reaktionsstarts |
| Sprung | Hürdensprünge · seitliche Hürdensprünge · Sprunglauf (Bounds) · seitliche einbeinige Sprünge · Landen und halten · einbeiniger Box Jump · Sprung mit Trap-Bar |
| Wurf | Seitwurf an die Wand · Rückwärts-Überkopfwurf · Stoß einarmig · Wurf von unten nach vorn |
| Griff, Balance, Hyrox | Scheiben-Kneifgriff · Handtuch-Hängen · Einbeinstand mit Augen zu · Sternreichen einbeinig · SkiErg (Strecke) · Burpee-Weitsprung über Strecke |

**Fertig, wenn:** Luc eine Einheit mit Box Jumps, 20-m-Sprint und Schlittenschieben loggt, Sprints eine Bestzeit
zeigen, auf Sprünge keine Steigerung vorgeschlagen wird und die Sprungkontakte stimmen.

## S2 – Sportarten und Sport-Termine (Free)

| # | Schritt |
|---|---|
| S2.1 | Sportarten als feste Liste (die 11 Profile aus Abschnitt 2 + Sonstiges). |
| S2.2 | Migration `sport_slot`: feste Termine (Wochentag, Sportart, Uhrzeit optional, Minuten, Training oder Spiel/Wettkampf, gewohnte Härte). |
| S2.3 | Migration `cardio_log.sport`. Alte Einträge „Sonstiges: Boxen“ werden nicht umgedeutet; die App bietet einmal an, sie zuzuordnen. |
| S2.4 | „Heute“ zeigt den Termin, ein Tippen zum Eintragen; Minuten vorbelegt, **Anstrengung wählt man selbst**. |
| S2.5 | „Heute ausgefallen“ ohne Vorwurf. |
| S2.6 | Wochenansicht: Gym-Tage und Sport-Termine zusammen. |
| S2.7 | Sicherung, Export, Plan-Dateien enthalten Termine und Sportart. |

**Fertig, wenn:** Luc zwei Termine anlegt, zwei Wochen lang mit einem Tippen einträgt und Woche, Verlauf und
Trainingslast den Sport zeigen.

## S3 – Wochenregeln um Spiele und Saison (Pro)

| # | Schritt |
|---|---|
| S3.1 | Saisonphase je Sportart: Vorbereitung · Saison · Pause. |
| S3.2 | Regeln (N4–N7): keine schweren Beine und keine Sprünge am Tag vor dem Spiel · am Tag danach nur leicht oder Oberkörper · Gym und Sport am selben Tag nur mit Abstand oder kurz, Explosives zuerst · Saison weniger Sätze (Vorschlag −30 %), kein Versagen; Vorbereitung mehr Volumen; Pause normaler Plan. |
| S3.3 | Planassistent nimmt Sport-Termine als belegt und verteilt die Gym-Tage darum herum. |
| S3.4 | **Angebot statt Automatik**: „Morgen Spiel – heute Oberkörper statt Beine?“; Annahme = befristete Planfassung für diesen Tag. |
| S3.5 | Bereitschaft nennt Sport als Grund („2 × Fußball, 1 Spiel diese Woche“). N8: Spiele in der Last höher gewichten? |

**Fertig, wenn:** Luc mit Samstagsspiel plant, Freitag keine Beine angeboten bekommt und jedes Angebot nachvollzieht.

## S4 – Zwei kostenlose Pläne (Free)

| Plan | Aufbau |
|---|---|
| **Athletik-Grundlage** (2 Tage, 45–60 min) | Tag A: Sprung → Kniebeuge-Muster → einbeinig → Nordic Curls → Anti-Rotation. Tag B: Wurf/Antritt → Hüftstreckung → Zug + Druck → Copenhagen/Waden → Seitstütz. Einsteiger- und Fortgeschrittenen-Fassung. |
| **Rumpf und Stabilität** (2–3 × 20–30 min, auch zuhause) | Anti-Streckung, Anti-Rotation, seitlich, Tragen, Balance; Steigerung über Zeit und Hebel, nicht über Gewicht. |

Als `myhealth-plan`-Dateien neben den bisherigen sechs, fachlich geprüft (N9).

## S5 – Sport-Coach (Pro)

Erweiterung des Planassistenten (`domain/planner.ts`, `buildTemplate`), keine zweite Logik. Vorschau, Begründung und
Konflikte funktionieren wie heute.

| # | Schritt |
|---|---|
| S5.1 | **Eingaben:** Sportart (eine Haupt-, optional eine Nebensportart) · Saisonphase · Sport-Termine aus S2 · Gym-Tage (1–4) und Minuten · Erfahrung im Gym · Geräteprofil · frühere Beschwerden (Liste: Knie, Sprunggelenk, Oberschenkelrückseite, Leiste, Schulter, unterer Rücken, Nacken) · optional Schwerpunkt-Baustein („mehr Sprint“, „mehr Rumpf“). |
| S5.2 | **Sportprofile als Daten** (`domain/sport-profiles.ts`, versioniert), Gewichte je Baustein wie in Abschnitt 2. |
| S5.3 | **Tagesaufbau** (N10): Explosiv/Sprint → Hauptübung Kraft → einseitig → Vorbeugung nach Profil und Beschwerden → Rumpf nach Profil. Welche Blöcke wie groß werden, entscheidet die Gewichtung; was nicht in die Minuten passt, wird mit Begründung gekürzt (wie heute). |
| S5.4 | **Volumen** (N11) nach Saisonphase, Erfahrung und Sportlast der Woche: viel Sport → weniger Gym-Sätze. |
| S5.5 | **Beschwerden** (N12): betroffene Übungen werden ersetzt, passende Vorbeugung kommt dazu; Hinweis „bei Schmerzen ärztlich abklären“; nie Reha-Versprechen. |
| S5.6 | **Begründung im Plan**: je Block ein Satz („Nordic Curls: senken bei Fußballern das Risiko für Zerrungen der Oberschenkelrückseite“), Wortwahl durch die Claims-Prüfung. |
| S5.7 | **Wechsel der Saisonphase** erzeugt eine neue Planfassung (Vorschau, bestätigen), alte bleibt im Verlauf. |
| S5.8 | Tests: je Sportprofil ein Beispielplan als feste Testdatei, damit Regeländerungen sichtbar werden. |

**Fertig, wenn:** für jede der 11 Sportarten ein Beispielplan existiert, den die Fachperson freigibt, und Luc mit
seinem eigenen Profil zwei Wochen damit trainiert.

## S6 – Trainingstipps je Sportart (Free/Pro)

Baut auf den Lerninhalten (A10.8) auf. Kurz, praktisch, ohne Heilversprechen.

| # | Schritt |
|---|---|
| S6.1 | Je Sportart **3 Grundtipps kostenlos**, z. B. Fußball: „Nordic Curls 1–2 × pro Woche“, „Schwere Beine nicht am Tag vor dem Spiel“, „Sprints frisch zu Beginn der Einheit, nicht am Ende“. |
| S6.2 | **Pro:** je Sportart 8–12 Tipps zu Aufwärmen vor dem Spiel, Erholung danach, Saison, Ernährung rund ums Spiel (Verknüpfung mit dem Tagebuch, keine neuen Zahlenregeln), typische Fehler. |
| S6.3 | Tipps erscheinen dort, wo sie passen: am Spieltag auf „Heute“, im Plan an der Übung, nach dem Spiel. |
| S6.4 | Alle Texte in die Fachprüfung (N13) und Claims-Prüfung. |

## S7 – Athletik-Tests und Auswertung (Pro)

| # | Schritt |
|---|---|
| S7.1 | Tests alle 6 Wochen (N14), je Sportart passend ausgewählt: Weitsprung aus dem Stand, 10-/20-m-Sprint, 5-10-5, Hängen an der Stange, Seitstütz-Zeit, 1-km-Lauf für Hyrox/Laufen. |
| S7.2 | Verlauf je Test, Hinweis „Handzeiten schwanken um ± 0,2 s“. |
| S7.3 | Coach schlägt nach dem Test eine Anpassung vor („Sprung verbessert, Sprint nicht → mehr Sprint-Block?“), nur nach Bestätigung. |
| S7.4 | Wochenlast Gym + Sport gestapelt mit 4-Wochen-Schnitt (auch Free, nutzt die vorhandene Last-Rechnung). |
| S7.5 | Später mit Apple Health (D3): Workouts der Uhr als Sport übernehmen, Puls in die Anstrengung. |

## S8 – Pro freischalten

| # | Voraussetzung / Schritt |
|---|---|
| S8.1 | **Entscheidung Bezahlmodell B** (kostenlos + Pro) in `docs/Monetarisierung_Entscheidung.md`, Preis festlegen. |
| S8.2 | **Development Build** (D1), In-App-Kauf über Apple (D12), Kauf wiederherstellen. |
| S8.3 | Pro-Ende ohne Datenverlust: Pläne bleiben nutzbar wie gespeichert, nur der Coach passt nicht mehr an (BUS-010). |
| S8.4 | **Rechtsprüfung:** bezahlte Trainingsempfehlungen, Haftungshinweis, Gewerbe/Steuern, Verbraucherinformationen (`docs/Rechtspruefung_Mappe.md` ergänzen). |

## S9 – Einstieg, Store, Pilot

| # | Schritt |
|---|---|
| S9.1 | Erststart: „Machst du einen Sport neben dem Gym?“ → Sportart, Termine → kostenloser Plan sofort, Coach als Angebot. Überspringbar. |
| S9.2 | Store-Texte mit dem Satz aus der Einleitung, Bilder mit Sportarten; jede Aussage durch die Claims-Prüfung. |
| S9.3 | Pilot: 3–5 Leute je Sportart (Verein, Kampfsportschule, Laufgruppe, Hyrox-Box). Fragen: Passt der Plan zum Sport? Fehlt etwas? Würdest du dafür zahlen, wie viel? |

---

## Fachprüfung – Abschnitt N in der Mappe

Am besten mit Schwerpunkt **Athletik/Leistungssport** (Athletiktrainer oder Sportwissenschaft mit Trainerlizenz).
Bei bezahlten Plänen ist eine Prüfung noch wichtiger, weil Nutzer dafür Geld ausgeben.

| ID | Regel (Vorschlag, alles anpassbar) | Phase |
|---|---|---|
| N1 | Explosive Übungen: 3–6 Wdh., 90–180 s Pause, immer am Anfang | S1 |
| N2 | Keine Steigerung, keine RIR-Frage, kein Versagen bei explosiven Übungen | S1 |
| N3 | Sprungkontakte je Woche: Hinweis ab 60 / 120 | S1 |
| N4 | Am Tag vor Spiel/Wettkampf keine schweren Beine, keine Sprünge | S3 |
| N5 | Am Tag nach Spiel/Wettkampf nur leicht oder Oberkörper | S3 |
| N6 | Gym und Sport am selben Tag: Abstand bzw. kurz, Explosives zuerst | S3 |
| N7 | Saison −30 % Sätze, kein Versagen; Vorbereitung mehr; Pause normaler Plan | S3 |
| N8 | Spiele in der Trainingslast höher gewichten: ja/nein, Faktor | S3 |
| N9 | Die zwei kostenlosen Pläne | S4 |
| N10 | Sportprofile (Gewichte je Baustein, Vorbeugung) und Tagesaufbau | S5 |
| N11 | Volumen nach Saison, Erfahrung und Sportlast | S5 |
| N12 | Umgang mit früheren Beschwerden: Ersatz, Zusatz, Hinweistext | S5 |
| N13 | Trainingstipps je Sportart | S6 |
| N14 | Athletik-Tests: Auswahl je Sportart, Abstand, Anleitung, Anpassungsvorschlag | S7 |

## Offene Entscheidungen von Luc

| # | Frage | Mein Vorschlag |
|---|---|---|
| E6 | Bezahlmodell B (kostenlos + Pro „Sport-Coach“)? Preis? | Ja, Preis erst nach dem Pilot festlegen (Feedback-Frage Zahlungsbereitschaft). Richtwert aus dem Wettbewerbsvergleich: 3–5 €/Monat, 25–40 €/Jahr. |
| E7 | Sind die zwei kostenlosen Pläne „Athletik-Grundlage“ und „Rumpf und Stabilität“ richtig? | Ja; Alternative wäre ein kostenloser Plan für die beliebteste Sportart (Fußball). |
| E8 | Jugendliche Sportler? Viele Vereinsspieler sind unter 18. | Nein, Zielgruppe bleibt ab 18 (sonst Rechts- und Fachprüfung neu, bei Bezahlfunktion zusätzlich Jugendschutz). |
| E9 | Was bekommen Pilot-Testerinnen und -Tester, solange Pro noch nicht bezahlbar ist? | Pro im Pilot frei und **klar als „Pro – im Pilot kostenlos“ markiert**; Pilotnutzer behalten Pro danach dauerhaft. Sonst würde man ihnen etwas wegnehmen (BUS-010). |
| E10 | Mit welchen Sportprofilen starten, falls nicht alle 11 auf einmal? | Fußball, Kampfsport (beide Profile), Basketball, Hyrox, Laufen; der Rest in einer zweiten Runde. |

## Bewusst weglassen (W)

Technik-Training der Sportarten · Videos · Mannschafts- und Trainerkonten · KI-Chat-Coach (Kosten, Server, nicht
prüfbar) · Spielplan-Import · Sprintmessung per Kamera/GPS · Direktanbindung Whoop/Garmin/Strava (läuft über Apple
Health / Health Connect, D3/D9) · Reha nach Verletzungen · Pläne für unter 18-Jährige.
