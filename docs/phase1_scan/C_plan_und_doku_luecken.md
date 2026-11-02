# Plan-Lücken-Scan Myhealth (Stand Repo 01.11.2026, Commit 5ac8a99)

Nur gelesen, nichts geändert. Geprüft: `docs/Fahrplan.md` (Phase 0–11, Coach C1–C9, alle Nachträge),
`docs/Ausbauplan.md` (A1.1–A11.4, Abdeckungstabelle, E1–E5, D1–D12, W), Bericht
`docs/recherche/reports/Was Myhealth noch fehlt.md`, dazu Entscheidungen, Freigabematrix, Gerätetest,
Fachprüfungs-/Rechtsmappe, Datenschutz, Store-Texte, Pakete, Pilot, Repo-/Wettbewerbsvergleich, Gesamtprüfung,
Kapitel 21 – jeweils gegen `mobile/src` (Stichproben per grep/Lesen).

Apple Health / Health Connect (6.2, C7, D3, D4, D9) ist bewusst bis zum MacBook verschoben und wird hier **nicht**
als Lücke gezählt.

Gesamturteil: Der Code deckt die Pläne erstaunlich vollständig ab. Es gibt keine TODO/FIXME im Code; die Schemata
aller Ausbau-Migrationen (19–26) sind da. Echte Code-Lücken sind wenige und eher klein. Größer ist die
**Doku-/Text-Drift**: Rechts-, Datenschutz-, Hilfe-, Store-, Pilot- und Paket-Unterlagen stehen auf 30.10.2026 und
kennen die A1–A11-Funktionen nicht, vor allem den neuen Netzwerkzugriff „Rezept per Link“.

---

## 1. Echte Lücken im Code (fehlt oder nur teilweise), nach Wichtigkeit

### 1.1 Datenschutz-/Netzwerktexte in der App kennen „Rezept per Link“ nicht (mittel-hoch, rechtlich relevant)
- Code: `mobile/src/data/meal-plan.ts:126` – `fetch(url)` auf eine beliebige, vom Nutzer eingegebene Rezeptseite
  (A9.4). Das ist neben Open Food Facts der zweite Netzwerkzugriff (IP-Adresse geht an fremde Seite).
- In der App falsch bzw. unvollständig: `src/i18n/de.ts:3316` (Mehr → Datenschutz: „Nur beim Scannen oder bei der
  Online-Suche …“), `de.ts:3247` (Hilfe „Welche Daten verlassen mein Handy?“).
- Docs: siehe Abschnitt 3 (Rechtsmappe D1–D7, Datenschutz-Entwurf, website/datenschutz.html, Pakete-Doc
  „Netzwerkzugriffe: nur Open Food Facts“, Freigabematrix R5).
- Ebenfalls nicht in den Texten: PDF-Bericht/CSV/„Zusammenfassung für deine KI“ (Zwischenablage) und Teilen-Karten
  als vom Nutzer ausgelöste Weitergabe von Gesundheitsdaten.

### 1.2 Fortschrittsfotos: Einleitungstext widerspricht dem Stand (mittel, Nutzer sieht es)
- `src/i18n/de.ts:2158–2159` (angezeigt in `app/progress/photos.tsx:87`): „Eine eigene App-Sperre gibt es noch nicht“
  und „Eine Sicherung kommt später (Phase 6)“. Beides existiert seit Phase 6.5 (`components/lock-gate.tsx`,
  `app/more/security.tsx`, Sicherung mit Fotos in `data/backup.ts`). Falsche Aussage gegenüber Testern + interner
  Begriff „Phase 6“.

