# Gesamtprüfung aller übergebenen Unterlagen

Stand 28.10.2026. Alle Dateien wurden vollständig gelesen; wiederholte Standardtexte wurden maschinell
auf Gleichheit geprüft statt mehrfach gelesen. Ziel: ein gemeinsamer Ausgangsstand ohne Lücken.

## 1. Was die Dateien sind

| Datei | Inhalt | Ergebnis der Prüfung |
|---|---|---|
| `Fitness_Ernaehrung_Aktualisierte_Arbeitsgrundlage.pdf` (2×, 96 S.) | **Version 2.0** – Hauptdokument: Kap. 01–20, Anhang A Register, B Originalblöcke, C Quellen, D Tests, E Original | Beide Uploads byte-identisch. **Maßgebliche Fassung.** |
| `working_report.pdf` (76 S.) | Seiten 1–76 der Version 2.0 | Wortgleich mit v2.0, nur ohne Original-Archiv. Kein eigener Inhalt. |
| `Fitness_Ernaehrung_Arbeitsgrundlage.pdf` (80 S.) | **Version 2.1** – „Rekonstruktion“, weil die KI damals v2.0 nicht mehr fand | Gleiche Kapitelthemen, kürzer formuliert, **kein neuer Inhalt**. Register nur mit Pauschaltexten. Original-Archiv identisch mit v2.0. Kann ersetzt werden. |
| Original (in beiden PDFs als Archiv, 20 S.) | **Version 1.1 – deine ursprünglichen Anforderungen** aus dem Gespräch | Vollständig gelesen; ist die Quelle aller Wünsche. |
| `Fachregister.csv` | 147 Punkte, 11 Spalten | Wort für Wort identisch mit Anhang A der v2.0 (0 Abweichungen). |
| `Fachregister_Wiederhergestellt.csv` | 147 Punkte aus v2.1 | Gleiche IDs/Namen, aber Befunde durch Pauschaltexte ersetzt; keine Widersprüche zum Hauptregister. Überflüssig. |
| `Originalabdeckung.csv` | 98 Textblöcke des Originals | Alle Blöcke stammen aus dem Original und decken es ab. |
| `Referenztests.py`, `Testnachweise.json` | 24 Rechentests | Erneut ausgeführt: 24/24 bestanden. |
| `Dokumentpruefung.json` | Selbstprüfung v2.0 | Sagt selbst: keine visuelle Seitenprüfung, offene Praxisfragen nicht gelöst. |

## 2. Vollständige Funktionsliste (alle Quellen zusammengeführt)

Quelle: O = Original v1.1, V = Version 2.0, L = Wunsch vom 28.10. (Kap. 21).

**Ernährung & Kalorien**
- Lebensmittel per Barcode, Markenname, Suche (O) · Produktname, kcal, Protein, KH, Fett, Menge (O)
- Eigene Produkte/Korrekturen privat (V) · Favoriten, Mahlzeitenvorlagen (O) · Rezepte mit Endgewicht/Portionen (O)
- „Nutella-Brot“-Vorlage → später Freitext/Sprache (O) · Essensfoto mit korrigierbarer Schätzung (O)
- Ernährungstagebuch mit Frühstück/Mittag/Abend/Snack, Datum/Uhrzeit, Nachträge (O)
- **Kalorienrechner**: Bedarf aus Profil, Ziel, Aktivität, Schritte, Beruf; Zu-/Abnahme (O, ausgebaut L)
- **Kalorientracker**: Tagesübersicht gegessen/Ziel/übrig, Makros, Wochenansicht (O „Tagesübersicht“, ausgebaut L)
- Makroziele (O) · Essenszeiten/Anzahl Mahlzeiten an Alltag angepasst (O) · Allergien/Vorlieben (O)

**Getränke**
- Wasser + andere Getränke, eigene Glas-/Flaschengrößen, Schnelltasten (O)
- Kalorienhaltige Getränke einmal gezählt in beiden Ansichten (O)
- Trinkziel, gewichtsabhängig mit Min/Max gewünscht (O; Grenzen erst nach Fachprüfung)
- Erinnerungen mit Ruhezeiten (O)

**Training**
- Anfängereinstieg mit Orientierung und Übungserklärungen (O)
- Eigene Übungen, Plan erstellen oder bestehenden übernehmen (O)
- Splits: Ober/Unter, PPL, Arnold, weitere; 2–6 Tage; Umstellung z. B. 6→4, 5 Arnold→3 (O)
- **Adaptiver Planumbau** (Kernidee): Lieblingsübungen sperren, Vorschau, Bestätigung, Rückkehr, temporär/dauerhaft (O)
- Satzlogger: Gewicht, Wiederholungen, Sätze; letzte vergleichbare Leistung (O)
- Pausentimer 30 s, 3/4/5 min, frei; Auto-Start nach Satz; HIIT mit Belastung/Pause/Runden (O)
- Timer zuverlässig im Hintergrund, Sperrbildschirm-Anzeige (O)
- Ausgefallener Tag, blockiertes Gerät, Schmerzen, Progression (O)
- 3D-Übungsdemonstrationen (O; Clips oder interaktiv offen)
- **Dehnung & Mobilität**: Aufwärmen, Cool-down, eigene Routinen, Halte-Timer (L)

