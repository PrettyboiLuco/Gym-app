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

## Feinschliff (umgesetzt)

| # | Was | Umsetzung |
|---|---|---|
| F1 | Brust als Fächer | Die drei Brustbänder haben gebogene Grenzen, die zur Achsel zusammenlaufen – wie die Fasern zum Oberarm – statt waagrechter Streifen. |
| F2 | Körperdetails | Schlüsselbein, Kniescheiben, vorderer Schienbeinmuskel, Daumen, Kniekehle und Achillessehne zart im Körperton (`BodyDetail`), unter den Muskeln, ohne Daten, nicht antippbar. Nur auf der großen Karte. |
| F3 | Fokus beim Antippen | Die übrigen Muskeln treten in 200 ms auf 55 % zurück, der gewählte bleibt voll und bekommt den Rand. Tippen daneben holt alle zurück. |

## Ideen aus anderen Apps (noch offen)

Gesichtet: Hevy (Satzverteilung je Muskel, Körperform umschaltbar), Fitbod (Erholung in % – bewusst nicht, Hausregel),
TeamBuildr und react-native-body-highlighter (linke/rechte Seite getrennt, Heranzoomen beim Antippen), MuscleSquad
(dunkler = häufiger trainiert).

| Idee | Nutzen | Aufwand |
|---|---|---|
| Körperform wählen (männlich/weiblich) | Persönlicher; Hevy bietet das an | Zweite Zeichnung mit eigenen Flächen; Treffer und Tests laufen mit |
| Vergleich zur Vorwoche | Pfeil/Zahl je Muskel „+4 Sätze“ zeigt Trend ohne Bewertung | Klein: zweite Woche laden, Differenz in der Liste |
| Durchschnitt über 4 Wochen | Glättet Ausreißer (Urlaub, Deload) | Klein: Zeitraum-Schalter, gleiche Zählung |
| Heranzoomen beim Antippen | Kleine Muskeln (Unterarm, Nacken) groß sehen | Mittel: Ausschnitt der Zeichnung animiert vergrößern |
| Links/rechts getrennt | Ungleichgewicht bei einseitigen Übungen sichtbar | Groß: Sätze müssten je Seite erfasst werden |

## Körperform und 3D-Wirkung (umgesetzt)

| # | Was | Umsetzung |
|---|---|---|
| K1 | Körperform wählbar | „Männlich · Weiblich“ in der Statistik, gespeichert (Einstellung der Muskelkarte); gilt auch für die kleine Karte auf „Heute“ und den Abschluss. Das Profil kennt kein Geschlecht – die Wahl betrifft nur die Zeichnung. |
| K2 | Weibliche Figur | Entsteht aus der männlichen durch eine weiche Verformung quer zur Mitte (Kopf 0,93, Schultern 0,86, Taille 0,84, Hüfte 1,07, Arme 0,9). Eigene Formen für Brust, geraden und seitlichen Bauch und Sägemuskel; langes Haar rahmt das Gesicht. Alle Flächen, das Antippen und die Tests gelten für beide Formen. |
| K3 | 3D-Wirkung | Licht von links oben: jeder Muskel bekommt einen runden Verlauf (heller Glanz oben links, dunklerer Rand), der Körper wird nach rechts dunkler, unter den Füßen liegt ein weicher Schatten. Die Verläufe beziehen sich auf jede Fläche selbst und bleiben bei Fokus und Überblendung mit der Fläche verbunden. |

## Neue Zeichnungen (umgesetzt)

Die selbst gebauten Kurven sahen zu sehr nach Code aus (Muskeln als Inseln mit gleich breiten Fugen, Bauch als Raster,
Puppenkopf, Glanz-Effekt, weibliche Figur nur verformt). Ersetzt durch die Körperzeichnungen aus
**react-native-body-highlighter** (MIT, kostenlos): von Hand gezeichnet, mit Händen, Gesicht, Frisur, ineinander
laufenden Muskeln und einer eigenen weiblichen Figur.

| Was | Umsetzung |
|---|---|
| Daten | `mobile/src/components/body-art.ts` – nur die Pfade je Körperteil, Lizenztext im Kopf; das Paket ist keine Abhängigkeit |
| Zuordnung | `muscle-figure.ts`: Körperteil → Kartenmuskeln und Gruppe (z. B. Brust → Brust oben/Mitte/unten, oberer Rücken → Latissimus, oberer Rücken, Rotatoren). Die Zeichnung ist gröber als unsere 24 Muskeln; die Liste unter der Karte zeigt weiter jeden Muskel einzeln |
| Farbe | Eine Fläche nimmt die höchste Stufe ihrer Muskeln; Kopf, Hände, Füße, Knie im Körperton, Haar dunkler |
| Antippen | Treffer über die Umrisse der Zeichnung (eigener Pfad-Leser für alle SVG-Befehle inkl. Bögen); gemeint ist der Muskel der Fläche mit den meisten Sätzen, die Liste wählt jeden Muskel einzeln |
| Entfallen | Glanz-Verläufe, Bodenschatten, Verformung zur weiblichen Figur, eigene Frisur, Ganzkörper-Umriss (Ganzkörper steht jetzt als Text unter der Karte) |
| Geblieben | Farbstufen, Überblenden mit Versatz, Fokus, Markierung, Drehung, Ansicht, Körperform, geschonte Bereiche, Erfolgsmoment |
| Lizenz in der App | Mehr → Über die App → „Zeichnungen und Lizenzen“ mit vollständigem MIT-Text |
