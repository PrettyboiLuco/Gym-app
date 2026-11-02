# Freigabematrix (Kap. 18) – Stand vor der Veröffentlichung

Stand 02.11.2026 (zuerst 30.10.2026) · „Fertig, wenn“ von Phase 10: **keine offenen kritischen Punkte → Einreichung im App Store.**

Regel aus Kap. 18: Kein bekannter kritischer/hoher Datenverlust-, Zugriffs- oder Sicherheitsfehler; keine ungeklärten
Rechte an ausgelieferten Medien; keine unfreigegebenen gesundheitsbezogenen Automatikregeln; klare Restrisiken und
Ansprechpartner. **Ein nicht gewähltes Feature blockiert nicht, ein aktives riskantes Feature blockiert.**

| Risiko | Maßnahme | Nachweis | Stand | Blockiert? | Wer |
|---|---|---|---|---|---|
| **R1** Datenverlust | Transaktionen, Migrationen, Wiederherstellen | 691 automatische Tests, darunter Golden-Dataset Version 4 → 26 (jede Spalte gleich, Verweise ok, jede Zwischenversion), Sicherung → Löschen → Wiederherstellen, ältere Sicherung, kaputte Sicherung ändert nichts; Datenbank-Update auf Lucs iPhone (Version 10) ohne Verlust | Gerätetest D1–D6, V4 noch offen | **ja**, bis D1–D6 und V4 auf dem iPhone bestanden | Luc (Test), Claude (Fehler beheben) |
| **R2** Fremdzugriff | Nutzer-/Objektprüfung | entfällt: kein Konto, kein Server. Auf dem Gerät: App-Sperre (Face ID/Code) | erfüllt (Gerätetest S1–S3) | nein | – |
| **R3** falsche Gesundheitsvorgaben | versionierte Fachregeln, Ausnahmefälle | `docs/Fachpruefung_Mappe.md` (Coach 1, Check-in 1 und Fassung 2 mit Verbrauchsschätzung 1 (wählbar, Abschnitt J), Steigerung 1 und Fassung 2 (vorbereitet, ausgeschaltet, Abschnitt L), Bereitschaft 1 (Abschnitt I), Deload 1 und Programm-Vorlagen (Abschnitt K), Dehnen, HIIT, Schutz sensibler Gruppen) | Mappe fertig, **Fachperson fehlt** | **ja** – Rechner, Coach, Check-in, Steigerung, Bereitschafts-Ampel, Verbrauchsschätzung und Deload-Angebot sind aktive Automatikregeln | Luc (Fachperson beauftragen) |
| **R4** Medienrechte | Verträge, Autoren, Version | Verzeichnis `exercise-media.ts` mit Autor/Lizenz/Prüfstatus und Test; App-Symbol: Form selbst gezeichnet, 3D-Look aus getlayers-Preset (Nutzungsbedingungen offen, siehe Rechtsmappe Abschnitt 3); keine Produktbilder von Open Food Facts | erfüllt, solange keine Bilder ausgeliefert werden | nein (jedes neue Bild: Eintrag + Prüfung) | Luc |
| **R5** private Daten in Ads/KI/Crashlogs | Minimierung, Netzwerkprüfung | Code geprüft (02.11.2026), drei Netzwerkzugriffe: Open Food Facts (`src/data/off.ts`, nur auf Aktion), Rezept per Link (`src/data/meal-plan.ts` `fetchPage`, lädt nur die vom Nutzer eingegebene Seite) und Expo-Update-Abfrage (`app.json`, technisch, ohne Einträge); keine Werbung/KI/Absturzdienste. Open Food Facts und Rezept-Link sind abschaltbar: für den Nutzer unter Mehr → Bereiche der App → Online-Funktionen, für alle per Not-Aus `PROVIDER_ONLINE_ENABLED` in `src/data/online.ts` (Ablauf: `docs/Support_und_Notfallplan.md`) | Expo-Abfrage war nicht in der Datenschutzerklärung → in App-Texten und Entwurf ergänzt; Entscheidung behalten/abschalten offen | **ja**, bis 10.2 (D2) entschieden ist | Luc + Rechtsprüfung |
| **R6** unzuverlässiger Timer | Gerätematrix, deklarierte Fallbacks | Mitteilungen bei gesperrtem Handy; bekannte Grenzen in Hilfe-Text („einige Sekunden später“) und Fahrplan | Gerätetest T1–T10 offen | **ja**, bis T1–T8 bestanden | Luc |
| **R7** falsche Veröffentlichung/Abrechnung | Kontotyp, Store-Regeln | Anleitung TestFlight, Store-Texte mit automatischer Prüfung (`docs/Store_Texte.md`), keine Käufe (10.3 offen, Empfehlung kostenlos) | Developer-Konto und App-Name offen | **ja**, bis Konto, Name, Datenschutz-URL stehen | Luc |
| **R8** Rechts-/Verbraucherinformationen | konkrete Texte anhand echter Flüsse | `docs/Rechtspruefung_Mappe.md`, `website/datenschutz.html`, `website/impressum.html` | Entwürfe fertig, **Prüfung fehlt** | **ja** | Luc (Anwalt beauftragen) |
| **R9** Community-Missbrauch | Melden/Blockieren/Moderation | entfällt: keine Community (Phase 11) | – | nein | – |

## Zusätzlich vor dem Einreichen

| Punkt | Stand |
|---|---|
| Release-Qualität (LAW-017): Lint, Typprüfung, Formatierung, Tests, Build | grün (02.11.2026, 691/691 Tests); Build am MacBook/EAS |
| Sicherheit/Pakete (O6, TECH-017) | geprüft, siehe `docs/Pakete_und_Sicherheit.md` (Stand 02.11.2026); nur Build-Werkzeug-Meldungen |
| Hilfe/FAQ (UX-005) | in der App: Mehr → Hilfe und häufige Fragen (44 Fragen, Suche, ohne Internet) |
| Keine falschen Versprechen (UX-009, COACH-011, HIIT-006) | automatischer Test über alle App-Texte der Sprachdatei (02.11.2026: 5138, mit Übungstexten) und die Store-Texte |
| Open-Food-Facts-Kennung mit Kontakt | offen (nach Anbieterangaben) |
| Pilot ausgewertet (Phase 7) | offen |

**Ergebnis heute:** Nicht einreichbar. Offen sind ausschließlich Punkte, die Luc oder externe Fachleute erledigen
müssen (R1/R6 Gerätetests, R3 Fachperson, R5/R8 Rechtsprüfung, R7 Konto/Name). Code-seitig ist nichts Kritisches offen.
