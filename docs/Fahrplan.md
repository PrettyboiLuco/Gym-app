# Fahrplan: von null bis App Store

Für Luc: iPhone vorhanden, MacBook ab Ende November, Windows-PC mit Claude Code, keine klassische
Programmiererfahrung. Technik: Expo / React Native mit TypeScript, lokale Datenbank, Deutsch zuerst mit
Übersetzungsstruktur.

**So arbeiten wir in jedem Schritt:** Claude Code schreibt den Code → du testest auf dem iPhone →
du sagst, was nicht passt → erst wenn „Fertig, wenn“ erfüllt ist, kommt der nächste Schritt.
Jeder Schritt ist ein eigener Git-Commit, damit man immer zurück kann.

Kosten bis Phase 6: **0 €**.

Abdeckung geprüft: alle 197 Registerpunkte (147 + 50) und alle offenen Punkte O1–O7 aus Kap. 19 sind einer Phase zugeordnet. Danach Apple Developer Program 99 $/Jahr.

---

## Phase 0 – Vorbereitung (1 Abend)

| # | Schritt | Wer |
|---|---|---|
| 0.1 | Node.js (LTS) und Git auf dem PC installieren | du, Claude erklärt |
| 0.2 | Repository `Gym-app` von GitHub auf den PC klonen | du |
| 0.3 | App „Expo Go“ aus dem App Store aufs iPhone laden | du |
| 0.4 | Arbeitstitel für die App festlegen (kann später geändert werden) | du |
| 0.5 | Grobes Budget und Zeit pro Woche ins Entscheidungsblatt (`docs/Entscheidungen.md`, O5) | du |

**Fertig, wenn:** `node --version` und `git --version` am PC funktionieren und Expo Go auf dem iPhone ist.

## Phase 1 – Grundgerüst

| # | Schritt | Register |
|---|---|---|
| 1.1 | Expo-Projekt anlegen, auf dem iPhone per QR-Code öffnen; alle Pakete mit fester Version, Lizenz und Sicherheitsmeldungen notiert | TECH-001, TECH-010, TECH-011 |
| 1.2 | Navigation mit 5 Bereichen: Heute · Training · Ernährung · Fortschritt · Mehr | UX-001 |
| 1.3 | Sprachdatei Deutsch; kein Text direkt im Code; Datum/Zahlen nach Sprache | UX-004 |
| 1.4 | Farben, Schriftgrößen, Hell/Dunkel; große Schrift möglich | TECH-019 |
| 1.5 | Lokale Datenbank (SQLite) mit Migrationen und sofortigem Speichern | TECH-012 |
| 1.6 | Automatische Tests einrichten, die 24 Referenztests als echte App-Tests übernehmen | LAW-017 |

**Fertig, wenn:** Die App öffnet sich auf dem iPhone, alle 5 Bereiche sind erreichbar, ein Testeintrag
überlebt das Schließen der App.

**Stand 29.10.2026:** 1.1–1.6 gebaut im Ordner `mobile/` (Expo SDK 58). Erster echter Eintrag: Körpergewicht
unter „Fortschritt“. 37 automatische Tests (die 24 + 22 Referenztests als App-Code), Typprüfung und Lint
bestanden; iOS-Bundle und Web-Vorschau bauen fehlerfrei; im Browser getestet (Speichern, Neuladen,
Fehleingabe). **29.10.2026: auf Lucs iPhone in Expo Go bestätigt** (Gewicht bleibt nach Neustart erhalten).
Nachgeholt: Löschen mit Rückfrage, Datenbank-Tests mit echten Tabellen, Paket-/Sicherheitsliste
(`docs/Pakete_und_Sicherheit.md`). Vorschau aufs iPhone: Ablauf `mobile/.eas/workflows/expo-go-vorschau.yml`,
dann expo.dev → Updates → oberstes Update → Preview.

## Phase 2 – Training (Kern)

| # | Schritt | Register |
|---|---|---|
| 2.1 | Übungsliste: kleine Startliste aus freier Datenbank (Lizenz geprüft: RepDB Free / Free Exercise DB / RepDB-Starter / RN-Starter) + eigene Übungen anlegen | TRAIN-003, TECH-007, TECH-008, TECH-009 |
| 2.2 | Plan manuell anlegen: Tage, Übungen, Sätze, Wiederholungen, Pausen | TRAIN-002, -004 |
| 2.3 | Training starten: Satz eintragen (Gewicht, Wdh.), abhaken, sofort gespeichert; Knopf „Schmerz/Abbruch“ ohne Therapie-Tipps | TRAIN-013, TRAIN-017 |
| 2.4 | Pausentimer: 30 s / 3 / 4 / 5 min / frei, Auto-Start, verlängern, überspringen | HEALTH-008, -009 |
| 2.5 | Letzte vergleichbare Leistung bei jeder Übung anzeigen | TRAIN-014 |
| 2.6 | Trainingsverlauf; Planänderung erzeugt neue Version, alte Trainings bleiben; verpasster Tag: neu planen oder fortsetzen | TRAIN-010–012, TRAIN-015 |
| 2.7 | HIIT/Intervall-Timer (Belastung, Pause, Runden) | HEALTH-010 |

**Fertig, wenn:** Du ein echtes Training im Gym komplett mit der App protokollieren kannst.

**Stand 29.10.2026:** 2.1–2.7 gebaut. 25 Startübungen + eigene Übungen; Pläne mit 1–7 Tagen, Versionen und
„Wieder verwenden“; Training mit geplanten/tatsächlichen Werten, Vorschlag aus vorigem Satz bzw. letztem Mal,
„Satz hinzufügen“, „Übung hinzufügen“, „Schmerzen / abbrechen“; Pausentimer (Endzeit gespeichert, +30 s,
Überspringen, Vibration am Ende, nur bei offener App); Verlauf; Intervall-Timer; „Heute“ zeigt nächsten Tag.
77 automatische Tests, Browser-Test aller Abläufe bestanden. **Offen:** Test im Gym auf dem iPhone.
Bewusst später: Timer bei gesperrtem Handy (Phase 6), fertige Pläne und Progression (Phase 8).

**Prüfung Phase 2 (29.10.2026), Zeile für Zeile gegen Plan und Register:** 4 Fehler und 10 Lücken gefunden
und behoben – Vibration nach „Überspringen“ (Timer-Generation), Werte wieder geöffneter Sätze,
Tausenderpunkt, feste Texte; Pausen-Schnellwahl 0:30–5:00 im Plan und im Training (HEALTH-008), Pause von Hand
starten und Automatik abschaltbar (HEALTH-009), Übungen und Tage umsortieren (TRAIN-002), offene Sätze
entfernen, Intervall-Timer übersteht App-Neustart (HEALTH-011), Satz bleibt bei Timerfehler gespeichert,
Körpergewicht mit 0 kg vorbelegt, Suche nach Muskelgruppe/Gerät (TRAIN-003), Hinweis zu ausgelassenen Tagen
(TRAIN-015), Test 2–6 Tage (TRAIN-004). 91 automatische Tests, Browser-Test 16/16 + 15/15.
Verschoben und eingetragen: UX-011 Zeit-Übungen (Phase 5), UX-012 Warnung bei ungespeicherten Änderungen,
UX-013 eigene Übungen bearbeiten (beide als Schritt 3.0).

