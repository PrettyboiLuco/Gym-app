# Ausbauplan A1–A11 (nach der Wettbewerbsanalyse)

Grundlage: `docs/recherche/reports/Was Myhealth noch fehlt.md` (01.11.2026). Entscheidung Luc: alles umsetzen, was
ohne Development Build geht, **außer Übungsbildern** – die macht Luc mit Higgsfield (siehe „Parallel“).

**Vollständigkeit:** Jede Lücke aus dem Bericht ist unten genau einer Stelle zugeordnet – einer Phase A1–A11, dem
Development Build (D1–D12), einer offenen Entscheidung von Luc (E1–E5) oder „bewusst weglassen“ (W). Die Tabelle
„Abdeckung“ am Ende prüft das Punkt für Punkt. Was dort nicht steht, ist nicht vergessen, sondern war nicht im Bericht.

**So arbeiten wir:** Claude Code baut eine Phase → Tests, Lint und Browser-Durchlauf → Expo-Go-Link → Luc testet auf dem
iPhone → erst wenn „Fertig, wenn“ erfüllt ist, kommt die nächste Phase. Jede Datenbank-Änderung ist eine eigene
Migration mit Test „alte Daten bleiben erhalten“ und landet in Sicherung und Export.

**Grundsätze bleiben:** kein Konto, kein Server, keine KI-Kosten, keine Werbung, alles lokal. Neue Automatikregeln
(**Fachprüfung**) laufen versioniert und werden gesammelt in `docs/Fachpruefung_Mappe.md` nachgetragen – ein Termin
mit der Fachperson statt vieler einzelner.

## Stand

| Phase | Status |
|---|---|
| A1 | **fertig** (01.11.2026) – Datenbank-Version 19, 552 Tests; Gerätetest durch Luc offen |
| A2 | **fertig** (01.11.2026) – Datenbank-Version 20; Gerätetest durch Luc offen |
| A3 | **fertig** (01.11.2026) – Datenbank-Version 21, 566 Tests; OFF-Test (50 Produkte) durch Luc offen |
| A4 | **fertig** (01.11.2026) – Datenbank-Version 22, 441 Grundnahrungsmittel (USDA SR28); Gerätetest durch Luc offen |
| A5 | **fertig** (01.11.2026) – CSV-Export, Import Strong/Hevy/Gewicht, PDF-Bericht, KI-Zusammenfassung; Test mit echten Strong-/Hevy-Dateien durch Luc offen |
| A6 | **fertig** (01.11.2026) – Datenbank-Version 23, Regeln Bereitschaft v1 (Fachprüfung offen, Mappe Abschnitt I); 2 Wochen Morgen-Check durch Luc offen |
| A7 | **fertig** (01.11.2026) – Datenbank-Version 24, Schätzung Fassung 1, Check-in Fassung 2 wählbar (Fachprüfung offen, Mappe Abschnitt J); Test nach 3–4 Wochen Daten durch Luc offen |
| A8 | **fertig** (01.11.2026) – 5 Vorlagen, Deload v1 (Fachprüfung offen, Mappe Abschnitt K), Geräteprofile, Muskelkarte, Statistik; Gerätetest durch Luc offen |
| A9 | **fertig** (01.11.2026) – Datenbank-Version 25, Wochenplan, Einkaufsliste, Rezept per Link, Meal-Prep; Supermarkt-Test durch Luc offen |
| A10–A11 | offen |

| Phase | Inhalt | Fachprüfung |
|---|---|---|
| A1 | Logger-Paket: Satztypen, RIR pro Satz, Notizen, Supersätze, Übungsvarianten, 1RM, Scheibenrechner | Steigerung v2 (vorbereitet, aus) |
| A2 | Cardio | nein |
| A3 | Ernährung schneller eintragen | nein |
| A4 | Grundnahrungsmittel offline (inkl. Mikronährstoffe) | nein |
| A5 | Export, Import, Berichte | nein |
| A6 | Bereitschaft Stufe 1, Schlaf, Status | **ja** |
| A7 | Adaptiver Energiebedarf | **ja** |
| A8 | Programme und Auswertung im Training | Deload **ja** |
| A9 | Essen planen: Wochenplan, Einkaufsliste, Rezept-Import | nein |
| A10 | Körper, Rückmeldung und Motivation | nein |
| A11 | Qualität: Barrierefreiheit, Module, Aufräumen | nein |

**Reihenfolge und warum:** A1/A2 liefern RIR und Cardio für A6 und A8. A3/A4 machen das Tagebuch vollständiger für A7
und A9. A5 kommt nach A1–A4, damit der Export die neuen Felder gleich enthält. A10 setzt auf A6 (Konstanz, Monatsbilanz)
auf. A11 räumt am Ende auf.

---

## Schritt 0 – Freigabe-Blocker (Luc, läuft parallel)

Nicht Code, aber Voraussetzung für die Veröffentlichung (`docs/Freigabematrix.md`): Gerätetests Datenverlust und Timer
(R1, R6), Fachperson beauftragen (R3 – bekommt die Regeln aus A1, A6, A7, A8 gebündelt), Rechtsprüfung (R5, R8),
Developer-Konto, App-Name, Datenschutz-URL (R7).

## A1 – Logger-Paket

| # | Schritt |
|---|---|
| A1.1 | Migration: `set_log.set_type` (arbeit · aufwaermen · drop · versagen), `set_log.rir` (0–5), `set_log.note`, `workout_session.note` |
| A1.2 | Im Training: Tippen auf die Satznummer → Satzart (Kürzel A / D / V); vor einem Drop-Satz startet keine Pause |
| A1.3 | Nach dem Abhaken optional RIR-Chips (0 · 1 · 2 · 3 · 4+), vorbelegt mit dem Ziel-RIR aus dem Plan |
| A1.4 | Notiz je Satz und je Training (im Abschluss und im Verlauf sichtbar); Übungsnotiz aus dem Plan bleibt |
| A1.5 | Aufwärmsätze zählen nicht für Bestleistungen, Volumen und Steigerung; Drop/Versagen zählen fürs Volumen |
| A1.6 | „Aufwärmsätze vorschlagen“ (z. B. 50 % × 8, 70 % × 5, 85 % × 3), jederzeit löschbar |
| A1.7 | **Supersätze/Zirkel** – vorher auf dem Gerät prüfen, ob es heute schon geht. Sonst: Gruppierung in `plan_item` (Migration), im Training automatisches Weiterspringen, Pause erst nach der Runde; der Planassistent darf beim Kürzen Supersätze anbieten |
| A1.8 | **Übungsvarianten:** einseitig (Gewicht je Seite), unterstützt (Gegengewicht, z. B. Klimmzug-Maschine – weniger ist schwerer) und Körpergewicht mit Zusatzgewicht (Dip + 10 kg) |
| A1.9 | Geschätztes 1RM (Epley, bis 12 Wdh.) im Kraftverlauf umschaltbar und im Abschluss („geschätzt“) |
| A1.10 | Scheibenrechner: Stange (20 / 15 / 10 kg oder eigene), vorhandene Scheiben, Scheiben je Seite |
| A1.11 | Steigerungsregel v2 mit RIR vorbereitet, **aus** bis zur Fachfreigabe; v1 läuft weiter |

