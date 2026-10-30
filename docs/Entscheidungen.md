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
| App-Symbol | Anatomisches menschliches Herz (rot, Gefäße rot/blau) auf dunkelblauem Verlauf; Startbildschirm in derselben Farbe (#13213A). Selbst gezeichnet (SVG-Quelle `mobile/assets/heart-icon.svg`), keine fremden Bildrechte | 30.10.2026 |
| Dehnung | Teil von „Training“, kein eigener Tab | 30.10.2026 |
| Übungsmedien zum Start | Name und kurze Textanleitung, keine Bilder; Bilder/Animationen später als eigene Bilder (siehe Phase 9) | 30.10.2026 |
| Fortschrittsfotos | Ja. Umsetzung: freiwillig, standardmäßig aus, nur auf dem Gerät, kein Upload/keine Werbung/keine KI, beim Öffnen verdeckt | 30.10.2026 |
| Übungsbilder | Später, alle im selben Stil und für jeden klar verständlich. Erst eigene Bilder (auch mit Higgsfield neu erstellt), reicht das nicht: kaufen. RepDB weglassen (kostet bzw. nicht nötig) | 30.10.2026 |
| Coach | Geführter Begleiter, vor der Veröffentlichung, ohne KI. Fragt beim Start Ziel, Schritte, Gym-Tage, Schlaf; gibt Bulk/Cut/Erhalt und Makros (Eiweiß, Fett, Kohlenhydrate, Ballaststoffe) vor; Schritte statt Alltagsstufe, Schlaf nur Kontext; Tempo schlägt der Coach vor (änderbar); Trainingstage mehr, Ruhetage weniger Kalorien; Plan selbst eingeben oder vorgeben lassen; fragt nach Anbindungen; erinnert an Trainingstagen, Tipps nur auf Klick. Details: Fahrplan „Coach“ | 30.10.2026 |
| Phase 9 | Kostenfreie Version: keine gekauften Medien, keine KI, kein Server. Übungsbilder später als eigene Bilder (keine RepDB-/Kaufbilder). Coach nur als Vorschlag mit Bestätigung | 30.10.2026 |

## Vorläufig umgesetzt (Phase 4, 30.10.2026) – bitte bestätigen oder ändern

| Thema | Vorläufige Lösung |
|---|---|
| Einheiten | Standard kg/cm; lb und Zoll in Profil wählbar; gespeichert immer kg/cm. ml/oz nicht. |
| Pilot-Zieltypen | Gewicht + Kraftziel + Gewohnheit (Vorschlag aus Kap. 21.7). Maße als Verlauf, nicht als Ziel. |
| Zielprognose | keine (kein Zieldatum, keine Schätzung). |
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
