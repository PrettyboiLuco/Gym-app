# Myhealth – Bestandsaufnahme des Funktionsumfangs (Stand Repo 01.11.2026)

Codebase-Inventur, keine Websuche. Quellen sind Repo-Pfade relativ zu `/home/user/Gym-app`. Stand: Commit `e62158c`
(„Rezeptbuch: 64 neue Rezepte …“), Datenbank-Schema-Version 18 (`mobile/src/data/migrations.ts`), Expo SDK 58,
React Native 0.88, 52 Routendateien unter `mobile/src/app`. Hinweis: `docs/Fahrplan.md` endet beim „Optik-Paket“
(31.10.2026); die danach gebauten Funktionen Plan-Import (RIR, Hinweise, Anzeigenamen), „vergessenes Training“ und
Rezeptbuch stehen nur in Git-Historie und Code, nicht im Fahrplan.

## Training: Was kann die App heute (Pläne, Logging, Timer, Progression, Katalog, HIIT, Dehnen, Cardio, Auswertung)?

### Takeaway
Krafttraining ist der am weitesten ausgebaute Bereich: versionierte Pläne, Satz-Logging (Gewicht × Wdh. oder
Sekunden), Pausentimer mit Sperrbildschirm-Mitteilungen, regelbasierte Steigerungsvorschläge, 894 Übungen ohne
Bilder, offline-Planassistent, Bestleistungen und Kraftverlauf. Es fehlen Cardio/Laufen mit Dauer/Strecke,
Satztypen (Aufwärm-/Drop-/Fehlversuchssätze), RIR/RPE pro geloggtem Satz, 1RM-Schätzung, Supersätze und Übungsmedien.

### Cited Findings
**Pläne und Versionen**
- Pläne mit Tagen, Übungen, Sätzen (1–20), Wdh.-Bereich (1–100), Pause (0–1800 s); jede Planänderung = neue Version, alte Trainings bleiben; „Wieder verwenden“ alter Versionen; Tage/Übungen umsortieren; Warnung bei ungespeicherten Änderungen — [mobile/src/data/migrations.ts (Version 2)](mobile/src/data/migrations.ts); [docs/Fahrplan.md Phase 2/3.0](docs/Fahrplan.md); Editor [mobile/src/app/training/plan/[id].tsx](mobile/src/app/training/plan/[id].tsx)
- Pro Plan-Übung zusätzlich Ziel-RIR als Text (z. B. „0–1“), kurzer Hinweis und eigener Anzeigename (Schema v17/v18); im Training als „RIR {{rir}}“ angezeigt — [mobile/src/data/migrations.ts](mobile/src/data/migrations.ts); [mobile/src/i18n/de.ts `session.rir`](mobile/src/i18n/de.ts)
- Befristete Planfassungen „nur diese Woche“ (bis Sonntag) / „2 Wochen“, danach automatisch zurück; „Woche ausgefallen? Diese Woche neu planen“ — [docs/Fahrplan.md Phase 8.2](docs/Fahrplan.md); [mobile/src/i18n/de.ts `training.rescheduleTitle`](mobile/src/i18n/de.ts)
- Freies Training ohne Plan; „Heute“/Training schlägt den nächsten Plantag vor, jeder Tag wählbar — [mobile/src/i18n/de.ts `training.freeWorkout`, `training.dayChoiceHint`](mobile/src/i18n/de.ts)

**Logging im Training** ([mobile/src/app/training/session/[id].tsx](mobile/src/app/training/session/[id].tsx), 801 Zeilen)
- Geloggt werden je Satz nur: Gewicht (kg, ≥0), Wiederholungen, bzw. Sekunden bei Zeit-Übungen, plus geplante Werte und Pause — Tabelle `set_log` [mobile/src/data/migrations.ts (v2, v6)](mobile/src/data/migrations.ts). Kein Feld für RIR/RPE pro Satz, Satztyp, Notiz oder Tempo (Schema-Befund).
- Anzeige „Letztes Mal“, Vorbelegung aus vorigem Satz/letztem Mal, Satz hinzufügen/entfernen/wieder öffnen, Übung hinzufügen, „Schmerzen / abbrechen“ ohne Therapie-Tipps, Fortschrittsbalken, fertige Übungen klappen zu, federnder Satz-Haken mit Haptik — [mobile/src/i18n/de.ts `session.*`](mobile/src/i18n/de.ts); [docs/Fahrplan.md Nachtrag 14 Verbesserungen](docs/Fahrplan.md)
- Zeit-Sätze (Plank) mit Countdown, der den Satz am Ende einträgt — [mobile/src/i18n/de.ts `session.holdHint`](mobile/src/i18n/de.ts)
- „Gerät belegt? Ersatz wählen“: tauscht nur offene Sätze dieses Trainings gegen kuratierte Ersatzübung — [mobile/src/i18n/de.ts `session.busy*`](mobile/src/i18n/de.ts); [docs/Fahrplan.md 8.4](docs/Fahrplan.md)
- Vergessenes Training: nach 6 Stunden „Noch offen“ im Mini-Player, beenden (Ende = letzter Satz) oder verwerfen — [git d9d7530]; [mobile/src/i18n/de.ts `session.stale*`, `mini.*`](mobile/src/i18n/de.ts)
- Mini-Player „Training läuft“ über der Tab-Leiste — [mobile/src/components/mini-player.tsx](mobile/src/components/mini-player.tsx)

**Pausentimer**
- Schnellwahl 0:30–5:00 / frei, Auto-Start abschaltbar, manuell starten, +30 s, Überspringen, Vibration, Vollbild mit Ring, „Als Nächstes“, 3-2-1-Schläge; Endzeit gespeichert (übersteht Neustart) — [docs/Fahrplan.md Phase 2, Nachtrag 14 Verbesserungen](docs/Fahrplan.md); [mobile/src/components/rest-timer-bar.tsx](mobile/src/components/rest-timer-bar.tsx)
- Bei gesperrtem Handy nur lokale Mitteilungen (nicht sekundengenau); Live Activity/Sperrbildschirm-Anzeige fehlt (braucht Development Build) — [docs/Fahrplan.md 6.3](docs/Fahrplan.md); [mobile/src/data/notifications.ts](mobile/src/data/notifications.ts)

