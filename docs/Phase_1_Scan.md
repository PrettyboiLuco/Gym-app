# Phase 1 Scan (01.11.2026)

Ein vollständiger Abgleich vor den nächsten Prioritäten. Geprüft wurden:
- die Arbeitsgrundlage v2.0 (PDF, 96 Seiten, 147 Anforderungen)
- Lucs Trainingsplan, nur Seite 1
- Fahrplan und Ausbauplan ab den Anfangsphasen
- der ganze Code auf Fehler
- die Oberfläche im Hell- und Dunkelmodus
- das App-Symbol
- Pakete und Sicherheit

**Es wurde nichts am Code geändert.** Die Einzeltabellen stehen in `docs/phase1_scan/` (A–E). Gefundene Fehler wurden
mit Wegwerf-Skripten gegen den echten Code bestätigt oder sind ausdrücklich als „unbestätigt“ markiert.

## 1. Kurzfazit

| Bereich | Ergebnis |
|---|---|
| Arbeitsgrundlage (147 IDs) | **69 umgesetzt**, 8 fertig gebaut, aber noch ohne Fachfreigabe, **19 teilweise**, **0 fehlen ganz**, 28 bewusst verschoben (mit Doku-Beleg), 14 extern offen (Anwalt, Store, Luc), 9 kein App-Thema |
| Lucs Plan (Seite 1) | vollständig drin: 4 Tage So/Mo/Mi/Fr, Satzzahlen 16/18/17/13, RIR, Hinweise. Klein: der wöchentliche Wechsel „Chest Press ↔ Multipresse“ und „Trizeps im Wechsel mit Curls“ stehen nur als Notiz, die App wechselt nicht selbst |
| Fehler im Code | **kein kritischer** (kein Absturz, kein großer Datenverlust), **8 mittlere**, gut 20 geringe (nach Gegenprüfung, siehe Abschnitt 10) |
| Plan und Doku | Code fast vollständig. **Texte in der App und Docs sind nicht mitgezogen** (Datenschutz, Hilfe, Fotos-Hinweis, Feedback-Bogen) |
| Oberfläche | sauber und ruhig, aber fast nur Schwarz/Weiß. Die Markenfarbe Lime kommt kaum vor (bewusste Regel vom 31.10.: „Lime nur auf Daten“) |
| App-Symbol | 3D-Look stammt aus einem getlayers-Preset; die Doku sagt „selbst gezeichnet“. **3 eigene Vorschläge** liegen bereit |
| Technik | alle Expo-Pakete passen zu SDK 58; tsc, Lint und 676 Tests sind grün. 16 Warnungen in npm audit betreffen nur das Build-Werkzeug von Expo, nicht die App |

## 2. Fehler, die dich direkt treffen (Gym und Alltag)

