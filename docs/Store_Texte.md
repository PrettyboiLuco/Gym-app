# App-Store-Texte (Phase 10.4) – Entwurf

Stand 30.10.2026 · Register UX-009, COACH-011, HIIT-006, LAW-010 · Sprache: Deutsch.
Name, Preis und Datenschutz-URL hängen an offenen Entscheidungen (App-Name, 10.2, 10.3).

Der Text zwischen den Markierungen wird automatisch auf unzulässige Versprechen geprüft
(`mobile/src/domain/__tests__/help-claims.test.ts`, Regeln in `mobile/src/domain/claims.ts`). Der Test prüft auch die
Längen (Apple-Grenzen: Name 30, Untertitel 30, Werbetext 170, Beschreibung 4000, Stichwörter 100 Zeichen).

<!-- store:start -->

## Name (max. 30)

Myhealth: Training & Ernährung

## Untertitel (max. 30)

Plan, Kalorien, Dehnen, Coach

## Werbetext (max. 170, jederzeit änderbar)

Training, Ernährung und Fortschritt in einer App – ohne Konto, ohne Werbung. Deine Daten bleiben auf deinem iPhone.

## Beschreibung (max. 4000)

Training, Ernährung und Fortschritt an einem Ort. Ohne Konto, ohne Werbung, ohne Abo: Alles, was du einträgst, bleibt auf deinem iPhone.

TRAINING
• Trainingspläne selbst zusammenstellen oder aus Ziel, Erfahrung, Geräten, Tagen und Zeit vorschlagen lassen
• Sätze, Wiederholungen und Gewicht erfassen, mit Pausen-Timer – auch bei gesperrtem Handy per Mitteilung
• Planassistent: Plan auf mehr oder weniger Tage oder weniger Zeit umbauen, mit Vorschau und „Rückgängig“ – auch nur für diese Woche
• Gerät belegt? Ersatzübung wählen, ohne den Plan zu ändern
• Steigerungsvorschläge nach klaren Regeln, die du jederzeit abschalten kannst
• Kurzanleitungen für alle Übungen

DEHNEN, MOBILITÄT UND HIIT
• Fertige Abläufe für morgens, Büro und Hüfte, Aufwärmen und Cool-down passend zum Training
• HIIT-Programme für Bauchmuskeln und Ganzkörper in zwei Stufen, mit Ansage und Intervall-Timer
• Eigene Abläufe anlegen

ERNÄHRUNG
• Ernährungstagebuch mit Frühstück, Mittag, Abend und Snacks
• Barcode-Scanner und Online-Suche über Open Food Facts, kostenlos
• In eigenen Worten eintragen, z. B. „2 Scheiben Brot mit Nutella, 1 Banane“ – du bestätigst, bevor etwas gebucht wird
• Rezepte, Vorlagen, Getränke mit eigenen Glasgrößen
• Hinweise zu deinen Allergenen aus den Produktangaben – maßgeblich bleibt immer das Etikett
• Auf Wunsch ohne Kalorienzahlen

COACH UND FORTSCHRITT
• Kalorienrechner mit sichtbarem Rechenweg – eine Schätzung, keine Messung
• Coach: Tagesziel mit Eiweiß, Fett, Kohlenhydraten und Ballaststoffen, auf Wunsch mehr an Trainingstagen und weniger an Ruhetagen
• Wöchentlicher Check-in, der dein Ziel nur nach deiner Bestätigung in kleinen Schritten anpasst
• Gewicht mit Trend, Körpermaße, Schritte, Ziele und Fortschrittsfotos (freiwillig, nur auf dem Gerät)

DEINE DATEN
• Kein Konto, kein Server, keine Werbung, keine Analyse-Dienste
• Sicherung als Datei und Umzug auf ein neues iPhone
• Alle Daten mit einem Tipp löschen
• App-Sperre mit Face ID

Hinweis: Die App unterstützt allgemeine Fitness für gesunde Erwachsene ab 18. Sie ersetzt keine ärztliche oder fachliche Beratung. Alle Kalorienwerte sind Schätzungen.

