# Fahrplan: von null bis App Store

Für Luc: iPhone vorhanden, MacBook ab Ende November, Windows-PC mit Claude Code, keine klassische
Programmiererfahrung. Technik: Expo / React Native mit TypeScript, lokale Datenbank, Deutsch zuerst mit
Übersetzungsstruktur.

**So arbeiten wir in jedem Schritt:** Claude Code schreibt den Code → du testest auf dem iPhone →
du sagst, was nicht passt → erst wenn „Fertig, wenn“ erfüllt ist, kommt der nächste Schritt.
Jeder Schritt ist ein eigener Git-Commit, damit man immer zurück kann.

Kosten bis Phase 6: **0 €**. Danach Apple Developer Program 99 $/Jahr.

---

## Phase 0 – Vorbereitung (1 Abend)

| # | Schritt | Wer |
|---|---|---|
| 0.1 | Node.js (LTS) und Git auf dem PC installieren | du, Claude erklärt |
| 0.2 | Repository `Gym-app` von GitHub auf den PC klonen | du |
| 0.3 | App „Expo Go“ aus dem App Store aufs iPhone laden | du |
| 0.4 | Arbeitstitel für die App festlegen (kann später geändert werden) | du |

**Fertig, wenn:** `node --version` und `git --version` am PC funktionieren und Expo Go auf dem iPhone ist.

## Phase 1 – Grundgerüst

| # | Schritt | Register |
|---|---|---|
| 1.1 | Expo-Projekt anlegen, auf dem iPhone per QR-Code öffnen | TECH-001 |
| 1.2 | Navigation mit 5 Bereichen: Heute · Training · Ernährung · Fortschritt · Mehr | UX-001 |
| 1.3 | Sprachdatei Deutsch; kein Text direkt im Code; Datum/Zahlen nach Sprache | UX-004 |
| 1.4 | Farben, Schriftgrößen, Hell/Dunkel; große Schrift möglich | TECH-019 |
| 1.5 | Lokale Datenbank (SQLite) mit Migrationen und sofortigem Speichern | TECH-012 |
| 1.6 | Automatische Tests einrichten, die 24 Referenztests als echte App-Tests übernehmen | LAW-017 |

**Fertig, wenn:** Die App öffnet sich auf dem iPhone, alle 5 Bereiche sind erreichbar, ein Testeintrag
überlebt das Schließen der App.

## Phase 2 – Training (Kern)

| # | Schritt | Register |
|---|---|---|
| 2.1 | Übungsliste: kleine Startliste + eigene Übungen anlegen (Name, Gerät, Muskelgruppe) | TRAIN-003 |
| 2.2 | Plan manuell anlegen: Tage, Übungen, Sätze, Wiederholungen, Pausen | TRAIN-002, -004 |
| 2.3 | Training starten: Satz eintragen (Gewicht, Wdh.), abhaken, sofort gespeichert | TRAIN-013 |
| 2.4 | Pausentimer: 30 s / 3 / 4 / 5 min / frei, Auto-Start, verlängern, überspringen | HEALTH-008, -009 |
| 2.5 | Letzte vergleichbare Leistung bei jeder Übung anzeigen | TRAIN-014 |
| 2.6 | Trainingsverlauf; Planänderung erzeugt neue Version, alte Trainings bleiben | TRAIN-010–012 |
| 2.7 | HIIT/Intervall-Timer (Belastung, Pause, Runden) | HEALTH-010 |

**Fertig, wenn:** Du ein echtes Training im Gym komplett mit der App protokollieren kannst.

## Phase 3 – Ernährung & Kalorientracker

| # | Schritt | Register |
|---|---|---|
| 3.1 | Lebensmittel manuell anlegen (kcal/Makros pro 100 g/ml) | FOOD-010, -011 |
| 3.2 | Tagebuch: Frühstück/Mittag/Abend/Snack, Menge, Nachtrag für gestern | TIME-001, -002 |
| 3.3 | Barcode-Scanner mit Open Food Facts, Produkt bestätigen | FOOD-001–006 |
| 3.4 | Suche, Favoriten, „zuletzt gegessen“, Mahlzeit kopieren | FOOD-007, -016, TRACK-005 |
| 3.5 | Rezepte mit Endgewicht und Portionen | FOOD-017 |
| 3.6 | Getränke & Wasser, eigene Glasgrößen, Trinkziel (editierbar) | TIME-004–012 |
| 3.7 | Tagesübersicht gegessen/Ziel/übrig + Wochenansicht | TRACK-001–004 |

