# Muskelkarte – Ausbau (Stand 02.11.2026)

Sechs Verbesserungen, je fünf Unterpunkte mit Umsetzung und Bewegung. Hausregel bleibt: Bewegung nur als Rückmeldung
(Antippen, Werte ändern sich, Erfolgsmoment am Trainingsende), nichts bekommt einen Auftritt beim Öffnen, bei
„Bewegung reduzieren“ springt alles sofort ans Ziel. Alle Zuordnungen von Übungen zu Muskeln sind Vorschläge ohne
Fachprüfung (wie die übrigen Übungsdaten, Phase 10.1).

## 1. Feinere Muskeln auf der Karte

| # | Unterpunkt | Umsetzung |
|---|---|---|
| 1.1 | Grundlage sind die vorhandenen Zielmuskeln | `domain/targets.ts` ordnet jeder Übung schon einen Zielmuskel zu (z. B. Bizeps, Trizeps, Unterarme). Die Karte färbt künftig je Zielmuskel statt je Muskelgruppe. Keine Datenbankänderung; eigene Übungen laufen über dieselben Regeln (Name und Bewegungsmuster). |
| 1.2 | Zeichnung aufgeteilt | Schulter in vorn / seitlich / hinten, Brust in oben / Mitte / unten, Trapez in Nacken (oberer Teil) und oberen Rücken (mittlerer und unterer Teil), Schulterblatt = Rotatorenmanschette, Hüfte vorne in Hüftbeuger und Abduktoren, hinten mittlerer Gesäßmuskel = Abduktoren. 24 Kartenmuskeln. |
| 1.3 | Rumpfstabilität | Hat keine eigene Fläche: Übungen wie Plank zählen auf geraden und seitlichen Bauch. |
| 1.4 | Liste nach Gruppen | Unter der Karte: je Muskelgruppe die Summe und darunter die Zielmuskeln („Arme 14 – Bizeps 8 · Trizeps 6“). |
| 1.5 | Abschluss fein, „Heute“ grob | Die Karte auf dem Abschluss-Bildschirm zeigt die Zielmuskeln. Die kleine Karte auf „Heute“ (54 × 116 px) bleibt bei Muskelgruppen – die feinen Flächen wären dort kleiner als ein Fingertipp. |

**Bewegung:** Wechselt die Woche, gleiten die Farben wie bisher in 240 ms. Der Versatz folgt jetzt der Höhe jeder
einzelnen Fläche (gemessen aus der Zeichnung), dadurch läuft die „Welle“ gleichmäßig von Kopf bis Fuß.

## 2. Mitbeteiligte Muskeln

| # | Unterpunkt | Umsetzung |
|---|---|---|
| 2.1 | Regeln je Bewegungsmuster | Z. B. Drücken waagrecht → vordere Schulter, Trizeps, Sägemuskel; Ziehen senkrecht → Bizeps, oberer Rücken, Unterarme; Kniebeuge → Gesäß, Adduktoren, unterer Rücken. Dazu Ausnahmen je Übung (Kreuzheben, Beinpresse, Dips, Liegestütze, Plank). |
| 2.2 | Zählweise | Hauptmuskel = 1 Satz, mitbeteiligt = ½ Satz. Die Stufen (1–5, 6–11, 12–19, 20+) bleiben. |
| 2.3 | Schalter | „Mitbeteiligte halb zählen“ in der Statistik, an oder aus, wird gespeichert. |
| 2.4 | Anzeige | Antippen zeigt „Trizeps: 9 Sätze, davon 4 mitbeteiligt“. In der Abschluss-Karte sind nur mitbeteiligte Muskeln heller als die Hauptmuskeln. |
| 2.5 | Absicherung | Tests: Jede Kraftübung hat mindestens einen Hauptmuskel (außer Ganzkörper), kein Muskel ist zugleich Haupt- und mitbeteiligter Muskel, alle Namen gibt es auf der Karte. Hinweistext unter der Karte erklärt die Zählung. |

**Bewegung:** Schalter umlegen → die Farben gleiten in 240 ms zum neuen Wert (gleiche Kurve wie beim Wochenwechsel).

## 3. Sägemuskel richtig zuordnen

| # | Unterpunkt | Umsetzung |
|---|---|---|
| 3.1 | Eigener Kartenmuskel | „Sägemuskel“ ist ein eigener Kartenmuskel statt Teil des Bauchs. |
| 3.2 | Wann er zählt | Mitbeteiligt bei Drücken (waagrecht und über Kopf), Liegestützen und Plank. Kein Hauptmuskel – es gibt keine Übung, die nur ihn trainiert. |
| 3.3 | Gruppe | In der Liste unter Brust. |
| 3.4 | Kleine Karte | Weggelassen (drei Zacken wären dort nur Rauschen). |
| 3.5 | Antippbar | Über den Fangradius (Punkt 4) trotz kleiner Fläche gut zu treffen. |