**Körper & Ziele**
- Ziele und Einheiten bearbeiten (O) · Körpergewichtsverlauf (O) · Trainingsverlauf (O)
- **Körperziele**: abnehmen/halten/zunehmen, Kraft, Maße, Beweglichkeit, Gewohnheiten (O + L)

**Coach & KI**
- Coach verbindet Planung, Ernährung, Fortschritt (O) · wöchentlicher Check-in + Änderungsvorschau (O)
- Schlaf als Erholungskontext (O) · freie KI-Unterhaltung (O, später)

**Health**
- Schritte über Apple Health / Health Connect, ohne Pflichtkonto (O)

**Daten & Konto**
- Offline, automatisches Speichern, Export, Löschung, Sicherung/Wiederherstellung (O)
- Optionales Konto und Gerätesynchronisierung (O) · Hilfe (O)

**Geschäft & Veröffentlichung**
- Kostenlose Basis + dosierte Werbung, Pro werbefrei; Abo ca. 4 €/Monat oder 30 €/Jahr als Hypothese (O)
- Community (O, später) · Pilot mit 5–10 Nutzern (O)
- Recht/Datenschutz von Anfang an, keine Secrets im Code, geprüfter Code vor Release (O)

## 3. Gefundene Lücken (Wunsch steht im Original, aber ohne eigenen Registerpunkt)

Neu im Register `register/Fachregister_Ergaenzung.csv` als UX-001 bis UX-010:

| ID | Lücke | Fundstelle |
|---|---|---|
| UX-001 | **Tagesübersicht/Startbildschirm** (Kalorien, Training, Getränke, Schritte auf einen Blick) | Original S. 3 „Tagesübersicht“ |
| UX-002 | **Körpergewichtsverlauf** – nur als Datenmodell `WeightEntry`, kein Fachpunkt | Original S. 3, 9 |
| UX-003 | **Einheiten kg/lb, cm/ft, ml/oz** wählbar | Original S. 3 „Ziele und Einheiten bearbeiten“ |
| UX-004 | **App-Sprache** – nirgends festgelegt, ob nur Deutsch oder mehrsprachig | fehlt komplett |
| UX-005 | **Hilfe/FAQ/Support im App** | Original S. 3 „Hilfe“ |
| UX-006 | **Sperrbildschirm-/Live-Anzeige des Timers** – nur als Randnotiz | Original S. 8; v2.0 Kap. 12 |
| UX-007 | **Trainings-Erinnerungen** – nur Trinkerinnerungen im Register | Original S. 3/15 (Erinnerungen) |
| UX-008 | **Kontolöschung in der App**, falls Konten kommen (Store-Pflicht) | Original S. 10 |
| UX-009 | **Store-Auffindbarkeit (Name, Beschreibung, Screenshots)** | Original S. 12 „Suchbarkeit“ |
| UX-010 | **Onboarding-Ablauf** für alle Nutzer (nicht nur Anfänger-Trainingsplan): Profil, Ziel, Health-Freigabe, Einheiten | aus Original S. 3/6/7 abgeleitet |

Bereits mit Kap. 21 ergänzt: Dehnung (STRETCH), Körperziele (GOAL), Kalorienrechner (CALC), Kalorientracker (TRACK).

## 4. Widersprüche und veraltete Angaben

| Thema | Original v1.1 | Version 2.0 | Gilt |
|---|---|---|---|
| RepDB-Umfang | 695 Übungen | 701 Übungen, freie Version 650, Starter 609 | v2.0 |
| Übungsdaten-Hauptkandidat | wger | RepDB Free/Standard, wger nur als Vergleich | v2.0 |
| Open Food Facts API | Version offen | v3 (3.6) empfohlen, v2 veraltet | v2.0 |
| Cality-App | Beschreibung abgerufen (Arabisch/Englisch, Foto/Barcode) | Seite nicht abrufbar | beides unbestätigt |
| Lyfta | Link nicht abrufbar | gleiche ID im kanadischen Store gefunden | v2.0 |
| Original S. 17 | „Alle 13 ursprünglichen PDF-Seiten“ | Original hat 20 Seiten | Zählfehler im Original, ohne Folgen |
| Version 2.1 | – | behauptet, v2.0 sei nicht mehr verfügbar | falsch, v2.0 liegt vor; v2.1 überflüssig |

Inhaltliche Widersprüche zwischen Hauptregister, Kapiteltexten und Tests: **keine gefunden**.

## 5. Was weiterhin nur du oder Fachleute klären können

Aus dem Plan (O5/O3/O4) plus Ergänzungen:
1. App-Name, Budget, Hardware (Mac? iPhone? Android-Gerät?), Programmiererfahrung, Zeit pro Woche
2. Zielalter (nur Erwachsene?), App-Sprache
3. 3D: frei drehbare Figur oder Video-Clips
4. Free/Pro-Grenze, Preis, Werbenetzwerk
5. Dehnung eigener Tab oder Teil von Training; Pilot-Zieltypen; Fortschrittsfotos
6. Fachperson für Training/Ernährung (Vorlagen, Progression, Kalorienfaktoren, Untergrenzen, Trinkgrenzen, Dehnwerte)
7. Rechtliche Prüfung vor Veröffentlichung (Betreiber, Datenschutz, Google-Kontotyp für Health-Apps)