**Fertig, wenn:** Luc ein Training mit Aufwärmsätzen, RIR, Notiz und einem Supersatz loggt, die Bestleistungen stimmen
und der Scheibenrechner im Gym richtig rechnet.

**Umgesetzt (A1, 01.11.2026):** Satzart über die Satznummer (A/D/V-Kürzel, Hinweis je Art), kein Pausentimer vor
Drop-Sätzen; RIR-Frage in der Vollbild-Pause bzw. direkt unter dem Satz, Ziel-RIR aus dem Plan als Hinweis (bewusst
**nicht** vorausgewählt – sonst stünde ein Wert drin, den niemand bestätigt hat); Notiz je Satz und je Training
(Abschluss, Training, Verlauf); Aufwärmsätze zählen nirgends mit (Bestleistung, Volumen, Steigerung, Wochensätze,
Kraftziele, Kraftverlauf, letzte Leistung); Aufwärm-Vorschlag ab 20 kg; Supersätze im Plan-Editor und in
Plan-Dateien (`"superset": "A"`), im Training im Wechsel mit Pause nach der Runde, Dauer-Schätzung berücksichtigt
das; Gewichtsart je Übung (automatisch oder bei eigenen Übungen wählbar) mit eigener Eingabe-Hilfe, Volumen
(einseitig ×2, Gegengewicht 0), Bestleistung und Steigerung bei Gegengewicht in umgekehrter Richtung; neue
Katalog-Übung „Klimmzüge an der Maschine (Gegengewicht)“; geschätztes 1RM im Kraftverlauf und bei Bestleistungen;
Scheibenrechner mit Stange und vorhandenen Scheiben; Steigerungsregel v2 mit RIR gebaut und getestet, aber aus.

**Beim Lückencheck nach A1 gefunden und geschlossen:** Ziel-Zeile zeigte Aufwärm-Wiederholungen · Satzart-Auswahl
abgeschnitten · Übungsnamen im Plan-Editor brachen mitten im Wort · Chips im Satz-Feld unsichtbar · RIR-Frage fehlte
ohne Vollbild-Pause · Dauer-Schätzung ignorierte Supersätze · Scheiben nicht auswählbar · 1,25 kg wurde als „1,3“
angezeigt · Gewichtsart für eigene Übungen fehlte · Trainingsnotiz fehlte im Verlauf.
**Verschoben:** Der Planassistent bildet beim Kürzen noch keine Supersätze von selbst → A8.3.

## A2 – Cardio

| # | Schritt |
|---|---|
| A2.1 | Übungsart `cardio`: Laufband, Fahrrad-Ergometer, Spinning, Crosstrainer, Rudergerät, Treppensteiger, Stepper, Seilspringen, Gehen, Laufen, Radfahren, Schwimmen (ohne GPS, nur Eintrag) |
| A2.2 | Migration `cardio_log`: im Training oder allein, Minuten, Strecke optional, Ø-Puls optional, Anstrengung 1–10, Stufe/Steigung, Notiz |
| A2.3 | Im Plan: Cardio mit Ziel-Minuten (bis 180; die 10-min-Grenze bleibt nur für Kraft-Zeitübungen) |
| A2.4 | Im Training Stoppuhr oder direkte Eingabe; „Cardio eintragen“ auch ohne Plan |
| A2.5 | Cardio-Minuten je Woche, WHO-Orientierung (150–300 min moderat) als Information, nicht als Ziel |
| A2.6 | Verlauf, Abschluss und Wochenpunkte zählen Cardio mit; **keine** Kalorien-Gutschrift (HEALTH-007) |

**Fertig, wenn:** Luc nach dem Krafttraining 15 min Laufband einträgt und es in Woche und Verlauf auftaucht.

**Umgesetzt (A2, 01.11.2026):** Cardio als eigene Tabellen (`plan_cardio`, `cardio_log`) statt neuer Übungsart – die
Übungstabelle legt ihre Arten per CHECK fest, ein Neuaufbau hätte alle verknüpften Tabellen betroffen. 14 Aktivitäten,
Stoppuhr (läuft weiter, auch wenn die App zu ist), Minuten, Strecke mit Tempo, Stufe/Steigung, Ø-Puls, Anstrengung 1–10,
Notiz, Tag wählbar; im Plan je Tag mit Minuten und „am Anfang/am Ende“ (auch reine Cardio-Tage), im Training als
eigene Karte, „Cardio hinzufügen“ im laufenden Training; Training-Tab mit Wochenminuten und WHO-Orientierung; Verlauf,
Abschluss, Wochenpunkte und Gewohnheit „Training“ zählen Cardio mit; Plan-Dateien mit `"cardio"`; Sicherung enthält
beide Tabellen. Keine Kalorien-Gutschrift (Hinweis im Formular).

**Beim Lückencheck nach A2 gefunden und geschlossen:** Offene Einträge mit laufender Stoppuhr ohne Training waren
nirgends sichtbar → stehen jetzt oben in der Cardio-Karte · Abschluss eines reinen Cardio-Tags zeigte „0 Sätze, 0 kg“
→ zeigt jetzt Dauer, Cardio-Minuten und Strecke.

## A3 – Ernährung schneller eintragen

| # | Schritt |
|---|---|
| A3.1 | **Schnelleintrag:** nur kcal (Pflicht), optional Eiweiß/KH/Fett, Name optional |
| A3.2 | Migration `food.package_amount` (aus OFF), Knöpfe „1 Portion“ / „1 Packung“ / „½ Packung“ |
| A3.3 | Migration: Zucker, gesättigte Fettsäuren, Salz für Lebensmittel, Einträge, Rezept-Zutaten; aus OFF übernommen, im Formular eingebbar; Anzeige ohne Bewertung |
| A3.4 | Ganzen Tag kopieren (zusätzlich zu „Wie am Vortag“ je Mahlzeit) |
| A3.5 | Tagesgrenze einstellbar (z. B. Tag endet um 4 Uhr) |
| A3.6 | Nach erfolglosem Scan: Formular mit Barcode vorausgefüllt, Hinweis „Etikett abtippen“ |
| A3.7 | **Koffein** in mg: Schätzwert je Getränketyp (Kaffee, Espresso, Tee, Energy) beim Eintragen, änderbar; Tagessumme (Grundlage fürs Journal in A6) |
| A3.8 | **OFF-Test** `docs/OFF_Test.md`: 50 typische Produkte (Liste von Claude), Luc scannt, Trefferquote und Werte dokumentiert |