## Phase 3 – Ernährung & Kalorientracker

| # | Schritt | Register |
|---|---|---|
| 3.0 | Nachträge aus Phase 2: Warnung bei ungespeicherten Planänderungen, eigene Übungen bearbeiten | UX-012, UX-013 |
| 3.1 | Lebensmittel manuell anlegen (kcal/Makros pro 100 g/ml) | FOOD-010, -011 |
| 3.2 | Tagebuch: Frühstück/Mittag/Abend/Snack, Menge, Nachtrag für gestern, Zeitzone/Sommerzeit; Nährwerte als Snapshot gespeichert | TIME-001, -002, -003, FOOD-012 |
| 3.3 | Barcode-Scanner mit Open Food Facts, Produkt bestätigen; gleichnamige Produkte nicht zusammenwerfen | FOOD-001–006, FOOD-018 |
| 3.4 | Suche (inkl. Grundnahrungsmittel über USDA), Favoriten, „zuletzt gegessen“, Mahlzeit kopieren | FOOD-007, -008, -016, TRACK-005 |
| 3.5 | Rezepte mit Endgewicht und Portionen; Vorlagen wie „Nutella-Brot“ | FOOD-013, FOOD-017 |
| 3.6 | Getränke & Wasser, eigene Glasgrößen, Trinkziel (editierbar) | TIME-004–012 |
| 3.7 | Tagesübersicht gegessen/Ziel/übrig + Wochenansicht; optionaler Modus ohne Zahlen | TRACK-001–004, TRACK-006 |

**Fertig, wenn:** Du eine Woche lang deine Ernährung nur mit der App erfassen kannst.
Parallel: 50 eigene Produkte scannen und Trefferquote notieren (FOOD-009, O2).

**Stand 29.10.2026:** 3.0–3.7 gebaut. Plan-Editor, Lebensmittel-, Rezept-, Eintrags- und Einstellungsseiten
fragen vor dem Verlassen mit ungespeicherten Änderungen nach (UX-012); eigene Übungen umbenennbar, Verlauf
bleibt verknüpft (UX-013). Tagebuch mit Tag vor/zurück (Nachtrag), vier Mahlzeiten (Vorschlag nach Uhrzeit,
frei wählbar), Einträge ändern/verschieben/löschen, Schnappschuss der Nährwerte. Eigene Lebensmittel pro 100 g
oder 100 ml, roh/gekocht, Portionsgröße, leere Werte bleiben „unbekannt“; Lebensmittel aus der Liste entfernbar.
Barcode-Scanner (Kamera auf dem iPhone, Eintippen überall) mit Open Food Facts v3, Bestätigen oder Korrigieren,
eigene Abfragegrenzen, Fehler für offline/429/503/nicht gefunden; gleicher Barcode = gleiches Produkt.
Suche lokal + „Online suchen“, Favoriten, „Zuletzt gegessen“, „Wie am Vortag“, Vorlagen aus einer Mahlzeit.
Rezepte mit Versionen, Endgewicht und Portionen getrennt (ohne Endgewicht nur nach Portionen). Getränke im selben
Eintrag wie Essen, Wasser-Schnelltasten mit eigenen Glasgrößen, Trinkziel editierbar, Hinweis zur Zielbasis,
keine Aufforderung nach Zielerreichung. Tagesübersicht gegessen/Ziel/übrig mit Makros, „≥/≤“ bei unbekannten
Werten, Hinweis „Training nicht dazugerechnet“; Woche/30 Tage mit Schnitt nur über vollständige Tage; Modus ohne
Zahlen (Tagebuch, Heute, Woche). „Heute“ zeigt Kalorien und Getränke. Quellenhinweis Open Food Facts (ODbL)
unter „Mehr“. 163 automatische Tests, Browser-Test Ernährung 42/42, Phase-2-Tests 16/16 + 15/15.

**Prüfung Phase 3 (29.10.2026), Zeile für Zeile gegen Register:** 7 Lücken gefunden und behoben – Makrosumme
zeigte unbekannte Kohlenhydrate als „0 g“, Woche/Übrig ohne „≥/≤“ bei unvollständigen Tagen, negatives „übrig“
auf „Heute“, Zubereitung fehlte im Tagebuch, gültige UPC-E-Scans wären abgelehnt worden, Tagebuch blieb nach
Mitternacht auf dem Vortag, Lebensmittel nicht entfernbar; dazu Einzahl/Mehrzahl in Texten.
**Offen / bewusst verschoben:**
- FOOD-008 USDA (Grundnahrungsmittel): die Live-API braucht einen Schlüssel, der laut Plan nur über einen
  eigenen Server laufen darf – den gibt es erst mit Konten/Sync (Phase 11). Alternative ohne Server: eine
  mitgelieferte Liste häufiger Grundnahrungsmittel aus den USDA-Downloads (CC0); Download ist von dieser
  Entwicklungsumgebung aus gesperrt, Entscheidung offen. Bis dahin: eigene Lebensmittel und Open Food Facts.
- TIME-011 Trink-Erinnerungen mit Ruhezeiten: Phase 6.4 (Benachrichtigungen).
- FOOD-014 Freitext, FOOD-015 Essensfoto: Phase 9 (wie geplant). Stand 30.10.: Freitext lokal gebaut (9.5), Essensfoto verschoben (KI/Kosten).
- TRACK-006 Modus ohne Zahlen gilt im Tagebuch, auf „Heute“ und in der Woche; Produktseiten zeigen ihre
  Nährwerte weiter (Etikettangaben). Fachliche Prüfung steht laut Register noch aus.
- Live-Test Open Food Facts (FOOD-004/007): von hier aus gesperrt, erster echter Test auf dem iPhone.
- Von dir: eine Woche Ernährung nur mit der App erfassen; 50 eigene Produkte scannen (FOOD-009).

## Phase 4 – Körper, Ziele, Kalorienrechner

| # | Schritt | Register |
|---|---|---|
| 4.0 | Erststart-Ablauf: Alter (nur Erwachsene im Start), Profil, Ziel, Einheiten; Hinweis bei sensiblen Situationen | UX-010, COACH-010 |
| 4.1 | Profil + Einheiten (kg/lb, cm) | COACH-001, UX-003 |
| 4.2 | Gewicht eintragen, 7-Tage-Trend, Körpermaße; Fortschrittsfotos optional nur lokal (Entscheidung offen); Körperfett nur nach Fachfreigabe | UX-002, GOAL-003, -004, -008, -009 |
| 4.3 | Ziele: abnehmen/halten/zunehmen, Kraftziel, Gewohnheiten; versioniert; keine Erfolgsgarantie; keine Ziele ins Untergewicht | GOAL-001, -002, -005, -006, -007, COACH-004 |
| 4.4 | Kalorienrechner (Werte als „Schätzung“ gekennzeichnet), ein Aktivitätsmodell ohne Doppelzählung; Protein als Bereich | CALC-001–005, COACH-002, -003, -005 |

