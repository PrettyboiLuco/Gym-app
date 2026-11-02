# Abgleich Arbeitsgrundlage v2.0 ↔ App „Myhealth“: TRAIN, FOOD, HEALTH, COACH, TIME

Stand der Prüfung: 01.11.2026, nur gelesen, nichts im Repo geändert.
Quelle: Anhang A Fachprüfregister (PDF S. 23–42) plus Zielkonzept Kap. 04–06, 10–12 und Kap. 16 (Phasen P0–P5).

**Priorität:** Das PDF vergibt pro ID **kein** Muss/Soll/Kann. Die Spalte „Prio“ ist die Phasenzuordnung aus Kap. 16:
P1 = native Machbarkeit (Barcode, Health, Timer), P2 = nutzbarer Kern (Ernährung, Getränke, Datum/Zeitzone, Rezepte,
Übungen, manuelle Pläne, Satzlogger, Verlauf), P3 = Planassistent, P4 = Coach/Foto, P5 = öffentliche Beta/freie KI.
Der Befund-Typ aus dem Register (spezifiziert/bestätigt/korrigiert/offen/widerlegt) steht in Klammern.

**Status:** umgesetzt · umgesetzt (FF) = Code da, im PDF verlangte **Fachfreigabe** fehlt noch (gesammelt in
`docs/Fachpruefung_Mappe.md`, Fahrplan 10.1) · teilweise · fehlt · bewusst verschoben (mit Doku-Beleg) · kein App-Thema.

Pfade: `src/` = `/home/user/Gym-app/mobile/src/`, `docs/` = `/home/user/Gym-app/docs/`.

## TRAIN