**Fertig, wenn:** ein Kantinenessen in unter 10 Sekunden eingetragen ist und der OFF-Test dokumentiert ist.

**Umgesetzt (A3, 01.11.2026):** Schnelleintrag (kcal Pflicht, Makros und Name freiwillig) über „Hinzufügen“; Zucker,
gesättigte Fettsäuren und Salz als Nährwerte (aus OFF, im Formular, in Produkt, Eintrag, Scan-Vorschau und
Tagessumme – ältere Einträge bleiben „unbekannt“); Packungsinhalt aus OFF bzw. Formular mit „1 Packung“/„½ Packung“;
„Ganzen Vortag übernehmen“ für einen leeren Tag; Ernährungstag endet wählbar zwischen Mitternacht und 5 Uhr
(gilt für Ernährung, Heute und Rezeptbuch); Hinweis „Etikett abtippen“ nach erfolglosem Scan (Barcode war schon
vorausgefüllt); Koffein: aus OFF je 100 g/ml, Schnellwahl mit 9 Getränken (EFSA-Richtwerte), Tagessumme mit
EFSA-Einordnung, Koffein nach 14 Uhr als Grundlage fürs Journal (A6); Testliste `docs/OFF_Test.md`.

**Beim Lückencheck nach A3 gefunden und geschlossen:** Tagesgrenze galt nur im Ernährungs-Tab („Heute“ zeigte nach
Mitternacht einen anderen Tag) · Warnung „Werte unbekannt“ wäre wegen fehlender Zucker-/Salzangaben bei fast allen
älteren Produkten erschienen → nur noch für kcal und Makros · Zucker/Salz/Koffein fehlten in Eintrag, Scan-Vorschau
und Produktansicht · alte Tests erwarteten die alte Form der Nährwerte.

## A4 – Grundnahrungsmittel offline

| # | Schritt |
|---|---|
| A4.1 | Quelle und Lizenz klären: BLS (bevorzugt, wenn frei nutzbar) oder USDA FoodData Central (CC0) – Ergebnis in `docs/Entscheidungen.md` |
| A4.2 | Kuratierte Liste mit ca. 400–600 Grundnahrungsmitteln, roh **und** gekocht, deutsch benannt |
| A4.3 | Je Eintrag kcal, Eiweiß, KH, Fett, Ballaststoffe, Zucker, gesättigte Fettsäuren, Salz **und die wichtigsten Vitamine/Mineralstoffe**, soweit die Quelle sie hat (Anzeige im Lebensmittel und als Tagessumme, ohne Bewertung) |
| A4.4 | Portionen: Stück (1 Ei ≈ 60 g), Scheibe, EL, TL, Tasse, Handvoll |
| A4.5 | Migration: Herkunft `basis`; Liste als Datei in der App, beim Start eingespielt/aktualisiert, eigene Lebensmittel bleiben unberührt |
| A4.6 | Suche: Grundnahrungsmittel → eigene → OFF; Synonyme (Hähnchen/Hühnchen, Quark/Topfen), tippfehler-tolerant |
| A4.7 | Freitext-Eingabe und „In meine Rezepte übernehmen“ nutzen die Grundnahrungsmittel |

**Fertig, wenn:** Luc einen Tag mit frischen Lebensmitteln ohne Barcode und ohne Internet eintragen kann.

**Umgesetzt (A4, 01.11.2026):** Quelle USDA SR28 (gemeinfrei; BLS war nicht erreichbar, Begründung in
`docs/Entscheidungen.md`). 441 Einträge in 15 Gruppen, roh und gekocht, deutsch benannt mit Synonymen, Portionen
(Stück, Scheibe, EL, TL, Tasse, Glas, Handvoll) und 11 Vitaminen/Mineralstoffen. Erzeugt mit
`mobile/scripts/basis-foods/` (Auswahl + Generator, nachvollziehbar). Migration 22: `catalog_id`/`catalog_origin`,
Suchbegriffe, Portionen, Mikros an Lebensmittel und Eintrag. Beim Start eingespielt bzw. aktualisiert; vom Nutzer
geänderte Einträge werden abgekoppelt und nie überschrieben. Suche: Favoriten → Grundnahrungsmittel → eigene →
Produkte, Synonyme, Umlaute, ein Tippfehler. Vitamine/Mineralstoffe im Lebensmittel und als Tagessumme mit Angabe,
wie viele Einträge Werte hatten (ohne Bewertung). Freitext nutzt Synonyme und Portionen („2 EL Haferflocken“,
„2 Eier“ = Größe M). „In meine Rezepte übernehmen“ verknüpft 73 von 82 Rezeptbuch-Zutaten mit Grundnahrungsmitteln.

**Beim Lückencheck nach A4 gefunden und geschlossen:** Butter, Butterschmalz, Kokosmilch, Zitronensaft, Brühe und
Salz fehlten · Butter und Schweineschmalz waren als „vegan“, Eiernudeln ohne Ei, Kartoffelpüree ohne Milch
eingestuft; Synonyme wie „Eierfrucht“ (Aubergine) oder „Mandelbutter“ lösten falsche Allergene aus → Regeln nur
noch am Hauptnamen, Brot/Margarine/Wein „keine Aussage“, Test für Tierprodukte · Milch, Buttermilch, Kefir jetzt in
ml · US-Tofu hatte deutlich weniger Eiweiß als deutscher → festerer Tofu · Zucker konnte über den Kohlenhydraten
liegen (Messwerte der Quelle) → begrenzt · Stevia-Pulver (0 kcal, 100 g KH) entfernt · Freitext fand Synonyme,
verwarf sie aber beim Bewerten · nach „Alle Daten löschen“ und nach Wiederherstellen einer älteren Sicherung
fehlten die Grundnahrungsmittel bis zum nächsten Start.

## A5 – Export, Import und Berichte

