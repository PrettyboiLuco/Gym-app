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
- FOOD-014 Freitext, FOOD-015 Essensfoto: Phase 9 (wie geplant).
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
232 automatische Tests, Browser-Test Phase 4 37/37 ohne Konsolenfehler, Referenztests 24 + 22.

**Prüfung Phase 4 (30.10.2026), Zeile für Zeile gegen Fahrplan und Register – 2. Durchlauf:** 4 Lücken gefunden
und behoben – Gewichtsziel aus dem Erststart (vor der ersten Messung) zeigte nie „Seit Start“ (jetzt erste Messung
ab Gültigkeitsbeginn), unverändertes Speichern legte eine leere neue Zielversion an, ein altes Abnehmziel blieb
ohne Hinweis, wenn später „sensible Situation“ eingeschaltet wurde, Profil/Einheiten waren unter „Mehr“ nicht
erreichbar. Testumgebung: `expo-env.d.ts` fehlte für die Typprüfung (wird von `expo start` erzeugt, nicht im Git).
**Offen / bewusst verschoben:**
- Alle Rechner-Parameter (PAL-Stufen, Sport +0,3, Abstände, Untergrenze 1200/Ruheenergie, BMI 18,5, Eiweiß-Bereiche,
  7-Tage-Fenster mit 4 Messungen) sind vorläufig an einer Stelle (`src/domain/energy.ts`) und warten auf die
  Fachprüfung (10.1, CALC-003–005, GOAL-003, GOAL-007, COACH-005). DGE-Primärquelle in diesem Durchlauf nicht abgerufen.
- GOAL-008 Fortschrittsfotos: nicht gebaut, Entscheidung Luc offen. GOAL-009 Körperfett: nicht gebaut (Fachfreigabe).
- GOAL-006 Prognose: bewusst keine. COACH-008 automatische Anpassung nach Gewichtstrend: Phase 9.
- Zieltypen Maße/Beweglichkeit/Schritte/Dehnroutinen: Phase 5 (Dehnen) bzw. 6 (Schritte); Pilotauswahl offen (GOAL-001).
- Einheiten ml/oz und ft für Größe: nicht gebaut (Start nur Deutsch); Trinkziel bleibt ml.
- Health-Freigabe im Erststart: kommt mit Apple Health (6.2). Beruf/Geräte/Zeit im Profil: mit dem Planassistenten (Phase 8).
- Bebilderte Messanleitung (GOAL-004). Trinkziel ist nicht versioniert (Gewohnheit zählt mit dem aktuellen Trinkziel).
- Von dir: Erststart und Rechner auf dem iPhone durchgehen, ein Ziel setzen, eine Woche Gewicht eintragen.

## Phase 5 – Dehnung, Mobilität & HIIT-Programme

| # | Schritt | Register |
|---|---|---|
| 5.1 | Dehnübungen (Bilder/Medien prüfen), Routinen anlegen | STRETCH-003, -007, -009 |
| 5.2 | Halte-Timer mit Seitenwechsel; Dehnprotokoll; Abbruch bei Schmerz; Satztyp „Zeit“ (Plank) | STRETCH-004, -005, -006, UX-011 |
| 5.3 | Aufwärmen/Cool-down an Trainingstage hängen | STRETCH-001, -002 |
| 5.4 | Fertige HIIT-Programme (Start: Bauch + Ganzkörper) mit Stufen | HIIT-001, -002 |
| 5.5 | HIIT-Ablauf: Ansage nächste Übung, Timer, Runden, Abbruchknopf | HIIT-003, -007 |
| 5.6 | Eigene HIIT-Abläufe bauen, Protokoll im Verlauf | HIIT-004, -005 |

## Phase 6 – MacBook da: native Funktionen

| # | Schritt | Register |
|---|---|---|
| 6.1 | Xcode installieren, Development Build aufs iPhone | TECH-002 |
| 6.2 | Apple Health: Schritte lesen (HealthKit-Paket; Health Connect später für Android) | HEALTH-001–007, TECH-003, TECH-004 |
| 6.3 | Timer zuverlässig bei gesperrtem Handy, Anzeige auf Sperrbildschirm | HEALTH-011–016, UX-006 |
| 6.4 | Erinnerungen (Training, Trinken) mit Ruhezeiten | UX-007, TIME-011 |
| 6.5 | Export/Backup/Wiederherstellung, „alle Daten löschen“, optional verschlüsselte Datenbank | TECH-014, TECH-013, LAW-006 |
| 6.6 | Gerätetest-Liste abarbeiten (sperren, App killen, neu starten, offline) | O1 |

## Phase 7 – Pilot mit echten Leuten

| # | Schritt | Register |
|---|---|---|
| 7.1 | Apple Developer Program (99 $) – erst jetzt | BUS-011 |
| 7.2 | TestFlight-Version an 5–10 Leute aus dem Gym | BUS-016 |
| 7.3 | Feedback sammeln: Was nutzen sie? Was fehlt? Würden sie zahlen? Vergleich mit bestehenden Apps | BUS-002, -015, O7 |

**Fertig, wenn:** Mehrere Leute nutzen die App 2 Wochen lang wiederkehrend.

## Phase 8 – Adaptiver Planassistent (dein Alleinstellungsmerkmal)

8.1 Übungsdaten mit Muskelgruppen/Bewegungsmustern (RepDB Free prüfen; wger Server/App als Vergleich) ·
8.2 Plan von X auf Y Tage umbauen mit Regeln, Konfliktanzeige, Vorschau, Rückgängig · 8.3 Lieblingsübungen
sperren · 8.4 Ersatzübung bei blockiertem Gerät · 8.5 Progressionsregeln (mehr Gewicht/Wdh., Stagnation,
Wiedereinstieg) · 8.6 Anfängervorlagen · 8.7 Freitext per KI erst danach.
Register: TRAIN-001, -005–011, -016, -018–021, TECH-005, TECH-006.

## Phase 9 – Übungsdemos, Coach, KI

9.1 Entscheidung 3D/Clips, Medienpilot mit 3 Übungen (MEDIA) · 9.2 Coach-Check-in mit Schlaf als Kontext,
Essenszeiten, Allergien/Vorlieben (COACH-006–009) · 9.5 Freitext/Spracheingabe für Essen (FOOD-014) ·
9.3 KI-Erklärungen mit Kostenlimit (TECH-018, BUS-004) · 9.4 Essensfoto-Experiment (FOOD-015).

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