| ID | Anforderung (kurz) | Prio | Status | Beleg / Bemerkung |
|---|---|---|---|---|
| TRAIN-001 | Anfängereinstieg aus geprüfter Vorlage mit Erklärung, keine freie KI-Erfindung (offen) | P3 | umgesetzt (FF) | `src/domain/planner.ts` (nur kuratierte Einsteiger-Übungen, „So funktioniert dein Plan“), Kurzanleitungen für alle Übungen (`domain/__tests__/i18n-coverage.test.ts`); Fachprüfung Mappe D1–D6 offen |
| TRAIN-002 | Bestehenden Plan manuell übernehmen: Übungen, Reihenfolge, Sätze, Wdh., Pausen; Logs nicht umschreiben (spez.) | P2 | umgesetzt | `src/domain/training.ts` (Umsortieren), `src/data/migrations.ts` v2, `src/data/plan-import.ts`, Fahrplan 2.2 |
| TRAIN-003 | Eigene Übungen als stabile Variante mit Gerät und Synonymen, auch ohne externen Treffer (spez.) | P2 | umgesetzt | `exercise`-Tabelle (equipment Pflicht) `src/data/migrations.ts`; Synonyme `src/format/exercise-name.ts`, `src/i18n/de.ts:404`. Hinweis: eigene Übungen haben keine Synonyme (nur Startliste) |
| TRAIN-004 | 2 bis 6 Trainingstage, gültige Eingaben und Konflikte testen (spez.) | P2 | umgesetzt | `src/domain/planner.ts:39`, Tests `domain/__tests__/planner.test.ts`, `training.test.ts` |
| TRAIN-005 | PPL/Arnold/Ober-Unter; unpassender Split → Alternative mit Begründung (spez.) | P3 | umgesetzt | `src/domain/planner.ts:47`; Fahrplan 8.2 |
| TRAIN-006 | Lieblingsübungen als harte Bedingung; Konflikt statt Entfernen (spez.) | P3 | umgesetzt | `src/domain/planner.ts:169, :609`, `src/data/planner.ts`, Tests planner.test.ts |
| TRAIN-007 | Zeitbudget aus Sätzen, Pausen, Aufwärmen, Wechseln; Überlastung ohne falsche Dauer abweisen (spez.) | P3 | umgesetzt | `src/domain/planner.ts:155, :665, :784`, `src/domain/training.ts:108` |
| TRAIN-008 | Temporär vs. dauerhaft mit explizitem Gültigkeitsintervall (spez.) | P3 | umgesetzt | `valid_until` `src/data/migrations.ts:436`, `src/data/training.ts:183, :297`, Test `data/__tests__/planner-data.test.ts:101` |
| TRAIN-009 | Änderungsvorschau: behalten/verschieben/reduzieren/ersetzen/entfernen mit Grund (spez.) | P3 | umgesetzt | `src/domain/planner.ts:115` |
| TRAIN-010 | Neue Planversion erst nach Zustimmung; Ablehnen lässt Plan unverändert (spez.) | P3 | umgesetzt | `src/domain/planner.ts:567`, `src/data/training.ts` |
| TRAIN-011 | Rückkehr zu altem Plan durch Reaktivieren, neue Logs bleiben (spez.) | P3 | umgesetzt | `src/data/training.ts:283` („Rückgängig“) |
| TRAIN-012 | Session/SetLog unabhängig von Planvorlage; Golden-Vergleich vor/nach Umbau (spez.) | P3 | umgesetzt | `set_log` ohne Plan-FK `src/data/migrations.ts:118`; Test „Logs bleiben … Byte für Byte gleich“ `data/__tests__/planner-data.test.ts:81` |
| TRAIN-013 | Geplante und tatsächliche Werte getrennt; jeder Abschluss sofort gespeichert (spez.) | P2 | umgesetzt | `planned_reps_*` vs. `reps/weight_kg` `src/data/migrations.ts:118`; `src/data/training.ts:3` |
| TRAIN-014 | Letzte Leistung nur aus vergleichbarer Variante/Gerät/Einheit (spez.) | P2 | umgesetzt | `src/data/training.ts:4`, `src/domain/progression.ts:32`, `src/domain/exercises.ts:170` |
| TRAIN-015 | Ausfall ≠ absolviert; Wahl Neuplanung oder Fortsetzen (spez.) | P2 | umgesetzt | `src/app/training/index.tsx:69`, `src/app/training/assistant.tsx:69`; Fahrplan Z. 354 |
| TRAIN-016 | Gerät blockiert → geprüfte Ersatzrelation (offen) | P3 | umgesetzt (FF) | `src/data/training.ts:592`, `src/domain/planner.ts:258`; Ersatzlisten „ungeprüfte Vorschläge“ `src/domain/exercises.ts:103`, Mappe D8 |
| TRAIN-017 | Schmerzen: keine Therapie, keine erzwungene Fortsetzung; Abbruchregeln freigeben (offen) | P3 | umgesetzt (FF) | Knopf „Schmerzen / abbrechen“ + Hinweis ohne Behandlungstipps `src/i18n/de.ts:519–522, 1088–1091`; Freitext `src/domain/wish.ts:24`; Mappe D9 |
| TRAIN-018 | Progression (Last, Wdh., Sätze, Stagnation, Wiedereinstieg) als versionierte Entscheidungstabelle (offen) | P4 | umgesetzt (FF) | `src/domain/progression.ts` (Fassung 1, abschaltbar); Mappe E1–E6, L1–L2 |
| TRAIN-019 | Keine 100 ungeprüften Pläne, sondern wenige geprüfte Grundmodelle mit Varianten (korr.) | P3 | umgesetzt (FF) | `src/domain/planner.ts:716` (Bausteine A/B/C); Mappe D1, K5 |
| TRAIN-020 | KI-Ausgabe: Schema, IDs, Geräte, Zeit prüfen; Prompt-Injection ändert keine Regeln (spez.) | P3 | umgesetzt | `validateWish` `src/domain/wish.ts`, Tests `progression-wish.test.ts`; KI selbst bewusst nicht gebaut (Entscheidungen.md „Phase 9“, Fahrplan Z. 426) |
| TRAIN-021 | Umplanung ohne KI: strukturierte Auswahl und deterministische Regeln zuerst (spez.) | P3 | umgesetzt | `src/domain/planner.ts:1` („ohne KI und ohne Netz“), `src/domain/wish.ts` |
| TRAIN-022 | Fachliche Planqualität durch qualifizierten Review freigeben (offen) | P3/P4 | bewusst verschoben | kein Code-Thema; Fahrplan Phase 10.1 (Z. 496), `docs/Fachpruefung_Mappe.md` Teil D |

