# Ausbauplan A1–A7 (nach der Wettbewerbsanalyse)

Grundlage: `docs/recherche/reports/Was Myhealth noch fehlt.md` (01.11.2026). Entscheidung Luc: alle Expo-Go-Schritte
umsetzen, **außer Übungsbildern** – die macht Luc selbst mit Higgsfield (siehe „Parallel“ unten).

**So arbeiten wir wie bisher:** Claude Code baut eine Phase → Tests, Lint und Browser-Durchlauf → Expo-Go-Link →
Luc testet auf dem iPhone → erst wenn „Fertig, wenn“ erfüllt ist, kommt die nächste Phase. Jede Phase ist ein eigener
Commit (oder mehrere), jede Datenbank-Änderung eine eigene Migration mit Test „alte Daten bleiben erhalten“.

**Grundsätze bleiben:** kein Konto, kein Server, keine KI-Kosten, keine Werbung, alles lokal. Neue Automatikregeln
(markiert mit **Fachprüfung**) laufen versioniert und werden gesammelt in `docs/Fachpruefung_Mappe.md` nachgetragen –
ein Termin mit der Fachperson statt vieler einzelner.

**Reihenfolge und warum:** A1 und A2 liefern die Trainingsdaten (RIR, Cardio), die A6 braucht. A3 und A4 machen das
Ernährungstagebuch vollständiger, was A7 genauer macht. A5 (Export/Import) steht in der Mitte, weil er die neuen
Felder aus A1–A4 gleich mit abdeckt.

| Phase | Inhalt | Datenbank | Fachprüfung |
|---|---|---|---|
| A1 | Logger-Paket: Satztypen, RIR pro Satz, Notizen, geschätztes 1RM, Scheibenrechner | v19 | nur Steigerung v2 (vorbereitet, aus) |
| A2 | Cardio: Geräte, Minuten, Strecke, Anstrengung | v20 | nein |
| A3 | Ernährung schneller: Schnelleintrag, Packung, Zucker/Fett/Salz, OFF-Test | v21 | nein |
| A4 | Grundnahrungsmittel offline (deutsch, mit Portionen) | v22 | nein |
| A5 | Export (CSV) und Import (Strong, Hevy, Gewicht) | – | nein |
| A6 | Bereitschaft Stufe 1: Morgen-Check, Anstrengung, Trainingslast, Ampel | v23 | **ja** |
| A7 | Adaptiver Energiebedarf aus Essen und Gewichtstrend | v24 | **ja** |

---

## A1 – Logger-Paket

**Ziel:** Alles, was Umsteiger von Hevy/Strong beim Loggen erwarten.

| # | Schritt |
|---|---|
| A1.1 | Migration v19: `set_log.set_type` (`arbeit` · `aufwaermen` · `drop` · `versagen`, Standard `arbeit`), `set_log.rir` (0–5, leer = nicht angegeben), `set_log.note`, `workout_session.note` |
| A1.2 | Im Training: Tippen auf die Satznummer öffnet die Satzart (Kürzel A / D / V statt Nummer); nach dem Abhaken optional RIR-Chips (0 · 1 · 2 · 3 · 4+), vorbelegt mit dem Ziel-RIR aus dem Plan |
| A1.3 | Notiz je Satz (kurz) und je Training (am Ende im Abschluss-Bildschirm und im Verlauf sichtbar) |
| A1.4 | Aufwärmsätze zählen nicht für Bestleistungen, Volumen und Steigerung; Drop- und Versagenssätze zählen fürs Volumen |
| A1.5 | „Aufwärmsätze vorschlagen“ je Übung: 2–3 Sätze aus dem Arbeitsgewicht (z. B. 50 % × 8, 70 % × 5, 85 % × 3), als Satzart Aufwärmen eingefügt, jederzeit löschbar |
| A1.6 | Geschätztes 1RM (Epley, nur bis 12 Wdh.) im Kraftverlauf als umschaltbare Linie und beim Abschluss („geschätzt“, kein Ersatz für einen Test) |
| A1.7 | Scheibenrechner am Gewichtsfeld: Stange (20 / 15 / 10 kg oder eigene), vorhandene Scheiben einstellbar, zeigt Scheiben je Seite |
| A1.8 | Steigerungsregel v2 vorbereitet: nutzt RIR (alle Sätze RIR ≥ 3 → früher steigern, RIR 0 bei verfehlten Wdh. → halten). **Bleibt aus**, bis die Fachperson sie freigibt; v1 läuft weiter |