| # | Schritt |
|---|---|
| A5.1 | CSV-Export je Bereich (Sätze mit Satzart/RIR/Notiz, Cardio, Tagebuch, Gewicht, Maße, Schlaf/Morgen-Check, Ziele), Excel-tauglich (Semikolon, UTF-8 mit BOM), über das Teilen-Menü |
| A5.2 | Komplettsicherung (JSON) bleibt der Weg für Umzug und Wiederherstellung |
| A5.3 | Import aus **Strong** und **Hevy** (CSV): Vorschau, Übungsnamen automatisch zuordnen, unklare per Auswahl, kg/lb, Doppelte überspringen; Bestleistungen und Kraftverlauf rechnen sich daraus |
| A5.4 | Import von Gewichtswerten (CSV Datum + Gewicht) |
| A5.5 | **PDF-Bericht** für Trainer oder Arzt: Zeitraum wählbar; Gewicht, Maße, Training (Häufigkeit, Volumen, Bestleistungen), Ernährung (Ø kcal/Makros), Schlaf; teilbar, ohne Bewertung |
| A5.6 | **„Zusammenfassung für deine KI kopieren“:** strukturierter Text der letzten 4 Wochen in die Zwischenablage – Luc entscheidet selbst, wohin |
| A5.7 | **Trainer-Rückweg:** Trainer schickt einen Plan als `myhealth-plan`-Datei (gibt es schon), zurück geht der PDF-Bericht oder der Trainings-CSV |

**Offener Punkt:** echte Strong-/Hevy-Exportdateien zum Testen (von Luc, falls vorhanden – sonst nach dokumentiertem Aufbau).

**Fertig, wenn:** ein Strong- oder Hevy-Export im Verlauf erscheint, der CSV in Numbers sauber aufgeht und der
PDF-Bericht lesbar ist.

**Umgesetzt (A5, 01.11.2026):** „Mehr → Deine Daten“: CSV je Bereich (Training mit Satzart/RIR/Notizen, Cardio,
Tagebuch mit Zucker/Salz/Koffein, Gewicht, Maße, Schlaf, Ziele) – Semikolon, Dezimalkomma, UTF-8 mit BOM, über das
Teilen-Menü. „Aus anderen Apps übernehmen“: Strong und Hevy (Format wird erkannt, kg/lb, Satzarten, RPE → RIR,
Notizen, Dauer), reine Zeit-/Strecken-Sätze werden Cardio-Einträge, Übungsnamen werden mit Katalog und englischen
Namen abgeglichen – das Gerät in der Klammer entscheidet mit („Bench Press (Dumbbell)“ → Kurzhantel); unklare zum
Antippen, „eigene Übung anlegen“ oder „weglassen“; Doppelte (gleiche Startzeit) werden übersprungen. Gewichts-CSV
(Datum + Gewicht, kg oder lb; vorhandene Tage bleiben). Bericht 4/8/12/26 Wochen als PDF (expo-print) und als Text in
die Zwischenablage (expo-clipboard) – gleiche Zahlen, ohne Bewertung, leere Tage nicht als 0. Trainer-Rückweg als
Hinweis auf derselben Seite. Testdateien im Aufbau der Exporte: `mobile/src/domain/testing/import-samples.ts`.

**Beim Lückencheck nach A5 gefunden und geschlossen:** Dateiauswahl fehlte in der Browser-Vorschau (eigene
Web-Fassung) · Strong schreibt „0“ für nicht erfasste Wiederholungen/Sekunden → als „unbekannt“ gelesen ·
Kurzhantel- und Langhantel-Varianten wurden derselben Übung zugeordnet → Gerät aus der Klammer · Export-Bausteine
hingen an UI-Code und waren nicht testbar → getrennt · Texte wie „1 Cardio-Einträge“ → Zählform ohne Plural ·
Zeitraum-Schalter abgeschnitten → Chips · „Hähnchenbrustfilet (roh), roh“ in Suchlisten → Zustand nicht doppelt.

## A6 – Bereitschaft Stufe 1, Schlaf und Status (Fachprüfung)

| # | Schritt |
|---|---|
| A6.1 | Migration `daily_check`: Schlaf von–bis (oder Stunden), Schlafqualität 1–5, Energie 1–5, Muskelkater 1–5, Status, Notiz; bisherige Schlafeinträge werden übernommen; Felder für HRV/Ruhepuls angelegt (leer bis D4) |
| A6.2 | **Morgen-Check** auf „Heute“: 4 Antippen, unter 15 Sekunden; optionale Erinnerung |
| A6.3 | **Nach dem Training:** Anstrengung 1–10 (Migration `workout_session.effort`), optional Pump / Muskelkater / Gelenke je trainierter Muskelgruppe (1–3) |
| A6.4 | **Trainingslast:** Dauer × Anstrengung (Kraft und Cardio); 7 Tage gegen den Wochenschnitt der letzten 28 Tage |
| A6.5 | **Ampel** (Regeln v1): Vergleich mit dem eigenen 28-Tage-Schnitt (Schlaf, Energie, Muskelkater) plus Laststeigerung; immer mit Begründung und Rohwerten; wenige Daten → „noch am Lernen“ |
| A6.6 | **Angebot statt Automatik:** Gelb → „je Übung 1 Satz weniger?“, Rot → „leicht oder Dehnen?“, als befristete Planfassung |
| A6.7 | **Status krank / verletzt / Pause:** pausiert gemeinsam Erinnerungen, Wochenziele, Konstanz (A10) und Check-in-Vorschläge; Wiedereinstieg über die vorhandenen Regeln |
| A6.8 | **Schlaf:** Schlafschuld über 14 Nächte (gegen das eigene Schlafziel), Regelmäßigkeit der Bett-/Aufstehzeit als Kennzahl, kein eigener „Schlaf-Score“ |
| A6.9 | **Bettzeit-Erinnerung:** aus gewünschter Aufstehzeit und Schlafziel, im Mitteilungsbudget |
| A6.10 | **Journal mit Auswirkungen:** automatisch aus dem Tagebuch (Alkohol, Koffein nach 14 Uhr, letzte Mahlzeit spät, kcal), dazu frei ankreuzbare Faktoren; Auswertung „an Tagen mit … war deine Energie/Leistung im Schnitt …“ erst ab genug Daten, mit Hinweis auf Zufall |
| A6.11 | **Atemübung** (z. B. 4-7-8 / ruhiges Atmen) über den vorhandenen Ablauf-Runner |
| A6.12 | Verlauf: Bereitschaft, Schlaf und Last über 4 Wochen; Wortwahl als Trainingsempfehlung, nie als Befund; Begriffe in die Claims-Prüfung; Regeln in die Fachprüfungs-Mappe |

**Fertig, wenn:** Luc zwei Wochen lang morgens den Check macht und Ampel, Schlafschuld und Journal nachvollziehbar findet.