## FOOD

| ID | Anforderung (kurz) | Prio | Status | Beleg / Bemerkung |
|---|---|---|---|---|
| FOOD-001 | Barcode als Text, Produkt und Menge bestätigen (spez.) | P1 | umgesetzt | `src/app/nutrition/scan.tsx` (Bestätigen/Korrigieren), `src/domain/nutrition.ts:109`, `food.barcode TEXT` |
| FOOD-002 | kcal/Protein/KH/Fett mit Einheit und Herkunft; fehlend = unbekannt (spez.) | P2 | umgesetzt | NULL = unbekannt `src/data/migrations.ts:137`, `basis g/ml`, `source eigen/off`; `parseFoodForm` `src/domain/nutrition.ts:332` |
| FOOD-003 | OFF-Limits 15/10 pro Minute; Cache, 429/503, Requestzählung testen (best.) | P1 | umgesetzt | Eigene Grenzen 12/8 `src/data/off.ts:48–49`, lokaler Barcode-Cache `scan.tsx:55`, Tests `data/__tests__/off.test.ts` (429, 503, offline, Limit). Kein Backoff, nur Fehlermeldung |
| FOOD-004 | OFF API v3 für Produkte, Suche getrennt (korr.) | P1 | umgesetzt | `/api/v3/product` `src/data/off.ts:71`; Live-Test offen (Fahrplan Z. 126) |
| FOOD-005 | OFF-Lizenzen (ODbL/Contents/CC-BY-SA-Bilder) trennen, Attribution zeigen (best.) | P2 | umgesetzt | Hinweis „Open Food Facts (ODbL)“ `src/i18n/de.ts:1265`, keine Produktbilder geladen (FIELDS `off.ts`); `docs/Pakete_und_Sicherheit.md:37`. Rechtsbewertung Datenmischung OFF+SR28 erst 10.2 |
| FOOD-006 | Eigene App-Kennung (User-Agent), keine private Nutzerkennung (best.) | P1 | umgesetzt | `src/data/off.ts:16–18`; Kontaktadresse fehlt noch (Kommentar: „vor Veröffentlichung ergänzen“, Phase 10.2) |
| FOOD-007 | Suche per Markenname, Volltext ≠ v3; DE-Testqueries protokollieren (offen) | P2 | umgesetzt | `searchProducts` mit search-a-licious + Fallback `src/data/off.ts:83`; Protokoll `docs/OFF_Test.md` noch leer |
| FOOD-008 | USDA: Schlüssel nur über Server, 1000 Req/h, 429 testen (best.) | P2 | bewusst verschoben (API) – Ersatz umgesetzt | Fahrplan Z. 118–121; offline USDA SR28 (441 Einträge, gemeinfrei) `src/domain/basis-foods-data.ts`, Entscheidungen.md „Grundnahrungsmittel“ |
| FOOD-009 | Deutsche Abdeckung: 50 eigene Etiketten prüfen (offen) | P1 (Pilot) | kein App-Thema | Aufgabe Luc, `docs/OFF_Test.md`, Fahrplan Z. 96/127 |
| FOOD-010 | Eigene Produkte/Korrekturen privat, offline änderbar, keine Veröffentlichung (spez.) | P2 | umgesetzt | `src/data/nutrition.ts:184` |
| FOOD-011 | 100 g/100 ml/Portion und roh/gekocht trennen; g↔ml ohne Dichte verweigern (spez.) | P2 | umgesetzt | `prep` `src/data/migrations.ts:146`; `throw 'density required'` `src/domain/nutrition.ts:12`; `src/format/food-title.ts` |
| FOOD-012 | Nährwert-Snapshot beim Loggen; Katalogupdate ändert alte Einträge nicht (spez.) | P2 | umgesetzt | `consumption_event` mit eigenen Nährwerten `src/data/migrations.ts:197`, Test nutrition-data.test.ts |
| FOOD-013 | „Nutella-Brot“ als Vorlage aus Zutaten/Mengen, reproduzierbar (spez.) | P2 | umgesetzt | `src/data/nutrition.ts:549`, Test `nutrition-data.test.ts:208` |
| FOOD-014 | Freie Sprache: Kandidatenschema + Bestätigung, Rückfrage statt Annahme (offen) | P4 | umgesetzt | lokal ohne KI `src/domain/food-text.ts`, `src/app/nutrition/text.tsx:121`; Fahrplan 9.5 |
| FOOD-015 | Essensfoto als korrigierbare Schätzung (offen, Backlog) | P4 | bewusst verschoben | Fahrplan Z. 123, Z. 426; Ausbauplan „Bewusst weglassen (W)“ KI-Foto-Erkennung, Ersatz D6 Etikett-Scan |
| FOOD-016 | Favoriten/Mahlzeiten lokal, unabhängig vom Anbieter, offline (spez.) | P2 | umgesetzt | `favorite`, `meal_template` `src/data/migrations.ts`, `src/data/nutrition.ts:549` |
| FOOD-017 | Rezepte: Zutaten, Endgewicht, Portionen getrennt; 1200/800/200 → 300 kcal (spez.) | P2 | umgesetzt | `recipe_version` `src/data/migrations.ts:162`, Tests `nutrition.test.ts:48`, `nutrition-data.test.ts:240`; ohne Endgewicht nur Portion `recipe-log/[id].tsx:37` |
| FOOD-018 | Dubletten: Quelle/ID statt Name als Identität, nicht automatisch verschmelzen (spez.) | P2 | umgesetzt | `src/app/nutrition/add.tsx:97`, `food-edit/[id].tsx:78`, `src/data/nutrition.ts:120` |

