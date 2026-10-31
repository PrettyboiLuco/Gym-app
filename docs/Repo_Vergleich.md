# Vergleich mit fremden Repositories (31.10.2026)

Anlass: Liste mit 50 GitHub-Projekten (Fitness-Apps, Gesundheitsanbindungen, Lebensmittel- und Übungsdaten). Frage:
Gibt es dort besseren Code, der unseren ersetzen kann?

## Vorgehen

- **Technik-Filter:** Unsere App ist Expo/React Native (TypeScript). 25 der 50 Projekte sind Flutter/Dart-Bausteine
  (Scanner, Datenbank, Diagramme, Kalender, Mitteilungen, Cloud) – nicht einbaubar, die Funktionen haben wir bereits.
  Python-Backends, Bluetooth-SDKs, Capacitor/Swift-Projekte und Dienste mit Server oder KI passen nicht zu den
  Entscheidungen „kein Server, keine KI“.
- **Code gelesen** (geklont, nur gelesen, nichts ausgeführt): Liftosaur, wger, OpenNutriTracker, Waistline, FoodYou,
  OpenHIIT, smooth-app (Open Food Facts), free-exercise-db, react-native-healthkit.
- **Lizenzen (aus den Repos):**

| Projekt | Lizenz | Code übernehmen? |
|---|---|---|
| Liftosaur, wger | AGPL-3.0 | **nein** – würde die ganze App unter AGPL zwingen; nur Ideen |
| OpenNutriTracker, Waistline, FoodYou | GPL-3.0 | **nein** – nur Ideen |
| smooth-app | Apache-2.0 | erlaubt (mit Hinweis), aber Dart – Ideen nachgebaut |
| OpenHIIT, react-native-healthkit | MIT | erlaubt |
| free-exercise-db | Public Domain (Unlicense) | Daten erlaubt; Bilder: Herkunft unklar, und eigene Bilder sind entschieden |

## Ergebnis: keinen Code ersetzt, drei Verbesserungen selbst gebaut

| Fund (Quelle der Idee) | Unser Problem | Umgesetzt |
|---|---|---|
| Waistline liest Energie auch aus `energy_100g` | Bei älteren Open-Food-Facts-Produkten ohne `energy-kcal_100g`/`energy-kj_100g` fehlten die Kalorien | `normalizeOffProduct` nimmt `energy_100g` (kJ) als Ersatz; Test |
| smooth-app bereitet „GS1 Sunrise 2027“ vor | Ab 2027 tragen Packungen zunehmend QR-/DataMatrix-Codes; unser Scanner las nur EAN/UPC | Scanner liest zusätzlich QR und DataMatrix; `productCodeFromScan` holt die Produktnummer aus GS1 Digital Link, Klammerform und DataMatrix-Rohdaten (mit Prüfziffer); fremde QR-Codes werden übergangen; 6 Tests |
| Waistline entfernt führende 0 bei Barcodes | Dasselbe Produkt kommt je nach Gerät als UPC-A (12) oder EAN-13 (13 Ziffern) – die eigene Liste fand es dann nicht | `findFoodByBarcode` sucht beide Schreibweisen (`barcodeVariants`); Test |
| OpenNutriTracker: gleitender Gewichtsschnitt | Unser 7-Tage-Schnitt zählte **Messungen**: vier Messungen an einem Tag genügten für „genug Daten“ im Check-in und zählten vierfach | `weightTrend` rechnet über Tagesmittel und verlangt Messungen an ≥ 4 **Tagen**; Texte in App, Check-in-Regel und Fachprüfmappe angepasst; Test |

## Verglichen und bei uns gleichwertig oder besser

- **Steigerung** (Liftosaur, wger): Unsere Entscheidungstabelle deckt doppelte Progression, Stagnation und
  Wiedereinstieg ab, ist versioniert und getestet. Liftosauers Skriptsprache ist mächtiger, aber für Einsteiger zu
  komplex.
- **Kalorienziel/Makros** (OpenNutriTracker): dort feste Prozentverteilung 60/25/15 und ±500 kcal; unsere Makros nach
  g/kg mit Fett-Untergrenze und Untergrenzen-Schutz passen besser zu Krafttraining. Sport-Kalorien werden dort
  gutgeschrieben, bei uns bewusst nicht (HEALTH-007).
- **Timer** (OpenHIIT): Android-Dienst bzw. Audio-Trick; unser Weg (Zeitstempel + geplante iPhone-Mitteilungen) ist
  für iOS robuster.
- **Open-Food-Facts-Anbindung** (smooth-app, Waistline): Unsere Abfrage (API v3, Felderauswahl, Zeitlimit,
  Drosselung, Fehlerarten) ist sauberer als die von Waistline. Das JS-Paket `@openfoodfacts/openfoodfacts-nodejs` ist
  noch „2.0.0-alpha“ – kein Gewinn.

## Für später notiert (Ideen, nicht gebaut – Entscheidung Luc)

| Idee | Gesehen bei | Nutzen |
|---|---|---|
| **Apple Health über `@kingstinct/react-native-healthkit`** (MIT, 16.2.0, Expo-Plugin) – Schritte als Tagessumme per `queryStatisticsCollectionForQuantity` (`cumulativeSum`), so zählt Apple iPhone und Watch nicht doppelt (HEALTH-005) | react-native-healthkit | Phase 6.2 mit dem MacBook |
| Bestleistungen mit geschätztem 1RM (Brzycki: Gewicht × 36 / (37 − Wdh.)) | wger, Liftosaur | Motivation, Verlauf je Übung |
| Scheibenrechner (welche Scheiben auf die Stange) | Liftosaur | Komfort im Training |
| „Schnell eintragen“: nur kcal/Makros ohne Lebensmittel (z. B. Restaurant) | FoodYou | schnelleres Tagebuch |
| „1 Packung“ als Menge aus der Packungsgröße | FoodYou | weniger Rechnen |
| Tagesgrenze verschieben (Essen um 1 Uhr zählt zum Vortag) | OpenNutriTracker | Schichtarbeit, Nachteulen |
| Englische Namen aus free-exercise-db als zusätzliche Suchbegriffe | free-exercise-db | bessere Suche |