**Tests:** Migration mit alten Daten; Bestleistung ignoriert Aufwärmsätze; Volumen mit Drop-Sätzen; Epley-Werte;
Scheibenrechner (z. B. 102,5 kg mit 20-kg-Stange → 25 + 15 + 1,25 je Seite); Sicherung enthält die neuen Felder.

**Fertig, wenn:** Luc ein ganzes Training mit Aufwärmsätzen, RIR und einer Notiz loggen kann, die Bestleistungen
stimmen und der Scheibenrechner im Gym richtig rechnet.

## A2 – Cardio

**Ziel:** Ausdauer gehört zum Training und zur Trainingslast – ohne Kalorien-Gutschrift (HEALTH-007).

| # | Schritt |
|---|---|
| A2.1 | Übungsart `cardio` im Katalog: Laufband, Fahrrad-Ergometer, Spinning, Crosstrainer, Rudergerät, Treppensteiger, Stepper, Seilspringen, Gehen, Laufen, Radfahren, Schwimmen (draußen = ohne GPS, nur Eintrag) |
| A2.2 | Migration v20: `cardio_log` (Training oder allein, Übung, Minuten, Strecke km optional, Ø-Puls optional, Anstrengung 1–10, Steigung/Stufe optional, Notiz) |
| A2.3 | Im Plan: Cardio-Übung mit Ziel-Minuten (bis 180 min; die 10-min-Grenze für Zeit-Sätze gilt nur für Kraft-Zeitübungen) |
| A2.4 | Im Training: Cardio-Zeile mit Stoppuhr oder direkter Eingabe; „Cardio eintragen“ auch ohne Plan aus dem Training-Tab |
| A2.5 | Wochenansicht: Cardio-Minuten je Woche, Hinweis auf die WHO-Orientierung (150–300 min moderat pro Woche) als Information, nicht als Ziel |
| A2.6 | Verlauf, Abschluss-Bildschirm und Wochenpunkte zählen Cardio-Einheiten mit |

**Tests:** Migration; Cardio ohne Training; Wochensumme; keine Änderung am Kalorienziel; Sicherung.

**Fertig, wenn:** Luc nach dem Krafttraining 15 min Laufband eintragen kann und es in Woche und Verlauf auftaucht.

## A3 – Ernährung schneller eintragen

**Ziel:** Weniger Tippen im Alltag, mehr Nährwerte aus den Daten, die schon da sind.

| # | Schritt |
|---|---|
| A3.1 | **Schnelleintrag**: nur kcal (Pflicht) und optional Eiweiß/KH/Fett, Name optional, Mahlzeit wählbar – für Kantine, Restaurant, „ungefähr“ |
| A3.2 | Migration v21: `food.package_amount` (aus OFF `product_quantity`), Knöpfe „1 Portion“ / „1 Packung“ / „½ Packung“ in der Mengenwahl |
| A3.3 | Migration v21: Zucker, gesättigte Fettsäuren, Salz je 100 g für Lebensmittel, Einträge und Rezept-Zutaten (aus OFF übernommen, im eigenen Formular eingebbar); Anzeige in Lebensmittel und Tagesübersicht, ohne Bewertung |
| A3.4 | Ganzen Tag kopieren (gestern → heute), zusätzlich zum vorhandenen „Wie am Vortag“ je Mahlzeit |
| A3.5 | Tagesgrenze einstellbar (z. B. Tag endet um 4 Uhr) – für Spätschicht und spätes Essen nach dem Training |
| A3.6 | „Nicht gefunden“ nach dem Scan: Formular mit Barcode vorausgefüllt, Hinweis „Etikett abtippen“ |
| A3.7 | **OFF-Test** `docs/OFF_Test.md`: 50 typische Produkte (Liste vorbereitet), Luc scannt im Supermarkt/zu Hause, Ergebnis: gefunden ja/nein, Werte richtig ja/nein → Trefferquote dokumentiert |

**Tests:** Schnelleintrag zählt in Tag und Woche; Packungsgröße aus OFF; neue Nährwerte bleiben „unbekannt“ statt 0;
Tagesgrenze verschiebt Einträge richtig; Migration und Sicherung.

**Fertig, wenn:** Luc ein Kantinenessen in unter 10 Sekunden einträgt und der OFF-Test dokumentiert ist.

## A4 – Grundnahrungsmittel offline

**Ziel:** „Apfel“, „Reis gekocht“, „Hähnchenbrust“ sofort finden – ohne Internet, mit deutschen Namen und Portionen.

