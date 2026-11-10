# Plan: Ideen aus „fin“ (Vergleich vom 10.11.2026)

Grundlage: 15 Screenshots der App fin (Luc, 10.11.2026) und App-Store-Beschreibung. fin deckt dasselbe ab wie Myhealth
(Training, Essen, Gewicht, Bereitschaft), wirkt aber schlanker, weil jeder Bildschirm eine Hauptsache hat.
Übernommen wird nur, was zu unseren Regeln passt: **keine Serien, kein Druck, kein Konto, alles kostenlos, Lime nur auf Daten.**

Aufwand: S = bis ½ Tag, M = 1 Tag, L = mehrere Tage. „Build“ = braucht einen Development Build (nicht in Expo Go).

---

## 1. Verlauf mit Wochenleiste und Tages-Aktionen — M ✅ umgesetzt 10.11.

**fin:** Oben Monat + Wochenleiste (Mo–So, Tag antippen), darunter Karte des Tages: „10. November · Nichts eingetragen“
mit **Einheit nachtragen · Ruhetag · Krank**.

**Bei uns heute (Scan):**
- `src/app/training/history.tsx` – Liste nach Monaten, oben Knopf „Training nachtragen“ (→ `training/edit/[id]`, `data/workout-edit.ts`).
- Krank/verletzt/Pause: `data/readiness.ts` → `startStatus(db, status, today)` – **nur ab heute**, als Zeitraum; Einzeltag in der Vergangenheit geht nicht.
- **Ruhetag** gibt es nur als Plan-Wochentag bzw. Coach-Ziel (`coach.ts`), nicht als bewusst gesetzter Tag.

**Plan:**
1. Kopf des Verlaufs: Monat (antippbar → Monat wechseln) und waagrechte Wochenleiste (`WeekStrip`-Stil wie Datumsauswahl);
   Tage mit Training gefüllt, Ruhetag/Krank als eigene Marke (Umriss/Strich).
2. Tageskarte für den gewählten Tag: Einträge des Tages (Training, Cardio, Dehnen) oder „Nichts eingetragen“ mit drei
   Knöpfen: **Training nachtragen** (öffnet `training/edit/neu` mit diesem Datum), **Ruhetag**, **Krank**.
3. Daten: neue Tabelle `day_mark (day TEXT PRIMARY KEY, kind TEXT CHECK (kind IN ('ruhetag')), created_at_utc)` –
   Migration 29, in `BACKUP_TABLES`, CSV „befinden“. Krank für einen Einzeltag: neue Funktion
   `setStatusDay(db, 'krank', day)` (Zeitraum von=bis=Tag, überlappende kürzen) in `data/readiness.ts`.
4. Wirkung: Ruhetag = nur Anzeige (zählt nicht als Training, nimmt nichts weg). Krank-Tag wie bisher: Woche zählt
   nicht in Plan-Wochen (`weekResults`), Bereitschaft zeigt Status.
5. Liste darunter bleibt (nach Monaten, „Ältere laden“).

**Tests:** `setStatusDay` (Überlappung, Rückgängig), `day_mark` in Sicherung, Plan-Woche mit Krank-Tag.
**Offen für Luc:** Soll ein gesetzter Ruhetag den „Heute dran“-Vorschlag auf morgen schieben? (Vorschlag: ja.)

---

## 2. „Dein Jahr“ als Kästchen-Raster — S ✅ umgesetzt 10.11.

**fin:** 53 × 7 Kästchen (ein Jahr), Trainingstage farbig, darunter Einheiten · Stunden.

**Bei uns heute:** Trainingstage gibt es schon fertig: `data/goals.ts` → `trainingDays(db, fromUtc, timeZone)` (Kraft,
HIIT, Cardio; seit Migration 28 in der Startzone). Plan-Wochen-Kästchen (12 Wochen) in `progress/milestones.tsx`.

**Plan:**
1. Komponente `YearGrid` (`components/year-grid.tsx`, SVG wie die Muskelkarte): Spalten = Wochen (Mo oben), letzte
   52 Wochen bis heute, Kästchen 8–10 px; trainiert = Datenfarbe, Ruhetag/Krank = Umriss, leer = `backgroundSelected`.
2. Darunter drei Zahlen: Einheiten · Stunden (aus Dauer der Trainings + Cardio-Minuten) · aktive Wochen.
   **Keine** „Tage auf Eis“/Serien-Zahl.
3. Platz: im Verlauf unter der Tageskarte (Punkt 1). Antippen eines Kästchens wählt den Tag oben.
4. Bildschirmleser: eine Zusammenfassung („In den letzten 12 Monaten an 143 Tagen trainiert“), nicht 364 Elemente.

**Tests:** Zuordnung Tag → Spalte/Zeile (Wochenstart Montag, Jahreswechsel, Schaltjahr).

---

## 3. Muskel-Hinweis „Schultern seit 9 Tagen nicht“ — S ✅ umgesetzt 10.11.

**fin:** Muskelverteilung in Balken, darunter in Gelb „Schultern seit 9 Tagen nicht“.