| # | Fehler | Wirkung | Fundstelle |
|---|---|---|---|
| F1 | **App-Sperre wirft das laufende Training aus dem Bildschirm** | Bei 3–5 min Pause und gesperrtem Handy (> 60 s) sind getippte, noch nicht abgehakte Werte, das Pausen-Vollbild und der Halte-Countdown weg. Abgehakte Sätze bleiben | `components/lock-gate.tsx:36–50` |
| F2 | **Doppeltipp auf „Training starten“ legt zwei Trainings an** | Mini-Player und „Heute“ zeigen danach ein Geister-Training | `app/training/index.tsx:112` |
| F3 | **Doppeltipp bucht doppelt** (Lebensmittel, Vorlage, „In eigenen Worten“, Schnell eintragen, Vortag kopieren, Planassistent) | doppelte Kalorien; beim Assistenten zwei Fassungen, „Rückgängig“ greift die falsche | `nutrition/food/[id].tsx:70`, `add.tsx:102`, `text.tsx:158`, `assistant.tsx:233` u. a. |
| F4 | **Gescannte Produkte lassen sich beim Bearbeiten nicht speichern** | Werte wie Salz „0,0762“ gelten als ungültig | `domain/nutrition.ts:102/310` |
| F5 | **Lebensmittel bearbeiten löscht den Koffeinwert** | Energy-Drink: Namen ändern, danach 0 mg Koffein | `domain/nutrition.ts:335`, `data/nutrition.ts:190` |
| F6 | **Coach bleibt aus**, wenn Ernährung aus- und wieder eingeschaltet wird | Coach muss man von Hand wieder einschalten (und weiß das nicht) | `app/more/modules.tsx:19` |
| F7 | **Bereitschaft: Trainingslast in den ersten 2–4 Wochen zu hoch** | Ampel zeigt ohne Grund „Last hoch“ (Faktor 1,45–2,0 statt ~1,0) | `domain/readiness.ts:77` |
| F8 | **Check-in: falsche Begründung**, wenn das eigene Ziel unter der Untergrenze (1200) liegt | Die Zahl 1200 ist gewollt (Sicherheitsgrenze), aber die App sagt „das Gewicht bewegt sich nicht“, statt „dein Ziel liegt unter der Untergrenze“ – *gering* | `domain/checkin.ts:181/199`, `adaptive.ts:297` |
| F9 | **Notizen werden in der Browser-Vorschau nie gespeichert** (betrifft nur die Web-Vorschau). iPhone: unbestätigt, nur möglich beim Tippen auf „Abschließen“ bei offener Tastatur – *gering* | Trainingsnotiz weg | `session/[id].tsx:917`, `summary/[id].tsx:292` |
| F10 | **Planeditor lädt nach dem Planassistenten nicht neu** | Ändern und Speichern überschreibt still die Fassung des Assistenten | `plan/[id].tsx:157` |
| F11 | **Ältere Sicherung wiederherstellen holt Datenumwandlungen nicht nach** | Real nur: Sicherungen vom 30./31.10. (Version 7–14) bekommen die neuen Kabelgeräte nicht. Ältere Sicherungen gibt es nicht, die Funktion kam erst mit Version 7 – *gering* | `data/backup.ts:155–179` |

**Geringe Fehler (Auswahl, alle in Anhang D und E):**

*Training*
- „Leichte Woche“ läuft bewusst „bis Sonntag“; am Sonntag gestartet ist das nur ein Tag, setzt aber trotzdem den 8-Wochen-Zähler zurück.
- „Ca. 10 % leichter“ bleibt beim selben Gewicht, wenn der Geräteschritt groß ist.
- Halte-Countdown geht verloren, wenn man „Zurück“ tippt.
- Verlauf zeigt nach Mitternacht den Vortag (UTC).

*Ernährung*
- Rezept-Import: „1.000 g“ wird zu 1 g; „2–3 EL“ und „ca. 200 g“ ergeben keine Menge.
- „Tag endet um X Uhr“ wirkt nicht im Tagwechsler.
- Nachträge bekommen die Erfassungszeit als Essenszeit.
- Menge 0,25 Portion wird beim Ändern zu 0,3.
- Einkaufsliste: eigenes Rezept ohne Portionen zählt immer als 1 Rezept.

*Module, Daten und Bedienung*
- Module wirken nicht überall:
  - Dehnen auf „Heute“ trotz ausgeschalteter Routinen.
  - Supplement-Erinnerung läuft ohne Ernährung weiter.
  - Bettzeit-Erinnerung läuft ohne Bereitschaft weiter.
  - Check-in ist ohne Coach erreichbar.
- Bericht für Arzt/Trainer zählt Gegengewicht als Gewicht.
- Eine fehlgeschlagene Wiederherstellung löscht alle Erinnerungen.
- Fehler beim Laden bleiben ewig im Ladezustand.
- Die Knöpfe „‹ › ✕“ im Wochenplan sind ohne Ansage für VoiceOver.

**Ohne Befund geprüft:**
- Einheiten kg/lb, cm/in, ml/oz
- Komma/Punkt bei Eingaben
- Pausenuhr im Hintergrund
- Migrationen 6/7/10/26 (Daten, Indizes, Fremdschlüssel bleiben)
- Sicherung deckt alle 38 Tabellen ab
- Energiebedarf, Untergrenzen, Wochenstart Montag, Sommerzeit
- alle 153 Navigationspfade (keine fehlende Seite)

## 3. Lücken aus PDF und Plan