| # | Schritt |
|---|---|
| A4.1 | Quelle und Lizenz klären: Bundeslebensmittelschlüssel (BLS, bevorzugt, wenn frei nutzbar) oder USDA FoodData Central (gemeinfrei, CC0) mit deutschen Namen. Ergebnis in `docs/Entscheidungen.md` |
| A4.2 | Kuratierte Liste mit ca. 400–600 Grundnahrungsmitteln: Obst, Gemüse, Getreide/Beilagen roh **und** gekocht, Fleisch/Fisch, Milchprodukte, Eier, Nüsse, Öle, Brot, Getränke; je kcal, Eiweiß, KH, Fett, Ballaststoffe, Zucker, gesättigte Fettsäuren, Salz |
| A4.3 | Portionen je Lebensmittel: Stück (1 Ei ≈ 60 g, 1 Apfel mittel ≈ 150 g), Scheibe, EL, TL, Tasse, Handvoll |
| A4.4 | Migration v22: Herkunft `basis` für Lebensmittel; mitgelieferte Liste als Datei in der App, beim Start eingespielt bzw. aktualisiert (eigene Änderungen bleiben unberührt) |
| A4.5 | Suche: Grundnahrungsmittel zuerst, dann eigene, dann OFF; Synonyme (Hähnchen/Hühnchen, Kartoffel/Erdapfel, Quark/Topfen) und Tippfehler-tolerant |
| A4.6 | Freitext („200 g Reis gekocht und 2 Eier“) und „In meine Rezepte übernehmen“ aus dem Rezeptbuch nutzen die Grundnahrungsmittel statt neue eigene anzulegen |

**Tests:** Plausibilität aller Werte (Energie passt zu den Makros, wie beim Rezeptbuch); keine doppelten Namen;
Portionen > 0; Suche findet Synonyme; Aktualisierung der Liste überschreibt keine eigenen Lebensmittel.

**Fertig, wenn:** Luc einen ganzen Tag mit frischen Lebensmitteln ohne Barcode und ohne Internet eintragen kann.

## A5 – Export und Import

**Ziel:** Vertrauen ohne Konto (deine Daten gehören dir) und leichter Umstieg von anderen Apps.

| # | Schritt |
|---|---|
| A5.1 | Export als CSV je Bereich: Trainingssätze (mit Satzart, RIR, Notiz), Cardio, Ernährungstagebuch, Gewicht, Maße, Schlaf/Morgen-Check, Ziele; über das Teilen-Menü (Dateien, Mail, AirDrop) |
| A5.2 | Die vorhandene Komplettsicherung (JSON) bleibt der Weg für Umzug und Wiederherstellung; Export ist zum Anschauen und Weiterverwenden (Excel, Numbers) |
| A5.3 | Import aus **Strong** (CSV) und **Hevy** (CSV): Vorschau mit Anzahl Trainings/Sätze, Zuordnung der Übungsnamen zum Katalog (automatisch, unklare per Auswahlliste), kg/lb, Doppelte (gleiches Datum + Übung) werden übersprungen |
| A5.4 | Import von Gewichtswerten (CSV mit Datum und Gewicht, z. B. aus Waagen-Apps) |
| A5.5 | Importierte Trainings landen als abgeschlossene Einheiten im Verlauf, Bestleistungen und Kraftverlauf werden daraus berechnet |

**Tests:** Beispieldateien im Strong- und Hevy-Format (nach deren dokumentiertem Aufbau), Umlaute und Kommazahlen,
lb → kg, Doppelte, unbekannte Übungen; Export → Excel-taugliches CSV (Semikolon, UTF-8 mit BOM).

**Fertig, wenn:** Ein Strong- oder Hevy-Export (falls Luc einen hat, sonst Testdatei) vollständig im Verlauf erscheint
und der Export in Numbers/Excel sauber aufgeht.

## A6 – Bereitschaft Stufe 1 (Fachprüfung)

**Ziel:** Jeden Morgen eine ehrliche Antwort auf „Wie hart heute?“ – aus Schlaf, Befinden und der echten
Trainingslast. Grundlage für Stufe 2 mit HRV und Ruhepuls nach dem Development Build.

