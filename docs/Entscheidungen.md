# Entscheidungsblatt (O5)

Getroffene Entscheidungen von Luc, mit Datum. Offene Punkte bleiben offen, bis Luc sie entscheidet.

| Thema | Entscheidung | Datum |
|---|---|---|
| Geräte | iPhone vorhanden; MacBook ab Ende November 2026; Windows-PC mit Claude Code | 28.10.2026 |
| Erfahrung | Keine klassische Programmiererfahrung; 4–5 Websites und ein angefangenes Spiel mit Claude Code gebaut | 28.10.2026 |
| Fokus erste Version | Dehnen, Kalorientracker, Kalorienrechner (Gewicht, Bewegung, Erhaltungskalorien), fertige und eigene Trainingspläne, Satzpausen-Timer, fertige HIIT-Abläufe (z. B. Bauch). Weitere Wünsche folgen. | 28.10.2026 |
| Sprache | Ziel: viele Sprachen. Start nur Deutsch; Übersetzungsstruktur von Anfang an, weitere Sprachen als Folgepunkt | 28.10.2026 |
| Dehnung | Teil von „Training“, kein eigener Tab | 30.10.2026 |
| Übungsmedien zum Start | Name und kurze Textanleitung, keine Bilder; Bilder/Animationen nach Lizenzprüfung in Phase 9 | 30.10.2026 |
| Fortschrittsfotos | Ja. Umsetzung: freiwillig, standardmäßig aus, nur auf dem Gerät, kein Upload/keine Werbung/keine KI, beim Öffnen verdeckt | 30.10.2026 |

## Vorläufig umgesetzt (Phase 4, 30.10.2026) – bitte bestätigen oder ändern

| Thema | Vorläufige Lösung |
|---|---|
| Einheiten | Standard kg/cm; lb und Zoll in Profil wählbar; gespeichert immer kg/cm. ml/oz nicht. |
| Pilot-Zieltypen | Gewicht + Kraftziel + Gewohnheit (Vorschlag aus Kap. 21.7). Maße als Verlauf, nicht als Ziel. |
| Zielprognose | keine (kein Zieldatum, keine Schätzung). |
| Zielalter | Start nur ab 18 (Ja/Nein beim Erststart); Rechner nur 19–78 Jahre. |
| Rechner-Werte | DGE-PAL-Stufen, Abstände ±250/±500, Untergrenze max(1200, Ruheenergie), BMI 18,5 – alles bis zur Fachprüfung vorläufig. |

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

Vor dem Pilot (Phase 7): **App-Name, Bundle-ID, App-Symbol, Apple Developer Program (99 $).**


App-Name · Budget · Zeit pro Woche · Zielalter · 3D-Figur oder Clips · Free/Pro-Grenze und Preis ·
Werbenetzwerk · Pilot-Zieltypen (vorläufig s. o.) · Einheiten (vorläufig s. o.) ·
Fachperson Training/Ernährung · Rechtsprüfung