**Steigerungsvorschläge**
- Regeltabelle Fassung 1: doppelte Progression (oberes Ende → kleinster Gewichtsschritt 2,5 kg / KH 2 kg / KB 4 kg / 5 lb, sonst +1 Wdh.), halten, Stagnation nach 3 Einheiten → ca. 10 % leichter, Wiedereinstieg ≥14/28 Tage → −10/−20 %, Zeit-Übung +5 s, Körpergewicht → schwerere Variante; Vorschlag mit „eintragen“, abschaltbar, „ohne fachliche Prüfung“ — [mobile/src/domain/progression.ts](mobile/src/domain/progression.ts); [docs/Fahrplan.md 8.5](docs/Fahrplan.md); [mobile/src/i18n/de.ts `session.advice`](mobile/src/i18n/de.ts)

**Übungskatalog und Medien**
- 894 Übungen (780 Kraft, 114 Dehnen/Mobilität/Faszienrolle), je mit eigenem deutschen Namen, Kurzanleitung, englischen Suchbegriffen, Bewegungsmuster (16), Stufe, Messart, Ersatzübungen; Gliederung Muskelgruppe → Zielmuskel, Suche (mehrwortig, Synonyme wie „Squat“) und Gerätefilter; Kabel als drei Geräte — [docs/Uebungsliste.md](docs/Uebungsliste.md); [docs/Entscheidungen.md „Übungsumfang“](docs/Entscheidungen.md); [mobile/src/domain/exercise-catalog.ts](mobile/src/domain/exercise-catalog.ts), [mobile/src/app/training/exercises.tsx](mobile/src/app/training/exercises.tsx)
- Eigene Übungen anlegen und umbenennen, Verlauf bleibt — [docs/Fahrplan.md 3.0](docs/Fahrplan.md)
- **Keine Bilder/Videos ausgeliefert**: Medienverzeichnis ist leer (`EXERCISE_MEDIA: MediaEntry[] = []`), Ordner `mobile/assets/exercises/` enthält nur `LIESMICH.txt`; Anzeige-Infrastruktur existiert — [mobile/src/media/exercise-media.ts](mobile/src/media/exercise-media.ts); [docs/Anleitung_Uebungsbilder.md](docs/Anleitung_Uebungsbilder.md)

**Dehnen, Aufwärmen/Cool-down, HIIT, Intervall**
- Dehnroutinen fertig: „Morgens“, „Büro: Nacken und Schultern“, „Hüfte für Sitzberufe“; eigene Routinen versioniert; Halte-Timer mit Seitenwechsel; Sprachansage (expo-speech, abschaltbar); Pause/Weiter/Überspringen; übersteht Neustart — [mobile/src/domain/routines.ts](mobile/src/domain/routines.ts); [mobile/src/app/training/stretch.tsx](mobile/src/app/training/stretch.tsx), [run.tsx](mobile/src/app/training/run.tsx), [routine/[id].tsx](mobile/src/app/training/routine/[id].tsx); [docs/Fahrplan.md Phase 5](docs/Fahrplan.md)
- Aufwärmen (dynamisch, passend zu Muskelgruppen des Tages) und Cool-down (statisch) je Plantag abschaltbar, im Training angeboten — [mobile/src/data/migrations.ts (v6 `plan_day.warmup/cooldown`)](mobile/src/data/migrations.ts); [mobile/src/i18n/de.ts `session.warmup*`](mobile/src/i18n/de.ts)
- HIIT: fertige Programme „Bauch“ und „Ganzkörper“ je Anfänger/Fortgeschritten, eigene Abläufe (Arbeit 5–300 s, Pause, 1–20 Runden, Rundenpause), Sicherheitshinweis „kein gezielter Bauchfettabbau“; HIIT zählt als Trainingstag — [mobile/src/domain/routines.ts](mobile/src/domain/routines.ts); [mobile/src/app/training/hiit.tsx](mobile/src/app/training/hiit.tsx)
- Separater Intervall-Timer (Belastung/Pause/Runden), übersteht Neustart — [mobile/src/app/training/interval.tsx](mobile/src/app/training/interval.tsx)
- Beweglichkeits-Selbsttest Finger-Boden-Abstand + Beweglichkeitsziel — [mobile/src/data/migrations.ts (v6 `flexibility_test`)](mobile/src/data/migrations.ts)
- Protokoll aller Dehn-/HIIT-/Aufwärm-/Cool-down-Einheiten (`timed_session`), löschbar — [mobile/src/app/training/timed/[id].tsx](mobile/src/app/training/timed/[id].tsx)

**Cardio/Laufen**
- **Nicht vorhanden.** `run.tsx` ist der Ablauf-Runner für Dehnen/HIIT, kein Lauf-Tracker. Cardio ist als „nächster Schritt“ offen: Laufband, Rad, Crosstrainer, Rudergerät, Stepper, Seilspringen mit Dauer in Minuten, optional Strecke, ohne Kalorien-Gutschrift; Zeit-Sätze heute max. 600 s — [docs/Fahrplan.md Nachtrag „Lücken gefüllt“](docs/Fahrplan.md); [docs/Uebungsliste.md](docs/Uebungsliste.md); [mobile/src/data/migrations.ts (`target_seconds` ≤ 600)](mobile/src/data/migrations.ts)
- GPS-Läufe (RunnerUp) explizit „nicht unser Umfang“ — [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)

**Auswertung**
- Abschluss-Bildschirm: Dauer, Sätze, bewegtes Gewicht (Volumen), neue Bestleistungen (nur gegenüber früheren Trainings: mehr Gewicht → mehr Wdh. bei gleichem Gewicht → länger gehalten), Trainingswoche — [mobile/src/domain/summary.ts](mobile/src/domain/summary.ts); [mobile/src/app/training/summary/[id].tsx](mobile/src/app/training/summary/[id].tsx)
- Kraftverlauf je Übung (bester Satz je Training, Bestleistungen markiert) — [mobile/src/app/training/exercise/[id].tsx](mobile/src/app/training/exercise/[id].tsx)
- Wochensätze je Muskelgruppe; Verlauf-Liste — [mobile/src/i18n/de.ts `training.muscleTitle`](mobile/src/i18n/de.ts); [mobile/src/app/training/history.tsx](mobile/src/app/training/history.tsx)