## TIME

| ID | Anforderung (kurz) | Prio | Status | Beleg / Bemerkung |
|---|---|---|---|---|
| TIME-001 | Verzehrzeit, Erfassungszeit, Zeitzone, Tagebuchdatum getrennt; Nachtrag 00:05 bleibt gestern (spez.) | P2 | umgesetzt | `occurred_at_utc/recorded_at_utc/time_zone/utc_offset_min/diary_date` `src/data/migrations.ts:211–215`; Test `nutrition-data.test.ts:146` |
| TIME-002 | Frühstück/Mittag/Abend/Snack frei wählbar; Schichtarbeit ändert Vorschlag (spez.) | P2 | umgesetzt | `meal`-Spalte; eigene Essenszeiten `src/data/nutrition.ts` (`mealTimes`), Fahrplan 9.3 |
| TIME-003 | Reisen/Sommerzeit: alte Tagebuchdaten nicht neu zuordnen, 23/25-h-Tag (spez.) | P2 | umgesetzt | festes `diary_date`; `src/domain/time.ts`; Test „Herbsttag hat 25 Stunden“ `domain/__tests__/domain.test.ts:77` |
| TIME-004 | Wasser und Gesamtgetränke getrennt; eigene Glas-/Flaschengrößen (spez.) | P2 | umgesetzt | `src/domain/nutrition.ts:164`, `glassSizes` `src/data/nutrition.ts:772` |
| TIME-005 | Kalorienhaltiges Getränk: ein Event für beide Ansichten (spez.) | P2 | umgesetzt | eine Tabelle `consumption_event` `src/data/migrations.ts:196`; Tests nutrition-data/phase9 |
| TIME-006 | Ändern/Löschen atomar in beiden Ansichten (spez.) | P2 | umgesetzt | `src/data/nutrition.ts:455`, Test `nutrition-data.test.ts:159` |
| TIME-007 | DGE ~1,5 l als Orientierung, kein Minimum; Hinweis auf veränderten Bedarf (best.) | P2 | umgesetzt | Default 1500 ml `src/data/nutrition.ts:770`; Text `src/i18n/de.ts:1217` (Hitze, Sport, Krankheit, Schwangerschaft) |
| TIME-008 | Keine gewichtsabhängigen Min/Max-Werte ohne Fachprüfung (offen) | P2 | umgesetzt (Schutzregel) – Wunsch verschoben | keine Automatik `src/domain/nutrition.ts:411`; Wunsch Min/Max: `docs/Fachpruefung_Mappe.md` G5 |
| TIME-009 | Gesamtwasser ≠ Trinkmenge; Zielbasis ausdrücklich darstellen (best.) | P2 | umgesetzt | `src/domain/nutrition.ts:164`; „Gezählt werden nur Getränke …“ `src/i18n/de.ts:1217` |
| TIME-010 | Individuelle Trinkvorgabe nie automatisch überschreiben (spez.) | P2 | umgesetzt | „Dein Wert wird nie automatisch geändert.“ `src/i18n/de.ts:1402`. Kap. 06 schlägt zusätzlich die Kennzeichnung „Nutzerwert / fachliche Vorgabe“ vor – nicht vorhanden |
| TIME-011 | Erinnerungen optional, Ruhezeiten, an Tagesrhythmus anpassbar (spez.) | P2 | umgesetzt | `src/domain/reminders.ts`, `src/app/more/notifications.tsx` (Zeitfenster, Standard aus); Gerätetest offen (`docs/Geraetetest.md` Erinnerungen) |
| TIME-012 | Mehrtrinken nicht unbegrenzt belohnen (spez.) | P2 | umgesetzt | `src/app/nutrition/index.tsx:296` |

