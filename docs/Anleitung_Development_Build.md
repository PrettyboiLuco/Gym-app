# Anleitung: eigene App-Version (Development Build) – Fahrplan 6.1

Stand 30.10.2026. Für Luc, sobald das MacBook da ist. Expo Go reicht für fast alles; diese Punkte brauchen
eine eigene App-Version, weil sie native Bausteine enthalten, die Expo Go nicht mitbringt (TECH-002):

| Funktion | Warum nicht in Expo Go | Register |
|---|---|---|
| Apple Health: Schritte automatisch lesen | HealthKit-Baustein fehlt in Expo Go | HEALTH-001–007, TECH-004 |
| Face ID für die App-Sperre | Expo Go darf Face ID nicht nutzen (Gerätecode geht schon) | – |
| Zusätzlich verschlüsselte Datenbank (SQLCipher) | Muss beim Bauen eingeschaltet werden | TECH-013 |
| Timer direkt auf dem Sperrbildschirm (Live Activity) | Eigener nativer Baustein | UX-006, HEALTH-013 |

Bereits ohne Development Build fertig: Timer-Mitteilungen bei gesperrtem Handy, Trainings- und
Trink-Erinnerungen, Sicherung/Wiederherstellen, „Alle Daten löschen“, App-Sperre mit Gerätecode,
Schritte von Hand.

## Weg A: kostenlos mit dem MacBook (eigenes iPhone, 7 Tage gültig)

1. Xcode aus dem Mac App Store installieren und einmal öffnen (Zusatzkomponenten installieren lassen).
2. In Xcode → Settings → Accounts mit deiner Apple-ID anmelden (kostenloses „Personal Team“).
3. Repository klonen, im Ordner `mobile`: `npm install`.
4. iPhone per Kabel anschließen, auf dem iPhone „Entwicklermodus“ einschalten
   (Einstellungen → Datenschutz & Sicherheit → Entwicklermodus).
5. `npx expo run:ios --device` – Xcode baut die App und installiert sie.
6. Auf dem iPhone: Einstellungen → Allgemein → VPN & Geräteverwaltung → deinem Entwicklerprofil vertrauen.

Grenzen: Die App läuft 7 Tage, dann neu bauen. Ob Apple HealthKit mit dem kostenlosen Personal Team erlaubt,
muss beim ersten Versuch geprüft werden; sonst Weg B.

## Weg B: mit Apple Developer Program (99 $/Jahr, Fahrplan 7.1)

1. Mitgliedschaft abschließen (siehe `docs/Anleitung_TestFlight.md`).
2. `npx eas-cli@latest build --profile development --platform ios` – baut in der Expo-Cloud, kein Xcode nötig.
3. Gerät registrieren, wenn EAS danach fragt; App über den Link aufs iPhone laden.

## Was ich danach einbaue (Claude Code)

1. **Apple Health:** Paket nach Prüfung von Lizenz und Kompatibilität mit Expo SDK 58 (Kandidat laut Register
   TECH-004: MIT-lizenzierter HealthKit-Wrapper mit Expo-Config-Plugin). Nur Lesen von Schritten, einmalige
   Erlaubnis, keine Schreibrechte. Werte werden pro Tag mit Abrufzeit und Zeitfenster gespeichert (Tabelle
   `steps_entry` ist schon vorbereitet, Quelle `apple_health`) und haben Vorrang vor eigenen Einträgen –
   nie addiert (HEALTH-005/006). Hinweis: iOS verrät nicht, ob Lesen abgelehnt wurde (HEALTH-002); die App
   zeigt dann „keine Daten“ statt „verweigert“.
2. **Face ID:** Hinweistext ist schon in `app.json`, funktioniert im Build automatisch.
3. **SQLCipher:** In `app.json` beim Plugin `expo-sqlite` `useSQLCipher` einschalten; Schlüssel im
   Schlüsselbund ablegen; bestehende Datenbank einmalig umschlüsseln (mit Sicherung vorher).
4. **Sperrbildschirm-Timer:** Live Activity prüfen (HEALTH-013 AlarmKit als Alternative).
5. Danach Gerätetest-Liste `docs/Geraetetest.md` vollständig durchgehen.

## Bundle-ID (vor dem ersten Build festlegen)

Die Bundle-ID ist die eindeutige Kennung der App (z. B. `de.<dein-name>.gymapp`) und lässt sich nach dem
ersten App-Store-Upload nicht mehr ändern. Sie steht dann in `app.json` unter `ios.bundleIdentifier`.
Vorschlag, sobald der App-Name feststeht (offene Entscheidung).
