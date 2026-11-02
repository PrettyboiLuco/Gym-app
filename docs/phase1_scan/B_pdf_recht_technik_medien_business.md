# Abgleich Arbeitsgrundlage v2.0 – Bereiche BUS / LAW / MEDIA / TECH

Stand Prüfung: 01.11.2026 (nur gelesen, nichts geändert). Quelle: Register Anhang A (PDF S. 36–39, 46–59).
Das Register nennt **keine Muss/Soll/Kann-Stufen**; angegeben ist der Befund-Typ des PDFs (bestätigt/spezifiziert/offen/
korrigiert/teilgeprüft/widerlegt) und – wo ableitbar – das Gate aus Kap. 16 (P0–P5, PDF S. 18).

Status: **umgesetzt** · **teilweise** · **fehlt** · **verschoben** (mit Doku-Beleg) · **extern offen** (Anwalt, Store,
Fachperson, Luc) · **kein App-Thema**.

Wichtige Querbefunde (betreffen mehrere IDs):
- **Q1 – Rechts-/Datenschutztexte sind älter als die neuen Funktionen.** `docs/Rechtspruefung_Mappe.md`,
  `docs/Datenschutz_Entwurf.md`, `website/datenschutz.html` (letzter Stand 30./31.10.) und die Hilfe-Antwort
  `help.q.wasGesendet` (i18n/de.ts:3247) nennen als Netzwerkzugriffe nur Open Food Facts + Expo-Update. Seit 01.11. lädt
  aber **„Rezept per Link“ beliebige Webseiten** (`mobile/src/data/meal-plan.ts:121–131`, IP an Dritt-Server). Ebenfalls
  nicht in Datenschutz-/Rechtsmappe: CSV-Export, PDF-„Bericht für Trainer oder Arzt“, „Zusammenfassung kopieren – für
  deine KI“ (Zwischenablage, `app/more/report.tsx`), Teilen-Karten (`react-native-view-shot`), Import Strong/Hevy.
  CSV/PDF-Export tragen keinen Hinweis „enthält Gesundheitsdaten“ (nur die Sicherung, de.ts:2339).
- **Q2 – Medizinprodukt-Nähe gestiegen:** Blutdruck-Tagebuch (`domain/blood-pressure.ts`), Bereitschafts-Ampel (A6),
  „Bericht für Trainer oder Arzt“ sind nicht in der Zweckbestimmung der Rechtsmappe (Abschnitt 1) erfasst.
- **Q3 – Paket-/Sicherheitsbericht veraltet:** `docs/Pakete_und_Sicherheit.md` (Stand 29./30.10.) listet die später
  hinzugekommenen Laufzeitpakete `expo-print`, `expo-clipboard`, `react-native-view-shot`, `expo-device`,
  `expo-web-browser`, `@expo/ui`, `expo-linking` nicht; `npm audit` danach nicht wiederholt.
- **Q4 – Support/Incident nach Phase 11 verschoben** (Fahrplan.md:682–683), das PDF verlangt Support und
  Incident-Plan aber bereits für P5 „öffentliche Beta“ (PDF S. 18).

## MEDIA (PDF S. 36–39)