### 1.3 Journal ohne Zielgröße „Leistung“ (mittel, versprochen und vergessen)
- Plan: A6.10 „an Tagen mit … war deine Energie/**Leistung** im Schnitt …“. A6-Abweichung: „Leistung fehlt noch … kommt
  mit A8“. A8 (Umgesetzt) enthält es nicht; auch der Bericht nennt „Trainingsleistung als Zielgröße“ als Chance.
- Code: `src/domain/readiness.ts:214` – `JournalMetric = 'energy' | 'sleepHours' | 'sleepQuality'`; keine Leistung.

### 1.4 Hilfe/FAQ (10.5) nicht für A1–A11 nachgezogen (mittel)
- `src/domain/help.ts:7–13`: 30 Fragen, alle aus Phase ≤ 10/Supplements. Keine Frage zu Satzarten/RIR/Supersätzen,
  Cardio, Schnelleintrag/Grundnahrungsmitteln, CSV/Import/PDF/KI-Zusammenfassung, Bereitschaft/Ampel/Status,
  geschätztem Verbrauch/Check-in Fassung 2, Vorlagen/leichter Woche/Geräteprofilen, Wochenplan/Einkaufsliste/Rezept
  per Link, Blutdruck/Meilensteine/Plan-Wochen, Modulen. „Was kann die App?“ (`de.ts:3110`) ist auf Phase-9-Stand.

### 1.5 Feedback-Bogen (7.3) nicht für A1–A11 nachgezogen (mittel, wichtig für den Pilot)
- `src/domain/feedback.ts:4` – Bereiche nur `training, planassistent, dehnen, hiit, ernaehrung, rechner, fortschritt,
  checkin`. Es fehlen Cardio, Coach, Bereitschaft/Morgen-Check, Essen planen, Supplements, Statistik, Export/Import.
- Nutzungsübersicht `data/feedback.ts:18–27` zählt keine Cardio-Einträge, Morgen-Checks, Wochenplan, Rezept-Importe.
- Bei Phase 8 wurde genau diese Lücke (Bereich „Planassistent“) als Fehler behandelt – hier wiederholt.

### 1.6 Modus „ohne Zahlen“ / sensible Situation nicht in den A5-Berichten (mittel, TRACK-006)
- `data/report.ts` (PDF-Bericht + Text für die KI, `app/more/report.tsx`) zeigt Ø kcal/Makros ohne Prüfung von
  `hideNumbers`. Der Monatsbericht (A7) wurde beim Lückencheck genau dafür korrigiert, der A5-Bericht nicht.
- Grenzfall (vermutlich bewusst): Rezeptbuch-Liste zeigt kcal je Portion (`app/nutrition/book/index.tsx:92`).

### 1.7 Gewichts-Hochrechnung widerspricht der Entscheidung „keine Zielprognose“ (mittel, Entscheidung nötig)
- Code: `domain/weight.ts:54` `projectWeight`, `components/weight-chart.tsx:30–42`, Text `de.ts:1449`
  („Hochrechnung … {{value}} am {{date}}. Keine Vorhersage.“).
- Docs: `Entscheidungen.md:30` „Zielprognose: keine (kein Zieldatum, keine Schätzung)“, Fahrplan Phase 4 / GOAL-006
  „bewusst keine“, Kapitel 21: höchstens „grobe Schätzung **mit Unsicherheit**“ – die Linie zeigt ein Datum ohne
  Unsicherheit. Nicht in der Fachprüfungs-Mappe. Luc bestätigen lassen oder Unsicherheit/Sensibel-Ausblendung ergänzen.

### 1.8 Übungsbilder: Claudes Zulieferung fehlt (mittel, Voraussetzung für Lucs Higgsfield-Arbeit)
- Ausbauplan „Parallel“: „Claude liefert: Liste der 150 häufigsten Übungen, Stilvorgabe (Hintergrund, Blickwinkel,
  Format, Dateiname = Übungs-ID)“. Keine solche Liste im Repo (grep), `docs/Anleitung_Uebungsbilder.md` Abschnitt 0
  sagt weiter „vor dem ersten Bild einmal festlegen und hier eintragen“ (leer).
- `src/media/exercise-media.ts:17` – `EXERCISE_MEDIA = []`; `mobile/assets/exercises/` nur `LIESMICH.txt` (erwartet).

### 1.9 Module ein/aus (A11.1) unvollständig wirksam (klein)
- „Routinen“ aus: „Heute“ bietet am Ruhetag trotzdem „Dehnen“ an (`app/index.tsx:151–158`); Aufwärmen/Cool-down im
  Training nicht geprüft.
- „Ernährung“ aus: Supplement-Erinnerungen laufen weiter (`services/alerts.ts:120–130`), obwohl der Tab weg ist.
- „Bereitschaft“ aus: Bettzeit-Erinnerung läuft weiter (`services/alerts.ts:115–119`, nur Morgen-Check ist gekoppelt).

### 1.10 Kleine Teil-Umsetzungen gegenüber den Schritt-Tabellen
- A1.10 Scheibenrechner: Stange nur 20/15/10 kg (lb 45/35/25), **keine eigene Stange**; Scheiben nur aus fester Liste
  (keine 0,5-kg-/eigene Scheiben); nur bei `langhantel` (`domain/logger.ts:84–94`, `components/set-details.tsx:95`).
- A3.4 „Ganzen Tag kopieren“: nur „Ganzen Vortag übernehmen“ in einen leeren Tag (`app/nutrition/index.tsx:114–151`).
- A1.3 RIR „vorbelegt mit Ziel-RIR“: bewusst nur als Hinweis (dokumentierte Abweichung) – ok.
- A6.11 Atemübung nicht über den Ablauf-Runner (dokumentierte Abweichung) – ok.
- A5.1/Fahrplan 5 („Export des Protokolls: Phase 6.5“): Dehn-/HIIT-Protokoll, Schritte, Supplements, Maß-Ziele nur in
  der JSON-Sicherung, kein CSV (`data/export-csv.ts:14`). Blutdruck fehlt im PDF-„Bericht für den Arzt“
  (`data/report.ts`).
- Mehr → Datenquellen (`de.ts` `sources`) nennt nur Open Food Facts; USDA SR28 steht nur am Lebensmittel
  (`de.ts:1266`), EFSA/WHO-Orientierungen nirgends gesammelt.
- Bericht-Punkte ohne Plan-Stelle (Abdeckung „genau einer Stelle zugeordnet“ stimmt nicht ganz): „Stimmung“ im
  Morgen-Check, „Tempo“ je Satz, AlarmKit (Bericht-Schritt B, D2 nennt es nicht), Zielprognose (Ausschluss im Bericht,
  in der Abdeckungstabelle fehlend – und inzwischen als Hochrechnung gebaut, s. 1.7), Konto/Sync/Community und
  gekaufte Medien (nur indirekt über Phase 11/Entscheidungen), direkte Strava/Garmin-Anbindung.

### 1.11 Ältere Fahrplan-Reste, weiterhin offen (klein, bekannt)
- Trinkziel nicht versioniert (Fahrplan Phase 4); gewichtsabhängiges Trinkziel mit Min/Max (Gesamtprüfung) nicht gebaut
  (Fachprüfung).
- Erinnerungen prüfen nicht, ob schon trainiert/getrunken wurde (Phase 6, bekannte Grenze).
- Strong/Hevy-Import ja, FitNotes nein (Repo_Vergleich „für später“).
- Lizenzhinweise der Pakete in der App (Frage an Rechtsprüfung, offen).
- Development Build: `expo-dev-client` fehlt in `package.json`, obwohl `eas.json` ein `development`-Profil mit
  `developmentClient: true` hat und die Anleitung (Weg B) es nutzt – bei D1 nachholen.

## 2. Ausbauplan A1–A11 Zeile für Zeile (Kurzfassung)

| Schritt | Befund |
|---|---|
| A1.1–A1.2 | da (Migration 19: `set_type`, `rir`, `note`, `superset`; kein Timer vor Drop) |
| A1.3 | da, Ziel-RIR bewusst nicht vorausgewählt |
| A1.4–A1.6 | da (Aufwärmen 50/70/85 %, zählt nirgends) |
| A1.7 | da (Plan-Editor, Plan-Datei, Training); Assistent → A8.3 erledigt |
| A1.8–A1.9 | da (Epley bis 12 Wdh.) |
| A1.10 | **teilweise** – keine eigene Stange/eigene Scheiben |
| A1.11 | da (v2 gebaut, aus) |
| A2.1–A2.6 | da (14 Aktivitäten, eigene Tabellen statt Übungsart – dokumentiert) |
| A3.1–A3.3, A3.5–A3.7 | da |
| A3.4 | **teilweise** – nur Vortag in leeren Tag |
| A3.8 | Liste da (`docs/OFF_Test.md`), Durchführung Luc |
| A4.1–A4.7 | da (USDA SR28 statt BLS, begründet) |
| A5.1–A5.7 | da; Blutdruck nicht im PDF, Berichte ignorieren „ohne Zahlen“ |
| A6.1–A6.9, A6.11–A6.12 | da (A6.11 eigener Bildschirm) |
| A6.10 | **teilweise** – Zielgröße „Leistung“ fehlt (versprochen für A8) |
| A7.1–A7.6 | da |
| A8.1–A8.6 | da (Deload nach 8 Wochen) |
| A9.1–A9.5 | da (CORS nur im Browser) |
| A10.1–A10.8 | da; Bilder für Messanleitung offen („Eine bebilderte Anleitung folgt“, `de.ts:2233`) |
| A11.1 | **teilweise** – siehe 1.9 |
| A11.2 | Prüfliste da, Durchführung Luc |
| A11.3 | **teilweise** – Fahrplan nur Übersichtstabelle; Plan-Import/Rezeptbuch/vergessenes Training haben keinen eigenen Abschnitt; viele Fahrplan-„Offen“-Zeilen veraltet (s. 3) |
| A11.4 | Mappe A–L da; Kopf noch „Stand 30.10.2026, Regelfassungen Coach 1, Check-in 1, Steigerung 1“ |
| Parallel | **fehlt** – Top-150-Liste + Stilvorgabe von Claude |

## 3. Für Nutzer sichtbare „später/bald/folgt“-Texte (`src/i18n/de.ts`)

Keine TODO/FIXME/XXX/comingSoon im Code. Sichtbare Vertröstungen:

| Zeile | Text | Bewertung |
|---|---|---|
| 1716–1718 | „bald“ / „Apple Health … (Development Build, **Fahrplan 6.1/6.2**)“ | Health verschoben ok; interner Begriff „Fahrplan 6.1/6.2“ raus |
| 2158–2159 | „App-Sperre gibt es noch nicht“, „Sicherung kommt später (**Phase 6**)“ | **falsch** (s. 1.2) |
| 2115 | Rechner: „Automatische Anpassungen gibt es noch nicht.“ | veraltet – Check-in-Vorschläge gibt es seit 9.2 |
| 737 | Cardio: „Fließt später in die Trainingslast ein.“ | veraltet – fließt schon ein (`data/readiness.ts:172–184`) |
| 2233 | „Eine bebilderte Anleitung folgt.“ | ok, hängt an Bildern |
| 402 | „Bilder folgen später.“ | ok, hängt an Bildern |
| 2279 | „Anzeige direkt auf dem Sperrbildschirm folgt später.“ | ok (D2) |
| 2250, 2372, 2028, 3237, 3292 | Apple Health / SQLCipher mit späterer Version | ok (verschoben) |
| 1473 | „Noch nicht enthalten: Körperfett-Schätzungen“ | ok (E4/W) |
| Mehr → Sprache | „Weitere Sprachen folgen.“ | ok (E5) |
| viele | „noch nicht fachlich geprüft“ | ok, bis Fachprüfung |

## 4. Offen bei Luc / extern

**Entscheidungen**
- E1 Wochen-Konstanz: vorläufig wie empfohlen gebaut → bestätigen.
- E2 Fasten-Timer, E3 GLP-1-Modus, E4 Körperfett von der Waage anzeigen (→ D3), E5 Englisch: offen.
  E2–E5 stehen **nicht** im Entscheidungsblatt `docs/Entscheidungen.md`.
- Weitere offen: endgültiger App-Name (Markenrecherche), Budget/Zeit pro Woche (Phase 0.5, O5), Monetarisierung
  (10.3), Expo-Updates behalten/abschalten (D2), Anbieterangaben/Impressum, Veröffentlichungsort Datenschutzseite,
  Zielprognose/Hochrechnung (1.7), „vorläufig umgesetzt“-Tabellen in Entscheidungen.md (Phase 4/8/A4–A5) bestätigen,
  problematische Supplement-Namen (Rechtsmappe 4a).

**Gerätetests** (`docs/Geraetetest.md`): R1 Daten D1–D6/V4, R6 Timer T1–T10, Optik-Paket, X1–X14, VoiceOver
VO1–VO10, Gym-Test Phase 2, iPhone-Tests Phasen 4/5/8/9, eine Woche Ernährung, Coach-Woche + Check-in,
2 Wochen Morgen-Check (A6), 3–4 Wochen für Verbrauch (A7), Supermarkt (A9), OFF-Test 50 Produkte (A3.8/FOOD-009),
echte Strong/Hevy-Dateien (A5), Allergene live, Rezept-Link auf dem iPhone. Ungetestet in der Liste: Supersatz und
Scheibenrechner im Gym (A1-„Fertig, wenn“), Blutdruck, Meilensteine, Plan-Wochen, leichte Woche, Atemübung,
Bettzeit-/Morgen-Erinnerung, ml/oz.

**Fachprüfung** (R3): Fachperson beauftragen, `docs/Fachpruefung_Mappe.md` A–L. Nicht in der Mappe: Wissensartikel
(A10.8, 12 Gesundheitstexte), Koffein-Einordnung (EFSA), WHO-Cardio-Orientierung, Gewichts-Hochrechnung,
Bewegung auf Übungsbildern (`movementReviewed`).

**Rechtsprüfung** (R5/R8): Anwalt, `docs/Rechtspruefung_Mappe.md` (vorher um Rezept-Link, Exporte, neue
Gesundheitsdaten ergänzen), Supplement-Namen, Programm-Namen.

**Store/Konto** (R7): Apple Developer Program (MacBook), App-Name, Screenshots, Datenschutz-URL, OFF-Kennung mit
Kontakt-E-Mail, `npm audit`/`expo-doctor` mit Internet.

**Pilot** (Phase 7): TestFlight, 5–10 Tester, 2 Wochen, Auswertung.

**Inhalte**: Übungsbilder mit Higgsfield (Top 100–150), Bilder für Messanleitung.

**MacBook (bewusst verschoben, keine Lücke)**: D1–D12 inkl. Apple Health/Health Connect, Face ID, SQLCipher,
Live Activity.

## 5. Vergessene Doku-Pflege (Docs passen nicht mehr zum Code)

| Datei | Problem |
|---|---|
| `docs/Rechtspruefung_Mappe.md` (Stand 30.10.) | Datenflüsse D1–D7 ohne Rezept-per-Link-Abruf (`data/meal-plan.ts:126`), ohne PDF/CSV/Zwischenablage/Teilen-Karten; Gesundheitsdaten-Liste ohne Blutdruck, Morgen-Check, Status krank/verletzt, Journal, Anstrengung; Lizenzmatrix ohne USDA SR28 |
| `docs/Datenschutz_Entwurf.md`, `website/datenschutz.html` | gleiche Lücken; Webseite listet Gesundheitsdaten ohne Blutdruck/Bereitschaft |
| `docs/Pakete_und_Sicherheit.md` (Stand 29./30.10.) | `expo-print`, `expo-clipboard`, `react-native-view-shot` fehlen (A5/A10); „Netzwerkzugriffe: nur Open Food Facts“ falsch; Testzahl 508 statt 676; USDA-Daten fehlen unter Daten-Lizenzen |
| `docs/Freigabematrix.md` (Stand 30.10.) | R1 „508 Tests, Golden-Dataset 4 → 16“ (heute 26); R3 nennt nur Rechner/Coach/Check-in/Steigerung, nicht Bereitschaft, Fassung 2, Deload; R5 Netzwerk nur OFF |
| `docs/Store_Texte.md` (Stand 30.10.) | Beschreibung/Stichwörter ohne A1–A11 (Cardio, RIR/Supersätze, Grundnahrungsmittel offline, Export/Import, Bereitschaft, Wochenplan/Einkaufsliste); Screenshot-Liste veraltet |
| `docs/Pilot_Leitfaden.md` (Stand 30.10.) | Aufgaben für Tester ohne A-Funktionen |
| `docs/Entscheidungen.md` | E1–E5 fehlen in „Noch offen“; „Einheiten: ml/oz nicht“ und „Maße als Verlauf, nicht als Ziel“ überholt (A10.2/A10.3); Zielprognose „keine“ vs. Hochrechnung |
| `docs/Fahrplan.md` | Phase-4-„Offen“: „ml/oz und ft nicht gebaut“, „bebilderte Messanleitung“, Zieltypen Maße – teils erledigt; Phase 5 „Export des Protokolls: Phase 6.5“; 10.5 „29 Fragen“ (30); Zahlen 1683 Texte usw.; Plan-Import/Rezeptbuch/vergessenes Training nur als Tabellenzeile |
| `docs/Ausbauplan.md` | Alle A als „fertig“, obwohl die eigenen „Fertig, wenn“ (Luc-Tests) nicht erfüllt sind und die Regel „erst wenn erfüllt, nächste Phase“ lautet → besser „gebaut, Test offen“; Abdeckung „jede Lücke genau einer Stelle“ nicht ganz vollständig (s. 1.10); Parallel-Zulieferung fehlt |
| `docs/Fachpruefung_Mappe.md` | Kopf „Stand 30.10.2026, Regelfassungen Coach 1, Check-in 1, Steigerung 1“ |
| `docs/Geraetetest.md` | Kopf „Stand 30.10.2026“; fehlende Tests s. Abschnitt 4 |
| `docs/Repo_Vergleich.md` | „Für später notiert (nicht gebaut)“: 1RM, Scheibenrechner, Schnelleintrag, 1 Packung, Tagesgrenze, englische Namen sind inzwischen gebaut |
| `docs/Anleitung_Development_Build.md` (Stand 30.10.) | „Nur Lesen von Schritten, keine Schreibrechte“ widerspricht D3 (lesen **und** schreiben, Schlaf/HRV/Gewicht …); `expo-dev-client` nicht erwähnt; Widgets/Watch/Siri (D5–D10) fehlen in der Tabelle |
| `docs/Anleitung_Uebungsbilder.md` | Stilvorgabe (Abschnitt 0) leer, Top-150-Liste fehlt |
| `src/i18n/de.ts` | veraltete Texte s. Abschnitt 3 (Fotos, Rechner, Cardio, Datenschutz, Hilfe, Datenquellen) |
