# Entscheidungsblatt (O5)

Getroffene Entscheidungen von Luc, mit Datum. Offene Punkte bleiben offen, bis Luc sie entscheidet.

| Thema | Entscheidung | Datum |
|---|---|---|
| Geräte | iPhone vorhanden; MacBook ab Ende November 2026; Windows-PC mit Claude Code | 28.10.2026 |
| Erfahrung | Keine klassische Programmiererfahrung; 4–5 Websites und ein angefangenes Spiel mit Claude Code gebaut | 28.10.2026 |
| Fokus erste Version | Dehnen, Kalorientracker, Kalorienrechner (Gewicht, Bewegung, Erhaltungskalorien), fertige und eigene Trainingspläne, Satzpausen-Timer, fertige HIIT-Abläufe (z. B. Bauch). Weitere Wünsche folgen. | 28.10.2026 |
| Sprache | Ziel: viele Sprachen. Start nur Deutsch; Übersetzungsstruktur von Anfang an, weitere Sprachen als Folgepunkt | 28.10.2026 |
| Bundle-ID (vorläufig) | `myhealth.system` – nach dem ersten Upload fest; Wechsel vor der Veröffentlichung = neue App (Tester ziehen per Sicherung um) | 30.10.2026 |
| App-Name (Arbeitstitel) | „Myhealth“; endgültiger Name folgt. Interne Kennungen (Expo-Projekt, Datenbank) bleiben unverändert | 30.10.2026 |
| App-Symbol | Seit 31.10.2026 (Optik Schritt 2): Herz bleibt das Motiv, jetzt als 3D-Herz in Lime-Chrom mit ausgeschnittener Pulslinie auf Schwarz, passend zur neuen Optik; Startbildschirm schwarz. Gebaut mit getlayers.ai „SVG to 3D“ (Preset Heart, Werte 1:1), gerendert mit three.js; Quelle und Erzeugung in `design/logo/` (`npm install && npm run build`). Selbst gezeichnet, keine fremden Bildrechte. Vorher (30.10.2026): anatomisches Herz auf Dunkelblau, Quelle bleibt in `mobile/assets/heart-icon.svg` | 31.10.2026 |
| Dehnung | Teil von „Training“, kein eigener Tab | 30.10.2026 |
| Übungsmedien zum Start | Name und kurze Textanleitung, keine Bilder; Bilder/Animationen später als eigene Bilder (siehe Phase 9) | 30.10.2026 |
| Fortschrittsfotos | Ja. Umsetzung: freiwillig, standardmäßig aus, nur auf dem Gerät, kein Upload/keine Werbung/keine KI, beim Öffnen verdeckt | 30.10.2026 |
| Übungsbilder | Später, alle im selben Stil und für jeden klar verständlich. Erst eigene Bilder (auch mit Higgsfield neu erstellt), reicht das nicht: kaufen. RepDB weglassen (kostet bzw. nicht nötig) | 30.10.2026 |
| Coach | Geführter Begleiter, vor der Veröffentlichung, ohne KI. Fragt beim Start Ziel, Schritte, Gym-Tage, Schlaf; gibt Bulk/Cut/Erhalt und Makros (Eiweiß, Fett, Kohlenhydrate, Ballaststoffe) vor, mit Ausrichtung Standard, Lean/Bodybuilding (weniger Fett, mehr Eiweiß und Kohlenhydrate) oder eigene Werte; Schritte statt Alltagsstufe, Schlaf nur Kontext; Tempo schlägt der Coach vor (änderbar); Trainingstage mehr, Ruhetage weniger Kalorien; Plan selbst eingeben oder vorgeben lassen; fragt nach Anbindungen; erinnert an Trainingstagen, Tipps nur auf Klick. Details: Fahrplan „Coach“ | 30.10.2026 |
| Supplements | Nur ein Tracker: erfassen, täglich abhaken, optional erinnern. Keine Empfehlungen, keine vorgeschlagenen Mengen, keine Marken, keine Wirkversprechen (Health-Claims-Verordnung, Nähe zum Medizinprodukt). Empfehlungen höchstens später mit Fachperson und Rechtsprüfung. Namensvorschläge beim Eintippen: Vitamine und Mineralstoffe der EU-Liste plus gängige unproblematische Stoffe; problematische (z. B. TUDCA, Melatonin, Ashwagandha) erst nach Rechtsprüfung (Anwalt Lebensmittelrecht), frei eintippbar bleiben sie | 31.10.2026 |
| Übungsumfang | Erst „ca. 450 ohne Exoten“ (439), dann erweitert auf Wunsch Luc: 800–1000, je Muskel alle gängigen Varianten → **894 Übungen** (780 Kraft, 114 Dehnen/Mobilität). Jede Variante einzeln beschrieben, eigene Namen, keine Bilder. Liste: Muskel → Zielmuskel, aufklappbar, mit Suche und Gerätefilter. Kabel als drei Geräte: Kabelzug (einzeln), Kabelturm-Paar (Crossover, zwei gegenüberliegende Türme), Doppelkabelzug (Functional Trainer). Vorlagen bevorzugen weiter die bewährte Startliste. Cardio folgt als eigener Schritt | 31.10.2026 |
| Optik | Ruhig und clean nach Lucs Vorlage (Bild 31.10.2026), Schwarz/Weiß/Grau mit Lime-Grün #C6F24E. Seit 31.10.2026 nach taste-skill (`.claude/skills/taste-skill/`, App-Stil „True-black flat“): Lime nur auf Daten, nie auf Knöpfen/Tabs; Karten nur durch Helligkeit abgesetzt; Hauptknopf invertierte Pille; Überschriften Manrope (höchstens 700), Satzschreibung; Bewegung nur als Rückmeldung, keine Eingangs-Animationen. Hell/Dunkel wie iPhone, umstellbar unter Mehr → Darstellung | 31.10.2026 |
| Phase 9 | Kostenfreie Version: keine gekauften Medien, keine KI, kein Server. Übungsbilder später als eigene Bilder (keine RepDB-/Kaufbilder). Coach nur als Vorschlag mit Bestätigung | 30.10.2026 |