| # | Schritt |
|---|---|
| A6.1 | Migration v23: `daily_check` (Tag, Schlaf von–bis oder Stunden, Schlafqualität 1–5, Energie 1–5, Muskelkater 1–5, Status normal/krank/verletzt/Pause, Notiz); vorhandene Schlafeinträge werden übernommen; Felder für HRV und Ruhepuls schon angelegt (leer bis Stufe 2) |
| A6.2 | **Morgen-Check** auf „Heute“: 4 Antippen, unter 15 Sekunden; optional Erinnerung am Morgen |
| A6.3 | **Anstrengung nach dem Training** (1–10, „Wie anstrengend war das Training insgesamt?“) im Abschluss-Bildschirm; Migration `workout_session.effort` |
| A6.4 | **Trainingslast** je Einheit = Dauer × Anstrengung (Kraft und Cardio); Last der letzten 7 Tage gegen den Wochenschnitt der letzten 28 Tage |
| A6.5 | **Ampel** (Regeln v1, versioniert): Vergleich mit dem eigenen Schnitt der letzten 28 Tage (Schlaf, Energie, Muskelkater) plus Laststeigerung; „krank“ = Pause. Immer mit Begründung und Rohwerten („6,0 h Schlaf, sonst 7,5 h · Last +45 %“) |
| A6.6 | **Angebot statt Automatik:** Gelb → „Heute je Übung 1 Satz weniger?“, Rot → „Heute leicht oder Dehnen?“ – als befristete Planfassung wie bei „Woche ausgefallen“; nichts ändert sich ohne Tippen |
| A6.7 | Verlauf: Bereitschaft, Schlaf und Last über 4 Wochen als Diagramm |
| A6.8 | Wortwahl als Trainingsempfehlung, nie als Befund (keine Diagnose, kein „Infekt erkannt“); Begriffe in die Claims-Prüfung aufnehmen |
| A6.9 | Regeln und Grenzwerte in die Fachprüfungs-Mappe |

**Tests:** Ampel für typische und Grenzfälle (wenige Daten → „noch am Lernen“, krank, Schlaf kurz, Last hoch);
Begründung immer vorhanden; Angebot ändert den Plan erst nach Bestätigung; Claims-Test.

**Fertig, wenn:** Luc zwei Wochen lang morgens den Check macht und die Ampel nachvollziehbar findet.

## A7 – Adaptiver Energiebedarf (Fachprüfung)

**Ziel:** Der echte Verbrauch, geschätzt aus dem, was gegessen wurde, und wie sich das Gewicht entwickelt –
statt nur Formel und ±100-Regel.

| # | Schritt |
|---|---|
| A7.1 | Schätzung über 14–28 Tage: Ø Aufnahme + (Änderung des Gewichtstrends × ca. 7.700 kcal/kg) ÷ Tage; Gewichtstrend geglättet, damit Wasser-Schwankungen nicht durchschlagen |
| A7.2 | Datenqualität: Tage können als „nicht vollständig erfasst“ markiert werden und zählen dann nicht; zu wenige Tage → Formel (Mifflin-St Jeor) bleibt, Hinweis „noch am Lernen“ |
| A7.3 | Anzeige: „Geschätzter Verbrauch 3.150 kcal (± 200)“ mit Rechenweg und Verlauf (Aufnahme gegen geschätzten Verbrauch je Woche) |
| A7.4 | Wochen-Check-in Regeln v2: Vorschlag = geschätzter Verbrauch + Ziel-Abstand (Aufbau/Diät/Halten), Änderung je Woche begrenzt, gerundet auf 50 kcal; weiter nur nach Bestätigung |
| A7.5 | Schutzregeln bleiben: Untergrenzen, kein Defizit bei Untergewicht, „sensible Situation“ blendet Zahlen aus |
| A7.6 | Regeln in die Fachprüfungs-Mappe; v1 bleibt wählbar, bis v2 freigegeben ist |

**Tests:** Künstliche Verläufe mit bekanntem Verbrauch (die Schätzung trifft nach 3–4 Wochen auf ± 5 %); Lücken
und unvollständige Tage; Wassersprünge; Grenzen und Schutzregeln.

**Fertig, wenn:** Nach 3–4 Wochen Tagebuch und Wiegen zeigt die App Luc einen geschätzten Verbrauch mit Rechenweg,
und der Check-in-Vorschlag ist nachvollziehbar.

---

## Parallel: Übungsbilder mit Higgsfield (Luc)

Die Medien-Struktur in der App ist fertig (`mobile/src/media/exercise-media.ts`, `docs/Anleitung_Uebungsbilder.md`).
Vorbereitung von Claude: Liste der 150 häufigsten Übungen (nach Plänen, Vorlagen und Lucs Plan), einheitliche
Stilvorgabe (Hintergrund, Blickwinkel, Format, Dateiname = Übungs-ID). Luc erzeugt die Bilder, Claude bindet sie ein.

## Danach: Development Build (ab MacBook)

Reihenfolge aus dem Bericht: Build-Grundlage → Live Activity (Pausentimer) → Apple Health lesen/schreiben →
Bereitschaft Stufe 2 (HRV, Ruhepuls, Schlafschuld) → Widgets → Etikett-Scan auf dem Gerät → Siri/Kurzbefehle →
Android + Health Connect → Apple Watch.
