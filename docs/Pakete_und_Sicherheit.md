# Pakete, Lizenzen und Sicherheitsmeldungen

Register TECH-010, TECH-011, O6. Stand: 29.10.2026, Expo SDK 58. Bei jedem SDK-Update neu prüfen.

## Direkte Pakete der App

Alle direkten Abhängigkeiten stehen unter der **MIT-Lizenz** (geprüft aus `node_modules/*/package.json`).
Versionen sind in `mobile/package-lock.json` festgeschrieben.

| Paket | Version | Lizenz | Zweck |
|---|---|---|---|
| expo | 58.0.21 | MIT | Grundgerüst |
| expo-router | 58.0.28 | MIT | Navigation |
| expo-sqlite | 58.0.14 | MIT | lokale Datenbank |
| expo-localization | 58.0.5 | MIT | Sprache und Region |
| expo-updates | 58.0.19 | MIT | Vorschau-Updates in Expo Go |
| expo-haptics | 58.0.7 | MIT | Vibration am Pausenende |
| expo-keep-awake | 58.0.3 | MIT | Bildschirm bleibt im Training an |
| expo-camera | 58.0.14 | MIT | Barcode-Scanner (beim Scannen werden keine Bilder gespeichert) |
| expo-image-picker | 58.0.10 | MIT | Fortschrittsfotos aufnehmen oder aus der Mediathek wählen (nur wenn eingeschaltet) |
| expo-notifications | 58.1.7 | MIT | Lokale Mitteilungen: Timer bei gesperrtem Handy, Erinnerungen (keine Push-Mitteilungen) |
| expo-sharing | 58.0.21 | MIT | Sicherungsdatei über das Teilen-Menü speichern |
| expo-document-picker | 58.0.4 | MIT | Sicherungsdatei zum Wiederherstellen auswählen |
| expo-local-authentication | 58.0.2 | MIT | App-Sperre mit Gerätecode bzw. Face ID |
| expo-speech | 58.0.3 | MIT | Sprachansage bei Dehnen und HIIT (auf dem Gerät, nichts wird gesendet) |
| expo-file-system | 58.0.13 | MIT | Fortschrittsfotos als Kopie im App-Ordner speichern und löschen |
| i18n-js | 4.5.4 | MIT | Übersetzungen |
| react / react-native | 19.3.0 / 0.88.1 | MIT | UI |
| weitere expo-* und react-native-* aus der Vorlage | 58.x | MIT | Vorlage |

Übungsdaten: eigene Startliste (nur Namen und Zuordnungen), keine fremden Texte oder Medien.

Produktdaten: Open Food Facts, Abruf zur Laufzeit nur auf Aktion des Nutzers (Scan, „Online suchen“);
Datenbanklizenz ODbL, Namensnennung unter „Mehr → Datenquellen“. Produktbilder werden nicht verwendet
(eigene Lizenz CC BY-SA, FOOD-005).

## `npm audit` (nur Laufzeit-Abhängigkeiten, 29.10.2026; erneut 30.10.2026 nach expo-image-picker/expo-file-system/expo-speech und den vier Paketen aus Phase 6: unverändert; Phase 8 ohne neue Pakete, erneut geprüft: unverändert)

8 Meldungen (5 niedrig, 3 hoch). Alle betreffen **Expos Build-Werkzeuge** (`@expo/cli`, `@expo/config`,
`@expo/metro-config`, `@expo/prebuild-config`) über die Pakete `deepmerge` und `zod`. Diese laufen beim
Bauen auf dem Rechner bzw. in der Expo-Cloud, nicht in der App auf dem Handy.

Der von npm vorgeschlagene „Fix“ wäre ein Rückschritt auf Expo SDK 51 und wird **nicht** angewendet.

**Nächster Schritt:** Bei jedem Expo-Update `npm audit` erneut ausführen; vor der Veröffentlichung (Phase 10)
vollständige Prüfung inklusive transitiver Pakete und Build-Artefakte.

## Prüfung vor der Veröffentlichung (Phase 10.6, 30.10.2026)

Register LAW-017, TECH-017, O6. Commit-Stand: Branch `claude/plan-ergaenzung-module`.

| Prüfung | Ergebnis |
|---|---|
| Typprüfung (`npm run typecheck`) | ohne Fehler – jetzt auch direkt nach frischem Klonen (neue Datei `src/expo-types.d.ts`; vorher fehlte die erzeugte `expo-env.d.ts`) |
| Lint (`npm run lint`) | ohne Befund |
| Automatische Tests (`npm test`) | 473/473 bestanden (21 Testdateien, Stand 31.10.2026), neu: Update-Test mit Golden-Dataset (Version 4 → 10, jede Spalte gleich) |
| Browser-Durchlauf | 34/34 Bildschirme ohne Konsolenfehler; Hilfe-Seite 9/9 |
| `expo-doctor` | 18/20; die 2 übrigen brauchen Expo-Server (im Container nicht erreichbar) → am PC/MacBook wiederholen |
| `npm audit` (nur Laufzeit) | unverändert 8 Meldungen (5 niedrig, 3 hoch), alle in Expos Build-Werkzeugen (`deepmerge` über `@expo/config`, `zod` über `@expo/cli`), nicht im App-Code auf dem Handy. Fix nur per Rückschritt auf SDK 51 → nicht angewendet; bei nächstem Expo-Update erneut prüfen |
| `npm audit` (mit Entwicklung) | zusätzlich 7 niedrige Meldungen über Jest (Testwerkzeug, nicht in der App) |
| Lizenzen aller 599 Laufzeit-Pakete | MIT 528, ISC 33, BSD 11, Apache-2.0 6, BlueOak 6, sonstige freizügige (0BSD, Unlicense, CC0, Python-2.0, Unicode-DFS). Genauer angesehen: `lightningcss` (MPL-2.0, nur CSS-Werkzeug beim Bauen), `node-forge` (BSD-3-Clause **oder** GPL-2.0 – BSD gewählt; Code-Signierung von Expo-Updates), `make-plural` (Unicode-DFS, freizügig), 1× CC-BY-4.0 (Browserdaten des Build-Werkzeugs). **Kein GPL/AGPL-Zwang.** |
| Geheimnisse (TECH-017) | Suche in Code **und** gesamter Git-Historie nach Schlüsseln, Tokens, Passwörtern, privaten Schlüsseln: nichts gefunden. Keine `.env`-, `.p8`-, `.p12`-Dateien im Repository. `.gitignore` ergänzt um `.env` und `.env.*` |
| Netzwerkzugriffe im Code | nur Open Food Facts (`src/data/off.ts`); dazu Expos Update-Abfrage aus `app.json` (siehe `docs/Rechtspruefung_Mappe.md`, D2) |
| Aufgeräumt | ungenutzter Code entfernt (`ComingSoonList` aus der Vorlage, `timedSessionTimes`) |

**Vor dem Einreichen noch zu tun:**
- Open-Food-Facts-Kennung (`src/data/off.ts`, jetzt „Myhealth - ios - Version 1.0.0“) um die Kontakt-E-Mail ergänzen.
- Entscheidung Expo-Updates behalten/abschalten (10.2, D2).
- `npm audit` und `expo-doctor` auf dem MacBook mit Internet wiederholen; Ergebnis hier eintragen.
- Lizenzhinweise der Pakete in der App anzeigen? (Frage an die Rechtsprüfung)