**Bei uns heute:** Sätze je Muskel der Woche (`data/training-week.ts` → `loadWeekSetsByMuscle`, `loadWeekTally`),
Muskelkarte auf Statistik und Heute. **Fehlt:** letzter Trainingstag je Muskelgruppe.

**Plan:**
1. Daten: eine Abfrage „letzter erledigter Arbeitssatz je Übung“ (`MAX(started_at_utc)` je `exercise_id`, Index
   `set_log_exercise` vorhanden), in JS auf Muskelgruppen (`exerciseMuscles`/`muscleGroup`) verdichten → `lastTrainedByMuscle`.
2. Regel (Domain, getestet): Hinweis nur für Muskelgruppen, die **im aktiven Plan vorkommen**, seit ≥ 8 Tagen nicht
   trainiert; höchstens einer, der älteste. Kein Hinweis bei Status (krank/verletzt/Pause) oder geschontem Bereich.
3. Platz: Statistik unter der Muskelkarte und klein im Training-Tab über „Pläne“. Ton neutral: „Schultern zuletzt vor
   9 Tagen“ – keine Warnfarbe (kein Gelb/Rot), keine Mitteilung.

**Tests:** Plan ohne Schultern → kein Hinweis; Status → kein Hinweis; Mehrgelenk-Übung zählt für Nebenmuskel nur halb? (Vorschlag: nein, Hauptmuskel zählt.)

---

## 4. Mehr Sportarten „nach Zeit“ — M ✅ umgesetzt 10.11.

**fin:** Auswahl „Was für ein Training?“ mit Suche und Kategorien (Ausdauer, Kraft und Fitness, Ballsport …), viele
Sportarten mit „Nur nach Zeit“ oder „Strecke und Zeit“.

**Bei uns heute:** `domain/cardio.ts` → 14 Aktivitäten (Geräte, Laufen, Radfahren, Schwimmen, Wandern, „sonstiges“
mit eigenem Namen); `CARDIO_INFO` steuert Strecke/Stufe. Auswahl als Chips in `training/cardio.tsx`.

**Plan:**
1. Liste erweitern (~30): Ballsport (Fußball, Basketball, Volleyball, Handball, Tennis, Badminton, Tischtennis, Squash,
   Padel), Kampfsport (Boxen, Kickboxen, Kampfsport), Kurse (Yoga, Pilates, Tanzen, Zirkeltraining, Crossfit/Functional),
   Outdoor (Klettern, Bouldern, Skifahren, Inline, Rudern draußen, SUP), Alltag (Gartenarbeit). Je Eintrag
   `distance`/`level` und Kategorie.
2. Auswahl-Fenster statt Chips: Suche + Kategorien (wischbare Chip-Reihe, wie Gerätefilter) + Liste mit Symbol und
   „nach Zeit“ / „Strecke und Zeit“. Zuletzt genutzte oben.
3. Daten: `cardio_log.activity` ist freier Text ohne CHECK (geprüft) – **keine Migration nötig**, nur die Liste in
   `domain/cardio.ts` und die Texte. Belastung bleibt Minuten × Anstrengung (`sessionLoad`).
4. Symbole: wenige generische (Ball, Schläger, Faust, Berg, Welle) statt eines je Sport.

**Tests:** jede Aktivität hat Text + Info; Import/Export unbekannter Aktivität → „sonstiges“.
**Offen:** Kalorien je Sportart? (Vorschlag: nein – keine Schätzungen ohne Messung, wie bisher.)

---

## 5. Kraft pro Übung als Kurve in der Übersicht — S ✅ umgesetzt 10.11.

**fin:** Karte „Kraft pro Übung“: Kniebeugen (LH), Kurve, „138 kg geschätztes Maximum“, „+12 %“.

**Bei uns heute:** Fertig berechnet in `domain/training-stats.ts` → `exerciseTrends` (häufigste Übungen, 8 Wochen,
e1RM/Volumen), angezeigt in `training/stats.tsx` („Bestleistungen & Verlauf“) – eine Ebene tief.

**Plan:**
1. Karte „Kraft pro Übung“ im Fortschritt-Tab (unter Körpergewicht): häufigste Übung der letzten 8 Wochen,
   `SmoothChart` mit e1RM je Woche, Wert „geschätztes Maximum“, Veränderung in % gegenüber vor 8 Wochen
   (nur in Datenfarbe, wenn ≥ 2 Wochen mit Werten). Wischen/Pfeile für die nächsten 2 Übungen.
2. Antippen → `training/exercise/[id]` (Verlauf der Übung).
3. Leer (< 2 Wochen Daten): Leer-Ansicht, **keine Beispielwerte** (fin zeigt erfundene Kurven hinter Pro).

**Tests:** vorhandene `exerciseTrends`-Tests reichen; neu: Prozent-Veränderung (keine Division durch 0).

---

## 6. Essen: sechs Kacheln unter der großen Zahl — S ✅ umgesetzt 10.11.

**fin:** „0/3060 Kalorien“ + Ring „übrig“, darunter 2 × 3 Kacheln mit Ring: Eiweiß, Kohlenhydrate, Fett,
Ballaststoffe, Zucker (höchstens), Wasser.