**Fertig, wenn:** Ziel setzen → Kalorienziel erscheint im Tracker → Gewichtstrend sichtbar.

**Stand 30.10.2026:** 4.0–4.4 gebaut. Erststart beim ersten Öffnen (auch für bestehende Daten): „mindestens 18?“
(nur Ja/Nein gespeichert, bei Nein kein Weiter), sensible Situationen (Schwangerschaft/Stillzeit, Essstörung,
Untergewicht, Erkrankung; gespeichert nur ja/nein) mit Hinweis auf Fachleute und Option „Zahlen ausblenden“,
Einheiten, Gewichtsrichtung, freiwillige Rechner-Angaben (alles überspringbar). Profil unter Fortschritt und Mehr.
Einheiten kg/lb und cm/in für Körpergewicht, Ziele, Maße, Größe und Training; gespeichert wird immer kg/cm.
Gewicht für frühere Tage nachtragen, 7-Tage-Durchschnitt, Veränderung zur Vorwoche, Verlauf der letzten 30 Tage
als Punkte mit Durchschnittslinie. Körpermaße (Taille, Hüfte, Brust, Oberarm, Oberschenkel) mit Textanleitung und
Verlauf. Ziele parallel: Gewicht (abnehmen/halten/zunehmen, Zielgewicht optional, nur eins), Kraft (Übung, Gewicht,
Wdh., Fortschritt aus Sätzen), Gewohnheit (Trainingstage oder Trinkziel-Tage pro Woche, ohne Serien/Strafe);
jede Änderung eine neue Version mit Gültig-ab, „Ziel beenden“ behält den Verlauf; kein Zieldatum, keine Prognose.
Abnehmziel nicht unterstützt bei BMI < 18,5 (jetzt oder Ziel) und bei sensibler Situation. Kalorienrechner:
Mifflin-St Jeor × eine PAL-Tabelle (DGE-Stufen 1,45/1,65/1,85/2,2, Sport +0,3), Abstand −250/−500/0/+250/+500,
Untergrenze max(1200, Ruheenergie), keine Zahl außerhalb 19–78 Jahre, bei sensibler Situation oder Untergewicht +
Abnehmen; Rechenweg sichtbar, „Schätzung“, Eiweiß als Bereich (0,8 bzw. 1,2–2,0 g/kg), kein Fett/KH-Split.
„Übernehmen“ setzt das Kalorienziel ab heute. Kalorienziel jetzt versioniert (Tabelle calorie_goal, Migration 4
übernimmt das bisherige Ziel für alle bisherigen Tage); Tagebuch und „Heute“ zeigen das Ziel, das an dem Tag galt.
Fortschrittsfotos (nach Lucs Entscheidung vom 30.10.2026): freiwillig und standardmäßig aus, Erklärung vor dem
Einschalten, Aufnahme oder Auswahl aus der Mediathek, Ansicht vorne/seite/hinten, Tag wählbar, Vergleich erstes vs.
neuestes Foto je Ansicht, beim Öffnen verdeckt, einzeln oder alle löschen. Speicherung als Kopie im App-Ordner
(nur Dateiname in der Datenbank, Migration 5), keine Vorschaubilder in der Übersicht, nichts verlässt das Gerät.
237 automatische Tests, Browser-Test Phase 4 38/38 ohne Konsolenfehler, iOS-Bundle baut, Referenztests 24 + 22.

**Prüfung Phase 4 (30.10.2026), Zeile für Zeile gegen Fahrplan und Register – 2. Durchlauf:** 4 Lücken gefunden
und behoben – Gewichtsziel aus dem Erststart (vor der ersten Messung) zeigte nie „Seit Start“ (jetzt erste Messung
ab Gültigkeitsbeginn), unverändertes Speichern legte eine leere neue Zielversion an, ein altes Abnehmziel blieb
ohne Hinweis, wenn später „sensible Situation“ eingeschaltet wurde, Profil/Einheiten waren unter „Mehr“ nicht
erreichbar. Testumgebung: `expo-env.d.ts` fehlte für die Typprüfung (wird von `expo start` erzeugt, nicht im Git).
**Offen / bewusst verschoben:**
- Alle Rechner-Parameter (PAL-Stufen, Sport +0,3, Abstände, Untergrenze 1200/Ruheenergie, BMI 18,5, Eiweiß-Bereiche,
  7-Tage-Fenster mit 4 Messungen) sind vorläufig an einer Stelle (`src/domain/energy.ts`) und warten auf die
  Fachprüfung (10.1, CALC-003–005, GOAL-003, GOAL-007, COACH-005). DGE-Primärquelle in diesem Durchlauf nicht abgerufen.
- GOAL-008 Fotos: Kamera/Mediathek nur auf dem iPhone testbar (im Browser nicht verfügbar); App-Sperre (Face ID)
  und Sicherung der Fotos folgen mit Phase 6.5; Datenschutzprüfung (DSGVO) vor der Veröffentlichung (10.2).
- GOAL-009 Körperfett: nicht gebaut (Fachfreigabe).
- GOAL-006 Prognose: bewusst keine. COACH-008 Anpassung nach Gewichtstrend: Phase 9.2 als Vorschlag mit Bestätigung gebaut.
- Zieltypen Maße/Beweglichkeit/Schritte/Dehnroutinen: Phase 5 (Dehnen) bzw. 6 (Schritte); Pilotauswahl offen (GOAL-001).
- Einheiten ml/oz und ft für Größe: nicht gebaut (Start nur Deutsch); Trinkziel bleibt ml.
- Health-Freigabe im Erststart: kommt mit Apple Health (6.2). Beruf/Geräte/Zeit im Profil: mit dem Planassistenten (Phase 8).
- Bebilderte Messanleitung (GOAL-004). Trinkziel ist nicht versioniert (Gewohnheit zählt mit dem aktuellen Trinkziel).
- Von dir: Erststart und Rechner auf dem iPhone durchgehen, ein Ziel setzen, eine Woche Gewicht eintragen,
  Fortschrittsfotos einschalten und ein Foto aufnehmen.

## Phase 5 – Dehnung, Mobilität & HIIT-Programme

