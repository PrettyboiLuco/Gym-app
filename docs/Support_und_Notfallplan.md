# Support und Notfallplan (TECH-020, LAW-018)

Stand 02.11.2026. **Entwurf, gilt ab dem Pilot.** Verantwortlich: Luc (Anbieter; Name und Kontakt im Impressum
eintragen, siehe `docs/Rechtspruefung_Mappe.md`). Die App hat keinen Server und kein Konto. Deshalb geht es hier um
Fehler in der App, Probleme mit Online-Quellen und um den Umgang mit Rückmeldungen. Ein Datenleck beim Anbieter ist
nicht möglich, weil dort keine Nutzerdaten liegen.

## 1. Support-Weg

| Was | Wie |
|---|---|
| Rückmeldung, Frage, Fehler | In der App: Mehr → Feedback geben. Der Nutzer sieht den Text und verschickt ihn selbst (Mail/Messenger). |
| Was in einer Meldung stehen darf | Nur, was der Nutzer selbst schreibt, und auf Wunsch Nutzungsanzahlen (z. B. „12 Trainings“). Keine Einträge, keine Gesundheitswerte. |
| Fehleransicht in der App | `components/error-view.tsx` zeigt die technische Fehlermeldung (Text des Fehlers, keine Einträge); der Nutzer kann sie im Feedback mitschicken. Es gibt keinen automatischen Absturzbericht, nur Apples eigenen, wenn der Nutzer „Mit Entwicklern teilen“ erlaubt hat. |
| Umgang mit Feedback-Mails | Im Postfach des Anbieters, nicht weitergeben, nach Bearbeitung löschen (spätestens nach 6 Monaten). Gesundheitsangaben, die jemand von sich aus schreibt, nicht abspeichern oder weiterverwenden. |
| Antwortzeit (Ziel) | Pilot: 2 Werktage. Öffentlich: 5 Werktage. |

## 2. Vorfälle: erkennen und einstufen

| Stufe | Beispiel | Reaktion |
|---|---|---|
| **A – kritisch** | Datenverlust beim Update; falsche Gesundheitszahl (z. B. Kalorienziel unter der Untergrenze); eine Online-Quelle liefert gefährlich falsche Daten | Innerhalb von 24 h: Not-Aus bzw. Korrektur als Update, Hinweis an die Tester |
| **B – hoch** | Absturz in einem Hauptablauf (Training, Tagebuch); Erinnerungen kommen falsch | Innerhalb von 3 Tagen: Korrektur als Update |
| **C – normal** | Anzeige- oder Textfehler | Mit dem nächsten Update |

Quellen für Vorfälle: Feedback, eigene Tests (`docs/Geraetetest.md`), Absturzberichte von Apple (App Store Connect),
Meldungen von Open Food Facts.

## 3. Not-Aus (Kill-Switch)

| Was abschalten | Wie | Wirkung |
|---|---|---|
| Alle Online-Funktionen für alle Nutzer | In `mobile/src/data/online.ts` `PROVIDER_ONLINE_ENABLED = false` setzen, testen, als Update veröffentlichen (EAS Update, Kanal der Store-Version) | Scan, Online-Suche und „Rezept per Link“ fragen nicht mehr im Netz. Alles andere läuft offline weiter. Nutzer sehen „Online-Funktionen sind ausgeschaltet“. |
| Nur für sich selbst | Nutzer: Mehr → Bereiche der App → Online-Funktionen aus | wie oben, nur auf diesem Gerät |
| Ein fehlerhaftes Update | Vorheriges Update in EAS erneut veröffentlichen (Rollback) | Die App lädt beim nächsten Start die vorige Fassung |
| Expo-Update-Abfrage selbst | Nur über einen neuen Build abschaltbar (`app.json`, `updates.enabled`). Ob die Store-Version sie behält, entscheidet Luc (Rechtsmappe D2). | – |

Das Update erreicht die Nutzer beim nächsten App-Start. Das Abschalten wirkt also nicht sofort auf jedem Gerät. Für
Vorfälle der Stufe A bekommen die Tester deshalb zusätzlich eine Nachricht.

## 4. Regelmäßige Proben

| Probe | Wie oft | Ablauf | Erledigt |
|---|---|---|---|
| **Wiederherstellen** | vor jedem Store-Update, sonst monatlich | Echte Sicherung erstellen (mit Fotos), auf einem zweiten Gerät bzw. nach „Alle Daten löschen“ wiederherstellen, Stichproben vergleichen (letztes Training, Tagebuch, Gewicht, Fotos, Erinnerungen) | |
| **Testvorfall** | einmal vor der öffentlichen Beta | Not-Aus wie in Abschnitt 3 auf einem Testkanal auslösen, prüfen, dass Scan/Link gesperrt sind, dann zurücknehmen; Zeit messen | |
| **Update-Rollback** | einmal vor der öffentlichen Beta | Ein Test-Update veröffentlichen und zurückrollen | |

## 5. Nach einem Vorfall

1. Ursache, Zeitraum und betroffene Funktionen kurz in `docs/Entscheidungen.md` festhalten (ohne Nutzerdaten).
2. Einen Test schreiben, der den Fehler künftig findet (wie in `src/*/__tests__/scan-fixes*.test.ts`).
3. Prüfen, ob ein Hinweis in der App nötig ist (z. B. „Bitte Sicherung erstellen“).
4. Rechtlich unklar? Mit der Rechtsprüfung klären, ob eine Meldung nötig ist. Weil der Anbieter keine Nutzerdaten
   hat, wird das in der Regel nicht der Fall sein, ist aber nicht geprüft.