**Teilweise umgesetzt (Code):**
1. **Journal ohne Zielgröße „Leistung“:** in A6.10 versprochen („kommt mit A8“), nie gebaut.
2. **Zwei Aktivitätsmodelle (COACH-003):** Rechner und Coach können für dieselbe Person zwei verschiedene Ziele ergeben.
3. **Coach gibt volle Makroverteilung vor (COACH-005):** Das PDF will Eiweiß als Bereich bis zur Fachfreigabe. Luc hat das bewusst so entschieden, die Fachprüfung (Mappe B) steht aus.
4. **Gewichts-Hochrechnung mit Datum:** widerspricht `Entscheidungen.md` („keine Zielprognose“) und GOAL-006, zeigt keine Unsicherheit → **Entscheidung Luc**.
5. **PDF-Bericht und KI-Zusammenfassung ignorieren „ohne Zahlen“ und die sensible Situation (TRACK-006).**
6. Kleinere Punkte:
   - keine eigene Stange und keine eigenen Scheiben (A1.10)
   - „Wie am Vortag“ nur für den ganzen Tag (A3.4)
   - Dehn-/HIIT-Protokoll nicht als CSV
   - Blutdruck nicht im Arztbericht
   - Abrufzeit der Schritte gespeichert, aber nicht angezeigt (HEALTH-006, wichtig erst mit Apple Health)
   - Open Food Facts: kein Backoff bei Überlast (FOOD-003); Kennung ohne Kontakt-E-Mail (FOOD-006)

**Texte in der App veraltet (das sieht jeder Nutzer):**
- **Fotos:** „Eine eigene App-Sperre gibt es noch nicht … Sicherung kommt später (Phase 6)“. Beides gibt es längst (`de.ts:2158`).
- **Hilfe/FAQ:** 30 Fragen, keine zu A1–A11; „Was kann die App?“ ist veraltet.
- **Feedback-Bogen für den Pilot:** Cardio, Coach, Bereitschaft, Essen planen, Supplements und Statistik fehlen.
- **Datenschutz und „Welche Daten verlassen mein Handy?“:** nennen nur Open Food Facts.
  - Fehlt: **Rezept per Link** (lädt beliebige Webseiten), CSV/PDF-Export, KI-Zusammenfassung, Teilen-Karten, Strong/Hevy-Import, USDA.
- **Interne Begriffe und alte Stände sichtbar:** „Fahrplan 6.1/6.2“ (`de.ts:1718`), „fließt später ein“ beim Cardio, ein Rechner-Text auf altem Stand.

**Für die Übungsbilder fehlt Claudes Zulieferung:** Liste der 150 häufigsten Übungen und eine Stilvorgabe. Die Bilder
selbst entstehen mit Higgsfield (Luc).

## 4. Recht und Datenschutz (vor Pilot und Store)

- **Rechtsmappe und Datenschutzentwurf stehen auf dem 30.10.**
  - Es fehlen: Rezept-Link (zweiter Netzzugriff), Exporte, Blutdruck, Bereitschaft/Status, USDA.
  - Export-Dateien (CSV/PDF) haben keinen Hinweis „enthält Gesundheitsdaten“.
- **Abgrenzung zum Medizinprodukt (LAW-010):** Blutdruck-Tagebuch, Bereitschafts-Ampel und „Bericht für Arzt“ sind neu und stehen nicht in der Zweckbestimmung → vor dem Anwalt ergänzen.
- **Gesundheitsdaten-Einwilligung (LAW-004):** In der App gibt es keine eigene Einwilligung nach Art. 9. Die Frage an den Anwalt steht in der Mappe.
- **Expo-Updates mit Server in den USA (LAW-005/008):** behalten oder vor dem Store abschalten? Offen.
- **Sicherungsdatei unverschlüsselt (TECH-013, verschoben):** Es gibt nur einen Warnhinweis.
- **Support, Notfallplan, Not-Aus für Onlinefunktionen (TECH-020, LAW-018):** Der Fahrplan legt das in Phase 11, das PDF verlangt es **vor der öffentlichen Beta**.
- **App-Symbol (MEDIA-013):** 3D-Look aus dem getlayers-Preset „Heart“, Nutzungsbedingungen nicht dokumentiert. Die Doku nennt es „selbst gezeichnet“ (`Freigabematrix.md:14`, `Rechtspruefung_Mappe.md:51`).
- **Weitere offene externe Punkte:** Impressum, öffentliche Datenschutz-URL, DSFA-Schwelle, Nutzungsbedingungen, Gewerbe, Versicherung.