**Bewegung:** Wie alle Flächen; nach einem Drück-Training füllt er sich auf dem Abschluss-Bildschirm mit auf.

## 4. Leichter antippen

| # | Unterpunkt | Umsetzung |
|---|---|---|
| 4.1 | Treffer über die Zeichnung | Ein Tippen auf die Figur wird in Zeichnungs-Koordinaten umgerechnet; getroffen ist die Fläche, die den Punkt enthält. |
| 4.2 | Fangradius | Liegt der Finger auf einer Fuge oder knapp daneben, gilt die nächste Fläche im Umkreis von 6 Einheiten (≈ 7 px). Tippen außerhalb hebt die Auswahl auf. |
| 4.3 | Beide Ansichten | Die Auswahl gilt für den Muskel – liegt er vorne und hinten (Schulter seitlich, Waden), ist er in beiden Ansichten markiert. |
| 4.4 | Infozeile | Zielmuskel, Sätze, davon mitbeteiligt, dazu die Gruppe; liest VoiceOver vor (Live-Region). |
| 4.5 | Aufgeräumt | Nur noch ein Tipp-Bereich je Figur statt einer pro Fläche – das beseitigt auch die Warnungen im Web. |

**Bewegung:** Die Markierung zeichnet sich ein – der Rand wächst in 160 ms von 0 auf volle Breite, dazu eine leichte
Vibration. Erneutes Tippen auf denselben Muskel nimmt die Markierung zurück.

## 5. Ansicht wählen

| # | Unterpunkt | Umsetzung |
|---|---|---|
| 5.1 | Umschalter | „Beide · Vorne · Hinten“ über der Karte. |
| 5.2 | Größer | Eine einzelne Ansicht wird 1,4-mal so groß gezeichnet – mehr Details auf kleinen Handys. |
| 5.3 | Drehung | Beim Wechsel zwischen vorne und hinten dreht sich die Figur: Sie wird in 140 ms schmal, wechselt die Seite und wird in 140 ms wieder breit. |
| 5.4 | Gemerkt | Die Wahl wird gespeichert und gilt beim nächsten Öffnen. |
| 5.5 | Liste führt | Ein Muskel in der Liste unter der Karte lässt sich antippen: er wird markiert, und in der Einzelansicht dreht sich die Figur zur Seite, auf der er liegt. |

## 6. Geschonte Bereiche

| # | Unterpunkt | Umsetzung |
|---|---|---|
| 6.1 | Bereiche wählen | Beim Status „verletzt“ (Bereitschaft) lassen sich Bereiche ankreuzen: Nacken, Schultern, Brust, Arme, Rücken, Bauch, Hüfte, Gesäß, Beine, Waden. Freiwillig. |
| 6.2 | Speicherung | Ohne neue Tabelle im App-Zustand, an den laufenden Status gebunden – „Wieder fit“ beendet die Markierung automatisch. |
| 6.3 | Auf der Karte | Geschonte Flächen bekommen einen gestrichelten Rand in der Warnfarbe und werden etwas zurückgenommen; darunter „Gestrichelt: geschont seit …“. |
| 6.4 | Auf „Heute“ | Die kleine Karte zeigt die Strichelung. Trifft der heutige Plantag einen geschonten Bereich, steht darunter „Geschont: Schultern – Übungen dort nur, wenn es sich gut anfühlt“. |
| 6.5 | Später ändern | Während der Status läuft, lassen sich die Bereiche in der Bereitschaft jederzeit anpassen. |

**Bewegung:** Beim Erscheinen läuft die Strichelung einmal in 600 ms um die Fläche herum ein und bleibt dann stehen –
keine Dauerbewegung.

## Technische Notizen

- Logik ohne Oberfläche in `domain/muscle-map.ts` (Kartenmuskeln, Haupt- und mitbeteiligte Muskeln, Zählung).
- Zeichnung und Treffergeometrie in `components/muscle-figure.ts`, Darstellung und Bewegung in `components/muscle-map.tsx`,
  Werte der Bewegung in `constants/motion.ts` (`MapFade`).
- Im Browser setzt Reanimated animierte SVG-Farben nicht um; dort stehen die Farben direkt am Ziel (iPhone/Android gleiten).
- Sichtprüfung: `node scripts/muskelkarte/ansicht.mjs`.
