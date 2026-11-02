# Fehlersuche Logik – mobile/src (data/, domain/, services/)

Nur gelesen, nichts im Repo geändert. Bestätigungs-Skripte (jest, laufen gegen den echten Code):
`scan/food.test.ts`, `scan/logic.test.ts`, `scan/restore.test.ts`, Konfiguration `scan/jest.scan.config.js`
(Aufruf: `cd mobile && npx jest --config <scan>/jest.scan.config.js`).

Ergebnis: keine kritischen Funde (kein Absturz, kein Totalverlust). Mehrere mittlere, belegte Fehler.

---

## MITTEL

### M1 Lebensmittel bearbeiten löscht den Koffeinwert (Datenverlust) – bestätigt
- `domain/nutrition.ts:335-366` `parseFoodForm` gibt kein `caffeine` zurück (das Formular hat auch kein Feld dafür).
- `data/nutrition.ts:190` `draft.caffeine ?? null`, dann `data/nutrition.ts:213` `UPDATE food SET … caffeine = ?`.
- Szenario: Energy-Drink per Barcode (OFF, caffeine 32 mg/100 ml) → im Formular nur den Namen ändern → speichern
  → `caffeine` = NULL. Folge: Koffein künftiger Einträge ist „unbekannt“, Journal-Faktor „Koffein spät“ fehlt.
- Skript: `food.test.ts` → „caffeine after edit null“.

### M2 OFF-Produkte mit 3+ Nachkommastellen lassen sich nicht mehr speichern – bestätigt
- `domain/nutrition.ts:310` `foodToForm` schreibt den Wert ungerundet (`0,0762`), `domain/nutrition.ts:102`
  `parseNutrient` erlaubt nur 2 Nachkommastellen → Problem „nutrient“.
- Szenario: Gescanntes Produkt mit `salt_100g: 0.0762` (bei OFF üblich) öffnen → irgendein Feld ändern → Speichern
  scheitert, bis man den (richtigen) Salzwert von Hand kürzt. Gilt auch für Grundnahrungsmittel mit 3 Stellen.
- Skript: `food.test.ts` → „problems [ 'nutrient' ] 0,0762“.

### M3 Belastungsquotient (Bereitschaft) bei 14–27 Tagen Historie systematisch zu hoch – bestätigt
- `domain/readiness.ts:77` teilt die 28-Tage-Summe immer durch 4 Wochen, freigegeben wird aber schon ab 14 Tagen
  (`:83`, `MIN_LOAD_HISTORY_DAYS = 14`).
- Szenario: gleichmäßiges Training (jeden 2. Tag 300) seit 21 Tagen → ratio 1,45 → 1 Punkt „Last“; bei genau 14–15
  Tagen ~2,0 → 2 Punkte (gelb/rot mit nur einem weiteren Punkt). Richtig wäre ~1,0.
- Skript: `logic.test.ts` → history 21: ratio 1.45 (bei 28 Tagen 1.14).
- Fix-Idee: durch `min(4, historyDays/7)` teilen.

### M4 Wiederherstellung älterer Sicherungen überspringt die Daten-Migrationen – bestätigt
- `data/backup.ts:155-179` kopiert Tabellen/`app_state` 1:1; Umwandlungen aus `data/migrations.ts` laufen nicht:
  - v4 (`migrations.ts:239-241`): `nutrition_settings.kcalGoal` → `calorie_goal`. Sicherung von Schema ≤3 → Kalorienziel weg
    (`calorieGoalOn` = null).
  - v15 (`migrations.ts:537-540`): Profil mit „kabel“ bekommt `kabel_crossover`/`kabel_doppel`. Sicherung Schema ≤14 →
    Geräte fehlen, Crossover-Übungen fallen aus Planassistent/Vorlagen.
  - v6 (`migrations.ts:295`): Plank-Planeinträge → `target_seconds`. Sicherung ≤5 → Plank wieder als Wdh. geplant.
  (Nur v23 Schlaf wird per `adoptSleepEntries` nachgeholt.)
- Skript: `restore.test.ts` → Profil nach Restore `["kabel","koerpergewicht"]` vs. nach In-place-Update mit den
  zwei Kabel-Geräten; Kalorienziel nach Restore v3 = null.

### M5 Check-in schlägt „mehr essen“ vor, obwohl kein Fortschritt beim Abnehmen – bestätigt
- `domain/checkin.ts:181` delta −100, dann `:199` `Math.max(CALORIE_FLOOR, goal + delta)`. Liegt das eigene Ziel unter
  1200 (erlaubt: CHECK 500–10000), wird daraus eine Erhöhung.
- Szenario: Ziel 1100, Richtung abnehmen, Gewicht unverändert → `{kind:'kcal', from:1100, to:1200, reason:'keinFortschritt'}`
  = „1100 → 1200, weil das Gewicht sich nicht in Richtung deines Ziels bewegt hat“ (widersprüchlich).
  Gleiches Muster in `domain/adaptive.ts:297-303` (Fassung 2). Skript: `logic.test.ts`.

---

## GERING

### G1 „Leichte Woche“ (Deload) am Sonntag dauert nur einen Tag – bestätigt
- `domain/planner.ts:792` `(7 - getUTCDay()) % 7` = 0 am Sonntag → `validUntil = heute`; `data/training-stats.ts:105`
  setzt trotzdem `lastEnd` → 8-Wochen-Zähler zurückgesetzt. Samstag → 2 Tage. Skript: `temporaryEnd('woche','2026-11-01')` = `2026-11-01`.