## 5. Oberfläche: mehr Stimmung (nur Befund und Vorschläge)

**Befund (Screenshots aller Haupt-Tabs, hell und dunkel):**
- Ordentlich, ruhig, gut lesbar, aber fast **monochrom**.
- Lime erscheint nur als kleiner Punkt („Jetzt dran“) und in Diagrammen.
- Das Herz aus dem Start sieht man danach nie wieder.
- Die Wochenpunkte sind graue Kreise, die Hero-Karte „Push (So)“ ist eine reine Textkarte.
- Leere Zustände lesen sich trocken („0 von 0 Plan-Wochen“).

Ursache ist die bewusste Regel vom 31.10. („Lime nur auf Daten, nie auf Knöpfen“). Sie war richtig gegen
„zu bunt“, hat aber auch die Stimmung mitgenommen.

**Vorschlag:** sechs dosierte Schritte. Die Navigation bleibt schwarz/weiß, die Stimmung entsteht dort, wo Training
und Erfolg passieren.

| # | Idee | Wo | Stärke |
|---|---|---|---|
| U1 | **Lichtband hinter der Hero-Karte:** ein weicher Lime-Schein von unten (wie das getlayers-Gradient „Meridian“, als einfacher Verlauf ohne Shader) | „Heute“, Training-Vorschlag | leicht |
| U2 | **Wochenpunkte mit Leben:** erledigte Tage als gefüllte Lime-Punkte mit leichtem Glühen, geplante Tage als Lime-Ring, heute pulsiert einmal | „Heute“, Training | leicht |
| U3 | **Tageszeit-Stimmung im Kopf:** morgens kühles Weiß-Blau, abends ein warmer, sehr dunkler Ton hinter „Guten Abend“ | Kopf von „Heute“ | sehr leicht |
| U4 | **Muskelkarte in der Hero-Karte:** die vorhandene Muskelkarte klein neben „Push (So)“, die trainierten Muskeln in Lime | Hero „Heute“ und Training | mittel |
| U5 | **Erfolgsmomente:** Satz abgehakt → kurzer Lime-Puls; Training fertig → das Herz aus dem Start kommt zurück (Ring schließt sich) | Training, Abschluss | mittel |
| U6 | **Leere Zustände mit Charakter:** statt „0 von 0“ ein Satz und ein kleines Lime-Symbol („Deine erste Plan-Woche beginnt mit dem ersten Training“) | Meilensteine, Fortschritt | leicht |

**MCP-Referenzen** (getlayers.ai):
- Gradient **Meridian** („eine Lichtlinie mit Abfall“, ruhig) – Vorbild für U1
- Gradient **Antumbra** (weiches Schattenlicht, gibt es auch in Grün)
- Palette **Iris Voltage** – zeigt, wie Acid-Lime auf Dunkel wirkt, wenn es rationiert ist

Die Shader selbst wären für eine App zu schwer. Gemeint sind Look und Dosierung, umgesetzt als einfacher Verlauf
bzw. mit Reanimated. Nichts davon ist gebaut.

## 5b. Gegenprüfung mit dem taste-skill (02.11.2026)

Ablauf „App-Bildschirme“ des taste-skills (`.claude/skills/taste-skill/references/app-screens.md`):
- **Stil-Blatt:** `draw.mjs --app --kind workspace --theme dark --style true-black-flat`, Seed 1783295645, liegt in
  `.taste-skill/direction.json`. Er passt zu dem, was die App schon ist.
- **Messung:** `inspect.mjs --app` bei 390 px ergab 0 FAIL. Er sieht im frischen Browser nur den Willkommensbildschirm;
  die Tabs wurden nach den Screenshots bewertet.