| # | Schritt | Register |
|---|---|---|
| 5.1 | Dehnübungen (Bilder/Medien prüfen), Routinen anlegen | STRETCH-003, -007, -009 |
| 5.2 | Halte-Timer mit Seitenwechsel; Dehnprotokoll; Abbruch bei Schmerz; Satztyp „Zeit“ (Plank) | STRETCH-004, -005, -006, UX-011 |
| 5.3 | Aufwärmen/Cool-down an Trainingstage hängen | STRETCH-001, -002 |
| 5.4 | Fertige HIIT-Programme (Start: Bauch + Ganzkörper) mit Stufen | HIIT-001, -002 |
| 5.5 | HIIT-Ablauf: Ansage nächste Übung, Timer, Runden, Abbruchknopf | HIIT-003, -007 |
| 5.6 | Eigene HIIT-Abläufe bauen, Protokoll im Verlauf | HIIT-004, -005 |

**Stand 30.10.2026:** 5.1–5.6 gebaut, Dehnen und HIIT als Bereiche unter „Training“ (Entscheidung Luc).
37 Dehn-/Mobilitäts- und HIIT-Übungen mit selbst geschriebenen Kurzanleitungen (ohne Bilder, Entscheidung Luc);
Übungen haben jetzt Art (Kraft/Dehnen halten/Dehnen dynamisch/Mobilität), Seiten (einseitig = links, dann rechts),
Haltezeit und Messung (Wiederholungen oder Sekunden). Fertige Dehnroutinen „Morgens“, „Büro: Nacken und Schultern“,
„Hüfte für Sitzberufe“; eigene Routinen anlegen, ändern, alte Version wieder verwenden. Gemeinsame Timer-Engine für
Dehnen, Aufwärmen/Cool-down und HIIT: Ansage der Übung (Anzeige + Sprachansage, abschaltbar), Seitenwechsel,
Pause/Weiter, Überspringen, „Schmerzen / abbrechen“ immer sichtbar, übersteht einen App-Neustart; lief die Zeit bei
geschlossener App ab, fragt die App nach statt automatisch zu zählen. HIIT „Bauch“ und „Ganzkörper“ je in Anfänger/
Fortgeschritten (Dauer, Pausen, Runden, schwerere Varianten), eigene Abläufe versioniert, Sicherheitshinweise und
„kein gezielter Bauchfettabbau“. Protokoll aller Einheiten im Verlauf (Abbruch wegen Schmerzen vermerkt, löschbar);
HIIT zählt als Trainingstag. Satztyp „Zeit“ (Plank, Seitstütz) in Plan und Training. Aufwärmen passend zu den
Muskelgruppen des Tages (dynamisch) und Cool-down (statisch), je Plantag abschaltbar und in der Dauer eingerechnet;
im Training vor dem ersten Satz bzw. danach angeboten. Beweglichkeits-Selbsttest (Finger-Boden-Abstand) mit
Beweglichkeitsziel und Gewohnheit „Dehnen“. 282 automatische Tests, Browser-Test Phase 5 22/22 und Phase 4 38/38
ohne Konsolenfehler, iOS-Bundle baut.

**Prüfung Phase 5 (30.10.2026), Zeile für Zeile gegen Fahrplan und Register – 2. Durchlauf:** 3 Lücken gefunden
und behoben – alte Pläne mit Plank hätten nach der Umstellung auf Sekunden ein leeres Feld gehabt (Migration übernimmt
den bisherigen Höchstwert als Sekunden), eine bei geschlossener App abgelaufene Einheit wäre ungefragt als absolviert
gezählt worden (jetzt Nachfrage), Hinweis „Zeit-Übung“ im Plan-Editor fehlte. Beim Bauen behoben: Umbau der
Ziel-Tabellen verletzte die Fremdschlüssel-Prüfung (Reihenfolge geändert, Test mit vorhandenen Zielen).
**3. Prüfdurchlauf Phase 5 (30.10.2026):** 4 weitere Lücken geschlossen – Countdown für Zeit-Sätze (▶ startet,
am Ende wird der Satz mit den Sekunden eingetragen, vorzeitig beenden trägt die gehaltene Zeit ein), Kurzanleitungen
in der Übungsliste aufklappbar, Startansage „Gleich geht’s los mit …“ statt „Pause“, 3-2-1-Vibration vor jedem
Wechsel. Browser-Test Phase 5 23/23, Phase 4 38/38, 282 automatische Tests. Phase 5 ist damit von meiner Seite
vollständig; offen sind nur die unten genannten bewusst verschobenen Punkte und dein iPhone-Test.
**Offen / bewusst verschoben:**
- Haltezeiten, Programme, Stufen, Aufwärm-/Cool-down-Zuordnung und Kurzanleitungen sind Vorschläge ohne Fachprüfung
  (STRETCH-001/002/008, HIIT-001/002, 10.1); ACSM-Primärquellen nicht neu abgerufen.
- Bilder/Animationen der Übungen (STRETCH-009, MEDIA): Grundlage in Phase 9.1 gebaut, eigene Bilder folgen (Entscheidung 30.10.).
- Ansage und Vibration nur bei offener App; bei gesperrtem Handy läuft die Zeit korrekt weiter, meldet sich aber
  nicht (Phase 6.3). Export des Protokolls: Phase 6.5.
- Von dir: eine Dehnroutine und ein HIIT-Programm auf dem iPhone durchgehen (Sprachansage testen), ein Training mit
  Aufwärmen und Cool-down.

## Phase 6 – MacBook da: native Funktionen

| # | Schritt | Register |
|---|---|---|
| 6.1 | Xcode installieren, Development Build aufs iPhone | TECH-002 |
| 6.2 | Apple Health: Schritte lesen (HealthKit-Paket; Health Connect später für Android) | HEALTH-001–007, TECH-003, TECH-004 |
| 6.3 | Timer zuverlässig bei gesperrtem Handy, Anzeige auf Sperrbildschirm | HEALTH-011–016, UX-006 |
| 6.4 | Erinnerungen (Training, Trinken) mit Ruhezeiten | UX-007, TIME-011 |
| 6.5 | Export/Backup/Wiederherstellung, „alle Daten löschen“, optional verschlüsselte Datenbank | TECH-014, TECH-013, LAW-006 |
| 6.6 | Gerätetest-Liste abarbeiten (sperren, App killen, neu starten, offline) | O1 |

**Stand 30.10.2026 (vor dem MacBook umgesetzt, soweit in Expo Go möglich):**
- 6.1 Development Build: Schritt-für-Schritt-Anleitung `docs/Anleitung_Development_Build.md` (kostenlos mit Xcode
  und eigener Apple-ID oder per EAS mit Developer Program). Bauen selbst braucht MacBook bzw. Apple-Konto.
- 6.2 Schritte: Datenmodell nach HEALTH-005/006 (pro Tag und Quelle, Abrufzeit/Fenster, Apple Health hat Vorrang,
  nie addiert), eigene Tageswerte unter Fortschritt → Schritte, Wochenschnitt, Gewohnheit „Schritte“, keine
  Kalorien-Gutschrift (HEALTH-007). Apple-Health-Anbindung folgt mit dem Development Build (Plan in der Anleitung).