Nicht übernommen: Streak-Trophäen (wger) – widerspricht „keine Streak-Bestrafung“ (TRACK-006); Kalorien-Gutschrift für
Training (OpenNutriTracker) – HEALTH-007.

## Die übrigen 41 Repositories (31.10.2026, nachgeholt)

Alle 41 geklont (ohne große Dateien) und Doku, Changelogs und Code gezielt nach Punkten durchsucht, die für uns
zählen. Code übernehmen kann keins (Flutter, Kotlin, Python, Swift). Ergebnisse:

### Umgesetzt

| Fund | Quelle | Was bei uns passiert ist |
|---|---|---|
| **iOS behält höchstens 64 geplante Mitteilungen**, seit iOS 10 die zuletzt geplanten | flutter_local_notifications (32) | **Fehler bei uns:** bis zu 19 Erinnerungen + 50 Timer-Hinweise + Pausen-Hinweis = 70. Ein langer Dehn-/HIIT-Ablauf hätte Trink- und Trainingserinnerungen still verdrängt. Jetzt bekommen Timer-Hinweise nur den freien Rest (`timerAlertBudget`, höchstens 41 bei allen Erinnerungen an); Test |
| Taschenlampe und Vibration beim Erkennen | Open-Food-Facts-Scan-Anleitung (15) | Taste „Licht an/aus“ im Scanner, kurze Vibration beim erkannten Code |
| App-Kennung im Format „App - System - Version - Kontakt“ | OFF-Server-Doku (15) | `Myhealth - ios - Version 1.0.0`; Kontakt folgt mit den Anbieterangaben |
| Barcode **nicht** selbst umformen, der Server normalisiert | OFF-Server-Doku (15) | bestätigt: wir senden den Code unverändert, Varianten nur für die eigene Liste |
| Offizielle Grenzen 15 Produkt- / 10 Suchabfragen pro Minute | OFF-Server-Doku (15) | bestätigt: wir drosseln auf 12 / 8 |

### Für Apple Health (Phase 6.2) notiert

- **Schlaf** kommt in überlappenden Stufen („im Bett“, „wach“, Kern, Tief, REM) und von iPhone und Watch doppelt.
  Für Schlafstunden nur Schlafstufen nehmen, „im Bett“/„wach“ weglassen und überlappende Zeiten zusammenführen,
  nicht aufaddieren (carp-health-flutter 1, connect_kit 8).
- **Selbst eingetippte Werte** sind in Apple Health markiert („manuell“) und lassen sich erkennen (1).
- Hintergrund-Abruf aus Apple Health kann iOS die App beenden lassen, wenn er zu viel tut (Terra 10) – wir lesen nur
  beim Öffnen, kein Hintergrund.

### Für Android (Phase 11) notiert

- Health Connect: Gesundheitsdaten-Erklärung in der Play Console, danach **5–7 Werktage** bis zur Freischaltung;
  Datenschutzseite muss im Health-Connect-Dialog erreichbar sein; ohne Zusatzrecht nur **30 Tage** rückwirkend lesbar
  (1, 4, 7).
- `expo-health-connect` ist überholt und in `react-native-health-connect` aufgegangen; beide zusammen brechen den
  Android-Build (4).
- Exakte Wecker für Timer brauchen ab Android 14 eine eigene Berechtigung (32).

### Für später / andere Phasen

| Idee | Quelle |
|---|---|
| Import aus Strong, Hevy, FitNotes (CSV) – Umsteiger nehmen ihren Verlauf mit; Spaltennamen-Zuordnung dort gut dokumentiert (AGPL, nur Idee) | openGym (24) |
| Körperkarte: welche Muskeln eine Einheit trifft | openGym (24) |
| Geschätztes 1RM, Volumen je Übung | verifit (25), wger (21) |
| Lizenzen der Pakete in der App anzeigen | gym_rest_timer (35) – passt zur offenen Frage in 10.2 |
| Pausen-Countdown auf dem Sperrbildschirm (Live Activity) | gym_rest_timer (35) – ist schon geplant (6.3, Build) |
| Pflichtknopf „Käufe wiederherstellen“, falls je ein Pro-Abo kommt | RevenueCat (45), Apple-Regel |
| Nährwerte vom Etikett per Texterkennung auf dem Gerät | ML Kit (47) – berührt „keine KI“, nur auf Wunsch |

### Ohne verwertbare Infos für uns

Kalender (31), Diagramme (33), Datenbank Drift (42), Supabase/PowerSync/Firebase (41, 43, 44 – kein Server),
LangChain/MediaPipe (46, 48 – keine KI), Robotoff (19), OFF-Dart/JS/Python-Clients (16–18, unsere Anbindung ist
gleichwertig), Fitbit/Strava/Garmin/Polar (36, 38–40 – Phase 11+, Strava mit Abfragegrenzen je 15 min/Tag),
Spezi/Android-Beispiele/Capacitor (5–7), RunnerUp (50 – GPS-Läufe, nicht unser Umfang), wger-App (22 – wie 21),
exercises.json (27 – gleiche Daten wie 26, Public Domain), Secure Storage (49 – erst relevant, wenn wir einen
Schlüssel speichern; dann „erst nach Entsperren“ wählen), Stretch/Mindful/SimpleHIIT (29, 30, 34 – haben wir).