**Umgesetzt (A6, 01.11.2026):** Migration 23: `daily_check` (Schlaf von–bis/Stunden, Qualität, Energie, Muskelkater,
Faktoren des Vortags, Notiz, HRV/Ruhepuls leer bis D4) ersetzt `sleep_entry` (wird übernommen, auch aus alten
Sicherungen); `status_period`; `workout_session.effort` und Rückmeldung je Muskelgruppe. „Heute“: Morgen-Check mit
4 Antippen (jede Wahl sofort gespeichert), danach Trainings-Ampel mit Gründen, Rohwerten und eigenem Schnitt bzw.
„noch am Lernen“. Angebote nur für heute als befristete Planfassung (gelb 1 Satz weniger, rot halbe Sätze oder
Dehnen). Nach dem Training Anstrengung 1–10 und freiwillig Pump/Muskelkater/Gelenke je Muskelgruppe. Trainingslast
Dauer × Anstrengung (Kraft und Cardio). Status krank/verletzt/Pause: Trainingserinnerungen, Wochenziel und
Kalorienvorschlag ruhen; Hinweis auf den automatischen Wiedereinstieg. „Fortschritt → Bereitschaft“: Morgen-Check
im Detail (Uhrzeiten, Faktoren, Notiz), Status, Schlafschuld und Regelmäßigkeit, Journal mit Faktoren aus dem
Tagebuch, Verlauf von 4 Wochen. Erinnerungen für Morgen-Check und Bettzeit (aus Aufstehzeit und Schlafziel) zählen
im Mitteilungsbudget. Atemübung (ruhig 4/6 oder 4-7-8) als eigener Bildschirm. Claims-Regel „befund“; Regeln in der
Fachprüfungs-Mappe (I1–I12).

**Abweichungen vom Plan:** Die Atemübung läuft nicht über den Ablauf-Runner. Der braucht Übungen aus dem Katalog,
und für einen Atemtakt reicht ein eigener, schlichter Bildschirm. Das Journal wertet Energie, Schlafdauer und
Schlafqualität aus; „Leistung“ fehlt noch. Dafür braucht es pro Einheit einen Vergleichswert, der mit A8
(Auswertung im Training) kommt.

**Beim Lückencheck nach A6 gefunden und geschlossen:** Zweimal „1 Satz weniger“ hätte den Plan doppelt gekürzt →
nur einmal am Tag · eine befristete Wochenfassung wäre nach dem leichten Tag verloren gegangen → Rückkehr zu ihr ·
Schlaf aus dem Check-in und der Morgen-Check wären zwei Einträge pro Tag geworden → ein Eintrag je Tag · ältere
Sicherungen hätten keinen Schlaf mehr gezeigt → werden übernommen · Cardio im Training wäre doppelt in die Last
gezählt → nur Cardio außerhalb eines Trainings · Trainings-Ampel durfte das heutige Training nicht mitzählen → Last
bis gestern · Morgen-Check verschwand nach dem ersten Antippen → bleibt, bis alle vier Werte da sind · im Lernmodus stand
„Alles im Bereich deiner üblichen Werte“, obwohl es noch keinen Schnitt gab → stattdessen die heutigen Rohwerte.

## A7 – Adaptiver Energiebedarf (Fachprüfung)

| # | Schritt |
|---|---|
| A7.1 | Schätzung über 14–28 Tage: Ø Aufnahme + (Änderung des geglätteten Gewichtstrends × ca. 7.700 kcal/kg) ÷ Tage |
| A7.2 | Tage als „nicht vollständig erfasst“ markierbar (zählen nicht); zu wenige Tage → Formel bleibt, „noch am Lernen“ |
| A7.3 | Anzeige „Geschätzter Verbrauch 3.150 kcal (± 200)“ mit Rechenweg und Wochenverlauf Aufnahme gegen Verbrauch |
| A7.4 | Check-in Regeln v2: Vorschlag = Verbrauch + Ziel-Abstand, Änderung je Woche begrenzt, auf 50 kcal gerundet, nur nach Bestätigung; v1 wählbar bis zur Freigabe |
| A7.5 | **Monatsbericht** (Erweiterung des Wochen-Check-ins): Gewicht, Verbrauch, Training, Schlaf, Bestleistungen des Monats |
| A7.6 | Schutzregeln bleiben (Untergrenzen, Untergewicht, „sensible Situation“ blendet Zahlen aus) |

**Fertig, wenn:** nach 3–4 Wochen ein geschätzter Verbrauch mit Rechenweg erscheint und der Vorschlag nachvollziehbar ist.

**Umgesetzt (A7, 01.11.2026):**
- Migration 24: `diary_day`. Im Tagebuch lässt sich „Tag vollständig erfasst?“ auf „Nein“ stellen. Ein solcher Tag
  zählt dann weder im Wochenschnitt noch im Check-in, im Bericht oder in der Schätzung.
- Schätzung über 28 Tage mit Rechenweg („Ø Aufnahme − Trendänderung × 7.700 ÷ 21 Tage“) und Unsicherheit (± 200).
  Dazu kommt ein Wochenverlauf „Aufnahme gegen Verbrauch“. Bei weniger als 14 vollständigen Tagen oder fehlendem
  Gewichtstrend steht dort „noch am Lernen“.
- Check-in mit wählbarer Regel:
  - Fassung 1 (Gewichtsverlauf) bleibt Standard.
  - Fassung 2 (Verbrauch + Ziel-Abstand) ist wählbar: höchstens ±200 kcal je Woche, auf 50 gerundet, unter 100 kcal
    Unterschied kein Vorschlag.
  - Ohne Schätzung oder ohne Coach-Einrichtung gilt automatisch wieder Fassung 1.
- Monatsbericht im Check-in mit Gewicht, Maßen, Training (Top-Übungen mit geschätztem 1RM), Ernährung, Schlaf und
  Verbrauch, auch als PDF.
- Schutzregeln greifen auch in Fassung 2: Untergrenze, kein Senken bei Untergewicht, keine Zahlen bei sensibler
  Situation oder „ohne Zahlen“, kein Vorschlag bei Status krank/verletzt/Pause.

**Beim Lückencheck nach A7 gefunden und geschlossen:** Ein Vorschlag von +50 kcal wäre Rauschen → erst ab 100 kcal
Unterschied · die Wochenübersicht zeigte markierte Tage nicht als unvollständig · der PDF-Bericht (A5) zählte
Tage mit unbekannten oder markierten Werten in den Ernährungsschnitt → nur vollständige Tage, Getränke zählen mit ·
der Monatsbericht hätte im Modus „ohne Zahlen“ Kalorien gezeigt → Ernährung ausgeblendet · leerer Wochenverlauf
nur aus Strichen → erst sichtbar, wenn es erfasste Tage gibt.

## A8 – Programme und Auswertung im Training