- 6.3 Timer bei gesperrtem Handy: lokale Mitteilungen zum Pausenende, bei jedem Wechsel in Dehn-/HIIT-Abläufen und
  im Intervall-Timer (Pause löscht, Überspringen verschiebt); im Vordergrund kein doppelter Banner. Anzeige direkt
  auf dem Sperrbildschirm (Live Activity) braucht den Development Build.
- 6.4 Erinnerungen: Training an gewählten Wochentagen zur Uhrzeit, Trinken alle 1–4 h im Zeitfenster (außerhalb
  Ruhe); alles optional, standardmäßig aus, Erlaubnis erst beim Einschalten.
- 6.5 Daten: Sicherung als Datei (Teilen-Menü → „Dateien“), Fotos optional; Wiederherstellen mit Prüfung und
  Zusammenfassung vorab, in einer Transaktion (bei Fehlern bleibt alles), auch auf neues Handy und aus älteren
  Versionen; „Alle Daten löschen“ inkl. Fotos und Erinnerungen → Erststart; App-Sperre (in Expo Go mit
  Gerätecode, Face ID ab Build). SQLCipher-Verschlüsselung: vorbereitet in der Anleitung (braucht Build).
- 6.6 Gerätetest-Liste `docs/Geraetetest.md` (Timer, Erinnerungen, Daten, Sperre, Schritte, offline).
304 automatische Tests, Browser-Tests Phase 6 11/11, Phase 5 23/23, Phase 4 38/38, iOS-Bundle baut.

**Prüfung Phase 6 (30.10.2026) – 2. Durchlauf:** 4 Lücken geschlossen – Erinnerungen werden nach dem
Wiederherstellen neu eingeplant, Foto-Einträge ohne Datei (Sicherung ohne Fotos auf neuem Handy) werden entfernt
statt als leere Bilder zu bleiben, Tipp im Training zum Einschalten der Timer-Hinweise, Datenschutztext nennt
Sicherungsdateien.
**Offen (braucht MacBook/Apple-Konto oder Android):** Development Build (6.1), Apple Health lesen (6.2), Live
Activity/AlarmKit (UX-006, HEALTH-013), Face ID, SQLCipher (TECH-013), Android-Punkte HEALTH-003/004/014 (Phase 11),
Gerätetest durchführen (6.6, O1). Bekannte Grenzen: Mitteilungen nicht sekundengenau (HEALTH-012), Uhrzeit-Sprünge
(HEALTH-016), Erinnerungen prüfen nicht, ob schon trainiert/getrunken wurde.

## Phase 7 – Pilot mit echten Leuten

| # | Schritt | Register |
|---|---|---|
| 7.1 | Apple Developer Program (99 $) – erst jetzt | BUS-011 |
| 7.2 | TestFlight-Version an 5–10 Leute aus dem Gym | BUS-016 |
| 7.3 | Feedback sammeln: Was nutzen sie? Was fehlt? Würden sie zahlen? Vergleich mit bestehenden Apps | BUS-002, -015, O7 |

**Fertig, wenn:** Mehrere Leute nutzen die App 2 Wochen lang wiederkehrend.

**Stand 30.10.2026 (vorbereitet, Ausführung durch Luc):**
- 7.1 Anleitung Developer Program `docs/Anleitung_TestFlight.md` (Einzelperson, rechtlicher Name sichtbar, BUS-011).
- 7.2 TestFlight: Build-Profil `production` mit automatischer Build-Nummer, Submit-Profil, Exportkontrolle
  (`ITSAppUsesNonExemptEncryption = false`), Schritt-für-Schritt-Befehle (EAS, ohne Xcode), interne/externe
  Tester, Korrekturen per EAS Update ohne neuen Build. Datenschutz-Entwurf `docs/Datenschutz_Entwurf.md`.
- 7.3 Feedback in der App (Mehr → Feedback geben): was genutzt wird, was fehlt/nervt, Zahlungsbereitschaft
  (BUS-002), andere Apps (BUS-015), Weiterempfehlung 0–10, optionale Nutzungsübersicht nur mit Anzahlen; die App
  sendet nichts selbst, Text sichtbar und per Teilen-Menü verschickt; Entwurf bleibt gespeichert.
  Pilot-Leitfaden `docs/Pilot_Leitfaden.md` (Ablauf, Nachricht an Tester, Auswertungstabelle, Fertig-Kriterium),
  Wettbewerbsvergleich `docs/Wettbewerbsvergleich.md` (O7, Preise aus Sekundärquellen vom 30.10.2026).
- Für Tester: freundliche Fehleranzeige statt leerer Seite in allen Bereichen.
308 automatische Tests, Browser-Tests Phase 7 5/5, Phase 6 11/11, Phase 5 23/23, Phase 4 38/38, iOS-Bundle baut.

**Prüfung Phase 7 (30.10.2026):** 2 Lücken geschlossen – Fehleranzeige für Tester statt leerer Seite,
Korrekturen ohne neuen Build (EAS Update) in der Anleitung.
**Erledigt:** Arbeitstitel „Myhealth“, Bundle-ID `myhealth.system`, App-Symbol (anatomisches Herz, 30.10.2026).
**Offen (nur Luc):** Developer Program abschließen (99 $, am MacBook), endgültigen App-Namen festlegen, Build
hochladen, Tester einladen, Pilot durchführen und auswerten. Absturzberichte kommen über TestFlight; ein eigener
Absturzdienst ist bewusst nicht eingebaut (Datenschutz).

## Phase 8 – Adaptiver Planassistent (dein Alleinstellungsmerkmal)

| # | Schritt | Register |
|---|---|---|
| 8.1 | Übungsdaten mit Muskelgruppen/Bewegungsmustern (RepDB Free prüfen; wger Server/App als Vergleich) | TRAIN-003, TECH-005, TECH-006 |
| 8.2 | Plan von X auf Y Tage umbauen mit Regeln, Konfliktanzeige, Vorschau, Rückgängig | TRAIN-004, -005, -007–012, -021 |
| 8.3 | Lieblingsübungen sperren | TRAIN-006 |
| 8.4 | Ersatzübung bei blockiertem Gerät | TRAIN-014, TRAIN-016 |
| 8.5 | Progressionsregeln (mehr Gewicht/Wdh., Stagnation, Wiedereinstieg) | TRAIN-015, TRAIN-018 |
| 8.6 | Anfängervorlagen | TRAIN-001, TRAIN-019, COACH-001 |
| 8.7 | Freitext erst danach | TRAIN-020 |

**Fertig, wenn:** Pflichtübungs- und Zeitkonflikte korrekt gemeldet werden, Logs beim Umbau unverändert bleiben
und die alte Version reaktivierbar ist (P3, Kap. 15).

