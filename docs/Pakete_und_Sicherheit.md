# Pakete, Lizenzen und Sicherheitsmeldungen

Register TECH-010, TECH-011, O6. Stand: 02.11.2026 (zuerst 29.10.2026), Expo SDK 58. Bei jedem SDK-Update neu prüfen.

## Direkte Pakete der App

Alle direkten Abhängigkeiten stehen unter der **MIT-Lizenz** (geprüft aus `node_modules/*/package.json`); einzige Ausnahme ist die Schriftdatei Manrope (SIL Open Font License 1.1 – Nutzung und Weitergabe in Apps erlaubt, nur nicht einzeln verkaufen).
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
| expo-print | 58.0.8 | MIT | Bericht als PDF erzeugen bzw. drucken (`src/app/more/report.tsx`, A5) |
| expo-clipboard | 58.0.4 | MIT | Zusammenfassung des Berichts in die Zwischenablage kopieren (`src/app/more/report.tsx`, A5) |
| react-native-view-shot | 6.1.1 | MIT | Teilen-Karten als Bild erzeugen (`src/components/share-card.tsx`, A10) |
| i18n-js | 4.5.4 | MIT | Übersetzungen |
| react-native-svg | 15.16.0 | MIT | Diagramme, Ringe, Tab-Symbole (in Expo Go enthalten) |
| @expo-google-fonts/manrope | 0.4.3 | MIT (Paket), Schrift: SIL Open Font License 1.1 | Überschriften-Schrift Manrope, liegt in der App (kein Laden aus dem Netz) |
| react / react-native | 19.3.0 / 0.88.1 | MIT | UI |
| weitere expo-* und react-native-* aus der Vorlage | 58.x | MIT | Vorlage |

Entwicklungswerkzeuge (nicht in der App): u. a. jest, eslint, typescript und neu **prettier** 3.6.2 (MIT, einheitliche Code-Formatierung, `npm run format`).

Übungsdaten: eigene Startliste (nur Namen und Zuordnungen), keine fremden Texte oder Medien.

Produktdaten: Open Food Facts, Abruf zur Laufzeit nur auf Aktion des Nutzers (Scan, „Online suchen“);
Datenbanklizenz ODbL, Namensnennung unter „Mehr → Datenquellen“. Produktbilder werden nicht verwendet
(eigene Lizenz CC BY-SA, FOOD-005).

## Übernommenes Material (kein Paket)

| Material | Herkunft | Lizenz | Wo |
|---|---|---|---|
| Körperzeichnungen der Muskelkarte (männlich/weiblich, vorne/hinten) | react-native-body-highlighter 3.2.0, Hicham ELABBASSI | MIT | `mobile/src/components/body-art.ts` (nur Pfaddaten, Lizenztext im Dateikopf); Hinweis in der App unter Mehr → Über die App → „Zeichnungen und Lizenzen“ |

Die Pfade wurden nur als Text übernommen (Mustersuche nach Namen und Pfaden), kein Code des Pakets wird ausgeführt oder
mitgeliefert; das Paket selbst ist keine Abhängigkeit.

## `npm audit` (nur Laufzeit-Abhängigkeiten)

**Stand 02.11.2026** (`npm audit --omit=dev`, nach expo-print, expo-clipboard, react-native-view-shot):
16 Meldungen (1 niedrig, 13 mittel, 2 hoch). Ursache sind vier Pakete: `glob` und `minimatch` (mittel),
`zod` (hoch) und `deepmerge` (niedrig). Sie stecken nur in **Expos Build-Werkzeugen** (`@expo/cli`,
`@expo/config`, `@expo/config-plugins`, `@expo/fingerprint`, `@expo/metro-config`, `@expo/prebuild-config`);
`expo`, `expo-updates`, `expo-sharing` und `expo-splash-screen` erscheinen nur, weil sie diese Werkzeuge mitbringen.
Die Werkzeuge laufen beim Bauen auf dem Rechner bzw. in der Expo-Cloud, nicht in der App auf dem Handy.
Die neuen Pakete bringen keine eigene Meldung. Vorgeschlagene „Fixes“ wären Rückschritte (Expo SDK 51 bzw.
`expo-updates` 0.27) → **nicht** angewendet.

