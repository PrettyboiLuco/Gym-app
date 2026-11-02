# Gerätetest-Liste (Fahrplan 6.6, offener Punkt O1)

Stand 02.11.2026. Zum Abhaken auf dem iPhone. „Expo Go“ = geht jetzt schon; „Build“ = erst mit eigener
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

## Supplements (31.10.2026)

| # | Test | Erwartet | Wo |
|---|---|---|---|
| U1 | Ernährung → Supplements, „Kreatin“ mit 3 g anlegen, „genommen“ | „1 von 7 Tagen“, bleibt nach Neustart | Expo Go |
| U2 | Erinnerung 2 Minuten in der Zukunft eintragen, Handy sperren | Mitteilung „Kreatin – abhaken, wenn du es genommen hast.“ | Expo Go |
| U3 | Supplement entfernen | Erinnerung kommt nicht mehr | Expo Go |
| U4 | Sicherung erstellen, alle Daten löschen, Sicherung wiederherstellen | Supplements und abgehakte Tage wieder da | Expo Go |
| U5 | VoiceOver auf der Supplement-Seite | „offen/genommen“ je Supplement vorgelesen | Expo Go |


## Optik-Paket (31.10.2026) – auf dem iPhone in Expo Go

| Nr. | Was tun | Erwartung |
|---|---|---|
| O1 | App neu installieren bzw. „Alle Daten löschen“, dann öffnen | Herz pendelt, „Willkommen bei Myhealth“ steigt Wort für Wort auf, Karten folgen |
| O2 | Freies Training, Übung hinzufügen, Satz mit dem runden Haken abhaken | Haken federt, kurzer Druck spürbar, Pause öffnet sich im Vollbild mit „Als Nächstes“ |
| O3 | Pause bis zum Ende laufen lassen | bei 3, 2, 1 je ein leichter Schlag, am Ende ein Erfolgs-Signal |
| O4 | Alle Sätze einer Übung abhaken | Erfolgs-Signal, Übung klappt zu einer Zeile zusammen, nächste Übung rückt weich nach |
| O5 | „Training beenden“ | Abschluss-Bildschirm; beim zweiten Training mit mehr Gewicht „Neue Bestleistung“, heutiger Punkt federt auf |
| O6 | Während ein Training läuft, zu „Ernährung“ wechseln | Mini-Player „Training läuft“ über der Tab-Leiste (iOS 26), Tippen führt zurück |
| O7 | Auf einer langen Seite nach unten scrollen (iOS 26) | Tab-Leiste schrumpft, beim Zurückscrollen kommt sie wieder |
| O8 | Mehr → Darstellung zwischen Wie iPhone / Hell / Dunkel wechseln | Auswahlfeld gleitet, kurzer Tipp spürbar, App wechselt sofort |
| O9 | Gewicht speichern | „Gespeichert“ gleitet kurz über der Tab-Leiste ein |
| O10 | Ernährung → einen Eintrag antippen | öffnet sich als Sheet von unten, nach unten wischen schließt |
| O11 | iPhone: Bedienungshilfen → Bewegung reduzieren an, App öffnen | keine Feder- und Aufsteige-Bewegungen, alles steht sofort |
| O12 | iPhone: Textgröße sehr groß | Texte wachsen, Titel und große Zahlen begrenzt, nichts abgeschnitten |
| O13 | Neues App-Symbol (erst mit TestFlight-Build) | 3D-Herz in Lime auf Schwarz |

## Ausbaupaket A1–A11 (01.11.2026) – auf dem iPhone in Expo Go

| # | Test | Erwartet | Wo |
|---|---|---|---|
| X1 | Satzart über die Satznummer ändern, RIR setzen, Notiz | A/D/V-Kürzel sichtbar, RIR beim nächsten Mal angezeigt | Expo Go |
| X2 | Cardio im Plan, Timer starten, App schließen, später öffnen | Timer läuft richtig weiter | Expo Go |
| X3 | Schnelleintrag, Koffein-Getränk, „Ganzen Vortag übernehmen“ | Werte stimmen, Koffein nach 14 Uhr erkannt | Expo Go |
| X4 | Ohne Internet „Haferflocken“, „Hühnchen“, „Haferflockn“ suchen, 2 EL eintragen | Grundnahrungsmittel gefunden, 20 g | Expo Go |
| X5 | Strong-/Hevy-Export importieren, PDF-Bericht teilen, CSV in Numbers öffnen | Trainings im Verlauf, PDF lesbar, Spalten sauber | Expo Go |
| X6 | Zwei Wochen Morgen-Check | Ampel ab Check 8 nachvollziehbar, „leichter heute“ nur einmal am Tag | Expo Go |
| X7 | Status „krank“ setzen, am nächsten Tag Erinnerungen prüfen | Keine Trainingserinnerung, Wochenziel pausiert | Expo Go |
| X8 | Nach 3–4 Wochen Check-in öffnen | Geschätzter Verbrauch mit Rechenweg | Expo Go |
| X9 | Vorlage übernehmen, Geräteprofil „Zuhause“, „Gerät belegt“ | Nur Ersatz mit Kurzhanteln/Körpergewicht | Expo Go |
| X10 | Woche planen, Einkaufsliste im Supermarkt abhaken und teilen | Häkchen bleiben, Text in Nachrichten lesbar | Expo Go |
| X11 | Rezept per Link (z. B. eine große Rezeptseite) | Zutaten zugeordnet, Rezept gespeichert | Expo Go |
| X12 | Foto-Vergleich überblenden, Schieber ziehen | Flüssig, Hilfslinien passen | Expo Go |
| X13 | Teilen-Karte nach dem Training als Bild teilen | Bild in Nachrichten/Instagram, gut lesbar | Expo Go |
| X14 | Mehr → Bereiche der App: Ernährung aus | Tab „Ernährung“ weg, „Heute“ ohne Kalorien/Trinken, Trink-Erinnerung aus | Expo Go |
| X15 | Supersatz im Plan (zwei Übungen „mit nächster verbunden“), im Training abwechselnd abhaken | Pause erst nach der zweiten Übung, Reihenfolge stimmt | Expo Go |
| X16 | Scheibenrechner bei Langhantel 82,5 kg | Scheiben je Seite richtig, eigene Stange berücksichtigt | Expo Go |
| X17 | Blutdruck eintragen (3 Messungen), dann Bericht für den Arzt erstellen | Ø der letzten 7 Tage ohne Bewertung; im Bericht Anzahl und Ø | Expo Go |
| X18 | Erstes Training abschließen | Meilenstein „Erstes Training“ einmal auf „Heute“, danach unter Fortschritt → Meilensteine | Expo Go |
| X19 | Leichte Woche annehmen (am Sonntag und an einem anderen Tag) | Gilt bis Sonntag; am Sonntag gestartet bis zum nächsten Sonntag | Expo Go |
| X20 | Atemübung 4-7-8, 1 Minute, hell und dunkel | Kreis wächst/schrumpft, Text immer lesbar | Expo Go |