| ID | Anforderung (PDF, Befund-Typ) | Status | Befund im Repo | Beleg |
|---|---|---|---|---|
| MEDIA-001 | 3D-Wunsch: Clips vs. interaktives Modell nicht gleichsetzen; Luc entscheidet Interaktivität (offen) | verschoben | Entscheidung 30.10.: zum Start nur Text, später eigene Bilder; 3D/gekaufte Medien verschoben | docs/Entscheidungen.md (Übungsmedien, Phase 9); docs/Fahrplan.md:425–427; domain/media.ts:1 |
| MEDIA-002 | RepDB Free: kommerziell mit Attribution, Lizenztext/Assetmanifest sichern (korrigiert) | kein App-Thema (nicht genutzt) | RepDB bewusst nicht importiert/„weggelassen“ | docs/Entscheidungen.md:38, Übungsbilder-Zeile; docs/Fahrplan.md:489 |
| MEDIA-003 | RepDB-Vorschauanimationen nicht in Produktion (bestätigt) | umgesetzt (n/a) | Keine RepDB-Dateien; `mobile/assets/exercises/` enthält nur LIESMICH.txt | mobile/assets/exercises; src/media/exercise-media.ts (leer) |
| MEDIA-004 | RepDB-Umfang tatsächlich zählen (korrigiert) | kein App-Thema | RepDB nicht genutzt; eigener Katalog 894 Übungen | docs/Entscheidungen.md (Übungsumfang) |
| MEDIA-005 | RepDB Standard: Lizenz vor Kauf prüfen (bestätigt) | verschoben | „gekaufte Medien … verschoben“ | docs/Fahrplan.md:426 |
| MEDIA-006 | RepDB-Bilder nicht generativ verarbeiten / nicht in Higgsfield (bestätigt) | umgesetzt (Regel) | Regel in Anleitung | docs/Anleitung_Uebungsbilder.md:3–4, 15–16 |
| MEDIA-007 | Gym visual: Paket/Offline-Umfang bestätigen (bestätigt) | verschoben | gekaufte Medien verschoben | docs/Fahrplan.md:426 |
| MEDIA-008 | Gym visual: keine KI-Ableitung gekaufter Clips (bestätigt) | umgesetzt (Regel) | Regel in Anleitung | docs/Anleitung_Uebungsbilder.md:4, 16 |
| MEDIA-009 | Blender: importierte Modelle/Texturen/Rigs separat dokumentieren (bestätigt) | teilweise | Verzeichnis hat nur Freitext `origin` („Blender, eigenes Modell“); keine Pflicht/Felder für importierte Fremd-Assets (Modelle, Texturen, Rigs) | src/domain/media.ts:13–14 |
| MEDIA-010 | Higgsfield-Output: eigene Figur, erlaubte Referenzen, Export und **Terms-Version archivieren** (bestätigt) | teilweise | Regeln „nur eigene Vorgaben“ vorhanden; Archivierung der Terms-Version/Exportnachweis nicht vorgesehen | docs/Anleitung_Uebungsbilder.md:13–20 |
| MEDIA-011 | Higgsfield nutzt Uploads fürs Training → keine sensiblen Nutzer-/Gesundheitsdaten hochladen (bestätigt) | umgesetzt (Regel) | Hinweis in Anleitung; App lädt nichts hoch | docs/Anleitung_Uebungsbilder.md:17–18 |
| MEDIA-012 | Bewegungsqualität: drei Medienpilotübungen fachlich abnehmen (offen) | teilweise / extern offen | Feld `movementReviewed` vorhanden, **sperrt aber weder Anzeige noch Release** (`mediaFor` filtert nicht); Fachabnahme nicht beauftragt; noch keine Bilder | src/domain/media.ts:18, 39–41; docs/Freigabematrix.md R3/R4 |
| MEDIA-013 | Medienherkunft: Autor/Lizenz/Quelle/Prüfdatum je ausgelieferter Datei (spezifiziert) | teilweise | Für Übungsbilder umgesetzt inkl. Test (`validateMedia`). Andere ausgelieferte Medien ohne Rechte-/Revieweintrag: App-Symbol/Herz-Sprites wurden mit **getlayers.ai-Preset „Heart“** erzeugt – Nutzungsbedingungen nicht dokumentiert (Doku nennt „selbst gezeichnet“); Website bündelt three.js, Manrope (OFL liegt bei) | src/domain/media.ts:24–37; domain/__tests__/phase9.test.ts; design/logo/README.md:4; docs/Entscheidungen.md (App-Symbol); mobile/assets/images/heart-sprite-*.jpg |

## TECH (PDF S. 46–51)

