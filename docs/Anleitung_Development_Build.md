# Anleitung: eigene App-Version (Development Build) – Fahrplan 6.1

Stand 02.11.2026 (zuerst 30.10.2026). Für Luc, sobald das MacBook da ist. Expo Go reicht für fast alles; diese Punkte brauchen
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

## Vorher einmal: `expo-dev-client` installieren

Das Profil `development` in `mobile/eas.json` baut einen Development Build (`developmentClient: true`). Dafür
braucht die App das Paket `expo-dev-client`; es ist noch **nicht** in `mobile/package.json`. Am MacBook im Ordner
`mobile` einmal ausführen (nach `npm install`):

```
npx expo install expo-dev-client
```

`npx expo install` wählt die zu Expo SDK 58 passende Version. Danach `package.json` und `package-lock.json`
committen. Gilt für Weg A und Weg B.

## Weg A: kostenlos mit dem MacBook (eigenes iPhone, 7 Tage gültig)

1. Xcode aus dem Mac App Store installieren und einmal öffnen (Zusatzkomponenten installieren lassen).
2. In Xcode → Settings → Accounts mit deiner Apple-ID anmelden (kostenloses „Personal Team“).
3. Repository klonen, im Ordner `mobile`: `npm install`, dann `npx expo install expo-dev-client` (siehe oben).
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

1. **Apple Health** (Ausbauplan D3, ersetzt den früheren Plan „nur Schritte lesen, keine Schreibrechte“): Paket
   nach Prüfung von Lizenz und Kompatibilität mit Expo SDK 58 (Kandidat laut Register TECH-004: MIT-lizenzierter
   HealthKit-Wrapper mit Expo-Config-Plugin; Kandidat geprüft 31.10.2026: `@kingstinct/react-native-healthkit`,
   Tagessummen per `queryStatisticsCollectionForQuantity` ohne Doppelzählung, siehe `docs/Repo_Vergleich.md`).
   - **Lesen:** Schritte, Schlaf mit Phasen, Gewicht, Körperfett (nur anzeigen, keine eigene Schätzung, E4),
     Ruhepuls, HRV, VO2max, Workouts (Läufe fließen in die Trainingslast).
   - **Schreiben:** Krafttrainings, Gewicht, Wasser, Ernährung.
   - Erlaubnis fragt iOS je Datenart; alles freiwillig. Schritte werden pro Tag mit Abrufzeit und Zeitfenster
     gespeichert (Tabelle `steps_entry` ist schon vorbereitet, Quelle `apple_health`) und haben Vorrang vor eigenen
     Einträgen – nie addiert (HEALTH-005/006). iOS verrät nicht, ob Lesen abgelehnt wurde (HEALTH-002); die App
     zeigt bei leeren Daten den Hinweis „vielleicht keine Freigabe“ statt „verweigert“.
   - Danach Bereitschaft Stufe 2 (D4): HRV und Ruhepuls gegen eine 28–60-Tage-Baseline, Schlaf aus Health in
     Schlafschuld und Journal.
   - Datenschutztexte und Rechtsmappe vorher um Lesen **und** Schreiben ergänzen.
2. **Face ID:** Hinweistext ist schon in `app.json`, funktioniert im Build automatisch.
3. **SQLCipher:** In `app.json` beim Plugin `expo-sqlite` `useSQLCipher` einschalten; Schlüssel im
   Schlüsselbund ablegen; bestehende Datenbank einmalig umschlüsseln (mit Sicherung vorher).
4. **Sperrbildschirm-Timer:** Live Activity / Dynamic Island prüfen (Ausbauplan D2; HEALTH-013 AlarmKit als Alternative).
5. Danach Gerätetest-Liste `docs/Geraetetest.md` vollständig durchgehen.

## Bundle-ID

Festgelegt: `myhealth.system` (in `app.json` unter `ios.bundleIdentifier`). Nach dem ersten App-Store-Upload
gehört sie fest zur App.