## HEALTH

| ID | Anforderung (kurz) | Prio | Status | Beleg / Bemerkung |
|---|---|---|---|---|
| HEALTH-001 | Health-Freigabe nicht automatisch; Ablehnung/Entzug blockiert Kernapp nicht (best.) | P1 | bewusst verschoben | Apple Health erst mit Development Build: Fahrplan 6.2, Ausbauplan D3, `docs/Anleitung_Development_Build.md`. Kernapp läuft ohne Health (Schritte manuell `src/app/progress/steps.tsx`) |
| HEALTH-002 | HealthKit-Lesestatus nicht erkennbar; aus leerem Ergebnis keine „Verweigerung“ behaupten (korr.) | P1 | bewusst verschoben | `docs/Anleitung_Development_Build.md` (Punkt 1), `docs/Geraetetest.md` H3. UI-Text („keine lesbaren Schrittdaten; Quelle/Freigabe prüfen“) noch nicht in `de.ts` |
| HEALTH-003 | Android 14 + Extension 20, Eignung zur Laufzeit prüfen (best.) | P1 | bewusst verschoben | Android = Phase 11 (Fahrplan Z. 263), Ausbauplan D9 |
| HEALTH-004 | Android-Schrittquelle (SPN seit 06/2026) nicht hart codieren (korr.) | P1 | bewusst verschoben | Fahrplan Z. 263, Ausbauplan D9 |
| HEALTH-005 | Schrittquellen nicht blind summieren; Handy/Uhr-Überlappung prüfen (spez.) | P1 | teilweise | Vorrangregel (Apple Health vor manuell, nie addiert) `src/domain/steps.ts`, `steps_entry`; Plattform-Aggregation Handy/Uhr erst mit D3 (`docs/Repo_Vergleich.md`, Anleitung_Development_Build) |
| HEALTH-006 | Abrufzeit/Fenster/Quelle speichern; veraltete Daten sichtbar statt „live“ (spez.) | P1 | teilweise | `fetched_at_utc`, `window_*` gespeichert `src/data/migrations.ts:394–401`; Anzeige von Abrufzeit/Veraltung fehlt (`steps.tsx`, `de.ts` steps), nicht als offen dokumentiert |
| HEALTH-007 | Aktivitätsmodell und Schritte nicht doppelt gutschreiben (spez.) | P1/P4 | umgesetzt | `src/domain/steps.ts:2`, `src/domain/coach.ts:5–6`, Text `de.ts` `steps.noCredit`; Cardio ohne Gutschrift `src/domain/cardio.ts` |
| HEALTH-008 | Pausentimer 30 s, 3/4/5 min plus eigene Dauer (spez.) | P1 | umgesetzt | `REST_PRESETS` `src/domain/training.ts:139`, `src/components/rest-timer-bar.tsx` |
| HEALTH-009 | Auto-Start optional; starten/verlängern/überspringen/stoppen; SetLog bleibt bei Timerfehler (spez.) | P1 | umgesetzt | `src/app/training/session/[id].tsx:276`, `extendRest/stopRest` `src/domain/training.ts` |
| HEALTH-010 | HIIT: Belastung, Pause, Runden, Phasenindex ohne doppelte/verlorene Phase (spez.) | P1 | umgesetzt | `src/domain/training.ts:176`, `src/domain/timeline.ts`, `src/app/training/interval.tsx` |
| HEALTH-011 | Timer-Persistenz: Endzeit, Status, Generation, Neustartstrategie; keine Altalarme (spez.) | P1 | umgesetzt | `src/domain/training.ts:134–170`, `isCurrentAlarm` `src/domain/time.ts`, `src/data/training.ts:644`; Gerätetest T6/T7 offen |
| HEALTH-012 | iOS-Mitteilungen nicht garantiert pünktlich; Fokus/Rechte testen, Einschränkung erklären (best.) | P1 | umgesetzt | Hinweis `src/i18n/de.ts:2298`, `src/domain/reminders.ts:2`; Gerätetest T10 offen |
| HEALTH-013 | AlarmKit als zusätzlicher nativer Timer-Kandidat (offen) | P1 | bewusst verschoben | Fahrplan Z. 263, Ausbauplan D2, Anleitung_Development_Build („Sperrbildschirm-Timer“) |
| HEALTH-014 | Android Exact Alarm: Ablehnung/Entzug, legaler Fallback (best.) | P1 | bewusst verschoben | Fahrplan Z. 263 (Phase 11), Ausbauplan D9 |
| HEALTH-015 | Force-stop/Neustart nicht wie normalen Hintergrund behandeln; Gerätematrix (offen) | P1 | bewusst verschoben (schwacher Beleg) | nur über Sammelbereich „HEALTH-011–016“ (Fahrplan 6.3, `docs/Geraetetest.md` Z. 7); Matrix enthält App-Wegwischen (T6/T7), aber keinen Geräte-Neustart und kein Android-Force-stop |
| HEALTH-016 | Uhrsprünge: monotone Zeitbasis während Laufzeit, Abweichung sichtbar (offen) | P1 | bewusst verschoben (nur „bekannte Grenze“) | Fahrplan 6.3 und Z. 264–265, Geraetetest T9; Code nutzt nur Wanduhr `Date.now()` (`src/domain/time.ts`, `training.ts`), keine Erkennung/Anzeige |