**Stand 30.10.2026:** 8.1–8.7 gebaut, alles ohne Netz und ohne KI.
- 8.1 Übungsdaten selbst kuratiert (Kap. 4: „Metadaten selbst kuratieren“): 16 Bewegungsmuster, Stufe
  Einsteiger/Fortgeschritten und Ersatzübungen für alle 60 Kraftübungen; 20 neue Kraftübungen, damit es je Bewegung
  Varianten mit Maschine, Kurzhantel, Kabel und ohne Gerät gibt; Kurzanleitungen jetzt für alle Kraftübungen. Eigene
  Übungen: Bewegung wählbar, sonst aus der Muskelgruppe abgeleitet. RepDB Free/wger nicht importiert (Entscheidung
  unten); Muster und Ersatzübungen sind ungeprüfte Vorschläge (10.1).
- 8.2 Planumbau: 2–6 Tage, 20–180 min, Aufteilung automatisch oder gewählt (Ganzkörper, Ober/Unter, Push/Pull/Beine,
  Arnold, Ober/Unter+PPL). Passt die gewählte Aufteilung nicht zur Tageszahl, schlägt die App begründet eine andere vor.
  Übungen werden nach Bewegung verteilt, so oft pro Woche wie bisher; bei zu wenig Zeit wird nach festen Regeln
  gekürzt (Doppeltes, ähnliche Übung am selben Tag, Sätze bis 2, Isolation, dann Grundübungen), Pausen nie. Aufwärmen
  und Cool-down sind in der Dauer enthalten. Geht es nicht auf, kommt ein Konflikt mit echter Dauer, und Übernehmen ist
  gesperrt. Vorschau: je Übung „bleibt/verschoben/gekürzt/ersetzt/entfernt“ mit Grund, je Tag Dauer gegen Budget.
  Übernehmen = neue Planversion mit Grund; „Rückgängig“ aktiviert die vorige. Befristet „nur diese Woche“ (bis Sonntag)
  oder „2 Wochen“: Danach wird die gewohnte Fassung automatisch wieder aktiv, sie bleibt dabei unverändert (TRAIN-008);
  im Plan-Editor sichtbar mit „Jetzt zurück“.
- 8.3 Lieblingsübungen „behalten“: werden nie entfernt oder gekürzt; widerspricht das der Zeit oder einem fehlenden
  Gerät, zeigt die App den Konflikt statt sie zu entfernen. Wird gemerkt (auch in der Sicherung).
- 8.4 Geräte oder einzelne Übungen „nicht verfügbar“: Ersatz aus der kuratierten Liste, gleiche Messart. Im Training:
  „Gerät belegt? Ersatz wählen“ stellt nur die offenen Sätze dieses Trainings um; Plan und erledigte Sätze bleiben,
  Ersatzübung mit eigenem Verlauf (TRAIN-014).
- 8.5 Steigerungsregeln Fassung 1 (Entscheidungstabelle in `domain/progression.ts`): oberes Ende in allen Sätzen →
  kleinster Gewichtsschritt (2,5 kg, Kurzhantel 2 kg, 5 lb), im Bereich → +1 Wdh., meist darunter → halten, drei
  Einheiten ohne Fortschritt → ca. 10 % leichter neu aufbauen, Pause ≥ 14/28 Tage → −10/−20 %, Zeit-Übung +5 s,
  Körpergewicht → schwerere Variante. Im Training als Vorschlag mit „eintragen“, abschaltbar. Übersicht zeigt nach
  ≥ 14 Tagen Pause einen Wiedereinstiegshinweis.
- 8.6 Vorlagen: Ziel (Muskelaufbau/Kraft/Fitness), Erfahrung, vorhandene Geräte, Tage, Zeit → Plan aus Bausteinen je
  Tagesart mit Varianten A/B/C; Einsteiger nur Einsteiger-Übungen; Erklärung „So funktioniert dein Plan“ und
  Kurzanleitungen in der Vorschau. Profil: Erfahrung, Ziel, Geräte, Zeit pro Training (Beruf steckt in „Bewegung im
  Alltag“; sitzend → Büro-/Hüftroutinen oben unter Dehnen).
- 8.7 Freitext: „Künftig 4 Tage je 60 Minuten, Ober/Unter, ohne Langhantel, Kniebeuge behalten“ wird lokal gelesen
  (Tage, Minuten, Aufteilung, Dauer, Geräte, Übungen, „bisher …“ wird ignoriert) und füllt nur die Auswahlfelder.
  Jeder Wunsch läuft durch eine strenge Prüfung (`validateWish`): unbekannte Felder, Übungs-IDs, Geräte und Werte
  außerhalb der Grenzen werden abgewiesen – dieselbe Prüfung gilt für eine spätere KI-Antwort (KI vorerst nicht, Entscheidung 30.10.2026). Schmerzen im
  Text → Übung ersetzen plus Hinweis, keine Behandlungstipps.
380 automatische Tests (davon 72 neu für Phase 8, inkl. Prüfsumme der Logs vor/nach Umbau und Rückgängig),
Browser-Test Phase 8 27/27 ohne Konsolenfehler, iOS-Bundle baut, Referenztests 24 + 22.

**Prüfung Phasen 1–8 (30.10.2026), nach dem Bau von Phase 8:** Fahrplan, Funktionsliste der Gesamtprüfung und
Register gegen den Code; dazu ein automatischer Abgleich aller Textschlüssel, ein Browser-Durchlauf über alle 30
Bildschirme (30/30, keine Konsolenfehler) und `npm audit` (unverändert, nur Build-Werkzeuge). 8 Lücken geschlossen:
- TRAIN-003: Suche kannte keine anderen Namen – jetzt Synonyme (z. B. „Squat“ → Kniebeuge, „Lat Pulldown“ → Latzug),
  auch im Freitext des Assistenten.
- TRAIN-015: Bei ausgefallenen Tagen gab es nur „fortsetzen“ – jetzt auch „Woche ausgefallen? Diese Woche neu planen“
  (befristeter Umbau bis Sonntag).
- TRAIN-001: Kraftübungen hatten (bis auf drei) keine Kurzanleitung – jetzt alle; ein Test stellt sicher, dass jede
  Übung Name, Anleitung und Metadaten hat.
- Freitext las „bisher 6 Tage PPL“ als Wunsch – Beschreibungen des bisherigen Stands werden jetzt ignoriert.
- „Heute“ und „Training“ konnten befristete Fassungen gleichzeitig beenden (zwei Transaktionen) – jetzt nacheinander.
- Wiederherstellen einer Sicherung prüft Verweise zwischen Planversionen erst am Ende der Transaktion.
- Feedback-Bogen (7.3) ohne Bereich „Planassistent“; Datenschutz-Entwurf ohne Trainingsangaben/Planassistent;
  Gerätetest-Liste um Planassistent (P1–P6) ergänzt; Pilot-Leitfaden aktualisiert.