## Vorläufig umgesetzt (Phase 4, 30.10.2026) – bitte bestätigen oder ändern

| Thema | Vorläufige Lösung |
|---|---|
| Einheiten | Standard kg/cm/ml; lb, Zoll (Körpergröße als ft/in) und oz in Profil wählbar; gespeichert immer kg/cm/ml (`mobile/src/domain/units.ts`, seit A10 am 01.11.2026 auch ml/oz und ft/in). |
| Pilot-Zieltypen | Gewicht + Kraftziel + Gewohnheit (Vorschlag aus Kap. 21.7). Maße als Verlauf; seit A10 (01.11.2026) je Messstelle mit optionalem Zielwert (`mobile/src/data/goals.ts`, `loadMeasureGoals`; Anzeige unter Fortschritt → Maße), aber kein eigener Zieltyp. |
| Zielprognose | keine (kein Zieldatum, keine Schätzung). **Widerspruch:** Das Gewichtsdiagramm zeigt eine Hochrechnung bei gleichem Tempo mit Datum (`mobile/src/components/weight-chart.tsx`) – Entscheidung offen, siehe „Noch offen“. |
| Zielalter | Start nur ab 18 (Ja/Nein beim Erststart); Rechner nur 19–78 Jahre. |
| Rechner-Werte | DGE-PAL-Stufen, Abstände ±250/±500, Untergrenze max(1200, Ruheenergie), BMI 18,5 – alles bis zur Fachprüfung vorläufig. |

## Vorläufig umgesetzt (Phase 8, 30.10.2026) – bitte bestätigen oder ändern

