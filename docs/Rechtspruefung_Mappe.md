# Mappe für die rechtliche Prüfung (Phase 10.2)

Stand 30.10.2026 · Register LAW-001–018, BUS-001/-007/-008/-011, O4 · Freigabematrix Kap. 18: **R5** (private Daten in
Ads/KI/Crashlogs), **R7** (Veröffentlichung/Abrechnung), **R8** (Rechts-/Verbraucherinformationen).

**Keine Rechtsberatung.** Diese Mappe sammelt den technischen Ist-Stand und die offenen Fragen, damit eine Anwältin
oder ein Anwalt (IT-/Datenschutzrecht) sie in einem Termin prüfen kann. Alle Texte hier sind Entwürfe.

---

## 1. Was die App ist (Zweckbestimmung)

- Fitness- und Ernährungs-App für **gesunde Erwachsene ab 18**: Trainingspläne, Satzlogger, Timer, Dehnen/HIIT,
  Ernährungstagebuch mit Barcode-Scan, Kalorienrechner, Coach (Kalorien-/Makroziel), Gewicht, Maße, Fotos, Schritte.
- **Kein** Diagnose-, Therapie- oder Krankheitsbezug. Bei sensibler Situation (Schwangerschaft, Essstörung,
  Untergewicht, Erkrankung) zeigt die App keine Kalorienzahlen und unterstützt kein Abnehmen.
- Vorschläge nach festen, sichtbaren Regeln, ohne KI; jede Änderung erst nach Bestätigung.
- **Kostenlos, ohne Werbung, ohne Abo** (Stand heute; siehe 10.3 `docs/Monetarisierung_Entscheidung.md`).

**Frage an die Prüfung:** Bleibt die App mit dieser Zweckbestimmung außerhalb der Medizinprodukte-Verordnung (MDR,
LAW-010)? Welche Formulierungen in App und Store sind dafür wichtig?

## 2. Datenflüsse (Ist-Stand im Code geprüft)

Geprüft: alle Netzwerkzugriffe im App-Code (`grep fetch/https`), `app.json`, Pakete. Es gibt **kein Konto, keinen
eigenen Server, keine Analyse-, Werbe-, Absturz- oder KI-Dienste** im Code.

| # | Wohin | Wann | Was wird übertragen | Rechtsgrundlage (Vorschlag) | Status / offen |
|---|---|---|---|---|---|
| D1 | **Open Food Facts** (Verein, Frankreich; `world.openfoodfacts.org`, `search.openfoodfacts.org`) | nur bei Scan oder „Online suchen“ | Barcode bzw. Suchbegriff, IP-Adresse, technische Kennung der App (User-Agent) | Art. 6 Abs. 1 lit. b DSGVO (vom Nutzer ausgelöste Funktion) | kein Vertrag; Einordnung als eigenständig Verantwortlicher prüfen |
| D2 | **Expo / EAS Update** (650 Industries, Inc., USA; `u.expo.dev`) | **bei jedem App-Start automatisch** (Abfrage nach Korrekturen ohne neuen Build) | IP-Adresse und technische Angaben (Plattform, Laufzeitversion, Kanal, aktuelle Update-ID; laut Expo vermutlich auch eine zufällige Installations-ID – in der Expo-Doku bestätigen). Keine Gesundheitsdaten | Art. 6 Abs. 1 lit. f (Sicherheit/Fehlerbehebung) | **Neu gefunden:** steht noch nicht im Datenschutz-Entwurf. Entscheidung nötig: (a) behalten, in der Erklärung nennen, Expo-DPA abschließen, Drittlandtransfer (DPF/SCC) prüfen – oder (b) Updates in der Store-Version abschalten |
| D3 | **Apple** (App Store, TestFlight, iOS) | Download, Updates, Absturzberichte nur wenn der Nutzer „Mit Entwicklern teilen“ erlaubt | durch Apple | Apple eigenständig verantwortlich | in der Erklärung erwähnen |
| D4 | **Sicherungsdatei** | nur wenn der Nutzer sie erstellt | alle Daten inkl. Gesundheitsdaten, optional Fotos; Speicherort wählt der Nutzer (z. B. iCloud Drive) | Nutzer selbst | Hinweis „enthält Gesundheitsdaten“ in der App vorhanden |
| D5 | **Feedback** | nur wenn der Nutzer es verschickt (Teilen-Menü) | sichtbarer Text, optional Nutzungsanzahlen | Art. 6 Abs. 1 lit. a/b | Empfänger = Luc (Mail/Messenger des Nutzers) |
| D6 | Mitteilungen, Kamera, Fotos, Face ID | lokal | nichts verlässt das Gerät | – | – |
| D7 | Apple Health (geplant, Development Build) | nur nach Freigabe | Lesen von Schritten/Schlaf, nichts wird gesendet | Art. 9 Abs. 2 lit. a (ausdrückliche Einwilligung) | LAW-004: iOS-Freigabe allein reicht evtl. nicht – eigene Einwilligung in der App? |

**Gesundheitsdaten (Art. 9 DSGVO):** Gewicht, Maße, Fotos, Schlaf, Allergien, „sensible Situation“ (nur ja/nein),
Ernährung, Training. Verarbeitet werden sie **nur auf dem Gerät des Nutzers**; der Anbieter erhält sie nie.
**Frage:** Ist Luc für rein lokal gespeicherte Daten überhaupt „Verantwortlicher“? Ist eine Datenschutz-Folgenabschätzung
(DSFA, LAW-007) nötig, wenn keine Daten beim Anbieter ankommen?