**Befund nach den 7 App-Fragen:**
1. **Die Frage von „Heute“** („Was trainiere ich heute, und wie steht meine Woche?“) beantwortet die größte Karte
   richtig. Die **Woche** darin sind aber 7 leere graue Kreise und der Satz „an 0 Tagen trainiert“. Das wichtigste
   Datenelement trägt keine Farbe und keine Menge.
2. **Doppelte Angabe:** „heute ist Push (So) dran“ im Kopf und „Heute im Plan: Push (So)“ in der Karte.
3. **Der Morgen-Check** (fünf Reihen Antipp-Knöpfe) füllt die Mitte von „Heute“ und schiebt alles andere unter den
   ersten Bildschirm.
4. **Kein Gesicht:** Lime erscheint nur als kleiner Punkt. Der Skill nennt „Lime auf Schwarz ohne Farbe auf den Daten“
   ausdrücklich als Kit-Merkmal. Nötig ist ein Element, das nur diese App hat.
5. **Leere Zustände** wie „Letzte 4 Wochen: 0 von 0 Plan-Wochen“ (dreimal ähnlich) sind ehrlich, aber ohne nächsten
   Schritt.

**Was der Skill an den Ideen aus Abschnitt 5 ändert:**

| Idee | Urteil | Grund |
|---|---|---|
| U1 Lichtband/Schein | **gestrichen** | Glows und Verläufe sind verboten; „Off-style: glow“ |
| U2 leuchtende Wochenpunkte | **ersetzt** durch die Satz-Woche (unten) | ohne Glow, dafür mit echter Menge |
| U3 Tageszeit-Färbung | **gestrichen** | Der Grund bleibt echtes Schwarz; Stimmung über die Daten, nicht über den Hintergrund |
| U4 Muskelkarte in der Hauptkarte | bleibt (Stufe 2) | Daten aus der App, Lime auf den Muskeln = Farbe auf Daten |
| U5 Erfolgsmomente | bleibt als **Rückmeldung** (Satz-Haken, Abschluss) | Auftritte beim Öffnen sind auf App-Bildschirmen verboten, Rückmeldung nicht |
| U6 leere Zustände | bleibt, präzisiert | Rahmen behalten, ein Satz mit dem nächsten Schritt |
| L Lime-Knopf | **gestrichen** | „Der Akzent berührt nie Knöpfe, Tabs oder Navigation“; die weiße Pille (Inversion) ist richtig |

**Neue Vorschläge aus dem Skill:**
- **T1 Satz-Woche (Signatur-Element):** Wie in Lucs eigenem Trainingsplan („Balken: Sätze pro Training“) zeigt die
  Woche 7 Spalten mit je einem Balken. Die Höhe entspricht den geplanten Sätzen (So 16, Mo 18, Mi 17, Fr 13).
  Erledigte Sätze sind lime gefüllt, geplante als dunkle Fläche #2a2a2a, Ruhetage als kurze Linie, heute mit einer
  1-px-Lime-Linie markiert. Dazu die Kopfzahl „0 von 64 Sätzen“. Das ersetzt U2 und gibt der App ihr Gesicht.
- **T2 Zähler-Kacheln** (Muster „home“, auf dem Handy 2 × 2): Sätze diese Woche, Trainings von Plan, Kalorien heute,
  Schlaf letzte Nacht. Jeweils Bezeichnung, Wert in normaler Stärke und eine schlichte Zeile darunter, ohne Symbole und
  ohne Pfeile.
- **T3 Morgen-Check kompakt:** auf „Heute“ eine Zeile („Morgen-Check · 4 Antippen“), die den Check als Blatt öffnet;
  erledigt nur noch die Ampel mit Kurzbegründung.
- **T4 Doppelte Angabe weg:** Der Kopf zeigt nur das Datum, der Plantag steht in der Karte.

## 6. App-Symbol: 3 eigene Vorschläge

Dateien: `design/logo/vorschlaege/` (SVG, PNG 1024 und `logo-vergleich.png` mit echter Home-Bildschirm-Größe).
Alle drei sind vollständig selbst gezeichnet (keine Vorlage) und bleiben in der Markenwelt Lime auf Fast-Schwarz.