- Testumgebung: `expo-env.d.ts` fehlt nach frischem Klonen (wird von `expo start` erzeugt) – bekannt, kein App-Fehler.
Weiter offen wie in den Phasen 1–7 notiert (Gerätetests auf dem iPhone, Fachprüfung, MacBook-Punkte, USDA).

**Offen / bewusst verschoben:**
- Fachliche Prüfung von Mustern, Ersatzübungen, Vorlagen-Parametern und Steigerungsregeln (10.1, O3).
- KI-Anbindung für Freitext und Erklärungen: verschoben (kostenfreie Version, Entscheidung 30.10.2026); Schnittstelle und Prüfung stehen.
- Bevorzugte Wochentage: Pläne laufen als Reihenfolge; feste Wochentage über die Trainings-Erinnerungen (6.4).
- Zeitschätzung aus eigenen protokollierten Satzzeiten kalibrieren (Kap. 10) – später.
- Von dir: auf dem iPhone eine Vorlage erstellen, einen Plan umbauen (auch „nur diese Woche“), im Training
  „Gerät belegt“ und einen Steigerungsvorschlag ausprobieren.

## Phase 9 – Coach, Essen in eigenen Worten, Grundlage für Übungsbilder (kostenfrei)

Entscheidung Luc 30.10.2026: kostenfreie Version – keine gekauften Medien, keine KI, kein Server. Übungsbilder
später als eigene Bilder. Alles läuft auf dem Gerät; Regeln sind Vorschläge ohne Fachfreigabe (Prüfung in 10.1).

| # | Schritt | Register |
|---|---|---|
| 9.1 | Grundlage für eigene Übungsbilder: Verzeichnis je Bild mit Autor, Lizenz, Quelle, Prüfdatum und Prüfstatus; Anzeige, sobald ein Bild da ist; Anleitung zum Einfügen. Keine fremden Medien | MEDIA-001, -012, -013, STRETCH-009 |
| 9.2 | Wöchentlicher Check-in: Gewichtstrend, Essen (nur vollständige Tage), Training, Schritte, Schlaf als Kontext; Vorschlag erst nach Bestätigung, versioniert | COACH-006, -008, -010 |
| 9.3 | Essenszeiten an den eigenen Alltag anpassen (Vorschlag der Mahlzeit nach eigenen Zeiten) | COACH-007 |
| 9.4 | Allergien und Ernährungsweise: Hinweise aus Produktangaben, nie „allergenfrei“ zusichern | COACH-009 |
| 9.5 | Essen in eigenen Worten (auch per Diktat der Tastatur): Kandidaten mit Menge, erst nach Bestätigung gebucht | FOOD-014 |

**Fertig, wenn:** Der Check-in eine Woche richtig zusammenfasst (unvollständige Tage gekennzeichnet) und erst nach
Bestätigung etwas ändert; „2 Scheiben Brot mit Nutella, 1 Banane“ ergibt bestätigbare Einträge; ein Produkt mit
deinem Allergen zeigt einen Hinweis; ein Bild aus dem Verzeichnis erscheint bei der Übung – alles ohne Internet und KI.

**Stand 30.10.2026:** 9.1–9.5 gebaut, ohne Internet, KI oder Kosten.
- 9.1 Bilder: Verzeichnis `mobile/src/media/exercise-media.ts` (Autor, Lizenz, Herkunft, Prüfdatum, „Bewegung geprüft“),
  Ordner `mobile/assets/exercises/`, Anzeige in Übungsliste und Training, sobald ein Bild eingetragen ist; Test prüft
  jeden Eintrag. Anleitung `docs/Anleitung_Uebungsbilder.md`. Noch keine Bilder (kommen von dir).
- 9.2 Wochen-Check-in (Fortschritt → Wochen-Check-in; auf „Heute“, wenn fällig): Woche bis gestern mit
  Gewichtsschnitt und Veränderung, Essen nur über vollständige Tage (unvollständige gezählt, nicht gemittelt), Training
  gegen Plan, Schritte, Schlaf. Höchstens ein Vorschlag (±100 kcal, Regeln Fassung 1 in `domain/checkin.ts`), nur mit
  genug Daten, nie bei sensibler Situation, nie unter 1200 kcal oder bei Untergewicht senken; lag das Essen deutlich
  über dem Ziel, wird erst Einhalten empfohlen. „Übernehmen“ = neues Kalorienziel ab heute (alte Tage unverändert),
  „Nicht jetzt“ ändert nichts; jeder Check-in wird mit Entscheidung gespeichert. Schlaf (Stunden, Erholung 1–5) nur
  als Hinweis, nie als Kalorienfaktor. Weniger trainiert als geplant → Hinweis mit Weg zum Planassistenten.
- 9.3 Essenszeiten: eigene Uhrzeiten für Frühstück/Mittag/Abend (leer = lasse ich meist aus); der Mahlzeit-Vorschlag
  beim Eintragen richtet sich danach.
- 9.4 Allergien (14 Hauptallergene) und vegetarisch/vegan in den Ernährungs-Einstellungen. Allergene, Spuren und
  vegan/vegetarisch kommen beim Scan/der Online-Suche von Open Food Facts mit; eigene Lebensmittel: Allergene
  freiwillig. Hinweise am Lebensmittel und im Freitext, ⚠ in Suchlisten. Nie „allergenfrei“: ohne Angaben heißt es
  „bitte Etikett prüfen“.
- 9.5 Essen in eigenen Worten (Eintragen → „In eigenen Worten eintragen“, Diktat über die Tastatur): Teile mit Menge
  und Einheit (Zahlwörter, kg/l, „1,5 l“, Scheibe/Stück/Portion), Treffer aus eigenen Lebensmitteln und Vorlagen,
  Menge über die Portionsgröße; Löffel/Glas/Tasse werden nicht geschätzt. Erst „N Einträge buchen“ bucht, ohne Menge
  wird nichts gebucht; nicht Gefundenes führt zur Suche.
412 automatische Tests (31 neu), Browser-Test Phase 9 24/24, alle 32 Bildschirme ohne Fehler, Phase 8 weiter 27/27.

**Offen:** Schwellen des Check-ins und Essenszeiten-Logik fachlich prüfen (10.1, COACH-008); Schlaf aus Apple Health
(braucht Development Build, 6.2); erste eigene Bilder (du); Allergen-Angaben von Open Food Facts live testen (iPhone).
- Von dir: Allergie und Essenszeiten einstellen, ein Produkt scannen, „2 Scheiben Brot mit Nutella“ per Diktat
  eintragen, nach einer Woche den Check-in machen.