| ID | Anforderung (PDF, Befund-Typ) | Status | Befund im Repo | Beleg |
|---|---|---|---|---|
| TECH-001 | Framework: Expo als Spike; Barcode+Health+Timer+Persistenz im gleichen Build bestehen, erst dann final (offen, P1) | teilweise | Expo/RN gewählt; Barcode, SQLite, Timer laufen in Expo Go; Health und Dev-Build fehlen → P1-Gate nicht abgeschlossen | docs/Entscheidungen.md (Folgen Technik); docs/Fahrplan.md:33, 260–264 |
| TECH-002 | Health braucht nativen Dev-Build; Test nicht auf Expo Go beschränken (korrigiert, P1) | extern offen (MacBook) | Anleitung + EAS-Profil `development` vorhanden, Build nicht erstellt | docs/Anleitung_Development_Build.md; mobile/eas.json; docs/Fahrplan.md:263 |
| TECH-003 | Android Health-Connect-Wrapper pinnen, Plugin nicht doppelt (bestätigt) | verschoben | Android Phase 11; Paket nicht installiert | docs/Fahrplan.md:234, 263, 681 |
| TECH-004 | iOS HealthKit-Wrapper, Kompatibilität (bestätigt) | verschoben (MacBook) | Kandidat geprüft, nicht installiert | docs/Anleitung_Development_Build.md:8, 39; mobile/package.json |
| TECH-005 | wger Server AGPL vs. Offline vergleichen (bestätigt) | umgesetzt (Entscheidung) | nur Vergleich, kein Code übernommen | docs/Entscheidungen.md:38; docs/Repo_Vergleich.md |
| TECH-006 | wger Mobile AGPL prüfen (bestätigt) | umgesetzt (Entscheidung) | nicht genutzt | docs/Entscheidungen.md:38 |
| TECH-007 | RepDB Flutter Starter: nur erlaubte Dateien (bestätigt) | kein App-Thema | nicht übernommen (RepDB weggelassen) | docs/Fahrplan.md:489 |
| TECH-008 | RN-Starter: README/Lizenz/Lockfile vor Übernahme (offen) | kein App-Thema | nicht übernommen | docs/Pakete_und_Sicherheit.md:42 („eigene Startliste“) |
| TECH-009 | Free Exercise DB: Bildherkunft prüfen (offen) | umgesetzt | eigener Katalog, keine fremden Texte/Medien | src/domain/exercises.ts:1–2 |
| TECH-010 | Wartung: gepinnte Versionen mit Issues/Release/Build protokollieren (teilgeprüft) | teilweise | Lockfile pinnt; Bericht deckt neue Pakete nicht ab (Q3) | docs/Pakete_und_Sicherheit.md; mobile/package.json:10, 12, 25, 45 |
| TECH-011 | Sicherheitsmeldungen: Lockfile + transitive Kette prüfen (teilgeprüft) | teilweise | `npm audit` 30.10. (8 Meldungen Build-Tools); nach A1–A11 nicht wiederholt; Wiederholung mit Internet offen | docs/Pakete_und_Sicherheit.md:30–40, 68–72 |
| TECH-012 | Lokale Speicherung: Transaktionen, UUID, Migrationen, sofort speichern; Crash/Update mit Golden-Daten (spezifiziert, P1/P2) | umgesetzt (Gerätetest offen) | Migrationen je Version in Transaktion, `newId()`, Golden-Dataset-Upgrade-Test; Gerätetest V4 offen | src/data/migrations.ts:716–722; src/data/db.ts; src/data/__tests__/upgrade.test.ts; docs/Freigabematrix.md R1 |
| TECH-013 | SQLCipher: Schlüsselmanagement, Backup, Recovery testen (bestätigt) | verschoben (Dev-Build) | nicht aktiv (`expo-sqlite` ohne SQLCipher-Option in app.json); App-Text verweist auf iOS-Geräteverschlüsselung; **Sicherungsdatei ist unverschlüsseltes JSON mit Gesundheitsdaten** (nur Warnhinweis) | mobile/app.json (Plugin `expo-sqlite`); i18n/de.ts:2369–2372, 2339; docs/Fahrplan.md:263 |
| TECH-014 | Export/Backup/Restore: versioniertes Manifest, unabhängige Wiederherstellung identisch (spezifiziert, P1) | umgesetzt (Gerätetest offen) | `BACKUP_FORMAT`, Schema-Version, Prüfung vor Überschreiben, Restore in Transaktion; alle Nutzertabellen enthalten; Tests | src/domain/backup.ts; src/data/backup.ts; src/data/__tests__/native-data.test.ts; docs/Geraetetest.md:34 |
| TECH-015 | Optionales Konto, lokaler Kern ohne Pflichtkonto (spezifiziert) | umgesetzt | gar kein Konto | docs/Datenschutz_Entwurf.md; docs/Freigabematrix.md R2 |
| TECH-016 | Synchronisierung: Konflikte, Tombstones, Revisionen (offen) | verschoben | Phase 11 | docs/Fahrplan.md:681–682 |
| TECH-017 | Secrets nicht in Repo/App/Logs/Historie; Secret-Scan (spezifiziert) | umgesetzt | Scan Code + Git-Historie 30.10. ohne Fund, `.env*` ignoriert (Wiederholung nach späteren Commits empfohlen) | docs/Pakete_und_Sicherheit.md:64; mobile/.gitignore:33–47 |
| TECH-018 | KI-Backend: minimierter Kontext, Schlüssel, Kostenlimits, Schema-Validierung (offen) | verschoben | keine KI (Entscheidung 30.10.) | docs/Fahrplan.md:425; docs/Entscheidungen.md (Phase 9) |
| TECH-019 | Barrierefreiheit: große Schrift, Screenreader, klare Buttons; **ohne Farbe allein** + Screenreader testen (offen) | teilweise | Test erzwingt `accessibilityRole` für alle Touchables; 105 Label/Role-Stellen in 37 Dateien; VoiceOver-Checkliste vorhanden, **am Gerät nicht durchgeführt**; Prüfung „nicht nur Farbe“ (z. B. Ampel) und Kontrast nicht automatisiert/dokumentiert | src/domain/__tests__/accessibility-code.test.ts; docs/Geraetetest.md:106, 168–186 |
| TECH-020 | Support-Betrieb: datensparsame Fehlermeldung, Incident, Kill-Switch; Testvorfall + Restore-Probe (offen, P5) | verschoben (Konflikt mit P5) | Fehleransicht vorhanden; kein Incident-Plan, kein Kill-Switch/abschaltbare Onlinefunktionen; nach Phase 11 verschoben, PDF fordert es vor öffentlicher Beta (Q4) | src/components/error-view.tsx; docs/Fahrplan.md:682–683 |