## Stichwörter (max. 100, durch Komma, ohne Leerzeichen)

Fitness,Gym,Krafttraining,Trainingsplan,Kalorienzähler,Makros,Dehnen,HIIT,Workout,Tracker,Ernährung

## Neu in dieser Version

Erste Version.

<!-- store:end -->

## Längen (nachgezählt 30.10.2026)

| Feld | Zeichen | Grenze |
|---|---|---|
| Name | 30 | 30 |
| Untertitel | 29 | 30 |
| Werbetext | 115 | 170 |
| Beschreibung | 2135 | 4000 |
| Stichwörter | 99 | 100 |

Stichwörter wiederholen keine Wörter aus Name und Untertitel (Apple wertet diese ohnehin). Markenrecherche zum
Namen offen (siehe `docs/Rechtspruefung_Mappe.md`, Abschnitt 5); ist „Myhealth“ im Store vergeben, braucht es einen
anderen Namen.

## Weitere Angaben in App Store Connect

| Feld | Vorschlag | Offen |
|---|---|---|
| Kategorie | Gesundheit und Fitness (zweite: Essen und Trinken) | – |
| Altersfreigabe | Fragebogen ehrlich beantworten; Zielgruppe 18+ | Ergebnis prüfen |
| Preis | kostenlos | Entscheidung 10.3 |
| Datenschutz-URL | Seite aus `website/datenschutz.html` | Veröffentlichung nach 10.2 |
| Support-URL | z. B. dieselbe Seite mit Kontakt oder Hilfe-Seite | Entscheidung |
| App-Datenschutz („Nutrition Label“) | Vorschlag „Data Not Collected“ – **nur** wenn die Rechtsprüfung das bestätigt (Open Food Facts, Expo-Update-Abfrage, siehe 10.2, Frage 6) | 10.2 |
| Hinweise für die Prüfung (App Review) | „Kein Konto nötig. Barcode-Scan: beliebiges Lebensmittel. Alle Daten lokal. Erststart: Volljährigkeit bestätigen, dann Coach oder Überspringen.“ | – |
| Exportkontrolle | `ITSAppUsesNonExemptEncryption = false` (bereits in `app.json`) | – |

## Screenshots (iPhone 6,9", Pflicht; 6,5" optional)

Mit Beispieldaten (keine echten Personen- oder Gesundheitsdaten). Je Bild eine kurze Überschrift:

1. „Heute“ mit Coach-Karte – *Dein Tag auf einen Blick*
2. Training mit Pausen-Timer – *Sätze erfassen, Pause im Blick*
3. Planassistent-Vorschau – *Plan umbauen mit Vorschau und Rückgängig*
4. Ernährung mit Tagesübersicht – *Essen eintragen, Ziel im Blick*
5. „In eigenen Worten“ – *Einfach schreiben, was du gegessen hast*
6. Dehnen/HIIT-Ablauf – *Dehnen, Mobilität und HIIT mit Ansage*
7. Mehr → Datenschutz – *Kein Konto. Deine Daten bleiben bei dir.*

Erstellen am MacBook im Simulator (iPhone 16 Pro Max) oder auf dem iPhone; Übungsbilder erst, wenn sie da sind.

## Prüfliste: was nie im Store stehen darf

- Gezielter Fettabbau an einer Körperstelle („Bauchfett wegtrainieren“) – HIIT-006
- „Cardio bringt nichts“ oder ähnliche Abwertungen – COACH-011
- Erfolgsgarantien, Zieldaten, „in X Tagen Y kg“ – COACH-004
- Heilung, Therapie, Diagnose, Bezug zu Krankheiten – LAW-010 (Medizinprodukt)
- „fachlich/wissenschaftlich geprüft“, solange 10.1 nicht abgeschlossen ist
- „allergenfrei“ – COACH-009
- Funktionen, die es noch nicht gibt (Apple Health, Übungsbilder, KI)
- Unbelegte Superlative („beste App“, „Nr. 1“)