## 3. Verträge und Lizenzen (O4: Risiko-/Vertragsmatrix)

| Bereich | Partner | Vertrag/Lizenz | Kosten | Status | Verantwortlich |
|---|---|---|---|---|---|
| Veröffentlichung iOS | Apple Developer Program | Apple Developer Agreement, Einzelperson (rechtlicher Name im Store sichtbar, BUS-011) | 99 $/Jahr | offen (am MacBook) | Luc |
| Build/Updates | Expo (EAS) | Expo Terms, ggf. DPA (siehe D2) | kostenloser Tarif | offen | Luc |
| Produktdaten | Open Food Facts | Datenbank ODbL, Namensnennung (in der App unter Mehr → Datenquellen); Produktbilder nicht genutzt | 0 € | erfüllt; User-Agent mit Kontakt nachtragen (OFF-Bitte) | Luc |
| Software-Pakete | Open Source | 599 Laufzeit-Pakete, überwiegend MIT/ISC/BSD/Apache (Bericht `docs/Pakete_und_Sicherheit.md`) | 0 € | Lizenzhinweise in der App anzeigen? (Frage) | Luc |
| App-Symbol | selbst gezeichnet | eigene Rechte | 0 € | erfüllt | Luc |
| Übungsbilder | eigene/Higgsfield | Nutzungsrechte je Bild im Verzeichnis (`exercise-media.ts`), Higgsfield-AGB prüfen | offen | noch keine Bilder | Luc |
| Werbung | – | **nicht geplant** (Entscheidung offen, 10.3) | – | – | – |
| KI | – | **nicht geplant** (Entscheidung 30.10.2026) | – | – | – |
| Fachprüfung | Fachperson | Auftrag/Honorar, Haftung (`docs/Fachpruefung_Mappe.md`) | offen | offen | Luc |
| Versicherung | z. B. Berufs-/Vermögensschaden-Haftpflicht | LAW-015 | offen | offen | Luc |

## 4. Fragen an die Rechtsprüfung

1. **Gewerbe (LAW-001):** Muss Luc für eine kostenlose App ohne Werbung ein Gewerbe anmelden? Ändert sich das mit Pro-Abo
   oder Werbung? Rechtsform (Einzelunternehmen reicht?), Kleinunternehmerregelung.
2. **Impressum (LAW-002, § 5 DDG):** Pflicht schon bei kostenloser App? Wo (Store-Seite, Webseite, in der App)? Private
   Adresse vermeidbar (z. B. Impressums-Service)? Entwurf: `website/impressum.html`.
3. **Datenschutzerklärung (LAW-003, LAW-009):** Entwurf `website/datenschutz.html` – vollständig? Wo hosten (z. B.
   GitHub Pages, kostenlos)? Formulierungen zu D1–D3?
4. **Expo-Updates (D2):** behalten mit Erwähnung/DPA oder abschalten?
5. **Einwilligungen (LAW-004):** Reicht die iOS-Systemfreigabe für Apple Health, oder braucht es eine eigene
   Einwilligung nach Art. 9? Fortschrittsfotos (standardmäßig aus, nur lokal)?
6. **Apple „App Privacy“:** Ist „Data Not Collected“ korrekt, wenn Barcodes an Open Food Facts und technische Daten an
   Expo gehen (Apple: Daten, die an Dritte gehen, zählen ggf. als „collected“)?
7. **Haftung (LAW-013/014):** Welche Hinweise sind tragfähig? (Aktuell: „ersetzt keine ärztliche oder fachliche
   Beratung“, „Schätzungen“, Ausschlüsse sensibler Gruppen.) Nutzungsbedingungen nötig, oder reicht Apples
   Standard-EULA?
8. **Barrierefreiheit (BFSG, LAW-012):** Gilt das BFSG für eine kostenlose App ohne Verkauf? Gilt die
   Kleinstunternehmen-Ausnahme? (Die App unterstützt große Schrift, Bildschirmleser-Beschriftungen, hell/dunkel.)
9. **Medizinprodukt (LAW-010):** siehe Abschnitt 1.
10. **Mindestalter:** Selbstauskunft „18+“ beim Erststart ausreichend? Altersfreigabe im App Store?
11. **Pro-Abo/Werbung (falls später):** Was ändert sich (Verbraucherinformationen, Widerruf, TDDDG-Einwilligung bei
    Werbung, BUS-007: Gesundheitsdaten nie für Werbung)?

## 5. Was Luc vor dem Termin klären muss

- [ ] Wer ist Anbieter? (Name, ladungsfähige Anschrift, E-Mail – oder Impressums-Service)
- [ ] Endgültiger App-Name (Markenrecherche DPMA/EUIPO für „Myhealth“ – der Name ist sehr allgemein)
- [ ] Entscheidung 10.3 (kostenlos bleiben, Pro-Abo, Werbung?)
- [ ] Expo-Updates behalten oder abschalten (D2)
- [ ] Budget für Rechtsprüfung und Versicherung

## 6. Nach der Prüfung umsetzen

- Datenschutzerklärung und Impressum veröffentlichen, Links in App (Mehr → Datenschutz) und App Store Connect.
- App-Text `more.privacy`, Hilfe-Antwort `help.q.wasGesendet.a` und `docs/Datenschutz_Entwurf.md` an das Ergebnis
  anpassen (insbesondere D2).
- Open-Food-Facts-User-Agent mit App-Name, Version und Kontakt (`mobile/src/data/off.ts`).
- Register LAW-001–015 auf den geprüften Stand setzen; Freigabematrix R5/R7/R8 abhaken.