| # | Schritt |
|---|---|
| A8.1 | **Programm-Vorlagen** als `myhealth-plan`-Dateien in der App: z. B. Ganzkörper 3×, Oberkörper/Unterkörper 4×, Push/Pull/Beine 6×, Kraft-Basis 3× (lineare Steigerung), Zuhause mit Kurzhanteln; eigene Namen (keine geschützten Programmnamen ohne Rechtsprüfung) |
| A8.2 | **Geplanter Deload** (Fachprüfung): alle 6–10 Wochen eine leichte Woche anbieten (halbe Sätze, gleiche Gewichte, RIR 3) – wie in Lucs Plan; als befristete Planfassung, nie automatisch |
| A8.3 | **Zeitschätzung aus eigenen Satzzeiten** statt fester 45 s; **bevorzugte Wochentage** im Planassistenten; Planassistent bietet beim Kürzen **Supersätze** an (z. B. Drücken + Ziehen), statt Übungen zu streichen (aus A1 verschoben) |
| A8.4 | **Geräteprofile** (Studio, Zuhause, Hotel): Planassistent und „Gerät belegt“ nutzen das gewählte Profil |
| A8.5 | **Muskel-Körperkarte** (SVG, vorne/hinten): Wochensätze je Muskelgruppe farbig – nur Menge, keine „Erholung in %“ |
| A8.6 | **Monats- und Jahresstatistik:** Trainings, Sätze, Volumen, Cardio-Minuten, Bestleistungen je Zeitraum; Volumen je Übung |

**Fertig, wenn:** Luc eine Vorlage übernehmen, ein Geräteprofil wechseln und seine Muskelkarte und Monatszahlen sehen kann.

**Umgesetzt (A8, 01.11.2026):**
- **Programm-Vorlagen** als Plan-Dateien: Ganzkörper 3×, Kraft-Basis 3× (lineare Steigerung über feste 5 Wdh.),
  Zuhause mit Kurzhanteln 3×, Ober/Unter 4×, Drücken/Ziehen/Beine 6× und Lucs Plan. Übernommen wird mit Vorschau
  über „Plan übernehmen“; ein Test prüft, dass jede Vorlage gültig ist und in etwa 75 Minuten passt.
- **Leichte Woche:** wird nach 8 Trainingswochen am Stück auf dem Trainings-Tab angeboten (halbe Sätze, RIR 3,
  bis Sonntag). „Später“ fragt nach einer Woche wieder.
- **Planassistent:**
  - bevorzugte Wochentage (auch für die Wochenpunkte, wenn der Coach keine hat)
  - beim Kürzen erst Supersätze aus Gegenspielern
  - Dauer aus der eigenen Satzzeit (auch im Plan-Editor)
  - Geräteprofil: Vorlage nur mit diesen Geräten, Umbau ersetzt alles andere
- **Geräteprofile** Studio, Zuhause und Hotel; die Geräte sind je Profil wählbar. „Gerät belegt“ zeigt nur
  Ersatzübungen, die mit dem aktiven Profil gehen.
- **Statistik & Muskelkarte:** Karte vorne/hinten mit Wochensätzen je Muskelgruppe (nur Menge, zusätzlich als
  Liste) und blätterbaren Wochen. Monats- und Jahreszahlen: Trainings, Arbeitssätze, Volumen, Cardio,
  Bestleistungen des Zeitraums und Volumen je Übung.

**Beim Lückencheck nach A8 gefunden und geschlossen:**
- Wurde eine Übung aus einem Supersatz gestrichen, blieb ihr Partner als „Supersatz allein“ zurück. Er wird jetzt
  wieder aufgelöst.
- Bei Drücken/Ziehen/Beine gibt es keine Gegenspieler-Paare. Dort wird wie bisher gekürzt, und der Test prüft das
  bei Ganzkörper.
- Der Plan-Editor rechnete weiter mit 45 s je Satz und wich damit vom Assistenten ab.
- Eine leichte Woche während einer laufenden befristeten Fassung kehrt zu dieser zurück.

## A9 – Essen planen

| # | Schritt |
|---|---|
| A9.1 | **Wochenplan aus dem Rezeptbuch:** Mahlzeiten auf Tage legen (von Hand oder Vorschlag passend zu kcal-/Eiweißziel und Ernährungsweise); Tagessumme gegen Ziel |
| A9.2 | Geplante Mahlzeit mit einem Tippen als gegessen eintragen |
| A9.3 | **Einkaufsliste** aus dem Wochenplan: Zutaten zusammengefasst und nach Abteilung sortiert, abhakbar, teilbar |
| A9.4 | **Rezept-Import per Link:** Webseite laden, schema.org-Rezept lesen, Zutaten mit Grundnahrungsmitteln (A4) abgleichen, unklare per Auswahl |
| A9.5 | Meal-Prep: Portionen eines Rezepts über mehrere Tage verteilen |

**Fertig, wenn:** Luc für eine Woche plant, die Einkaufsliste im Supermarkt nutzt und ein Rezept per Link übernimmt.

**Umgesetzt (A9, 01.11.2026):**
- **Datenbank:** Migration 25 mit `meal_plan` (Rezeptbuch oder eigenes Rezept, Portionen, Verweis auf den
  Tagebucheintrag) und `shopping_check`.
- **„Ernährung → Wochenplan“:**
  - Wochen blättern; sonntags öffnet direkt die kommende Woche.
  - „Freie Plätze vorschlagen“ füllt ab heute Frühstück, Mittag, Abend (Snacks wahlweise) aus dem Rezeptbuch,
    passend zu Ernährungsweise und Allergien.
  - Die Portionen (½–2) treffen den Anteil am kcal-Ziel; zu wenig Eiweiß und Wiederholungen binnen 2 Tagen kosten
    Punkte. Ohne Zufall: gleiche Eingabe ergibt gleichen Vorschlag.
  - Tagessumme gegen das Ziel; im Modus „ohne Zahlen“ ausgeblendet.
  - „Gegessen“ trägt mit einem Tippen ein (nur bis heute). Wird der Tagebucheintrag gelöscht, ist der Plan-Eintrag
    wieder offen.
  - Eigene Rezepte, auch per Link übernommene, lassen sich ebenfalls einplanen.
- **Rezeptansicht:** „Für diesen Tag planen“ und Meal-Prep: 2–5 Portionen auf aufeinanderfolgende Tage, je 1
  Portion zur gleichen Mahlzeit.
- **Einkaufsliste:**
  - aus allen noch nicht gegessenen Mahlzeiten ab heute; gleiche Zutaten über die Grundnahrungsmittel
    zusammengefasst und aufgerundet
  - 9 Abteilungen (TK und Konserven am Namen erkannt), Stückzahl bei Eiern, Gemüse und Ähnlichem
  - Häkchen je Woche; Teilen als Text mit ☐/☑