Frühere Stände (29.10.2026; erneut 30.10.2026 nach expo-image-picker/expo-file-system/expo-speech und den vier Paketen aus Phase 6: unverändert; Phase 8 ohne neue Pakete, erneut geprüft: unverändert)

damals 8 Meldungen (5 niedrig, 3 hoch). Alle betrafen **Expos Build-Werkzeuge** (`@expo/cli`, `@expo/config`,
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
| Automatische Tests (`npm test`) | 691/691 bestanden (59 Testdateien, Stand 02.11.2026; am 31.10.2026: 508/508); dabei Update-Test mit Golden-Dataset (bis Datenbank-Version 26) |
| Browser-Durchlauf | 34/34 Bildschirme ohne Konsolenfehler; Hilfe-Seite 9/9 |
| `expo-doctor` | 18/20; die 2 übrigen brauchen Expo-Server (im Container nicht erreichbar) → am PC/MacBook wiederholen |
| `npm audit` (nur Laufzeit) | damals 8 Meldungen; Stand 02.11.2026: 16 Meldungen (1 niedrig, 13 mittel, 2 hoch), alle in Expos Build-Werkzeugen (`glob`, `minimatch`, `zod`, `deepmerge`), nicht im App-Code auf dem Handy – siehe oben. Fix nur per Rückschritt → nicht angewendet; bei nächstem Expo-Update erneut prüfen |
| `npm audit` (mit Entwicklung) | zusätzlich 7 niedrige Meldungen über Jest (Testwerkzeug, nicht in der App) |
| Lizenzen aller 599 Laufzeit-Pakete | MIT 528, ISC 33, BSD 11, Apache-2.0 6, BlueOak 6, sonstige freizügige (0BSD, Unlicense, CC0, Python-2.0, Unicode-DFS). Genauer angesehen: `lightningcss` (MPL-2.0, nur CSS-Werkzeug beim Bauen), `node-forge` (BSD-3-Clause **oder** GPL-2.0 – BSD gewählt; Code-Signierung von Expo-Updates), `make-plural` (Unicode-DFS, freizügig), 1× CC-BY-4.0 (Browserdaten des Build-Werkzeugs). **Kein GPL/AGPL-Zwang.** |
| Geheimnisse (TECH-017) | Suche in Code **und** gesamter Git-Historie nach Schlüsseln, Tokens, Passwörtern, privaten Schlüsseln: nichts gefunden. Keine `.env`-, `.p8`-, `.p12`-Dateien im Repository. `.gitignore` ergänzt um `.env` und `.env.*` |
| Netzwerkzugriffe im Code | Stand 02.11.2026 drei Stellen, alle nur auf Aktion des Nutzers bzw. durch Expo: (1) Open Food Facts (`src/data/off.ts`, Scan und „Online suchen“), (2) Rezept per Link (`src/data/meal-plan.ts`, `fetchPage` lädt die eingegebene Webseite, A9), (3) Expos Update-Abfrage aus `app.json` (`updates.url`, siehe `docs/Rechtspruefung_Mappe.md`, D2). Sonst keine Abrufe |
| Aufgeräumt | ungenutzter Code entfernt (`ComingSoonList` aus der Vorlage, `timedSessionTimes`) |

**Vor dem Einreichen noch zu tun:**
- Open-Food-Facts-Kennung (`src/data/off.ts`, jetzt „Myhealth - ios - Version 1.0.0“) um die Kontakt-E-Mail ergänzen.
- Entscheidung Expo-Updates behalten/abschalten (10.2, D2).
- `npm audit` und `expo-doctor` auf dem MacBook mit Internet wiederholen; Ergebnis hier eintragen.
- Lizenzhinweise der Pakete in der App anzeigen? (Frage an die Rechtsprüfung)

**Online-Funktionen abschaltbar (02.11.2026):** Open Food Facts und „Rezept per Link“ prüfen vor jeder Anfrage `onlineAllowed()` (`src/data/online.ts`): Nutzer-Schalter unter Mehr → Bereiche der App, Not-Aus des Anbieters per Update.