| Thema | Vorläufige Lösung |
|---|---|
| Übungsdaten | Selbst kuratiert (Bewegungsmuster, Stufe, Ersatzübungen, Kurzanleitungen). RepDB Free nicht importiert: Daten wären mit Namensnennung kommerziell nutzbar (MEDIA-002), bringen aber ohne Medien kaum Mehrwert; Entscheidung gemeinsam mit den Medien in Phase 9. wger nur Vergleich (AGPL, TECH-005/006). |
| Steigerung | Doppelte Progression (Wiederholungen, dann kleinster Gewichtsschritt), Stagnation nach 3 Einheiten, Wiedereinstieg ab 14 Tagen. Nur Vorschlag, abschaltbar. |
| Vorlagen | Ganzkörper 2–4 Tage, Ober/Unter 4, Ober/Unter+PPL 5, PPL 6 Tage; Sätze/Wdh./Pausen je Ziel (Tabelle in `domain/planner.ts`). |
| Befristung | „Nur diese Woche“ = bis Sonntag, „2 Wochen“ = 14 Tage; danach automatisch zurück. |
| Freitext | Lokal, ohne KI und ohne Internet; KI vorerst nicht (kostenfreie Version, Entscheidung 30.10.2026). |
| Beruf | Kein eigenes Feld – „Bewegung im Alltag“ im Profil enthält ihn bereits. |

## Vorläufig umgesetzt (Ausbauplan A4/A5, 01.11.2026) – bitte bestätigen oder ändern

| Thema | Vorläufige Lösung |
|---|---|
| Grundnahrungsmittel | **USDA SR28** (Standard Reference, Release 28, 2015) – als Werk der US-Regierung gemeinfrei, keine Namensnennung nötig (wird trotzdem in der App genannt). 441 Einträge, deutsch benannt, mit Synonymen, Portionen und 11 Vitaminen/Mineralstoffen. BLS (deutscher Bundeslebensmittelschlüssel) wäre fachlich näher an deutschen Produkten; er war aus der Bauumgebung nicht erreichbar und seine Nutzungsbedingungen sind noch ungeklärt. Bei US-Werten mit deutlicher Abweichung (z. B. Milch 3,25 statt 3,5 %, Magerquark, Räucherlachs) ist die Annäherung in `mobile/scripts/basis-foods/README.md` beschrieben. Wechsel auf BLS später möglich: Liste neu erzeugen, `BASIS_VERSION` erhöhen. |
| Allergene/Ernährungsweise der Grundnahrungsmittel | Nur eindeutige Fälle gesetzt; Brot, Wurst, Süßes, Saucen, Margarine, Wein/Bier: „keine Aussage“ statt Vermutung. |
| CSV-Export | Semikolon, Dezimalkomma, UTF-8 mit BOM (Excel in Deutschland). Je Bereich eine Datei. |
| Konstanz (E1) | Plan-Wochen statt Serien: geschafft bei x von y Trainingstagen, verpasste Wochen nehmen nichts weg, Status-Wochen zählen nicht, abschaltbar, bei sensibler Situation aus. |
| Import aus anderen Apps | Strong und Hevy (Trainings-CSV) sowie Gewichts-CSV. RPE wird als RIR = 10 − RPE übernommen. |

## Folgen für die Technik (Vorschlag)

- **Expo / React Native (TypeScript)** bleibt der Kandidat (Option B, Kap. 09): Es ist am nächsten an der
  Website-Erfahrung, läuft auf dem Windows-PC und wird auf dem iPhone per Expo Go getestet.
- **Bis das MacBook da ist:** Kernfunktionen bauen, die in Expo Go laufen (Tagebuch, Satzlogger, Timer im
  Vordergrund, lokale Datenbank, Barcode-Kamera). Apple Health und zuverlässige Hintergrund-Timer
  brauchen einen eigenen Development Build (TECH-002) und kommen danach.
- **Mit dem MacBook:** Xcode, Development Build auf dem iPhone, Health-/Timer-Tests (P1).
- **Android:** Kein Gerät vorhanden. Später mit Emulator auf dem MacBook oder einem günstigen Testgerät;
  für Google Play sind ohnehin 12 Tester über 14 Tage nötig (BUS-013).