## BUS (PDF S. 51–55)

| ID | Anforderung (PDF, Befund-Typ) | Status | Befund im Repo | Beleg |
|---|---|---|---|---|
| BUS-001 | Kein Erlös allein durch Downloads; Erlösmodell explizit (bestätigt) | extern offen (Luc) | Entscheidungsvorlage A–D, Empfehlung „kostenlos“; Entscheidung leer | docs/Monetarisierung_Entscheidung.md:3, 37–49 |
| BUS-002 | Preis 4 €/30 € nur Hypothese; Pilot + Deckungsbeitrag (offen) | teilweise / extern offen | Zahlungsbereitschaftsfrage im In-App-Feedback; Pilot nicht durchgeführt | src/domain/feedback.ts; app/more/feedback.tsx; docs/Pilot_Leitfaden.md:35 |
| BUS-003 | 100 Jahreskäufe = 3000 € Umsatz, kein Gewinn (bestätigt) | umgesetzt (Doku) | in Vorlage berücksichtigt | docs/Monetarisierung_Entscheidung.md:14 |
| BUS-004 | KI-Limits pro Nutzer + global, Fallback (spezifiziert) | verschoben | keine KI | docs/Fahrplan.md:425 |
| BUS-005 | Entwicklungsabo ≠ Produktions-KI (korrigiert) | kein App-Thema | keine Produktions-KI | docs/Fahrplan.md:425 |
| BUS-006 | Werbung nie im Satz/Demo/Timer; Ad-Ausfall blockiert nichts (spezifiziert) | kein App-Thema (keine Werbung) | kein Werbe-SDK; Regel in Vorlage für Option C | docs/Monetarisierung_Entscheidung.md:15; mobile/package.json |
| BUS-007 | Gesundheitsdaten nie für Werbung/Marketing (bestätigt) | umgesetzt | kein Werbe-/Analyse-SDK, Netzwerkprüfung | docs/Rechtspruefung_Mappe.md:26–37; docs/Freigabematrix.md R5 |
| BUS-008 | AdMob UMP: EEA-Test, Widerruf, canRequestAds (teilgeprüft) | kein App-Thema (bis Entscheidung) | nicht eingebaut | docs/Monetarisierung_Entscheidung.md:15 |
| BUS-009 | Werbeerlös real (eCPM) im Pilot messen (offen) | verschoben | nur Einschätzung | docs/Monetarisierung_Entscheidung.md:14 |
| BUS-010 | Pro-Ende ohne Löschung eigener Logs; Restore/Refund testen (spezifiziert) | kein App-Thema (kein Pro) | Grundsatz „Daten nie hinter Bezahlschranke“ dokumentiert | docs/Monetarisierung_Entscheidung.md:15, 32–33 |
| BUS-011 | Apple-Konto: Einzelperson, rechtlicher Name sichtbar; Verkäuferstatus klären (bestätigt) | extern offen (Luc) | Anleitung fertig, Konto nicht angelegt | docs/Anleitung_TestFlight.md:6–9; docs/Freigabematrix.md R7 |
| BUS-012 | Google: Health-Kategorie kann Organisationskonto erfordern (offen) | verschoben | Android Phase 11; als offene Frage notiert | docs/Fahrplan.md:681; docs/Gesamtpruefung_Vollstaendig.md §5 Nr. 7 |
| BUS-013 | Play-Testpflicht 12 Tester/14 Tage (bestätigt) | verschoben | Phase 11 | docs/Fahrplan.md:681; docs/Entscheidungen.md:64; docs/Pilot_Leitfaden.md:4 |
| BUS-014 | Hardware/Zeit/Erfahrung/Budget im Entscheidungsblatt (offen, P0) | teilweise / extern offen (Luc) | Geräte + Erfahrung eingetragen; **Budget und Zeit/Woche fehlen** | docs/Entscheidungen.md (Geräte, Erfahrung, „Noch offen“) |
| BUS-015 | Marktneuheit: Vergleich mit korrekt identifizierten Apps (offen) | teilweise | Vergleich vorhanden, Preise aus Sekundärquellen; Pilotfrage „andere Apps“ | docs/Wettbewerbsvergleich.md; src/domain/feedback.ts |
| BUS-016 | Nutzerpilot 5–10, Nutzung/Zeitersparnis/Zahlungsbereitschaft (spezifiziert, P2) | extern offen (Luc) | Feedback-Funktion, Leitfaden, TestFlight-Anleitung fertig; Pilot nicht gelaufen | docs/Pilot_Leitfaden.md; src/data/feedback.ts; docs/Fahrplan.md:272 |