**Bei uns heute:** große Zahl „übrig“ + Balken + Makro-Leiste (3 Spalten) in `components/day-hero.tsx`;
Ballaststoffe/Zucker im Fenster „Nährwerte“ (`day-summary.tsx`, `EXTRAS`); Wasser in der Getränke-Karte (Glas).

**Plan:**
1. Makro-Leiste ersetzen durch 2 × 3 Kacheln (`StatTile`-Stil): Wert groß, „von 165 g“ klein, dünner Ring/Balken in
   der Datenfarbe. Zucker als „höchstens“ (Balken wird erst über dem Wert rot), Wasser aus Getränken (Ziel aus
   Einstellungen).
2. Ohne Ziel je Kachel: nur Wert, kein Ring. Bei „Zahlen ausblenden“: Kacheln weg wie heute.
3. Ballaststoffe/Zucker damit nicht mehr nur im Fenster; Fenster „Nährwerte“ behält gesättigte Fette/Salz/Mikros.
4. Keine Emoji-Symbole (unser Stil), Reihenfolge wie fin.

**Tests:** Zucker-Grenze, fehlende Werte (≥-Anzeige wie bisher).

---

## 7. Bereitschaft als Wert 0–100 aus Apple Health — L + Build (7a ✅ umgesetzt 10.11., 7b offen)

**fin:** Halbkreis „82 · GUT · Etwas besser als sonst“, Schlaf und Ruhepuls darunter; aus Schlaf, Ruhepuls, HRV, je
Morgen neu, gegen den eigenen 14-Tage-Schnitt.

**Bei uns heute:** `domain/readiness.ts` → `readiness()` gibt eine **Ampel** (grün/gelb/rot, Punkte) aus dem
Morgen-Check (Energie, Schlaf, Muskelkater – von Hand) und der Belastung (ACWR); Lernphase mit
`MIN_BASELINE_CHECKS`. Apple Health ist als **D3** geplant (`docs/Ausbauplan.md`), nicht gebaut.

**Plan in zwei Stufen:**
- **7a (ohne Build, S):** Darstellung als Halbkreis mit Ampel-Stufe und dem stärksten Grund („Schlaf kürzer als sonst“),
  Schlaf/Muskelkater als zwei Kacheln darunter. **Keine** erfundene 0–100-Zahl, solange nur drei Selbstangaben da sind.
- **7b (Build, L):** D3 umsetzen – Apple Health lesen (Schlaf, Ruhepuls, HRV), 14-Tage-Baseline je Wert
  (Median ± Streuung, `domain/readiness.ts`), dann ein Wert 0–100 mit Begründung; Morgen-Check wird optional
  (füllt nur, was Health nicht hat). Benötigt `react-native-health`/`expo-health`-Modul, Development Build
  (EAS Build – kostet Build-Guthaben bzw. Free-Kontingent), Datenschutz-Text und Fachprüfung der Formel.

**Tests (7b):** Baseline-Lernphase, fehlende Werte, Ausreißer.
**Offen:** Development Build jetzt angehen? (Voraussetzung auch für Live Activity, Widgets, Watch.)

---

## Nicht übernehmen (widerspricht unseren Regeln)

| fin | Warum nicht |
|---|---|
| „Serie auf Eis“, Flamme, „Tage auf Eis“ | Serien erzeugen Druck; bei uns bewusst keine (Meilensteine ohne Serien) |
| Countdown „Schließt du dieses Fenster, ist das Angebot weg“, Einladungs-Timer | Künstliche Verknappung – Dark Pattern |
| Pro-Sperren, Beispielwerte hinter Pro | Alles kostenlos; nie erfundene Daten anzeigen |
| Freunde-Feed, Kommentare, Nutzername | Braucht Konto und Server; Daten bleiben auf dem Gerät |
| Maskottchen (Hai) | Passt nicht zum ruhigen „true-black flat“-Stil |
| Kalorien per Foto mit Cloud-KI | Cloud ausgeschlossen; KI auf dem Gerät als eigene Entscheidung (Recherche 08.11.) |

---

## Reihenfolge

| Schritt | Punkte | Aufwand | Build? |
|---|---|---|---|
| 1 | 6 Essen-Kacheln, 5 Kraft-Kurve, 3 Muskel-Hinweis | 3 × S | nein |
| 2 | 1 Verlauf mit Wochenleiste + Tages-Aktionen, 2 Jahres-Raster | M + S | nein (Migration 29) |
| 3 | 4 Sportarten | M | nein |
| 4 | 7a Bereitschaft-Darstellung | S | nein |
| 5 | 7b Apple Health + Wert 0–100 | L | **ja** |

Schritte 1–4 sind ohne neuen Build in Expo Go testbar (sobald Updates wieder gehen bzw. per `eas update` vom Rechner).

## Fragen an Luc
1. Ruhetag setzen → schiebt „Heute dran“ auf morgen? (Vorschlag: ja)
2. Muskel-Hinweis: ab wie vielen Tagen? (Vorschlag: 8)
3. Sportarten ohne Kalorien-Schätzung lassen? (Vorschlag: ja)
4. Development Build für Apple Health jetzt angehen?
