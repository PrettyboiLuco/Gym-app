# Datenschutzhinweise – Entwurf für den Pilot

Stand 02.11.2026 (nach Phase 1 Scan nachgezogen). **Entwurf, nicht rechtlich geprüft** (Prüfung in Fahrplan 10.2, LAW-Punkte). Beschreibt den
technischen Ist-Stand der App, damit Tester wissen, was mit ihren Daten passiert.

## Kurzfassung

- Es gibt **kein Konto und keinen Server** des Anbieters. Alle Einträge (Training, Ernährung, Gewicht, Ziele,
  Fotos, Einstellungen, freiwillige Trainingsangaben im Profil wie Erfahrung, Geräte und Zeit) werden nur
  **lokal auf deinem iPhone** gespeichert.
- **Coach-Angaben** (Ziel, Schritte, Gym-Tage, Schlaf, Trainingstage) und das daraus berechnete Ziel bleiben auf dem
  Gerät; der Coach rechnet ohne Internet und ohne KI.
- **Schlaf, Morgen-Check (Energie, Muskelkater), Status (krank/verletzt), Blutdruck und Puls, Allergien,
  Ernährungsweise, Supplements, Check-ins, Hunger/Sättigung/Stimmung zu Mahlzeiten und Fasten-Zeiten** sind freiwillig und bleiben ebenfalls nur auf dem Gerät
  (Gesundheitsdaten, kommen aber mit in deine Sicherungsdatei).
- Der **Planassistent** rechnet vollständig auf dem Gerät, ohne KI und ohne Internet. Auch dein Wunsch in eigenen
  Worten und „Essen in eigenen Worten“ werden nur lokal gelesen und nicht übertragen.
- Deine Einträge verlassen das Gerät nur, wenn **du** es auslöst:
  - **Barcode-Scan / Online-Suche:** Der Barcode bzw. Suchbegriff wird an Open Food Facts gesendet
    (openfoodfacts.org, Open Database License). Es wird nichts aus deinem Tagebuch übertragen.
  - **Rezept per Link:** Wenn du einen Link eingibst und „Laden“ tippst, ruft dein iPhone diese Webseite ab. Die
    Seite sieht dabei deine IP-Adresse und technische Angaben – nichts aus der App.
  - **Sicherung:** Eine Sicherungsdatei entsteht nur, wenn du sie erstellst; du entscheidest, wo sie gespeichert
    wird (z. B. „Dateien“, iCloud Drive). Sie enthält Gesundheitsdaten, Fotos nur wenn du das einschaltest.
  - **Exporte:** CSV je Bereich, PDF-Bericht („für Trainer oder Arzt“), Zusammenfassung zum Kopieren (z. B. für eine
    KI-App deiner Wahl) und Teilen-Karten entstehen nur, wenn du sie erstellst; wohin sie gehen, bestimmst du über das
    Teilen-Menü bzw. die Zwischenablage. Sie können Gesundheitsdaten enthalten. Mit „ohne Zahlen“ oder bei
    sensibler Situation enthält der Bericht keine Ernährungszahlen.
  - **Import:** Dateien aus Strong, Hevy, Waagen-Apps oder Plan-Dateien werden nur auf dem Gerät gelesen.
  - **Feedback:** Du siehst den Text vorher und verschickst ihn selbst über das Teilen-Menü.
- Automatisch, ohne Einträge:
  - **Update-Abfrage (Expo):** Beim App-Start fragt die App bei Expo (650 Industries, USA, `u.expo.dev`) nach
    Korrekturen ohne neuen Build. Dabei gehen IP-Adresse und technische Angaben (Plattform, Version, Kanal) mit, keine
    Einträge und keine Gesundheitsdaten. (Ergänzt 30.10.2026; behalten oder abschalten: `docs/Rechtspruefung_Mappe.md`, D2.)
- **Keine Werbung, keine Analyse-Dienste, keine KI-Auswertung** deiner Daten.
- **Mitteilungen** sind lokal (vom iPhone selbst geplant), keine Push-Dienste.
- **Kamera/Fotos:** Kamera für Barcodes und – nur wenn eingeschaltet – Fortschrittsfotos; Fotos bleiben in der App.
- **Grundnahrungsmittel** (USDA SR28, gemeinfrei) sind in der App enthalten und brauchen kein Internet.
- **Löschen:** Mehr → Deine Daten → Alle Daten löschen, oder die App löschen. Sicherungsdateien, die du selbst
  gespeichert hast, löschst du dort.

## Vorschlag für Apples „App Privacy“-Angaben (zu prüfen)

- „Data Not Collected“ für den Anbieter, da keine Daten an den Anbieter gehen.
- Offene Frage für die Rechtsprüfung: Wie ist die Übertragung von Barcode/Suchbegriff an Open Food Facts
  einzuordnen (Drittanbieter, nicht mit der Person verknüpft)? Und die Update-Abfrage bei Expo?
- Veröffentlichungsfassung als Webseite: `website/datenschutz.html` (Entwurf, Phase 10.2).

## Verantwortlich

Name und Kontakt des Anbieters eintragen (Pflichtangabe, sobald die App öffentlich ist; offene Entscheidung
Gewerbe/Impressum, Fahrplan 10.2).