**Plan-Import und Planassistent**
- Plan aus Datei oder eingefügtem Text, eigenes JSON-Format `myhealth-plan` v1 (Tage, Übungen, RIR, Hinweise, Wochentage, eigene Übungen, Dehn-Abläufe, optionale kcal-/Trinkziele); Vorschau; „als einzigen Plan“ (alte archiviert) oder dazu; Lucs Plan als Preset — [mobile/src/domain/plan-file.ts](mobile/src/domain/plan-file.ts); [mobile/src/app/training/import.tsx](mobile/src/app/training/import.tsx); [mobile/src/data/presets/lucs-training.myhealth.json](mobile/src/data/presets/lucs-training.myhealth.json). Kein Import aus Strong/Hevy/FitNotes-CSV (nur als Idee notiert: [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)).
- Planassistent (offline, ohne KI): Umbau auf 2–6 Tage, 20–180 min, Splits (Ganzkörper, Ober/Unter, PPL, Arnold, Ober/Unter+PPL), Kürzungsregeln, Konfliktanzeige, Vorschau je Übung, Rückgängig, Lieblingsübungen sperren, Geräte/Übungen „nicht verfügbar“, Vorlagen aus Ziel/Erfahrung/Geräten/Tagen/Zeit, Freitext-Wunsch lokal geparst mit `validateWish` — [docs/Fahrplan.md Phase 8](docs/Fahrplan.md); [mobile/src/domain/planner.ts](mobile/src/domain/planner.ts), [mobile/src/domain/wish.ts](mobile/src/domain/wish.ts); [mobile/src/app/training/assistant.tsx](mobile/src/app/training/assistant.tsx)

### Inferences
- Gegenüber Hevy/Strong fehlen typische Logger-Details: Satztypen (Warm-up/Drop/Failure), RPE/RIR je Satz, Supersätze/Zirkel, Notizen je Training/Übung, 1RM-Schätzung, Scheibenrechner, Ruhetimer pro Übung im Lock-Screen (Live Activity) und Übungsanimationen.
- Cardio-Logging ist eine dokumentierte, noch offene Lücke; Apple-Watch-/GPS-Tracking ist bewusst außerhalb des Umfangs.

### Gaps
- Ob Supersätze/Zirkel im Plan-Editor möglich sind, wurde nicht im Code bestätigt; das Schema (`plan_item` ohne Gruppierungsfeld) spricht dagegen.
- Das genaue Verhalten des Mini-Players auf iOS 26 (Tab-Leiste schrumpft) ist nur laut Fahrplan beschrieben, nicht auf dem Gerät verifiziert.

## Ernährung: Datenbank, Erfassungswege, Getränke, Ziele, Makros, Supplements, Präferenzen, Wochenansicht

### Takeaway
Vollständiges Kalorientagebuch mit eigenen Lebensmitteln, kostenlosem Open-Food-Facts-Barcode-Scan (inkl. QR/
DataMatrix), Online-Suche, Favoriten/Zuletzt/Vortag/Vorlagen, eigenen Rezepten, 124-Rezepte-Buch, Freitext-Eingabe
ohne KI, Getränken/Wasser, versioniertem Kalorien- und Makroziel, Allergenhinweisen und Supplement-Abhaken. Es fehlen
eine große generische Lebensmitteldatenbank (USDA/BLS), Mikronährstoffe (Zucker, Salz, gesättigte Fette, Vitamine),
Foto-Erkennung, Schnelleintrag nur kcal und Mahlzeitenplanung.

