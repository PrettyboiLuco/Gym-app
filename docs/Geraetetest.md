# Gerätetest-Liste (Fahrplan 6.6, offener Punkt O1)

Stand 30.10.2026. Zum Abhaken auf dem iPhone. „Expo Go“ = geht jetzt schon; „Build“ = erst mit eigener
App-Version (`docs/Anleitung_Development_Build.md`). Bei jedem Fehler: was du gemacht hast, was passiert ist,
was du erwartet hast – dann behebe ich es.

## Timer und Mitteilungen (HEALTH-011–016, UX-006)

Vorher: Mehr → Mitteilungen und Erinnerungen → „Timer bei gesperrtem Handy“ an, speichern, Erlaubnis geben.

| # | Test | Erwartet | Wo |
|---|---|---|---|
| T1 | Satz erledigen, Pause 60 s läuft, Handy sperren | Nach ca. 60 s Mitteilung „Pause vorbei“ | Expo Go |
| T2 | Wie T1, aber „+30 s“ vor dem Sperren | Mitteilung erst nach 90 s, keine doppelte | Expo Go |
| T3 | Pause läuft, „Überspringen“, sperren | Keine Mitteilung | Expo Go |
| T4 | HIIT starten, Handy sperren, 2 min warten | Mitteilung bei jedem Wechsel (Pause / nächste Übung) | Expo Go |
| T5 | HIIT „Pause“ drücken, sperren | Keine Mitteilungen, solange pausiert | Expo Go |
| T6 | Dehnroutine starten, App komplett schließen (wegwischen), nach Ende öffnen | Frage „Einheit beendet?“ | Expo Go |
| T7 | Ablauf läuft, App wegwischen, mitten drin öffnen | Ablauf läuft an der richtigen Stelle weiter | Expo Go |
| T8 | Pause läuft, Flugmodus an/aus | Timer unverändert | Expo Go |
| T9 | Uhrzeit in den iPhone-Einstellungen von Hand verstellen während einer Pause | Notieren, was passiert (HEALTH-016, bekannte Grenze) | Expo Go |
| T10 | Lautlos-Schalter an, Fokus „Nicht stören“ an | Notieren, ob/wie die Mitteilung kommt | Expo Go |
| T11 | Timer auf dem Sperrbildschirm sichtbar | Live Activity | Build |

## Erinnerungen (UX-007, TIME-011)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| E1 | Trainings-Erinnerung für heute in 2 Minuten einstellen | Mitteilung zur Uhrzeit | Expo Go |
| E2 | Trink-Erinnerung 1 h, Fenster bis in 1 h | Nur Zeiten im Fenster | Expo Go |
| E3 | Erinnerungen aus, speichern | Keine Mitteilungen mehr | Expo Go |
| E4 | Mitteilungen in iPhone-Einstellungen verbieten, App öffnen | Hinweis „Mitteilungen sind ausgeschaltet“ | Expo Go |

## Daten (TECH-014, LAW-006)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| D1 | Mehr → Deine Daten → Sicherung erstellen → „In Dateien sichern“ | Datei in „Dateien“ | Expo Go |
| D2 | Mit Fotos sichern | Datei deutlich größer | Expo Go |
| D3 | Einen Gewichtseintrag hinzufügen, Sicherung aus D1 wiederherstellen | Eintrag ist wieder weg, alles andere da | Expo Go |
| D4 | Alle Daten löschen | Erststart erscheint, Fotos weg, Erinnerungen aus | Expo Go |
| D5 | Nach D4 Sicherung aus D2 wiederherstellen | Alles inkl. Fotos zurück | Expo Go |
| D6 | Fremde Datei (z. B. PDF) wählen | Klare Fehlermeldung, nichts geändert | Expo Go |

## App-Sperre

| # | Test | Erwartet | Wo |
|---|---|---|---|
| S1 | Mehr → App-Sperre an | Gerätecode-Abfrage zur Bestätigung | Expo Go |
| S2 | App wegwischen, öffnen | Sperrbildschirm, mit Code entsperren | Expo Go |
| S3 | App 2 min im Hintergrund, zurück | Wieder gesperrt | Expo Go |
| S4 | Face ID statt Code | Face ID | Build |

## Schritte (HEALTH-001–007)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| H1 | Fortschritt → Schritte, Tageswert eintragen | Wert, Wochenschnitt, Kalorienziel unverändert | Expo Go |
| H2 | Apple-Health-Erlaubnis geben | Schritte erscheinen mit Quelle „Apple Health“ | Build |
| H3 | Apple-Health-Erlaubnis verweigern | „Keine Daten“, kein Absturz (HEALTH-002) | Build |

