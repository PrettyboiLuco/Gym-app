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