### Cited Findings
- Lebensmittel-Tabelle: Quellen nur `eigen` oder `off` (Open Food Facts); Nährwerte pro 100 g/ml: **kcal, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe** (Ballaststoffe seit v10); unbekannt = NULL statt 0; roh/gekocht; Portionsgröße; Favorit; archivierbar — [mobile/src/data/migrations.ts (v3, v9, v10)](mobile/src/data/migrations.ts). Keine Spalten für Zucker, Salz, gesättigte Fettsäuren oder Mikronährstoffe (Schema-Befund).
- Barcode-Scan per Kamera (EAN/UPC, UPC-A↔EAN-13-Varianten, QR/DataMatrix nach GS1 Digital Link „Sunrise 2027“), Taschenlampe, Vibration; Eintippen des Codes; Produkt bestätigen/korrigieren; Open Food Facts API v3 mit eigener Drosselung (12/8 pro Minute), Fehlerarten offline/429/503/nicht gefunden; Allergene/Spuren/vegan aus OFF — [mobile/src/data/off.ts](mobile/src/data/off.ts); [mobile/src/app/nutrition/scan.tsx](mobile/src/app/nutrition/scan.tsx); [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- Suche lokal + „Online suchen“ (OFF), Favoriten, „Zuletzt gegessen“, „Wie am Vortag“ (Mahlzeit kopieren), Vorlagen aus einer Mahlzeit — [mobile/src/data/nutrition.ts (`searchFoods`, `recentFoods`, `copyMeal`, `saveTemplateFromMeal`)](mobile/src/data/nutrition.ts); [docs/Fahrplan.md Phase 3](docs/Fahrplan.md)
- USDA-Grundnahrungsmittel **nicht gebaut** (API-Schlüssel bräuchte Server; Alternative mitgelieferte CC0-Liste offen) — [docs/Fahrplan.md Phase 3 „Offen“](docs/Fahrplan.md)
- Tagebuch: 4 Mahlzeiten (Vorschlag nach eigenen Essenszeiten), Tag vor/zurück (Nachtrag), Einträge ändern/verschieben/löschen, Nährwert-Schnappschuss, Zeitzone/Sommerzeit — [mobile/src/data/migrations.ts (`consumption_event`)](mobile/src/data/migrations.ts); [mobile/src/app/nutrition/index.tsx](mobile/src/app/nutrition/index.tsx), [entry/[id].tsx](mobile/src/app/nutrition/entry/[id].tsx)
- Eigene Rezepte versioniert mit Endgewicht und Portionen — [mobile/src/app/nutrition/recipe/[id].tsx](mobile/src/app/nutrition/recipe/[id].tsx), [recipe-log/[id].tsx](mobile/src/app/nutrition/recipe-log/[id].tsx)
- Rezeptbuch: 124 mitgelieferte Rezepte (60 + 64), Ziele Harte Diät/Diät/Erhalt/Aufbau/Masse mit kcal-Grenzen, Themen (Waffeln, Pancakes, Milchreis, Süßkartoffel, Meal Prep), Suche, Ernährungsweise-Filter, Start mit Coach-Ziel, Portionen skalieren, eintragen, „in meine Rezepte übernehmen“, Allergene aus Zutaten — [mobile/src/domain/recipe-book.ts](mobile/src/domain/recipe-book.ts), [recipe-book-data.ts](mobile/src/domain/recipe-book-data.ts), [recipe-book-more.ts](mobile/src/domain/recipe-book-more.ts); [mobile/src/app/nutrition/book/index.tsx](mobile/src/app/nutrition/book/index.tsx); [mobile/src/i18n/de.ts `book.*`](mobile/src/i18n/de.ts)
- „Essen in eigenen Worten“ (auch per Tastatur-Diktat): lokale Zerlegung in Menge/Einheit/Name, Treffer aus eigenen Lebensmitteln/Vorlagen/Rezepten, Buchung erst nach Bestätigung; Löffel/Glas/Tasse nicht geschätzt; ohne KI/Internet — [mobile/src/domain/food-text.ts](mobile/src/domain/food-text.ts); [mobile/src/app/nutrition/text.tsx](mobile/src/app/nutrition/text.tsx)
- Getränke im selben Eintrag wie Essen, Typen Wasser/Kaffee-Tee/Milch/Saft/Softdrink/Alkohol/Sonstiges; Wasser-Schnelltasten mit bis zu 8 eigenen Glasgrößen (50–2000 ml); Trinkziel (ml) editierbar, nie automatisch geändert — [mobile/src/data/migrations.ts (`drink_type`)](mobile/src/data/migrations.ts); [mobile/src/i18n/de.ts `nutrition.settings.glasses`, `drinkGoal`](mobile/src/i18n/de.ts)
- Kalorienziel versioniert (gültig ab), Quelle eigen/Rechner/Coach, Makroziele Eiweiß/Fett/KH/Ballaststoffe, Trainings-/Ruhetagskalorien je Wochentag — [mobile/src/data/migrations.ts (v10 `calorie_goal`)](mobile/src/data/migrations.ts)
- Tagesübersicht gegessen/Ziel/übrig mit Makros, „≥/≤“ bei unbekannten Werten, kein Training dazugerechnet; Wochen-/30-Tage-Ansicht mit Schnitt nur über vollständige Tage; Modus „Kalorienzahlen ausblenden“ — [mobile/src/app/nutrition/week.tsx](mobile/src/app/nutrition/week.tsx); [docs/Fahrplan.md 3.7](docs/Fahrplan.md); [mobile/src/i18n/de.ts `hideNumbers`](mobile/src/i18n/de.ts)
- Allergien (14 Hauptallergene) und vegetarisch/vegan in den Ernährungs-Einstellungen; ⚠-Hinweise, nie „allergenfrei“ — [docs/Fahrplan.md 9.4](docs/Fahrplan.md); [mobile/src/domain/diet.ts](mobile/src/domain/diet.ts); [mobile/src/app/nutrition/settings.tsx](mobile/src/app/nutrition/settings.tsx)
- Supplements: eigene Liste (Name, freiwillige Menge/Einheit), täglich abhaken „x von 7 Tagen“, optionale tägliche Erinnerung (max. 5), Namensvorschläge (50 Namen EU-Vitamine/-Mineralstoffe + gängige wie Kreatin), keine Empfehlungen; 23 problematische Stoffe nicht vorgeschlagen — [mobile/src/app/nutrition/supplements.tsx](mobile/src/app/nutrition/supplements.tsx); [mobile/src/domain/supplement-names.ts](mobile/src/domain/supplement-names.ts); [docs/Entscheidungen.md „Supplements“](docs/Entscheidungen.md)
- Essensfoto-Erkennung verschoben (KI/Kosten); Nährwert-Etikett-OCR nur als Idee — [docs/Fahrplan.md Phase 9 „Verschoben“](docs/Fahrplan.md); [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- Als Ideen notiert, nicht gebaut: Schnelleintrag nur kcal/Makros, „1 Packung“ als Menge, Tagesgrenze verschieben (Essen um 1 Uhr zum Vortag) — [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)

### Inferences
- Verglichen mit MyFitnessPal/Yazio ist die Lebensmitteldatenbank klein (nur eigene + OFF bei Bedarf online); generische deutsche Grundnahrungsmittel (BLS) fehlen ganz.
- Keine Mahlzeitenplanung/Einkaufsliste, kein Fasten-Timer, keine Mikronährstoff-Auswertung.

### Gaps
- Live-Test der OFF-Anbindung war in der Entwicklungsumgebung gesperrt; laut Code-Kommentar erst auf dem iPhone getestet ([mobile/src/data/off.ts](mobile/src/data/off.ts)) – Trefferquote (FOOD-009, 50 Produkte) nicht dokumentiert.

## Körper und Fortschritt: Gewicht, Maße, Fotos, Ziele, Schritte, Schlaf, Check-in, Coach, Rechner

### Takeaway
Gewicht mit 7-Tage-Tagesmittel-Trend und Diagramm, fünf Körpermaße, optionale lokale Fortschrittsfotos, versionierte
Ziele (Gewicht, Kraft, Gewohnheit, Beweglichkeit), manuelle Schritte, Schlaf im Check-in, Kalorienrechner (Mifflin-St
Jeor × PAL) und ein regelbasierter Coach ohne KI, der Ziel, Kalorien, Makros, Plan und Erinnerungen einrichtet und
wöchentlich ±100-kcal-Vorschläge mit Bestätigung macht. Kein Körperfett, keine automatische Schritt-/Schlafquelle.

### Cited Findings
- Gewicht: Nachtrag für frühere Tage, 7-Tage-Schnitt über Tagesmittel (≥4 Messtage), Veränderung zur Vorwoche, Diagramm mit Zielgewicht (gestrichelt) und Hochrechnung bei gleichem Tempo („keine Vorhersage“) — [docs/Fahrplan.md Phase 4, Nachtrag 14 Verbesserungen Punkt 5](docs/Fahrplan.md); [mobile/src/domain/weight.ts](mobile/src/domain/weight.ts); [mobile/src/components/weight-chart.tsx](mobile/src/components/weight-chart.tsx)
- Körpermaße Taille, Hüfte, Brust, Oberarm, Oberschenkel mit Textanleitung und Verlauf (kein Ziel) — [mobile/src/data/migrations.ts (`body_measurement`)](mobile/src/data/migrations.ts); [mobile/src/app/progress/measurements.tsx](mobile/src/app/progress/measurements.tsx)
- Körperfett **nicht gebaut** (Fachfreigabe nötig) — [docs/Fahrplan.md Phase 4 „Offen“](docs/Fahrplan.md)
- Fortschrittsfotos: freiwillig, Standard aus, Kamera/Mediathek, vorne/seite/hinten, Vergleich erstes vs. neuestes je Ansicht, beim Öffnen verdeckt, nur lokal — [mobile/src/app/progress/photos.tsx](mobile/src/app/progress/photos.tsx); [docs/Entscheidungen.md „Fortschrittsfotos“](docs/Entscheidungen.md)
- Ziele parallel, versioniert: Gewicht (abnehmen/halten/zunehmen, optional Zielgewicht), Kraft (Übung, Gewicht, Wdh.), Gewohnheit (Training/Trinken/Dehnen/Schritte pro Woche, ohne Serien/Strafe), Beweglichkeit (cm); kein Zieldatum/keine Prognose; kein Abnehmziel bei BMI < 18,5/sensibler Situation — [mobile/src/data/migrations.ts (v4, v6, v7)](mobile/src/data/migrations.ts); [mobile/src/app/progress/goal/[id].tsx](mobile/src/app/progress/goal/[id].tsx); [docs/Fahrplan.md 4.3](docs/Fahrplan.md)
- Schritte nur manuell als Tageswert (Quelle `manuell`; `apple_health` im Schema vorbereitet), Wochenschnitt, keine Kalorien-Gutschrift — [mobile/src/app/progress/steps.tsx](mobile/src/app/progress/steps.tsx); [mobile/src/data/migrations.ts (v7)](mobile/src/data/migrations.ts)
- Schlaf (Stunden, Erholung 1–5) nur als Kontext im Check-in erfasst, nie Kalorienfaktor — [mobile/src/data/migrations.ts (v9 `sleep_entry`)](mobile/src/data/migrations.ts); [mobile/src/app/progress/checkin.tsx](mobile/src/app/progress/checkin.tsx)
- Kalorienrechner: Mifflin-St Jeor × DGE-PAL (1,45/1,65/1,85/2,2, Sport +0,3), Abstand −500/−250/0/+250/+500, Untergrenze max(1200, Ruheenergie), nur 19–78 Jahre, Rechenweg sichtbar, „Schätzung“, Eiweiß als Bereich; „Übernehmen“ setzt Ziel ab heute — [mobile/src/domain/energy.ts](mobile/src/domain/energy.ts); [mobile/src/app/progress/calculator.tsx](mobile/src/app/progress/calculator.tsx); [docs/Fahrplan.md 4.4](docs/Fahrplan.md)
- **Coach (ohne KI)**: Einrichtung nach Erststart: Ziel Bulk/Cut/Erhalt → Gewicht, Größe, Geburtsmonat → Schritte, Gym-Tage, Schlaf → Bedarf mit Rechenweg (Schritte → Aktivitätsfaktor 1,4–1,8, +0,065 je Gym-Tag), Tempo-Vorschlag (Bulk +250, Cut −500, änderbar), Makros (Standard 1,6 g/kg Eiweiß/Cut 2,0, Fett 30 %; Lean/Bodybuilding Fett 20 %, 2,0/2,2 g/kg; oder eigene Werte), Ballaststoffe ≥30 g, Trainingstag +200/Ruhetag ≤ −300 kcal, Trainings-Wochentage, Plan behalten/vorschlagen/selbst eingeben, Erinnerung an Trainingstagen; „Heute“-Karte mit Trainings-/Ruhetag, Makro-Balken, „Tipps für heute“ nur auf Klick — [mobile/src/domain/coach.ts](mobile/src/domain/coach.ts); [mobile/src/app/progress/coach-setup.tsx](mobile/src/app/progress/coach-setup.tsx); [mobile/src/components/coach-today.tsx](mobile/src/components/coach-today.tsx); [docs/Fahrplan.md „Coach“ C1–C9](docs/Fahrplan.md)
- Wochen-Check-in: Gewichtsschnitt/Veränderung, Essen nur über vollständige Tage, Training gegen Plan, Schritte, Schlaf, Eiweiß/Ballaststoffe; höchstens ein Vorschlag ±100 kcal mit Bestätigung, nie bei sensibler Situation/unter 1200/Untergewicht; „Neu berechnen“ bei geänderten Schritten/Gym-Tagen; jede Entscheidung gespeichert — [mobile/src/domain/checkin.ts](mobile/src/domain/checkin.ts); [docs/Fahrplan.md 9.2, C9](docs/Fahrplan.md)
- Profil: Einheiten kg/lb, cm/in; Erfahrung, Trainingsziel, Geräte, Zeit pro Training, Bewegung im Alltag — [mobile/src/app/progress/profile.tsx](mobile/src/app/progress/profile.tsx); [docs/Entscheidungen.md „Einheiten“](docs/Entscheidungen.md)
- „Heute“-Startseite: Trainingswoche Mo–So als Hauptblock, Kennzahlen Kalorien/Trinken/Gewicht, Coach-Karte, Check-in wenn fällig — [mobile/src/app/index.tsx](mobile/src/app/index.tsx); [mobile/src/components/today-widgets.tsx](mobile/src/components/today-widgets.tsx); [docs/Fahrplan.md Nachtrag taste-skill](docs/Fahrplan.md)

### Inferences
- Der Coach ist ein deterministischer Regel-Assistent (Einrichtung + Tagesziel + wöchentlicher Vorschlag), kein Chat oder adaptiver Algorithmus à la MacroFactor; alle Werte vorläufig bis Fachprüfung.
- Ohne HealthKit fehlen automatische Schritte, Schlaf, Ruhepuls/HRV, Aktivitätsenergie – Nutzer müssen alles tippen.

### Gaps
- Keine Gamification/Streaks/Abzeichen – bewusst (siehe Ausschlüsse); ob Erfolgsfeedback darüber hinaus existiert, nicht weiter geprüft.

## Plattform: Mitteilungen, Health-Integration, Widgets, Watch, Sicherung, Sync, Onboarding, Sprache, Barrierefreiheit, Darstellung, Web

### Takeaway
Nur lokale Mitteilungen, Datei-Sicherung/-Wiederherstellung, App-Sperre, Hell/Dunkel und Deutsch. **Nicht vorhanden:**
Apple Health/Health Connect, Home-Widgets, Live Activities, Apple-Watch-App, Konto/Cloud-Sync, Android-Test,
weitere Sprachen. Web-Vorschau läuft (mit .web-Ersatzdateien), ist aber nur Testumgebung.

### Cited Findings
- Installierte native Module: expo-camera, -image-picker, -notifications (`enableRemoteNotifications: false`), -local-authentication, -sqlite, -file-system, -document-picker, -sharing, -speech, -haptics, -keep-awake, -localization, -updates u. a.; **kein HealthKit-/Health-Connect-, Widget-, Watch- oder StoreKit-Paket** — [mobile/package.json](mobile/package.json); [mobile/app.json](mobile/app.json). Kein `ios/`, `android/` oder `targets/` Ordner im Repo (Befund `ls mobile`).
- Erinnerungen: Training an gewählten Wochentagen/Uhrzeit, Trinken alle 1–4 h im Zeitfenster, Supplements; Timer-Hinweise bei gesperrtem Handy; alles Standard aus; iOS-64-Mitteilungen-Budget beachtet — [mobile/src/domain/reminders.ts](mobile/src/domain/reminders.ts); [mobile/src/app/more/notifications.tsx](mobile/src/app/more/notifications.tsx); [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- Apple Health (Schritte, Schlaf, Kalorien, Wasser, Makros) nur „vorbereitet“, kommt mit Development Build (`@kingstinct/react-native-healthkit` notiert); Health Connect erst Phase 11 — [docs/Fahrplan.md 6.2, C7](docs/Fahrplan.md); [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- Live Activity/AlarmKit, Face ID im Build, SQLCipher-Verschlüsselung offen (MacBook/Build) — [docs/Fahrplan.md Phase 6 „Offen“](docs/Fahrplan.md)
- Widgets/Live Activity als mögliche Pro-Kandidaten genannt — [docs/Monetarisierung_Entscheidung.md](docs/Monetarisierung_Entscheidung.md)
- Sicherung als Datei über Teilen-Menü (Fotos optional), Wiederherstellen mit Prüfung und Zusammenfassung in einer Transaktion, auch aus älteren Versionen; „Alle Daten löschen“ → Erststart. Kein CSV-/PDF-Export, kein Health-Export — [mobile/src/app/more/data.tsx](mobile/src/app/more/data.tsx); [mobile/src/domain/backup.ts](mobile/src/domain/backup.ts)
- App-Sperre Face ID/Gerätecode — [mobile/src/app/more/security.tsx](mobile/src/app/more/security.tsx); [mobile/src/data/app-lock.ts](mobile/src/data/app-lock.ts)
- Konten/Sync, Android + Google Play, weitere Sprachen, freier KI-Chat, Community erst „Phase 11 – Nach dem Start“ — [docs/Fahrplan.md Phase 11](docs/Fahrplan.md)
- Onboarding/Erststart: Volljährigkeit (nur ≥18), sensible Situation (Schwangerschaft, Essstörung, Untergewicht, Erkrankung; Option Zahlen ausblenden), Einheiten, dann Coach; animiertes 3D-Herz — [mobile/src/components/onboarding.tsx](mobile/src/components/onboarding.tsx); [docs/Fahrplan.md Coach, Nachtrag Punkt 4](docs/Fahrplan.md)
- Lokalisierung: nur `de.ts` (+ Übungsnamen `de-exercises*.ts`), typisierte Struktur „für weitere Sprachen“; Info.plist-Locales nur `de` — [mobile/src/i18n/](mobile/src/i18n/de.ts); [mobile/app.json](mobile/app.json); [docs/Entscheidungen.md „Sprache“](docs/Entscheidungen.md)
- Barrierefreiheit: große Schrift (Titel/Zahlen ×1,4 begrenzt), „Bewegung reduzieren“ respektiert (`useReducedMotion`), 63 `accessibilityLabel`-Vorkommen in app/components — [docs/Fahrplan.md Nachtrag Punkt 7](docs/Fahrplan.md); [mobile/src/components/set-check.tsx](mobile/src/components/set-check.tsx). Kein dokumentiertes VoiceOver-Audit.
- Darstellung: Wie iPhone/Hell/Dunkel unter Mehr → Darstellung — [mobile/src/data/appearance.ts](mobile/src/data/appearance.ts); [mobile/src/i18n/de.ts `more.appearanceOption`](mobile/src/i18n/de.ts)
- Web: Expo-Web-Vorschau mit `.web.ts`-Ersatz für App-Sperre, Sicherungsdateien, Mitteilungen, Fotos; plus Marketing-Startseite und Datenschutz/Impressum-Entwürfe — [mobile/src/data/*.web.ts](mobile/src/data/notifications.web.ts); [website/index.html](website/index.html)
- Hilfe/FAQ in der App (29 Fragen, Suche, offline); Feedback-Bogen (genutzt, fehlt, Zahlungsbereitschaft, andere Apps, NPS 0–10), per Teilen-Menü selbst verschickt — [mobile/src/app/more/help.tsx](mobile/src/app/more/help.tsx); [mobile/src/app/more/feedback.tsx](mobile/src/app/more/feedback.tsx); [docs/Freigabematrix.md](docs/Freigabematrix.md)
- Kein Absturzdienst (bewusst, Datenschutz), Absturzberichte über TestFlight — [docs/Fahrplan.md Phase 7](docs/Fahrplan.md)

### Inferences
- Die größten Plattform-Lücken gegenüber Wettbewerbern sind Apple-Health-Sync, Watch-App, Widgets/Live Activity und Android – alle hängen am Development Build (MacBook ab Ende November 2026).

### Gaps
- Ob der Release-Build tatsächlich Face ID nutzt und Mitteilungen zuverlässig sind, ist offen (Gerätetests T1–T10, S1–S3 laut [docs/Freigabematrix.md](docs/Freigabematrix.md)).

## Datenschutz, Recht und Monetarisierung: Was ist entschieden?

### Takeaway
Leitprinzip „kein Konto, kein Server, keine KI, keine Werbung/Tracking, alles lokal“; Netzwerk nur für Open Food
Facts (auf Aktion) und Expo-Update-Abfrage. Monetarisierung ist **nicht entschieden**; Empfehlung „kostenlos starten,
nach Pilot entscheiden“, nichts eingebaut. Veröffentlichung blockiert durch Fachprüfung, Rechtsprüfung, Gerätetests,
Konto/Name.

### Cited Findings
- Kein Konto/Server; Daten lokal; Daten verlassen das Gerät nur bei Barcode/Suche (OFF), Sicherung, Feedback (selbst ausgelöst) und automatisch bei Expo-Update-Abfrage (IP, technische Angaben); keine Werbung/Analyse/KI; nur lokale Mitteilungen — [docs/Datenschutz_Entwurf.md](docs/Datenschutz_Entwurf.md)
- Phase 9-Entscheidung: kostenfreie Version ohne gekaufte Medien, ohne KI, ohne Server — [docs/Entscheidungen.md „Phase 9“](docs/Entscheidungen.md)
- Monetarisierungsoptionen A kostenlos / B Pro-Abo / C Werbung + Pro / D Unterstützen; Empfehlung A; Werbung widerspricht Datenschutzversprechen; Pro-Kandidaten: Apple-Health-Sync, Widgets/Live Activity, weitere Programme, Langzeit-Statistiken, evtl. befristetes Umplanen; nie Daten hinter Bezahlschranke, nichts wegnehmen — [docs/Monetarisierung_Entscheidung.md](docs/Monetarisierung_Entscheidung.md)
- Preis-Hypothese 4 €/Monat, 30 €/Jahr (BUS-002) — [docs/Wettbewerbsvergleich.md](docs/Wettbewerbsvergleich.md)
- Freigabematrix: nicht einreichbar; blockierend R1 Datenverlust-Gerätetests, R3 Fachperson fehlt (Rechner, Coach, Check-in, Steigerung sind aktive Automatikregeln), R5 Expo-Updates behalten/abschalten, R6 Timer-Gerätetests, R7 Developer-Konto/App-Name/Datenschutz-URL, R8 Rechtsprüfung — [docs/Freigabematrix.md](docs/Freigabematrix.md)
- Automatische Prüfung gegen falsche Versprechen über alle App- und Store-Texte (kein „Bauchfett wegtrainieren“, „allergenfrei“, Heilversprechen, Superlative) — [mobile/src/domain/claims.ts](mobile/src/domain/claims.ts); [docs/Freigabematrix.md](docs/Freigabematrix.md)
- Zielgruppe nur Erwachsene ≥18; Rechner 19–78 Jahre — [docs/Entscheidungen.md „Zielalter“](docs/Entscheidungen.md)

### Inferences
- Jede Lücke, die KI, Server, Konto oder gekaufte Medien braucht (Foto-Erkennung, KI-Coach, Sync, Social, lizenzierte Übungsvideos), kollidiert mit getroffenen Grundsatzentscheidungen und müsste explizit neu entschieden werden.

### Gaps
- Keine Entscheidung zu Free/Pro-Grenze und Preis dokumentiert (Tabelle in [docs/Monetarisierung_Entscheidung.md](docs/Monetarisierung_Entscheidung.md) leer).

## Geplant/offen vs. bewusst ausgeschlossen (laut Docs) und frühere Wettbewerbsanalyse

### Takeaway
Offen geplant sind vor allem Cardio, Apple Health, Live Activity/Timer, SQLCipher, Übungsbilder, USDA-Liste, Android,
Sprachen, Sync; bewusst ausgeschlossen bzw. zurückgestellt sind KI, Essensfoto, Körperfett, Zielprognosen, Streaks,
Kalorien-Gutschrift fürs Training, Supplement-Empfehlungen, Werbung, Absturzdienst, GPS-Läufe, fremder AGPL/GPL-Code
und RepDB-/Kaufmedien. Der bisherige Wettbewerbsvergleich ist dünn (5 Apps, nur Preise, Sekundärquellen).

### Cited Findings
**Explizit geplant/offen (nicht gebaut)**
- Cardio (Laufband, Rad, Crosstrainer, Rudergerät, Stepper, Seilspringen) mit Minuten, optional Strecke — [docs/Fahrplan.md Nachtrag „Lücken gefüllt“](docs/Fahrplan.md)
- Development Build, Apple Health lesen (Schritte, Schlaf, Wasser), Live Activity/AlarmKit, Face ID, SQLCipher, Gerätetests — [docs/Fahrplan.md Phase 6 „Offen“](docs/Fahrplan.md)
- Eigene Übungsbilder (gleicher Stil, eigene/Higgsfield, sonst kaufen) — [docs/Entscheidungen.md „Übungsbilder“](docs/Entscheidungen.md); [docs/Fahrplan.md „Übungsbilder“](docs/Fahrplan.md)
- USDA-Grundnahrungsmittel als CC0-Liste (Entscheidung offen) — [docs/Fahrplan.md Phase 3](docs/Fahrplan.md)
- Bebilderte Messanleitung, versioniertes Trinkziel, ml/oz und ft — [docs/Fahrplan.md Phase 4 „Offen“](docs/Fahrplan.md)
- Bevorzugte Wochentage im Plan (heute Reihenfolge), Zeitschätzung aus eigenen Satzzeiten kalibrieren — [docs/Fahrplan.md Phase 8 „Offen“](docs/Fahrplan.md)
- Phase 11: Android + Google Play, weitere Sprachen, Konten/Sync mit Kontolöschung, freier KI-Chat, Community, Support/Updates — [docs/Fahrplan.md Phase 11](docs/Fahrplan.md)
- Ideen ohne Entscheidung: 1RM (Brzycki), Scheibenrechner, Schnell-Eintrag kcal, „1 Packung“, Tagesgrenze verschieben, Import aus Strong/Hevy/FitNotes-CSV, Körperkarte, Volumen je Übung, Lizenzanzeige, Etikett-OCR, „Käufe wiederherstellen“ — [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- Kap. 21 Modulkarte nennt im Gesamtumfang auch Übungsdemos, Essensfotos, KI-Erklärung, optionalen Sync, Werbung/Pro/Community — [docs/Kapitel_21_Ergaenzung_Module.md 21.1](docs/Kapitel_21_Ergaenzung_Module.md)

**Bewusst ausgeschlossen/zurückgestellt (mit Grund)**
- KI-Freitext/-Erklärungen, Essensfoto, gekaufte Medien/3D: kostet Geld oder braucht Server (Entscheidung 30.10.2026); Schnittstelle `validateWish` steht — [docs/Fahrplan.md Phase 9 „Verschoben“](docs/Fahrplan.md); [docs/Entscheidungen.md](docs/Entscheidungen.md)
- Körperfett-Schätzung: nur nach Fachfreigabe — [docs/Kapitel_21_Ergaenzung_Module.md 21.3](docs/Kapitel_21_Ergaenzung_Module.md)
- Zielprognose/Zieldatum: keine Erfolgsgarantie (COACH-004, GOAL-006) — [docs/Entscheidungen.md](docs/Entscheidungen.md)
- Streak-Trophäen: widerspricht „keine Streak-Bestrafung“ (TRACK-006, Essstörungsrisiko) — [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md); [docs/Kapitel_21_Ergaenzung_Module.md 21.5](docs/Kapitel_21_Ergaenzung_Module.md)
- Kalorien-Gutschrift für Training/Schritte: Doppelzählung, steckt im Aktivitätsfaktor (HEALTH-007) — [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- Supplement-Empfehlungen/Mengen/Marken/Wirkversprechen: Health-Claims-Verordnung, Nähe Medizinprodukt — [docs/Entscheidungen.md „Supplements“](docs/Entscheidungen.md)
- Werbung: widerspricht Datenschutzversprechen, TDDDG-Einwilligung nötig — [docs/Monetarisierung_Entscheidung.md](docs/Monetarisierung_Entscheidung.md)
- Eigener Absturzdienst: Datenschutz — [docs/Fahrplan.md Phase 7](docs/Fahrplan.md)
- RepDB-Medien/-Daten und wger-Import: Kosten bzw. wenig Mehrwert ohne Medien; AGPL — [docs/Entscheidungen.md](docs/Entscheidungen.md); [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- Fremder Code von Liftosaur/wger (AGPL) und OpenNutriTracker/Waistline/FoodYou (GPL): Lizenzzwang — [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- GPS-Läufe (RunnerUp), Fitbit/Strava/Garmin/Polar: nicht Umfang bzw. Phase 11+ — [docs/Repo_Vergleich.md](docs/Repo_Vergleich.md)
- Dehnen als eigener Tab: nein, Teil von Training — [docs/Entscheidungen.md](docs/Entscheidungen.md)
- Kinder/Jugendliche: Start nur ab 18 — [docs/Entscheidungen.md](docs/Entscheidungen.md)

**Frühere Wettbewerbsanalyse (docs/Wettbewerbsvergleich.md, 30.10.2026)**
- Verglichen: Hevy (Pro ca. 2,99 $/Monat, 23,99 $/Jahr, 74,99 $ lifetime; frei: unbegrenzt loggen, 4 Routinen, 7 eigene Übungen, 3 Monate Verlauf), Strong (4,99 $/Monat, 29,99 $/Jahr, 99,99 $; frei 3 Vorlagen), Fitbod (15,99 $/Monat, 95,99 $/Jahr, keine Gratisversion), MyFitnessPal (Premium 19,99 $/Monat bzw. 79,99 $/Jahr; Barcode nur bezahlt), Yazio (Preis nicht ermittelt) — überwiegend Sekundärquellen — [docs/Wettbewerbsvergleich.md](docs/Wettbewerbsvergleich.md)
- Hypothesen: Lücke = Kraftlog + Dehnen + HIIT + Ernährung in einer App, offline, ohne Konto; kostenloser Barcode-Scanner als Unterschied zu MFP; Datenschutz als Argument; adaptiver Planassistent als Alleinstellungsmerkmal; „keine echte Marktneuheit belegbar, nur Kombination“ — [docs/Wettbewerbsvergleich.md](docs/Wettbewerbsvergleich.md)
- Der Vergleich deckt nur Preise/Free-Tier ab, keinen Funktionsvergleich; keine Apps wie MacroFactor, Cronometer, Lose It!, FatSecret, Jefit, Gymshark, Apple Fitness+, Freeletics — [docs/Wettbewerbsvergleich.md](docs/Wettbewerbsvergleich.md)

### Inferences
- Für die Lückenanalyse sind die wichtigsten Kandidaten, die mit den Grundsatzentscheidungen vereinbar sind: Cardio-Logging, Apple Health, Live Activity/Widgets, 1RM/Scheibenrechner/Satztypen/RIR je Satz/Supersätze, Import aus Hevy/Strong, generische Lebensmittelliste (USDA/BLS), Mikronährstoffe, Schnelleintrag, Übungsbilder, weitere Sprachen, Android.
- Konfliktreiche Kandidaten (brauchen neue Entscheidung): KI-Foto-Logging, KI-Coach/Chat, Sync/Konto, Social/Community, gamifizierte Streaks.

### Gaps
- Fahrplan dokumentiert die neuesten Funktionen (Plan-Import, Rezeptbuch, vergessenes Training) nicht; Stand dafür nur aus Git/Code.
- Pilot-Feedback (Phase 7) liegt noch nicht vor; Nutzerwünsche sind daher nicht empirisch belegt.