- **Rezept per Link:**
  - Das schema.org-Rezept wird gelesen (auch in `@graph`) mit Name, Portionen, Zutaten und Schritten.
  - Die Zutatenzeilen werden zerlegt (Menge, Einheit, Name; ½, 1/2, Dezimalkomma, kg/l/cl). Löffel, Stück und
    Scheiben werden über die Portionen der Grundnahrungsmittel in Gramm umgerechnet.
  - Je Zeile gibt es drei Vorschläge oder „weglassen“, die Menge ist änderbar. Gespeichert wird als eigenes Rezept.
  - Ausweichweg: Zutaten als Text einfügen.

**Beim Lückencheck nach A9 gefunden und geschlossen:**
- Per Link übernommene Rezepte ließen sich nicht einplanen.
- „Gegessen“ stand auch an zukünftigen Tagen.
- „0,5 kg“ wurde als „0“ gelesen.
- „Eier“ schlug Rührei, Aubergine („Eierfrucht“) und Pfifferlinge vor statt des Hühnereis. Genaue Treffer bei Name
  oder Synonym kommen jetzt zuerst, auch in der Lebensmittelsuche.
- Sonntags zeigte der Plan nur vergangene, leere Tage.
- Die Einkaufsliste hätte bereits gegessene Mahlzeiten mitgezählt.

**Grenze:** Im Browser blocken viele Rezeptseiten das Laden (CORS) – auf dem iPhone nicht; dort bleibt sonst das
Einfügen der Zutaten.

## A10 – Körper, Rückmeldung und Motivation

| # | Schritt |
|---|---|
| A10.1 | **Fotos:** zwei beliebige Daten vergleichen, nebeneinander und als Überblendung (Schieber); gleiche Pose als Hilfslinie |
| A10.2 | **Maße:** weitere Stellen (Wade, Nacken, Unterarm, Brust), Ziele für Maße, Messanleitung (Text; Bilder später über Higgsfield) |
| A10.3 | **Einheiten:** ml/oz und ft/in zusätzlich zu kg/lb |
| A10.4 | **Blutdruck-Tagebuch** (manuell, optional, nur Verlauf ohne Bewertung oder Grenzwerte) |
| A10.5 | **Meilensteine** ohne Serien: 10./50./100. Training, erste 100 kg in einer Übung, 1.000 Sätze, 4 Wochen Plan geschafft |
| A10.6 | **Wochen- und Monatsbilanz** „x von y Plan-Wochen“, Ruhetage zählen, nichts geht verloren (Form der Konstanz siehe E1) |
| A10.7 | **Teilen-Karten** als Bild: Training, Bestleistung, Monatsbilanz – über das Teilen-Menü, ohne Konto |
| A10.8 | **Lerninhalte:** 10–15 kurze Artikel (Progression, RIR, Eiweiß, Schlaf, Deload, Cardio), geprüft gegen falsche Versprechen |

**Fertig, wenn:** Luc einen Foto-Vergleich mit Überblendung macht, einen Meilenstein bekommt und eine Teilen-Karte verschickt.

## A11 – Qualität und Aufräumen

| # | Schritt |
|---|---|
| A11.1 | **Module ein-/ausschaltbar** (z. B. Ernährung, Dehnen/HIIT, Coach aus für reine Lifter) – Tabs und „Heute“ passen sich an |
| A11.2 | **VoiceOver-Prüfung** aller Hauptabläufe auf dem iPhone, Fehler beheben, Ergebnis in `docs/Geraetetest.md` |
| A11.3 | `docs/Fahrplan.md` auf den Stand bringen (Plan-Import, Rezeptbuch, vergessenes Training, A1–A10) |
| A11.4 | Fachprüfungs-Mappe vollständig (Regeln aus A1, A6, A7, A8) für den gebündelten Termin |

**Fertig, wenn:** die Mappe vollständig ist und VoiceOver alle Hauptabläufe schafft.

---

## Offene Entscheidungen von Luc (E1–E5)

| # | Frage | Bericht empfiehlt | Wirkt auf |
|---|---|---|---|
| E1 | Verzeihende **Wochen-Konstanz** statt „keine Serien“? | ja: Ruhetage zählen, kein Verlust, abschaltbar, bei „sensibler Situation“ aus | A10.6 |
| E2 | **Fasten-Timer** (16:8 usw.)? | nur „Kann“; bei „sensibler Situation“ ausblenden | sonst W |
| E3 | **GLP-1-Begleitmodus** (Eiweiß + Krafttraining zum Muskelerhalt)? | strategisch interessant, braucht Rechts- und Fachprüfung | später |
| E4 | **Gemessenes Körperfett** von der Waage anzeigen (keine eigene Schätzung)? | ja, nur anzeigen | D3 |
| E5 | **Englisch** als zweite Sprache wann? | erst nach dem Deutschland-Start | Phase 11 |

## Parallel: Übungsbilder mit Higgsfield (Luc)

Medien-Technik steht (`mobile/src/media/exercise-media.ts`, `docs/Anleitung_Uebungsbilder.md`). Claude liefert:
Liste der 150 häufigsten Übungen, Stilvorgabe (Hintergrund, Blickwinkel, Format, Dateiname = Übungs-ID) und bindet
die Bilder ein. Später auch Bilder für die Messanleitung (A10.2).

## Development Build (ab MacBook, D1–D12)

| # | Inhalt |
|---|---|
| D1 | Build-Grundlage: EAS-Development-Build, Face ID im Build, SQLCipher-Verschlüsselung, offene Gerätetests |
| D2 | Live Activity / Dynamic Island für den Pausentimer (Satz, nächste Übung, Restzeit) |
| D3 | Apple Health **lesen** (Schritte, Schlaf mit Phasen, Gewicht, Körperfett nur anzeigen, Ruhepuls, HRV, VO2max, Workouts – Läufe in die Trainingslast) und **schreiben** (Krafttrainings, Gewicht, Wasser, Ernährung); Hinweis „vielleicht keine Freigabe“ bei leeren Daten |
| D4 | Bereitschaft Stufe 2: HRV und Ruhepuls gegen 28–60-Tage-Baseline, Schlaf aus Health in Schlafschuld und Journal |
| D5 | Widgets (kcal/Eiweiß übrig, nächstes Training, Wasser +250 ml, Ampel) |
| D6 | Etikett-Scan auf dem Gerät (Texterkennung) für Produkte, die OFF nicht kennt |
| D7 | Siri / Kurzbefehle („Wasser eintragen“, „Training starten“) |
| D8 | Pulszonen im Training (mit Watch-Daten aus Health) |
| D9 | Android + Health Connect (inkl. 30-Tage-Grenze, eigene RMSSD-Baseline) |
| D10 | Apple-Watch-App zum Satz-Loggen |
| D11 | Sync über die eigene iCloud des Nutzers (kein eigener Server) – vorher prüfen |
| D12 | Optional: Kamera-HRV-Morgenmessung; In-App-Kauf erst nach Entscheidung zur Monetarisierung; Zyklusdaten nur nach Rechtsprüfung |