| # | Name | Idee | Klein lesbar? |
|---|---|---|---|
| 1 | **Puls-Hantel** | Hantel, deren Stange eine Pulslinie ist: Training + Gesundheit in einem Zeichen | ja; Linien für die Endfassung etwas dicker |
| 2 | **M-Puls** | Das „M“ von Myhealth als Herzschlag, mit Punkt am Ende | sehr gut, am klarsten |
| 3 | **Ring + Herzschlag** | Fortschrittsring wie in der App, innen ein weißer Herzschlag – passt zu den Ringen auf „Heute“ | gut |

Die Vorschläge sind flache Entwürfe. Die gewählte Form kann danach wie das jetzige Herz als 3D-Version gerendert
werden, mit eigenem Render statt Preset.

### 6b. 3D-Fassungen über getlayers (02.11.2026)

Alle drei Vorschläge sind mit dem getlayers-Werkzeug **„SVG to 3D“** gerendert, auf demselben Weg wie das jetzige Herz.
Material, Licht, Glanz und Nachbearbeitung kommen 1:1 aus dem Bau-Prompt des Werkzeugs (three.js 0.158, Flüssig-Chrom
in #C6F24E, Rand- und Fülllicht). Die Formen sind eigene: Die Linienentwürfe wurden für das Extrudieren in Flächen
umgewandelt (`design/logo/vorschlaege/shapes3d.js`).

- Vergleich mit dem jetzigen Symbol: `design/logo/vorschlaege/3d/vergleich-3d.png`
- Einzelbilder: `…/3d/<name>-3d.png` (schräg wie das jetzige Symbol), `…/3d/<name>-3d-front.png` (gerade)
- Neu erzeugen: `cd design/logo && node vorschlaege/shapes3d.js && node run.js vorschlaege/3d/jobs.json`

### 6c. Effekt für die Erfolgsmomente (U5) über getlayers

Das Werkzeug **Text Animations**, Voreinstellung **„Pop Scale“**: Buchstaben springen mit leichtem Überschwingen auf.
- Werte aus dem Bau-Prompt: out = Deckkraft 0 / Größe 0 → in = 1 / 1, Feder Spannung 320, Reibung 14, 25 ms Versatz je
  Buchstabe.
- Die Web-Bibliothek dahinter (spring-text-engine) läuft nicht in React Native. Die Werte würden wie schon bei
  „Word Rise“ 1:1 auf Reanimated übertragen (Spannung = stiffness, Reibung = damping, Masse 1).
- Einsatz nur als Rückmeldung auf dem Abschluss-Bildschirm („Training geschafft“). Kein Auftritt beim Öffnen, wie es
  der taste-skill für App-Bildschirme verlangt.

## 7. Was ich vergessen bzw. nicht nachgezogen hatte

Ehrlich aufgelistet. Das sind Dinge, die bei A1–A11 hätten mitlaufen müssen:

1. **Datenschutz-Texte** in App und Docs bei neuen Netzzugriffen und Exporten (Rezept-Link, CSV, PDF, KI-Text).
2. **Hilfe/FAQ und Feedback-Bogen** um die neuen Bereiche ergänzen (beim Feedback-Bogen ist das schon zum zweiten Mal passiert).
3. **Fotos-Hinweistext** nach App-Sperre und Sicherung aktualisieren.
4. **Module ein/aus** auch bei Supplement- und Bettzeit-Erinnerung, Dehnen-Angebot und Check-in.
5. **Doppeltipp-Sperre** als gemeinsames Muster für alle Speichern-Knöpfe (statt je Bildschirm).
6. **Stand-Pflege der Docs:**
   - `Pakete_und_Sicherheit.md` (3 Pakete fehlen, 508 statt 676 Tests)
   - `Freigabematrix.md`
   - `Store_Texte.md`
   - `Pilot_Leitfaden.md`
   - `Entscheidungen.md` („ml/oz nicht“ ist überholt)
   - Köpfe „Stand 30.10“
7. **Ausbauplan** sagt „fertig“, obwohl die eigenen „Fertig, wenn“-Tests durch Luc noch offen sind. Besser „gebaut, Test offen“.
8. **Gerätetest-Liste** ohne Tests für Supersatz, Scheibenrechner, Blutdruck, Meilensteine, leichte Woche und Atemübung.
9. **Zulieferung Übungsbilder** (Top-150-Liste und Stilvorgabe).
10. **`expo-dev-client`** fehlt, obwohl `eas.json` ein Entwicklungsprofil hat. Wird mit dem MacBook gebraucht.

## 8. Fragen an Luc

1. **Stimmung:** Welche der Ideen U1–U6 willst du? Alle sechs, oder erst U1+U2+U6 (leicht) und den Rest danach?
2. **Lime-Regel:** Darf Lime künftig auch auf den Haupt-Knopf „Training starten“ (statt Weiß/Schwarz)? Das wäre der größte Einzelschritt zu mehr Stimmung.
3. **App-Symbol:** Welcher der drei Vorschläge oder beim 3D-Herz bleiben? Falls neu: flach lassen oder als 3D rendern?
4. **Gewichts-Hochrechnung mit Datum:** behalten (dann mit Unsicherheitsbereich und Eintrag in die Fachprüfungs-Mappe) oder entfernen (wie in `Entscheidungen.md`)?
5. **Coach-Makros:** bei der festen Verteilung bleiben (deine Entscheidung) oder bis zur Fachprüfung nur Eiweiß als Bereich?
6. **Expo-Updates (Server in den USA):** für Pilot und Store behalten oder abschalten?
7. **Entscheidungen E2–E5:** Fasten-Timer, GLP-1-Modus, Körperfett von der Waage, Englisch. Willst du die jetzt entscheiden oder später?
8. **Wöchentlicher Wechsel** (Chest Press ↔ Multipresse, Trizeps ↔ Curls): soll die App das automatisch abwechseln oder reicht die Notiz?
9. **Support/Notfallplan:** vor dem Pilot einbauen (wie das PDF verlangt) oder erst Phase 11?

## 9. Vorschlag für die Reihenfolge danach (Entwurf, wird nach deinen Antworten festgelegt)

1. **P1 Fehler, die im Gym stören:** F1 App-Sperre, F2/F3 Doppeltipp (gemeinsames Muster), F10 Planeditor.
2. **P2 Falsche Zahlen und Daten:** F4/F5 Lebensmittel, F7 Bereitschaft, F6 Coach-Schalter, dann geringe Fehler (F8, F11, Rezept-Import, Rundungen).
3. **P3 Texte und Datenschutz nachziehen:** Fotos-Text, Hilfe, Feedback-Bogen, Datenschutz in App und Docs, Export-Hinweis, Module überall.
4. **P4 Stimmung und App-Symbol** nach deiner Auswahl.
5. **P5 Doku-Stand** und Gerätetest-Liste ergänzen; Zulieferung Übungsbilder.
6. **Mit MacBook:** Development Build, Apple Health und Health Connect (D3/D4/D9).

## 10. Gegenprüfung (02.11.2026, nach Lucs „Sicher?“)

Die Fehlersuche lief über fünf Hilfs-Agenten. Deren Prüfskripte haben Werte meist nur ausgegeben, nicht hart geprüft.
Deshalb habe ich jeden mittleren Fehler selbst im Code nachgelesen und die Werte gegen den echten Code laufen lassen.

**Selbst bestätigt (Code gelesen, Werte nachgerechnet):**
- F1 App-Sperre hängt die App aus
- F2 kein Schutz gegen Doppelstart
- F3 Buchen ohne Sperre
- F4 Salz „0,0762“ ergibt den Fehler „nutrient“
- F5 Koffein ist nach dem Bearbeiten NULL
- F6 Coach-Schalter
- F7 bei 21 Tagen Verlauf 1,45 statt richtig ≈ 1,09
- F10 Editor lädt nur beim Öffnen; der Assistent wird aus ihm geöffnet und ersetzt sich danach durch einen zweiten Editor, der alte bleibt darunter
- Rezept-Import („1.000 g“ → 1 g; „2–3 EL“ und „ca. 200 g“ ohne Menge)
- Rundung „10 % leichter“
- Sicherung v14 ohne neue Kabelgeräte
- veralteter Fotos-Text
- Datenschutz-Texte ohne Rezept-Link
- Supplement- und Bettzeit-Erinnerung ohne Modul-Prüfung
- Herkunft des App-Symbols

**Korrigiert (vorher zu hoch eingestuft):**
- **F8:** Die Zahl 1200 ist die gewollte Sicherheitsgrenze; nur die Begründung ist falsch → gering.
- **F9:** Sicher betrifft das nur die Browser-Vorschau (react-native-web kennt `onEndEditing` nicht); auf dem iPhone ist es unbestätigt → gering.
- **F11:** Sicherungen gibt es erst ab Schema-Version 7. Die Teile „Kalorienziel v ≤ 3“ und „Plank v ≤ 5“ können nie eintreten → gering.
- **Leichte Woche:** „bis Sonntag“ ist gewollt; der Fehler ist nur das Zurücksetzen des 8-Wochen-Zählers.

**Nicht selbst gegengeprüft** (Agenten-Befund, plausibel, vor dem Beheben einzeln prüfen):
- die übrigen geringen Oberflächen-Punkte aus Anhang E
- die Einstufung jeder einzelnen PDF-ID in Anhang A/B; Stichproben stimmten (HEALTH-006, Datenschutz, Module, Fotos-Text)

## 11. Umsetzung (02.11.2026)

| Paket | Stand | Commit |
|---|---|---|
| P1 Fehler im Gym | **behoben:** App-Sperre als Ebene (Training bleibt), Doppeltipp-Sperre zentral (`useOnce` in Button, Listenzeile, Satz-Haken) + Doppelstart-Schutz in der Datenbank, Planeditor lädt nach dem Assistenten neu, Halte-Countdown wird beim Verlassen eingetragen | `7f2eeb5` |
| P2 Zahlen und Daten | **behoben:** F4–F8, F11 und alle geringen Logikfehler aus Anhang D/E; je Fehler ein Test in `scan-fixes(-data).test.ts` | `96196b6` |
| P3 Texte und Datenschutz | **behoben:** Fotos-Text, Hilfe (44 Fragen), Feedback-Bereiche, Datenschutz in App/Docs/Webseite, Gesundheitsdaten-Hinweis an Exporten, Bericht ohne Ernährungszahlen bei „ohne Zahlen“ (TRACK-006), Module überall | `a35241d` |
| P4 Stimmung und App-Symbol | **umgesetzt (02.11.):** T1 Satz-Woche (Heute, Training, Abschluss), T2 Kacheln 2 × 2 mit Schlaf, T3 Morgen-Check als Zeile, T4 keine doppelte Angabe, U4 kleine Muskelkarte, U5 Lime-Puls am Satz-Haken + „Pop Scale“ (getlayers) + Herz auf dem Abschluss, U6 leere Zustände mit nächstem Schritt. App-Symbol bleibt vorerst das 3D-Herz (Entscheidung Luc). Dabei gefunden und behoben: Trainingstage aus der Plan-Datei gingen ohne Coach-Einrichtung verloren. | siehe Git-Log |
| P5 Doku | **erledigt:** Doku-Stand, Gerätetest X15–X20/S1–S8, Übungsbilder Top-150 + Stilvorgabe | `06c57a3` |
| Weiter ohne MacBook | **erledigt:** Journal „Leistung“ (A6.10), eigene Stange/Scheiben (A1.10), CSV Dehnen/HIIT, Blutdruck im Bericht, Schritte-Abrufzeit (HEALTH-006), Backoff bei Open Food Facts (FOOD-003), Online-Funktionen abschaltbar + Not-Aus + Support-/Notfallplan (TECH-020, LAW-018) | `d6b2f5e` |
| P6 Apple Health / Health Connect | wartet auf das MacBook | – |

Bewusst offen gelassen (brauchen Lucs Entscheidung oder etwas außerhalb der App): Wochenwechsel Chest Press/Multipresse,
Gewichts-Hochrechnung, Coach-Makros, Expo-Updates, Kontakt-E-Mail in der Open-Food-Facts-Kennung, Uhrsprünge
(HEALTH-016, nur mit Development Build sinnvoll prüfbar), Einwilligung nach Art. 9 (Anwalt).