- **Sprachen:** Alle sichtbaren Texte von Anfang an in eine deutsche Übersetzungsdatei statt direkt in den
  Code. Datum, Zahlen und Einheiten über die Spracheinstellung formatieren. Dann sind weitere Sprachen
  später nur neue Übersetzungsdateien statt eines Umbaus.

## Noch offen

Vor dem Pilot (Phase 7): **Apple Developer Program (99 $)** – wird abgeschlossen, sobald Luc am MacBook ist.


Endgültiger App-Name · Budget · Zeit pro Woche · Zielalter · Free/Pro-Grenze und Preis ·
Werbenetzwerk · Pilot-Zieltypen (vorläufig s. o.) · Einheiten (vorläufig s. o.) ·
Fachperson Training/Ernährung · Rechtsprüfung

Neu aus Phase 10 (30.10.2026, Vorlagen liegen bereit):
- **Modell zum Start** (kostenlos / Pro-Abo / Werbung / Unterstützen) – `docs/Monetarisierung_Entscheidung.md`,
  Empfehlung: kostenlos starten, nach dem Pilot entscheiden.
- **Expo-Updates in der Store-Version** behalten (in Datenschutzerklärung nennen, Expo-Vertrag) oder abschalten –
  `docs/Rechtspruefung_Mappe.md`, D2.
- **Anbieterangaben** für Impressum und Datenschutzerklärung (Name, Anschrift, E-Mail oder Impressums-Service).
- **Veröffentlichungsort** der Datenschutz-Seite (z. B. GitHub Pages) – `website/README.md`.

Aus dem Ausbauplan (`docs/Ausbauplan.md`, „Offene Entscheidungen von Luc“; E1 ist vorläufig umgesetzt, s. o.):
- **E2 Fasten-Timer** (16:8 usw.)? Empfehlung: nur „Kann“, bei „sensibler Situation“ ausblenden.
- **E3 GLP-1-Begleitmodus** (Eiweiß + Krafttraining zum Muskelerhalt)? Braucht Rechts- und Fachprüfung.
- **E4 Gemessenes Körperfett** von der Waage nur anzeigen (keine eigene Schätzung)? Wirkt auf D3 (Apple Health).
- **E5 Englisch** als zweite Sprache wann? Empfehlung: erst nach dem Deutschland-Start.

Aus dem Phase 1 Scan (`docs/Phase_1_Scan.md`, Abschnitte 3, 5, 6 und 8, 02.11.2026):
- **Gewichts-Hochrechnung mit Datum** behalten (dann mit Unsicherheitsbereich und Eintrag in die Fachprüfungs-Mappe)
  oder entfernen (wie oben „Zielprognose: keine“, GOAL-006).
- **Expo-Updates** für Pilot und Store behalten oder abschalten (Server in den USA) – siehe auch oben und D2.
- **Wöchentlicher Wechsel** in Lucs Plan (Chest Press ↔ Multipresse, Trizeps ↔ Curls): App wechselt automatisch
  oder es bleibt bei der Notiz (heute: nur Notiz).
- **UI-Stimmung U1–U6** (Lichtband, Wochenpunkte, Tageszeit-Stimmung, Muskelkarte in der Hero-Karte, Erfolgsmomente,
  leere Zustände): welche davon? Dazu: Darf Lime auch auf den Hauptknopf „Training starten“? Nichts davon ist gebaut.
- **App-Symbol:** einer der drei Vorschläge (Puls-Hantel, M-Puls, Ring + Herzschlag in `design/logo/vorschlaege/`)
  oder beim 3D-Herz bleiben; falls neu: flach oder als 3D gerendert.
- **Coach-Makros:** feste Verteilung behalten oder bis zur Fachprüfung nur Eiweiß als Bereich (COACH-005)?
- **Support/Notfallplan:** vor dem Pilot (wie die Arbeitsgrundlage verlangt) oder erst Phase 11?