## Bewusst weglassen (W)

KI-Foto-Erkennung und Cloud-KI-Chat (Kosten, Server, Ungenauigkeit – Ersatz: A3, A4, A5.6, D6) · Lebensmittel-Score
„gut/schlecht“ · Restaurant-Datenbank (Schnelleintrag reicht) · Laborwerte · „Biologisches Alter“ ·
Krankheits-Frühwarnung · Smart Alarm/Schnarcherkennung · EKG/Vorhofflimmern/Blutdruck-Warnungen · eigene
Körperfett-Schätzung · Social-Feed, Freunde, Bestenlisten, Challenges · Web-App, Wear OS · Musik im Training ·
Kalorien-Gutschrift für Training · Supplement-Empfehlungen · Werbung · eigener Absturzdienst · GPS-Läufe.

---

## Abdeckung: jede Lücke aus dem Bericht → Stelle im Plan

| Bereich | Lücke laut Bericht | Stelle |
|---|---|---|
| Training | Satztypen | A1.1–A1.2, A1.5 |
| Training | RIR/RPE pro Satz | A1.3 (Regel A1.11) |
| Training | geschätztes 1RM | A1.9 |
| Training | Scheibenrechner | A1.10 |
| Training | Aufwärmsatz-Rechner | A1.6 |
| Training | Supersätze/Zirkel | A1.7 |
| Training | Notizen | A1.4 |
| Training | Cardio | A2 |
| Training | Übungsbilder | Parallel (Luc, Higgsfield) |
| Training | Import Strong/Hevy | A5.3 |
| Training | Programmbibliothek | A8.1 |
| Training | Deload/Mesozyklen | A8.2 |
| Training | Feedback nach der Einheit | A6.3 |
| Training | Muskel-Körperkarte | A8.5 |
| Training | Monats-/Jahresstatistik, Volumen je Übung | A8.6 |
| Training | Geräteprofile | A8.4 |
| Training | Teilen-Karte | A10.7 |
| Training | einseitig/unterstützt/Zusatzgewicht | A1.8 |
| Training | Zeitschätzung, bevorzugte Wochentage | A8.3 |
| Training | Apple-Watch-App | D10 |
| Training | Musik | W |
| Ernährung | Grundnahrungsmittel offline | A4 |
| Ernährung | Schnelleintrag | A3.1 |
| Ernährung | „1 Packung“, Tagesgrenze | A3.2, A3.5 |
| Ernährung | OFF-Trefferquote | A3.8 |
| Ernährung | adaptiver Energiebedarf | A7 |
| Ernährung | Zucker, Salz, gesättigte Fette | A3.3 |
| Ernährung | Vitamine/Mineralstoffe | A4.3 |
| Ernährung | Etikett-Scan | D6 |
| Ernährung | Foto-Erkennung | W |
| Ernährung | „Was ich gegessen habe“ als Text | vorhanden + A4.7 |
| Ernährung | Mahlzeitenplan + Einkaufsliste | A9.1–A9.3, A9.5 |
| Ernährung | Rezept-Import per Link | A9.4 |
| Ernährung | Fasten-Timer | E2 |
| Ernährung | Koffein | A3.7 |
| Ernährung | GLP-1-Modus | E3 |
| Ernährung | Lebensmittel-Score, Restaurant-DB | W |
| Ernährung | Ernährung in Health schreiben | D3 |
| Körper | Schritte/Gewicht/Körperfett/Ruhepuls automatisch | D3 |
| Körper | gemessenes Körperfett anzeigen | E4 → D3 |
| Körper | Foto-Vergleich frei / Überblendung | A10.1 |
| Körper | weitere Maße, Ziele für Maße | A10.2 |
| Körper | Messanleitung, ml/oz, ft | A10.2, A10.3 |
| Körper | PDF-Bericht | A5.5 |
| Körper | VO2max | D3 |
| Körper | Blutdruck-Tagebuch | A10.4 |
| Körper | Laborwerte, biologisches Alter | W |
| Körper | Zyklus | D12 (nach Rechtsprüfung) |
| Schlaf/Herz | Schlaf aus Health | D3 |
| Schlaf/Herz | HRV/Ruhepuls mit Baseline | D3, D4 |
| Schlaf/Herz | Bereitschafts-Ampel | A6.5 (Stufe 1), D4 (Stufe 2) |
| Schlaf/Herz | Trainingslast akut:chronisch | A6.4 |
| Schlaf/Herz | Morgen-Check | A6.2 |
| Schlaf/Herz | Status krank/verletzt/Pause | A6.7 |
| Schlaf/Herz | Schlafschuld | A6.8 (D4 mit Health) |
| Schlaf/Herz | Bettzeit-Empfehlung | A6.9 |
| Schlaf/Herz | Journal mit Auswirkungen | A6.10 |
| Schlaf/Herz | Schlaf-Score | A6.8 (bewusst nur Regelmäßigkeit) |
| Schlaf/Herz | Monatsbericht | A7.5 |
| Schlaf/Herz | Kamera-HRV | D12 |
| Schlaf/Herz | Energieplan nach Tagesrhythmus | W (weit weg vom Kern; mit D4 neu prüfen) |
| Schlaf/Herz | Stress-Wert / Atemübung | Atemübung A6.11, Stress-Wert D4 |
| Schlaf/Herz | Pulszonen | D8 |
| Schlaf/Herz | Krankheits-Frühwarnung, Smart Alarm, EKG usw. | W |
| Plattform | Development Build | D1 |
| Plattform | HealthKit lesen/schreiben | D3 |
| Plattform | Live Activity | D2 |
| Plattform | CSV/JSON-Export | A5.1–A5.2 |
| Plattform | Widgets | D5 |
| Plattform | SQLCipher, Face ID | D1 |
| Plattform | Android + Health Connect | D9 |
| Plattform | Siri/Kurzbefehle | D7 |
| Plattform | VoiceOver-Audit | A11.2 |
| Plattform | zweites Gerät/Sync | D11 |
| Plattform | Englisch | E5 |
| Plattform | Web-App, Wear OS | W |
| Plattform | In-App-Kauf | D12 |
| Motivation | Wochen-Konstanz | E1 → A10.6 |
| Motivation | Meilensteine | A10.5 |
| Motivation | Teilen-Karten | A10.7 |
| Motivation | Lerninhalte | A10.8 |
| Motivation | Module ein/aus | A11.1 |
| Motivation | Trainer/Kunde-Modus | A5.7 |
| Motivation | Social-Feed usw. | W |
| Bericht-Fahrplan | „Zusammenfassung für deine KI kopieren“ | A5.6 |
| Bericht-Fahrplan | Freigabe-Blocker | Schritt 0 |