## COACH

| ID | Anforderung (kurz) | Prio | Status | Beleg / Bemerkung |
|---|---|---|---|---|
| COACH-001 | Profil nur mit nötigen Eingaben + Ziel, Geräte, Zeit, Beruf; Zweck je Feld (spez.) | P4 | umgesetzt | `src/domain/profile.ts:1–3, :31` (Beruf in „Bewegung im Alltag“, Entscheidungen.md Phase 8), `src/components/profile-fields.tsx:51` |
| COACH-002 | Mifflin-St Jeor als Kandidat, keine TDEE-Messung; Population/Unsicherheit prüfen (offen) | P4 | umgesetzt (FF) | `src/domain/energy.ts:10–14` (19–78 J.), als „Schätzung“; Mappe A1–A2 |
| COACH-003 | Ein konsistentes Aktivitätsmodell ohne Komponentenüberlappung, versioniert (offen) | P4 | teilweise | Zwei parallele Modelle: Rechner (DGE-PAL + Sport +0,3, `src/domain/energy.ts:58–71`) und Coach (Schritt-Stufen + 0,065/Gym-Tag, `src/domain/coach.ts:18–27`); nie addiert, aber nicht „ein“ Ansatz; Mappe A3–A5 |
| COACH-004 | Abnehmen/Zunehmen/Halten, keine Erfolgsgarantie, keine extremen Ziele (spez.) | P4 | umgesetzt | `src/domain/goals.ts`, Untergrenze/Untergewicht `src/domain/coach.ts:8`; Claim-Test „garantie“ `src/domain/claims.ts` |
| COACH-005 | Protein als Bereich, keine erfundene Gesamt-Makroformel ohne Freigabe (offen) | P4 | teilweise | Rechner: Protein-Bereich `src/domain/energy.ts:102`. Coach gibt aber vollständige Verteilung vor (Eiweiß fix g/kg, Fett 30 %, KH Rest, Ballaststoffe ≥ 30 g, `src/domain/coach.ts:9–10, :32–50`) – laut PDF Kap. 11 erst nach Fachfreigabe; Mappe B1–B7 offen (Entscheidung Luc dokumentiert) |
| COACH-006 | Schlaf als Erholungskontext, kein kcal-Faktor (spez.) | P4 | umgesetzt | `src/domain/coach.ts:6–7`, `src/domain/checkin.ts`, Tests coach/phase9 |
| COACH-007 | Essenszeiten nach Alltag, Schichtarbeit/freie Mahlzeiten möglich (spez.) | P4 | umgesetzt | `src/domain/diet.ts`, `src/app/nutrition/settings.tsx` |
| COACH-008 | Wöchentlicher Check-in; fehlende Daten/Einzelschwankung → keine automatische Änderung (offen) | P4 | umgesetzt (FF) | `src/domain/checkin.ts` (nur mit Bestätigung, ±100 kcal); Mappe C1–C9 |
| COACH-009 | Allergien: keine unbestätigte Allergenfreiheit; Quellenhinweis, Nutzerprüfung (offen) | P4 | umgesetzt | `src/components/diet-notice.tsx`, „bitte Etikett prüfen“, Claim-Test „allergenfrei“ |
| COACH-010 | Sensible Gruppen (Minderjährige, Schwangerschaft, Untergewicht, Essstörung, Erkrankung) (offen) | P4 | umgesetzt (FF) | Ab-18-Abfrage + Schalter „sensible Situation“ (nur ja/nein gespeichert) `src/components/onboarding.tsx`, `src/i18n/de.ts:1493–1544`; Mappe G1–G2 |
| COACH-011 | Keine Behauptung „Cardio wirkungslos / Kraft 20× besser“ (widerlegt) | P4/P5 | umgesetzt | `src/domain/claims.ts` Regel „cardio“, Test `help-claims.test.ts`, Store-Texte |
| COACH-012 | Freier KI-Chat mit Grenzen und Datenminimierung (offen) | P5 | bewusst verschoben | Fahrplan Phase 11 (Z. 682); Ausbauplan „W“ Cloud-KI-Chat; Entscheidungen.md „Phase 9“ (keine KI) |

## Zählung

| Status | TRAIN | FOOD | TIME | HEALTH | COACH | Summe |
|---|---|---|---|---|---|---|
| umgesetzt | 16 | 15 | 12 | 6 | 6 | 55 |
| umgesetzt (FF – Fachfreigabe offen) | 5 | 0 | 0 | 0 | 3 | 8 |
| teilweise | 0 | 0 | 0 | 2 | 2 | 4 |
| fehlt | 0 | 0 | 0 | 0 | 0 | 0 |
| bewusst verschoben | 1 | 2 | 0 | 8 | 1 | 12 |
| kein App-Thema | 0 | 1 | 0 | 0 | 0 | 1 |
| **gesamt** | 22 | 18 | 12 | 16 | 12 | **80** |

TIME-008 zählt als umgesetzt (die verlangte Schutzregel ist da), der Min/Max-Wunsch ist laut Mappe G5 verschoben.
FOOD-008 zählt als verschoben (USDA-API), der Offline-Ersatz SR28 ist gebaut.
