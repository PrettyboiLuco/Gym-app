# App-Audit mit dem taste-skill (3. November 2026)

Alle 58 Bildschirme der Web-Vorschau wurden mit echten Demo-Daten (3 Wochen Training, Ernährung, Gewicht, Schlaf,
Schritte, Maße) dunkel und hell bei 390 px Breite fotografiert und nach den App-Regeln des taste-skill
(`references/app-screens.md`, Stil „True-black flat“) durchgesehen. Danach wurden die Befunde umgesetzt und alle
Bildschirme erneut fotografiert.

## App-weit – umgesetzt

| Befund                                                                                                                                    | Änderung                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rote Fehlerleiste „React does not recognize the `importantForAccessibility` prop“ auf jedem Bildschirm (Web), sie lag über der Tab-Leiste | Symbole (`Svg`) bekommen auf dem Web `aria-hidden` statt der nativen Namen (`components/a11y.ts`)                                                         |
| Ein/Aus als breite Segment-Leiste „An \| Aus“, mal „Aus \| An“ – 17 Stellen, uneinheitlich                                                | Neuer Baustein `Toggle`: Schalter-Zeile mit Titel, grauer Erklärung und Schalter rechts (an = Lime dunkel, fast Schwarz hell). Alle 17 Stellen umgestellt |
| „Bereiche der App“: eine Karte je Bereich, Titel und Segment-Beschriftung doppelt                                                         | Eine Karte mit Schalter-Zeilen, Erklärung direkt unter jedem Bereich                                                                                      |
| Roter „Löschen“-Rahmen in jeder Verlaufszeile (Gewicht, Schritte, Maße, Blutdruck, Beweglichkeit, Vorlagen) – Rot als Muster              | Ruhiges graues Papierkorb-Symbol; Rot erst in der Rückfrage („Abbrechen“ / „Löschen bestätigen“)                                                          |
| Verlaufszeilen als zusammengeklebter Text („02.11.2026 · 7571 · selbst eingetragen“), Zeilen brechen um                                   | Neuer Baustein `EntryRow`: Datum links, Wert rechts in gleich breiten Ziffern, Zusatz grau darunter                                                       |
| Deaktivierte Knöpfe als blasse graue Fläche mit dunkler Schrift (kaum lesbar)                                                             | Ruhige graue Fläche mit lesbarer grauer Schrift                                                                                                           |
| Segment-Schalter schnitt Beschriftungen ab („Frühst…“, „keine Ang…“)                                                                      | Segmente nur, wenn die Beschriftungen in die Breite passen; sonst Chips                                                                                   |
| Kartentitel und Auswahl-Beschriftung doppelt („Ziel / Ziel“, „Was ist dein Ziel?“ zweimal)                                                | `Choice hideLabel` – Beschriftung nur für Bildschirmleser                                                                                                 |
| Auswahllisten (Bewegung im Alltag, Pro-Version) als schwere umrandete Kästen                                                              | Zeilen mit Optionskreis und feiner Trennlinie                                                                                                             |
| Mehrzeilige Eingaben schnitten die zweite Zeile ab (Rezept-Import, Plan-Text, Feedback)                                                   | Mehrzeilige Felder sind höher, Text beginnt oben                                                                                                          |
| Textzeichen als Symbole (ⓘ ▴ ✕ ★ ✓)                                                                                                       | Gezeichnete Symbole (Info, Pfeil, Schließen, Stern, Haken)                                                                                                |
| Neue Knopfart                                                                                                                             | `quiet` (nur Schrift) für Nebenaktionen wie „Als Vorlage speichern“, „6 weitere“                                                                          |

## Einzelne Bildschirme – umgesetzt

- **Schritte:** „Letzte 7 Tage“ als große Zahl (Schnitt) und Säulen je Tag statt einer Textliste.
- **Wochenübersicht (Ernährung):** Säulen der letzten 7 Tage, Tageszeilen mit rechtsbündigen kcal.
- **Bereitschaft:** Vier Wochen als Raster (ein Feld je Tag in der Ampelfarbe) über der Liste.
- **Gewichtskurve:** keine Verlaufsfläche mehr (taste: keine Verläufe), zusätzlich das Datum der Mitte.
- **Rezeptbuch:** die vier Filtergruppen (~400 px) sind zugeklappt; eine Zeile nennt die aktiven Filter, die Rezepte
  stehen direkt unter der Suche.
- **Übungen:** Liste und Suche zuerst; das große Formular „Eigene Übung“ öffnet sich erst über „Eigene Übung anlegen“.
- **Plan und Routine bearbeiten:** ↑ ↓ und Entfernen als kleine Symbol-Knöpfe neben dem Namen statt dreier Pillen –
  lange Namen werden nicht mehr in schmale Zeilen gequetscht, „Entfernen“ ragt nicht mehr aus der Karte.
- **Wochenplan (Ernährung):** freie Tage gesammelt in einer Liste „Noch frei“ statt sieben gleicher Karten.
- **Getränke:** drei häufige Koffein-Getränke sofort, die übrigen über „6 weitere“ (statt 13 Chips).
- **Schnelleintrag:** Makro-Felder bündig, Platzhalter „–“ statt abgeschnittenem „unbekan…“.
- **Wissen:** statt Buch-Symbol und überall gleichem „ca. 1 min“ der erste Satz des Artikels als Vorschau; Artikel mit
  großer Überschrift.
- **Abschluss:** Bestleistungen ohne grüne Pfeil-Kreise (keine Symbol-Chips).
- **Statistik:** Bestleistungen als Zeilen mit rechtsbündigem Wert.
- **Beendetes Training:** „Dieses Training ist beendet. (abgeschlossen)“ → eine ruhige Zeile ohne Dopplung.
- **Barcode eintippen:** Kartentitel und Feldbeschriftung nicht mehr doppelt.

## Offen (bewusst nicht in dieser Runde)

- „Status setzen“ (Krank/Verletzt/Pause) und „Fertig“-Rückfragen nutzen noch den roten Rahmen der Lösch-Rückfrage.
- Planassistent: 14 Übungszeilen mit je drei Segmenten (frei/behalten/ersetzen) – funktioniert, ist aber lang.
- Geräteprofil und eigene Übung: viele Chips (Geräte, Bewegungsmuster); eine Suche oder Gruppierung wäre ruhiger.
- Fortschrittsfotos und Apple Health sind im Web nur Hinweistexte (keine Kamera, kein Health).

Prüfung: `npx tsc --noEmit`, `npx expo lint --max-warnings 0`, `npx prettier --check src`, `npx jest` (61 Suiten,
714 Tests) grün; `node .claude/skills/taste-skill/scripts/lint.mjs mobile/src --app` meldet nur noch Testdaten.