## LAW (PDF S. 55–59)

| ID | Anforderung (PDF, Befund-Typ) | Status | Befund im Repo | Beleg |
|---|---|---|---|---|
| LAW-001 | Gewerbe/Rechtsform/Steuerstatus klären (teilgeprüft) | extern offen (Anwalt/Luc) | Frage 1 in Rechtsmappe | docs/Rechtspruefung_Mappe.md:60 |
| LAW-002 | Impressum § 5 DDG passend zum Betreiber (bestätigt) | extern offen (Luc/Anwalt) | Entwurf mit Platzhaltern; Anbieterangaben fehlen; kein Veröffentlichungsort | website/impressum.html; docs/Rechtspruefung_Mappe.md:62, 126–131 |
| LAW-003 | Datenschutz: Art. 6/ggf. 9, Information, Zweckbindung; Datenfluss-Rechtsgrundlagenmatrix (teilgeprüft) | teilweise | Matrix D1–D7 + Entwürfe vorhanden, aber **unvollständig** (Q1: Rezept-Link-Abruf, Bericht/Zwischenablage, CSV/PDF, Teilen-Karten fehlen); Verantwortlicher Platzhalter; Anwaltsprüfung fehlt | docs/Rechtspruefung_Mappe.md:24–37; website/datenschutz.html; docs/Datenschutz_Entwurf.md; src/data/meal-plan.ts:121; i18n/de.ts:3247–3253, 3316–3320 |
| LAW-004 | Einwilligungen granular/freiwillig/widerrufbar; Health-Systemfreigabe allein reicht nicht (offen) | extern offen (Anwalt) | Keine eigene Art.-9-Einwilligung in der App; Opt-ins vorhanden (Fotos standardmäßig aus, Mitteilungen erst beim Einschalten, Apple Health noch nicht aktiv); Frage an Anwalt gestellt | docs/Rechtspruefung_Mappe.md:36, 67–68; i18n/de.ts:1476–1510 (Onboarding ohne Einwilligung) |
| LAW-005 | Auftragsverarbeitung/Drittlandtransfer je Anbieter (offen) | extern offen (Luc/Anwalt) | Expo (USA) DPA/DPF/SCC ungeklärt, Entscheidung „Expo-Updates behalten/abschalten“ offen; Updates in app.json aktiv | docs/Rechtspruefung_Mappe.md:31, 66; mobile/app.json (`updates.url`); docs/Freigabematrix.md R5 |
| LAW-006 | Löschung/Auskunft/Export: Gerät/Server/Anbieter/Backups getrennt; Testanfrage (spezifiziert) | umgesetzt (Gerätetest offen) | „Alle Daten löschen“ (Transaktion, Fotos, Erinnerungen), Sicherung/Restore, CSV-Export; Hinweis, dass eigene Sicherungsdateien selbst zu löschen sind. Offen: Gerätetest D1–D6; Umgang mit beim Anbieter eingehenden Feedback-Mails nicht beschrieben | src/data/backup.ts:83–90; app/more/data.tsx:25; docs/Geraetetest.md:34; docs/Datenschutz_Entwurf.md (Löschen) |
| LAW-007 | DSFA: Schwellenprüfung dokumentieren (offen) | extern offen (Anwalt) | nur als Frage formuliert, keine dokumentierte Schwellenprüfung | docs/Rechtspruefung_Mappe.md:40–41 |
| LAW-008 | TDDDG: Endgerätezugriffe je SDK bewerten (bestätigt) | extern offen | keine Ads/Tracking; Expo-Update (evtl. Installations-ID) nicht abschließend bewertet | docs/Rechtspruefung_Mappe.md:31; docs/Monetarisierung_Entscheidung.md:16 |
| LAW-009 | Google-Gesundheitsdeklaration + öffentliche Privacy-URL; Angaben = App (bestätigt) | verschoben (Android) / extern offen (URL) | Android Phase 11; öffentliche Datenschutz-URL fehlt auch für Apple (R7); Apple-„App Privacy“-Einordnung offen | docs/Rechtspruefung_Mappe.md:64–65, 69–70; docs/Freigabematrix.md R7; website/README.md |
| LAW-010 | Medizinprodukt: MDCG-Kriterien an finale Aussagen/Funktionen (offen) | teilweise / extern offen | Zweckbestimmung + automatische Claim-Prüfung aller Texte (Heilung/Diagnose/Befund) + Hinweis „ersetzt keine ärztliche Beratung“; **Zweckbestimmung nicht aktualisiert** für Blutdruck-Tagebuch, Bereitschafts-Ampel, „Bericht für Arzt“ (Q2); MDCG-Prüfung durch Anwalt fehlt | src/domain/claims.ts; docs/Rechtspruefung_Mappe.md:10–21; src/domain/blood-pressure.ts; i18n/de.ts (report.cardTitle); docs/Store_Texte.md:119 |
| LAW-011 | KI-Transparenz Art. 50 AI Act (teilgeprüft) | verschoben | keine KI in der App. Hinweis: „Zusammenfassung kopieren – für deine KI“ ist Nutzerhandlung, gehört aber in Datenschutztext (Q1) | docs/Fahrplan.md:425; app/more/report.tsx; i18n/de.ts:2940 |
| LAW-012 | BFSG: Anwendbarkeit/Kleinstunternehmen prüfen und dokumentieren (teilgeprüft) | extern offen (Anwalt) | Frage 8 gestellt; technische Barrierefreiheit teilweise (TECH-019) | docs/Rechtspruefung_Mappe.md:74–75 |
| LAW-013 | Haftungsausschluss: „nie haftend“ nicht tragfähig; AGB/Versprechen prüfen (bestätigt) | extern offen (Anwalt) | Hinweise „Schätzungen“, „ersetzt keine Beratung“ in App; keine Nutzungsbedingungen/EULA-Entscheidung | i18n/de.ts:3321–3322; docs/Rechtspruefung_Mappe.md:71–73 |
| LAW-014 | „Nie verklagt“ nicht garantierbar → Risikomatrix, Beschwerde- und Incident-Verfahren (widerlegt) | teilweise | Risikomatrix (Freigabematrix R1–R9) vorhanden; **Beschwerde-/Incident-Verfahren fehlt** | docs/Freigabematrix.md |
| LAW-015 | Versicherung: Angebote/Ausschlüsse vergleichen (offen) | extern offen (Luc) | nur als offen gelistet | docs/Rechtspruefung_Mappe.md:56 |
| LAW-016 | Community nur mit Moderation/Melden/Blockieren (offen) | verschoben | keine Community, Phase 11 | docs/Fahrplan.md:682; docs/Freigabematrix.md R9 |
| LAW-017 | Releasequalität: Lint, Typen, Tests, reproduzierbarer Build, Restfehler; keine kritischen Fehler (spezifiziert) | teilweise | `npm run check` (tsc+lint+prettier+jest) grün laut Matrix; **kein CI**, kein reproduzierbarer Store-Build bisher (MacBook/EAS); R1/R6 Gerätetests offen | mobile/package.json:70; docs/Freigabematrix.md:11, 25; mobile/.eas/workflows/expo-go-vorschau.yml (nur Vorschau) |
| LAW-018 | Nach Veröffentlichung: Updates, Support, Backup, Vorfälle; Verantwortliche + deaktivierbare Onlinefunktionen (spezifiziert) | verschoben (Konflikt mit P5) | Phase 11; Verantwortlicher (Anbieter) noch nicht benannt; Onlinefunktionen (OFF, Rezept-Link, Expo-Update) nicht abschaltbar | docs/Fahrplan.md:682–683; src/domain/modules.ts (nur Ernährung/Coach/Routinen/Bereitschaft) |

## Zählung

| Status | Anzahl |
|---|---|
| umgesetzt (inkl. „Regel“, „Entscheidung“, „Doku“, „Gerätetest offen“) | 14 (MEDIA 4, TECH 7, BUS 2, LAW 1) |
| teilweise (inkl. „teilweise / extern offen“) | 15 (MEDIA 4, TECH 4, BUS 3, LAW 4) |
| fehlt | 0 |
| verschoben (mit Doku-Beleg; davon 2 im Konflikt mit PDF-Gate P5: TECH-020, LAW-018) | 16 (MEDIA 3, TECH 6, BUS 4, LAW 3) |
| extern offen (Anwalt/Luc/Store/MacBook; LAW-009 hier gezählt) | 14 (TECH 1, BUS 3, LAW 10) |
| kein App-Thema | 8 (MEDIA 2, TECH 2, BUS 4) |
| **Summe** | **67** |