**Prüfung Phase 9 (30.10.2026):** 6 Lücken geschlossen – Getränke aus „In eigenen Worten“ wurden als Essen gebucht und
fehlten in der Trinkübersicht (jetzt Getränk, TIME-005), reines Wasser brauchte ein angelegtes Lebensmittel, Rezepte
wurden im Freitext nicht gefunden, Rezepte und Vorlagen zeigten keine Allergen-Hinweise (jetzt aus den Zutaten), der
Check-in zeigte im Modus „ohne Zahlen“ Kalorien (TRACK-006), der Vorschlag ging vom Ziel der vergangenen Woche statt
vom heute gültigen aus. 417 automatische Tests, Browser-Test Phase 9 27/27, 32/32 Bildschirme.

**Verschoben (kostet Geld oder braucht einen Server):** KI-Erklärungen und KI-Freitext (TECH-018, BUS-004, LAW-011),
Essensfoto (FOOD-015), gekaufte Medien oder 3D (MEDIA-005/-007). Neu zu entscheiden, wenn es Konten/Server gibt
(Phase 11) oder ein Budget feststeht.

## Coach – geführter Begleiter (vor Phase 10)

Konzept nach Lucs Antworten vom 30.10.2026: ohne KI, kommt vor der Veröffentlichung. Der Coach verbindet, was es
schon gibt (Erststart, Rechner, Planassistent, Erinnerungen, Check-in), zu einem geführten Ablauf.

| # | Schritt | Register |
|---|---|---|
| C1 | Einrichtung direkt nach dem Erststart (überspringbar, jederzeit neu): Ziel (Bulk/Cut/Erhalt) → Körperdaten → durchschnittliche Schritte, Gym-Tage pro Woche, Schlaf | COACH-001, UX-010 |
| C2 | Bedarf aus Ruheenergie × Aktivität aus **Schritten** (ersetzt „Bewegung im Alltag“) + Gym-Tage; Schlaf nur Erholungskontext; Rechenweg sichtbar, „Schätzung“ | CALC-001–005, HEALTH-007, COACH-006 |
| C3 | Vorgabe Bulk/Cut/Erhalt: Coach schlägt Tempo vor (Bulk +250, Cut −500, Erhalt ±0), änderbar; nie unter die Untergrenze; sensible Situation: keine Zahlen | COACH-004, -010, GOAL-007 |
| C4 | Makro-Ziele: Eiweiß, Fett, Kohlenhydrate, **Ballaststoffe** (Ballaststoffe neu erfasst: Lebensmittel, Scan, Tagebuch) | COACH-005 |
| C5 | Trainingstage mehr, Ruhetage weniger Kalorien bei gleichem Wochenschnitt (Unterschied über Kohlenhydrate) | COACH-002 |
| C6 | Training: Tage und Wochentage wählen; eigenen Plan eingeben (Übungen selbst aussuchen) oder Plan vorgeben lassen (Vorlage aus Ziel und Tagen, 8.6) | TRAIN-001, -002 |
| C7 | Anbindungen beim Einrichten: Mitteilungen (Erinnerung an Trainingstagen); Apple Health für Schlaf, Schritte, Kalorien, Wasser, Makros vorbereitet (Daten fließen mit dem Development Build, 6.1/6.2) | HEALTH-001–007, UX-007 |
| C8 | Tägliche Begleitung auf „Heute“: Trainings- oder Ruhetag, Kalorien und Makros heute (Ziel/gegessen/übrig), Trinken, Schritte; Tipps nur auf Klick | TRACK-001, UX-007 |
| C9 | Wochen-Check-in ausgebaut: Makros im Wochenschnitt, neue Berechnung, wenn sich Schritte/Gym-Tage deutlich ändern; Vorschläge behalten Makros und Aufteilung | COACH-008 |

Vorläufige Werte (Fachprüfung 10.1), alle in `domain/coach.ts`: Schritte → Aktivität nach Tudor-Locke-Stufen
(< 5000 → 1,4 · 5000–7499 → 1,5 · 7500–9999 → 1,6 · 10 000–12 499 → 1,7 · ab 12 500 → 1,8), je Gym-Tag pro Woche
+0,065; Eiweiß 1,6 g/kg (Cut 2,0 g/kg, ohne regelmäßiges Training 0,8/1,2 g/kg); Fett 30 % der Kalorien
(DGE-Orientierung, mind. 20 %); Kohlenhydrate der Rest; Ballaststoffe mindestens 30 g (DGE); Trainingstag +200 kcal,
Ruhetag höchstens −300 kcal.

**Fertig, wenn:** Ein neuer Nutzer vom Erststart bis zum ersten Training geführt wird (Ziel, Kalorien, Makros, Plan,
Erinnerung), „Heute“ jeden Tag das passende Tagesziel zeigt, Ziel und Tempo jederzeit änderbar sind und der Check-in
Vorschläge macht, ohne Makros und Aufteilung zu verlieren – alles ohne Internet und KI.

## Übungsbilder (nach Phase 9, vor 10.4)

Alle Bilder im selben Stil und für jeden klar verständlich (Entscheidung 30.10.2026). Reihenfolge: eigene Bilder bzw.
mit Higgsfield neu erstellt (nur aus eigenen Vorgaben, nie aus fremden Bildern; Bewegung fachlich prüfen, MEDIA-010–012)
→ reicht das nicht, Medien kaufen. RepDB weggelassen. Einfügen nach `docs/Anleitung_Uebungsbilder.md`.

## Phase 10 – Vor der Veröffentlichung

10.1 Fachperson prüft Trainingsvorlagen, Progression, Kalorienformeln, Grenzen, Dehnwerte, Planqualität
(O3, TRAIN-018, -022, STRETCH-008, COACH-010, TRACK-006) · 10.2 Verträge (Medien, KI, Werbung) zusammenführen (O4), Gewerbe, Impressum,
Datenschutzerklärung als Webseite, rechtliche Prüfung (LAW) · 10.3 Pro-Abo und Werbung einbauen, Free/Pro-Grenze (BUS, CALC-006) ·
10.4 Store-Texte, Screenshots, App-Name; keine falschen Versprechen wie „Cardio bringt nichts“ oder „Bauchfett wegtrainieren“ (UX-009, COACH-011, HIIT-006) · 10.5 Hilfe/FAQ (UX-005) · 10.6 Code aufräumen,
Sicherheits- und Abhängigkeitsprüfung (LAW-017, TECH-017, O6).

**Fertig, wenn:** Freigabematrix (Kap. 18) ohne offene kritische Punkte → Einreichung im App Store.

## Phase 11 – Nach dem Start

Android + Google Play (12 Tester/14 Tage, BUS-013) · weitere Sprachen (UX-004) · Konten/Sync mit
Kontolöschung (TECH-015, -016, UX-008) · freier KI-Chat (COACH-012) · Community (LAW-016) · Support,
Störungsplan, Updates (TECH-020, LAW-018).

---

**Zeitangaben** setzen wir bewusst nicht fest. Nach jeder Phase notieren wir, wie lange sie wirklich
gedauert hat, und schätzen dann den Rest realistisch.