## Allgemein

| # | Test | Erwartet |
|---|---|---|
| A1 | Ohne Internet: Training, Tagebuch, Timer, Dehnen | Alles geht (außer Online-Suche/Scan) |
| A2 | Große Schrift (Einstellungen → Anzeige) | Nichts abgeschnitten |
| A3 | Dunkelmodus | Alles lesbar |
| A4 | App-Update über Expo Go | Daten bleiben erhalten |

## Planassistent (Phase 8, TRAIN-008, -016, -018)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| P1 | Training → Planassistent → Vorlage (3 Tage, Einsteiger, 45 min) → Übernehmen | Plan erscheint in „Meine Pläne“ | Expo Go |
| P2 | Plan umbauen „nur diese Woche“, App am Montag wieder öffnen | Hinweis „befristete Änderung ist vorbei“, gewohnte Fassung aktiv | Expo Go |
| P3 | Umbau übernehmen, dann „Rückgängig“ | Vorige Fassung aktiv, Verlauf unverändert | Expo Go |
| P4 | Im Training „Gerät belegt? Ersatz wählen“ | Offene Sätze wechseln, erledigte bleiben | Expo Go |
| P5 | Gleiche Übung zweimal mit allen Sätzen am oberen Ende | Beim dritten Mal Vorschlag „mehr Gewicht“ | Expo Go |
| P6 | Freitext „4 Tage je 60 Minuten, ohne Langhantel“ (auch per Diktat) | Auswahl unten passend gesetzt | Expo Go |

## Coach, Essen, Allergien (Phase 9, COACH-006–009, FOOD-014)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| C1 | „In eigenen Worten“ mit dem Mikrofon der Tastatur diktieren | Text erscheint, „Erkennen“ findet die Teile | Expo Go |
| C2 | Allergie „Milch“ einstellen, Schokolade scannen | Hinweis „Enthält laut Angaben: Milch“ | Expo Go |
| C3 | Essenszeiten ändern, zur jeweiligen Uhrzeit über „Heute“ eintragen | passende Mahlzeit vorgewählt | Expo Go |
| C4 | Nach 7 Tagen mit Gewicht/Essen: Wochen-Check-in, „Übernehmen“ | neues Kalorienziel ab heute, gestern unverändert | Expo Go |

## Coach (C1–C9)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| K1 | App neu installieren (oder „Alle Daten löschen“), Erststart → „Weiter zum Coach“ | Einrichtung öffnet sich, am Ende Coach-Karte auf „Heute“ | Expo Go |
| K2 | An einem Trainingstag und einem Ruhetag „Heute“ ansehen | Unterschiedliches Kalorienziel, Eiweiß gleich | Expo Go |
| K3 | Erinnerung an Trainingstagen eingeschaltet | Mitteilung nur an diesen Tagen zur Uhrzeit | Expo Go |
| K4 | Kalorienziel in den Einstellungen ändern | Makros und Trainings-/Ruhetag passen sich an | Expo Go |


## Hilfe und Veröffentlichung (Phase 10)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| V1 | Mehr → Hilfe und häufige Fragen, eine Frage antippen, „Sicherung“ suchen | Antwort klappt auf; Suche zeigt passende Fragen aufgeklappt | Expo Go |
| V2 | Hilfe mit großer Schrift und VoiceOver | Fragen vorgelesen als „Taste, eingeklappt/ausgeklappt“, nichts abgeschnitten | Expo Go |
| V3 | Store-Version (TestFlight) ohne Internet starten | App startet normal, keine Fehlermeldung (Update-Abfrage scheitert still) | Build |
| V4 | Store-Version: Daten aus der Pilot-Version per Sicherung übernehmen | alles da (Golden-Dataset-Probe auf dem Gerät, R1) | Build |

## Scanner und Mitteilungen (Nachtrag 31.10.2026)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| N1 | Alle Erinnerungen an (7 Trainingstage, Trinken stündlich), dann langen Dehnablauf starten und Handy sperren; am nächsten Tag | Trink- und Trainingserinnerungen kommen weiter | Expo Go |
| B1 | Produkt mit QR-Code (GS1 Digital Link) scannen, falls eins auffindbar | Produkt wird gesucht | Expo Go |
| B2 | Werbe-QR-Code (z. B. Webseite) vor die Kamera halten | nichts passiert, Scanner bleibt offen | Expo Go |
| B3 | „Licht an“ in dunkler Umgebung | Taschenlampe an; Barcode wird erkannt | Expo Go |
| B4 | Kleinen Barcode nah scannen (iPhone Pro) | wird scharf erkannt; sonst notieren (Nah-Linse) | Expo Go |