**Fertig, wenn:** Du eine Woche lang deine Ernährung nur mit der App erfassen kannst.
Parallel: 50 eigene Produkte scannen und Trefferquote notieren (FOOD-009).

## Phase 4 – Körper, Ziele, Kalorienrechner

| # | Schritt | Register |
|---|---|---|
| 4.1 | Profil + Einheiten (kg/lb, cm) | COACH-001, UX-003 |
| 4.2 | Gewicht eintragen, 7-Tage-Trend, Körpermaße | UX-002, GOAL-003, -004 |
| 4.3 | Ziele: abnehmen/halten/zunehmen, Kraftziel, Gewohnheiten | GOAL-001, -005 |
| 4.4 | Kalorienrechner (Werte als „Schätzung“ gekennzeichnet) | CALC-001–005 |

**Fertig, wenn:** Ziel setzen → Kalorienziel erscheint im Tracker → Gewichtstrend sichtbar.

## Phase 5 – Dehnung & Mobilität

| # | Schritt | Register |
|---|---|---|
| 5.1 | Dehnübungen, Routinen anlegen | STRETCH-003, -007 |
| 5.2 | Halte-Timer mit Seitenwechsel | STRETCH-004 |
| 5.3 | Aufwärmen/Cool-down an Trainingstage hängen | STRETCH-001, -002 |

## Phase 6 – MacBook da: native Funktionen

| # | Schritt | Register |
|---|---|---|
| 6.1 | Xcode installieren, Development Build aufs iPhone | TECH-002 |
| 6.2 | Apple Health: Schritte lesen | HEALTH-001–007 |
| 6.3 | Timer zuverlässig bei gesperrtem Handy, Anzeige auf Sperrbildschirm | HEALTH-011–016, UX-006 |
| 6.4 | Erinnerungen (Training, Trinken) mit Ruhezeiten | UX-007, TIME-011 |
| 6.5 | Export/Backup/Wiederherstellung | TECH-014 |
| 6.6 | Gerätetest-Liste abarbeiten (sperren, App killen, neu starten, offline) | O1 |

## Phase 7 – Pilot mit echten Leuten

| # | Schritt | Register |
|---|---|---|
| 7.1 | Apple Developer Program (99 $) – erst jetzt | BUS-011 |
| 7.2 | TestFlight-Version an 5–10 Leute aus dem Gym | BUS-016 |
| 7.3 | Feedback sammeln: Was nutzen sie? Was fehlt? Würden sie zahlen? | BUS-002, -015 |

**Fertig, wenn:** Mehrere Leute nutzen die App 2 Wochen lang wiederkehrend.

## Phase 8 – Adaptiver Planassistent (dein Alleinstellungsmerkmal)

8.1 Übungsdaten mit Muskelgruppen/Bewegungsmustern (RepDB Free prüfen) · 8.2 Plan von X auf Y Tage
umbauen mit Regeln, Konfliktanzeige, Vorschau, Rückgängig · 8.3 Lieblingsübungen sperren · 8.4 Freitext
per KI erst danach. Register: TRAIN-005–011, -019–021.

## Phase 9 – Übungsdemos, Coach, KI

9.1 Entscheidung 3D/Clips, Medienpilot mit 3 Übungen (MEDIA) · 9.2 Coach-Check-in (COACH-008) ·
9.3 KI-Erklärungen mit Kostenlimit (TECH-018, BUS-004) · 9.4 Essensfoto-Experiment (FOOD-015).

## Phase 10 – Vor der Veröffentlichung

10.1 Fachperson prüft Trainingsvorlagen, Kalorienformeln, Grenzen (O3) · 10.2 Gewerbe, Impressum,
Datenschutzerklärung als Webseite, rechtliche Prüfung (LAW) · 10.3 Pro-Abo und Werbung einbauen (BUS) ·
10.4 Store-Texte, Screenshots, App-Name (UX-009) · 10.5 Hilfe/FAQ (UX-005) · 10.6 Code aufräumen,
Sicherheitsprüfung (LAW-017, TECH-017).

**Fertig, wenn:** Freigabematrix (Kap. 18) ohne offene kritische Punkte → Einreichung im App Store.

## Phase 11 – Nach dem Start

Android + Google Play (12 Tester/14 Tage, BUS-013) · weitere Sprachen (UX-004) · Konten/Sync (TECH-015,
-016) · Community (LAW-016) · Support und Updates (LAW-018).

---

**Zeitangaben** setzen wir bewusst nicht fest. Nach jeder Phase notieren wir, wie lange sie wirklich
gedauert hat, und schätzen dann den Rest realistisch.
