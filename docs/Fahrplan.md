# Fahrplan: von null bis App Store

Für Luc: iPhone vorhanden, MacBook ab Ende November, Windows-PC mit Claude Code, keine klassische
Programmiererfahrung. Technik: Expo / React Native mit TypeScript, lokale Datenbank, Deutsch zuerst mit
Übersetzungsstruktur.

**So arbeiten wir in jedem Schritt:** Claude Code schreibt den Code → du testest auf dem iPhone →
du sagst, was nicht passt → erst wenn „Fertig, wenn“ erfüllt ist, kommt der nächste Schritt.
Jeder Schritt ist ein eigener Git-Commit, damit man immer zurück kann.

Kosten bis Phase 6: **0 €**.

Abdeckung geprüft: alle 194 Registerpunkte (147 + 47) und alle offenen Punkte O1–O7 aus Kap. 19 sind einer Phase zugeordnet. Danach Apple Developer Program 99 $/Jahr.

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

## Phase 3 – Ernährung & Kalorientracker

| # | Schritt | Register |
|---|---|---|
| 3.1 | Lebensmittel manuell anlegen (kcal/Makros pro 100 g/ml) | FOOD-010, -011 |
| 3.2 | Tagebuch: Frühstück/Mittag/Abend/Snack, Menge, Nachtrag für gestern, Zeitzone/Sommerzeit; Nährwerte als Snapshot gespeichert | TIME-001, -002, -003, FOOD-012 |
| 3.3 | Barcode-Scanner mit Open Food Facts, Produkt bestätigen; gleichnamige Produkte nicht zusammenwerfen | FOOD-001–006, FOOD-018 |
| 3.4 | Suche (inkl. Grundnahrungsmittel über USDA), Favoriten, „zuletzt gegessen“, Mahlzeit kopieren | FOOD-007, -008, -016, TRACK-005 |
| 3.5 | Rezepte mit Endgewicht und Portionen; Vorlagen wie „Nutella-Brot“ | FOOD-013, FOOD-017 |
| 3.6 | Getränke & Wasser, eigene Glasgrößen, Trinkziel (editierbar) | TIME-004–012 |
| 3.7 | Tagesübersicht gegessen/Ziel/übrig + Wochenansicht; optionaler Modus ohne Zahlen | TRACK-001–004, TRACK-006 |

**Fertig, wenn:** Du eine Woche lang deine Ernährung nur mit der App erfassen kannst.
Parallel: 50 eigene Produkte scannen und Trefferquote notieren (FOOD-009, O2).

## Phase 4 – Körper, Ziele, Kalorienrechner

| # | Schritt | Register |
|---|---|---|
| 4.0 | Erststart-Ablauf: Alter (nur Erwachsene im Start), Profil, Ziel, Einheiten; Hinweis bei sensiblen Situationen | UX-010, COACH-010 |
| 4.1 | Profil + Einheiten (kg/lb, cm) | COACH-001, UX-003 |
| 4.2 | Gewicht eintragen, 7-Tage-Trend, Körpermaße; Fortschrittsfotos optional nur lokal (Entscheidung offen); Körperfett nur nach Fachfreigabe | UX-002, GOAL-003, -004, -008, -009 |
| 4.3 | Ziele: abnehmen/halten/zunehmen, Kraftziel, Gewohnheiten; versioniert; keine Erfolgsgarantie; keine Ziele ins Untergewicht | GOAL-001, -002, -005, -006, -007, COACH-004 |
| 4.4 | Kalorienrechner (Werte als „Schätzung“ gekennzeichnet), ein Aktivitätsmodell ohne Doppelzählung; Protein als Bereich | CALC-001–005, COACH-002, -003, -005 |

**Fertig, wenn:** Ziel setzen → Kalorienziel erscheint im Tracker → Gewichtstrend sichtbar.

## Phase 5 – Dehnung, Mobilität & HIIT-Programme

| # | Schritt | Register |
|---|---|---|
| 5.1 | Dehnübungen (Bilder/Medien prüfen), Routinen anlegen | STRETCH-003, -007, -009 |
| 5.2 | Halte-Timer mit Seitenwechsel; Dehnprotokoll; Abbruch bei Schmerz | STRETCH-004, -005, -006 |
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