## Nach dem Phase 1 Scan (02.11.2026) – behobene Fehler gegenprüfen

| # | Test | Erwartet | Wo |
|---|---|---|---|
| S1 | App-Sperre an, Training starten, Gewicht tippen (nicht abhaken), Handy > 1 min sperren, entsperren | Training, getippte Werte und Pausen-Vollbild sind noch da | Expo Go |
| S2 | „Training starten“ schnell doppelt tippen; Lebensmittel doppelt „Hinzufügen“ | Nur ein Training bzw. ein Eintrag | Expo Go |
| S3 | Planeditor → Planassistent → übernehmen → „Plan öffnen“, dann im Editor speichern | Editor zeigt die neue Fassung, nichts wird zurückgedreht | Expo Go |
| S4 | Halte-Übung (Plank) starten, mitten im Countdown „Zurück“ | Satz mit den gehaltenen Sekunden eingetragen | Expo Go |
| S5 | Gescanntes Produkt bearbeiten (Name ändern) und speichern | Speichern klappt, Koffein bleibt | Expo Go |
| S6 | Ernährung aus und wieder an | Coach wieder sichtbar | Expo Go |
| S7 | Tagesende 4 Uhr einstellen, um 1 Uhr Ernährung öffnen | Oben steht „Heute“ für den Vortag, „Zu heute“ springt nicht auf den Kalendertag | Expo Go |
| S8 | Ernährung bzw. Bereitschaft aus: Mehr → Mitteilungen | Trink-, Morgen- und Bettzeit-Karten ausgeblendet, keine Supplement-Erinnerung | Expo Go |

## VoiceOver – alle Hauptabläufe (A11.2)

Einschalten: Einstellungen → Bedienungshilfen → VoiceOver (oder dreimal Seitentaste, wenn eingerichtet). Wischen
nach rechts = nächstes Element, Doppeltippen = auslösen, mit zwei Fingern nach oben wischen = alles vorlesen.
Im Code sorgt ein Test dafür, dass jedes tippbare Element eine Rolle hat (`accessibility-code.test.ts`); ob die
Ansagen verständlich sind, kann nur der Test am Gerät zeigen.

| # | Ablauf | Erwartet | Wo |
|---|---|---|---|
| VO1 | „Heute“ von oben nach unten durchwischen | Jede Kachel mit Zahl und Einheit angesagt, Ampel mit Text (nicht nur Farbe) | Expo Go |
| VO2 | Morgen-Check mit VoiceOver ausfüllen | Jede Zahl als „Auswahl, 3 von 5“ o. ä., gewählte Zahl als ausgewählt | Expo Go |
| VO3 | Training starten, Satz erledigen, Pause überspringen | Satz-Knöpfe beschriftet, Pausenende angesagt | Expo Go |
| VO4 | Lebensmittel suchen und eintragen | Suchfeld beschriftet, Treffer mit Name und kcal | Expo Go |
| VO5 | Wochenplan: Mahlzeit als gegessen markieren | Knopf „Gegessen“ der richtigen Mahlzeit zugeordnet | Expo Go |
| VO6 | Einkaufsliste abhaken | „Kontrollkästchen, aktiviert/deaktiviert“ mit Name und Menge | Expo Go |
| VO7 | Foto-Überblendung mit dem Schieber | „anpassbar“, mit einem Finger hoch/runter wischen ändert in 10-%-Schritten | Expo Go |
| VO8 | Muskelkarte | Karte selbst still, Liste darunter mit Sätzen je Muskel | Expo Go |
| VO9 | Check-in mit Vorschlag annehmen | Vorschlag vollständig vorgelesen, Knöpfe beschriftet | Expo Go |
| VO10 | Große Schrift (Einstellungen → Anzeige & Textgröße) auf Maximum, Hauptseiten ansehen | Nichts abgeschnitten oder überlappend | Expo Go |