### G2 Rezept-Import: Mengen werden falsch/gar nicht erkannt – bestätigt
- `domain/recipe-import.ts:123-132, 137-168`:
  - „1.000 g Mehl“ → 1 g (Tausenderpunkt als Dezimalpunkt; Faktor 1000 falsch).
  - „2–3 EL Öl“ (Gedankenstrich, typisch in deutschen Rezepten) → Menge null, Einheit null.
  - „ca. 200 g Reis“ → Menge null (Präfix wird erst nach der Mengen-Erkennung entfernt, `:167`).
  - „2 - 3 Karotten“ → Name „- 3 Karotten“.
  („1/2“, „1½“, „1 ½“, „1 1/2“, „2-3“, „0,5 kg“ funktionieren.) Skript: `logic.test.ts`.

### G3 Steigerung: „ca. 10 % leichter“ ergibt dasselbe Gewicht – bestätigt
- `domain/progression.ts:56-58, 120, 159`: Rundung auf den Geräteschritt hebt die Reduktion auf.
  Kettlebell 16 kg Stagnation → 16 kg; Wiedereinstieg −10 % → 16 kg; Langhantel 10 kg → 10 kg; Kurzhantel 8 kg → 8 kg.

### G4 Ernährungstag-Ende („Tag endet um 4 Uhr“) nur teilweise umgesetzt – bestätigt (Code)
- `services/nutrition-format.ts:15-20` `diaryToday` beachtet `dayEndsAt`, aber `components/day-switcher.tsx:19` und
  `dayLabel` (`nutrition-format.ts:100-105`) nutzen `todayDay()`: Um 1 Uhr zeigt das Tagebuch den Ernährungstag als
  „Gestern · Zu heute“; „Zu heute“ springt auf den Kalendertag, Einträge landen dann am falschen Ernährungstag.
- `domain/caffeine.ts:300-301` `lateCaffeineMg`: Koffein nach Mitternacht (noch derselbe Ernährungstag) zählt nicht als
  spät (anders als `data/readiness.ts:227` bei Mahlzeiten).

### G5 Nachträge haben als Verzehrzeit die Erfassungszeit – bestätigt (Code)
- `services/nutrition-format.ts:23-25` `at: new Date()` → `occurred_at_utc`. Kaffee vom Morgen um 15 Uhr nachgetragen
  → Journal-Faktor „Koffein spät“ (`domain/caffeine.ts:300`), Frühstück um 22 Uhr nachgetragen → „spät gegessen“.

### G6 Wiederherstellung: Fehlschlag löscht alle Erinnerungen – bestätigt (Code)
- `app/more/data.tsx` `restoreNow`: `cancelEverything()` vor `restoreBackup`; im `catch` wird nichts neu geplant.
  Daten bleiben (Transaktion), Erinnerungen und Timer-Hinweise sind aber weg bis zum nächsten Speichern der Einstellungen.

### G7 Bericht für Trainer/Arzt ignoriert die Gewichtsart – bestätigt (Code)
- `data/report.ts:68-77, 93`: Volumen = kg × Wdh. auch bei Gegengewicht (zählt sonst 0) und einseitig (sonst ×2);
  e1RM wird für Klimmzug-/Dip-Maschine aus dem Gegengewicht berechnet, „bestes Gewicht“ = meiste Unterstützung.
  Weicht von Statistik/Zusammenfassung (`domain/logger.ts` `setVolume`, `bestOneRepMax`) ab.

### G8 Intervall-Timer plant 1 Hinweis mehr als das Budget – bestätigt (Code)
- `services/alerts.ts:55-63`: Prüfung `alerts.length < budget` nur je Runde, pro Runde 2 Hinweise → bis zu budget+1.
  Durch die Reserve von 3 (domain/reminders.ts:87) folgenlos, aber Grenze nicht exakt.

### G9 Einkaufsliste: eigenes Rezept ohne Portionsangabe ignoriert die geplanten Portionen – bestätigt (Code)
- `data/meal-plan.ts:90` `factor = r.portions ? … : 1` → 2 geplante Portionen = Zutaten für 1 ganzes Rezept.

---

## Unbestätigt / Hinweise
- `domain/time.ts:4` `timeZone` wird einmal beim Start gelesen; nach Zeitzonenwechsel bei laufender App rechnet
  `localDay(…, timeZone)` mit der alten, `getHours()` (diaryToday, caffeine) mit der neuen Zone.
- `data/nutrition.ts:124` Suche: `%`/`_` in der Eingabe werden nicht escaped (LIKE-Platzhalter), nur Trefferqualität.
- `app/more/data.tsx` Restore schreibt Fotos mit Dateinamen aus der Sicherung (`writePhotoBase64(name…)`) ohne Prüfung
  auf `../` – bei manipulierter Datei Schreiben außerhalb des Foto-Ordners denkbar (nicht getestet).
- `domain/checkin.ts:123` `goalAvg` über alle 7 Tage, `kcalAvg` nur über vollständige Tage – mit Trainings-/Ruhetag-
  Aufteilung kann „Ziel einhalten“ (>150 kcal drüber) schief ausfallen.

## Geprüft, ohne Fund
Migrationen v6/v7/v10/v26 (Neuaufbau: Daten, Indizes, keine eingehenden FKs), BACKUP_TABLES deckt alle 38 Tabellen
ab, Lösch-/Einfügereihenfolge passt zu den FKs; kg/lb-, cm/in-, ml/oz-Umrechnung (gespeichert wird immer kg/cm/ml);
Mifflin-St Jeor, Untergrenzen, Makros, Tages-Split (Ruhetag nie unter Untergrenze); adaptive Schätzung (Spanne 21 Tage);
Wochenstart Montag (`weekStart`, `isoWeekday`, Expo-Wochentag-Umrechnung); Datumsrechnung um 12 Uhr UTC (DST-fest);
Einkaufsliste zusammenfassen/aufrunden; Meilensteine; Status-Pause der Trainingserinnerungen (wird beim Beenden neu geplant).
