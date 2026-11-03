# Code-Struktur der App (`mobile/src`)

Stand: 01.11.2026, nach dem Aufräumen in A11. Diese Datei beschreibt, **wo was hingehört**. Die wichtigsten Regeln
sind als Tests und Lint-Regeln festgeschrieben, damit die Ordnung nicht schleichend verloren geht.

## Prüfen mit einem Befehl

```bash
cd mobile
npm run check     # tsc + Lint (0 Warnungen) + Prettier-Prüfung + alle Tests
npm run format    # Code einheitlich formatieren (Prettier)
```

## Schichten

Abhängigkeiten zeigen nur **nach unten**. Eine Schicht darf die darunterliegenden benutzen, nie die darüber.

| Schicht | Ordner | Inhalt | Darf nicht |
|---|---|---|---|
| Bildschirme | `app/` | Routen (expo-router), setzen Bausteine zusammen | – |
| Oberfläche | `components/`, `hooks/` | wiederverwendbare Bausteine mit React | `app` |
| Kontext | `providers/` | React-Kontext rund um die Daten: Datenbank, Profil, Module, laufendes Training | `components`, `app` |
| Abläufe | `services/` | verbinden Daten, Regeln und Texte ohne React (Erinnerungen planen, Ziel-Fortschritt, Zeitabläufe, Tagebuch-Texte) | React, `components`, `hooks`, `providers`, `app` |
| Anzeige-Texte | `format/` | Texte aus Domain-Werten (Übungsname, Lebensmittel-Titel) | React, Expo, `data` (nur Typen) |
| Daten | `data/` | SQLite, Migrationen, Speicher, Export/Import | React, Oberfläche, `providers` |
| Regeln | `domain/` | reine Logik, ohne Datenbank, ohne Texte, ohne Expo – vollständig testbar | alles außer `domain` |
| Texte | `i18n/` | `de.ts` (alle Texte), `t()`, Zahlen-/Datums-/Einheitenformat | – |
| Gestaltung | `constants/` | Farben, Abstände, Schrift, Bewegung | – |

Festgeschrieben in `src/domain/__tests__/architecture.test.ts`.

## Gemeinsame Helfer – nicht neu schreiben

| Thema | Modul | Inhalt |
|---|---|---|
| Kalendertage | `domain/dates.ts` | `DAY_MS`, `shiftDay`, `daysBetween`, `weekStart`, `isoWeekday`, `weekDays` |
| Uhrzeit, „heute“ | `domain/time.ts` | `timeZone`, `todayDay`, `localDay`, `nowMs` (nur in Event-Handlern), Restzeit |
| Zahlen | `domain/math.ts` | `mean`, `roundTo`, `roundDigits` |
| Gleiches Gewicht | `domain/logger.ts` | `sameKg` (Toleranz 0,01 kg; nie `===` auf kg-Werte, 135 lb = 61,2349… kg) |
| Kalorien-Untergrenze | `domain/energy.ts`, `data/goals.ts` | `calorieFloor`/`calorieFloorFor` = max(1200, Ruheenergie); `calorieFloorOn(db, day)` aus Profil und Gewicht |
| Transaktionen | `data/db.ts` | `serialTransactions`: Warteschlange, nie verschachteln; Kerne ohne Transaktion (`insertPlanVersion`, `insertRoutineVersion`) für Abläufe in einer Transaktion |
| Text vergleichen | `domain/text.ts` | `normalize` (behält „/ , . -“ für Mengen), `foldText` (nur Buchstaben/Ziffern/%, für Namensvergleich) |
| Einheiten | `domain/units.ts` + `i18n` | kg/lb, cm/in, ml/fl oz; Anzeige über `formatWeight`, `formatLength`, `formatVolume`, `formatHeight` |
| Module an/aus | `domain/modules.ts` + `useModules()` | Ernährung, Coach (braucht Ernährung), Routinen, Bereitschaft |
| Bildschirm wach | `components/keep-awake.tsx` | `<KeepAwake when={…} />`, im Web ohne Wirkung |
| Laden auf Bildschirmen | `hooks/use-load.ts` | Daten laden, neu laden, Datenbank |
| Werbe-/Heilversprechen | `domain/claims.ts` | prüft alle Texte, als Test |

## Regeln und Fassungen

Fachliche Regeln (Bereitschaft, Deload, Energie-Schätzung, Steigerung …) tragen eine Fassungsnummer
(`READINESS_RULES_VERSION`, `DELOAD_RULES_VERSION`, …). Die Nummer steht im Hinweistext der App und in
`docs/Fachpruefung_Mappe.md`. Ändert sich eine Regel, steigt die Fassung an beiden Stellen.

## Texte

- Alle sichtbaren Texte stehen in `i18n/de.ts`, nie direkt im Bildschirm.
- `src/i18n/__tests__/keys.test.ts` prüft beide Richtungen: kein Text bleibt ungenutzt, und jeder feste Schlüssel
  in `t('…')` existiert. Dynamische Schlüssel (`` t(`stats.level.${x}`) ``) gelten für alles unter dem Präfix.
- Barrierefreiheit: Jedes `Pressable`/`Touchable*` braucht eine `accessibilityRole`
  (`src/domain/__tests__/accessibility-code.test.ts`).

## Schreibweise

- **Prettier** (`.prettierrc.json`): einfache Anführungszeichen, Zeilen bis 160 Zeichen. Datentabellen mit einer
  Zeile je Eintrag (Grundnahrungsmittel, Übungskatalog, Rezeptbuch, Vorlagen) sind bewusst ausgenommen
  (`.prettierignore`).
- **Importe** (ESLint `import/order`): zuerst Pakete, dann `@/…`-Schichten, dann relative Pfade; je Block
  alphabetisch, Leerzeile dazwischen.
- **Exporte:** Nur exportieren, was eine andere Datei braucht. Typen und benannte Regelwerte (Grenzen,
  Fassungen) dürfen exportiert bleiben, weil sie Teil der Schnittstelle bzw. der Fachprüfung sind.
- **Kopfkommentar:** Eine Zeile oben in der Datei sagt, wofür sie da ist; danach erst die Importe.
- **Datenbank:** Änderungen nur als neue Migration in `data/migrations.ts`; jede neue Tabelle auch in die Sicherung
  (`domain/backup.ts`) und, wenn sinnvoll, in den CSV-Export. Schreibt eine Migration eigene Daten um, gehört der
  Schritt auch in `RESTORE_DATA_STEPS` (läuft nur bei älteren Sicherungen). Mehrere Schreibvorgänge, die zusammen
  gehören, laufen in **einer** Transaktion; Transaktionen werden nicht verschachtelt.

## Bekannte große Dateien (Folgearbeit, kein Fehler)

| Datei | Zeilen | Idee zum Teilen |
|---|---|---|
| `app/training/session/[id].tsx` | ~1000 | Übungskarte, Satzzeile und Pausenleiste in eigene Bausteine |
| `data/nutrition.ts` | ~800 | Lebensmittel, Tagebuch, Rezepte, Einstellungen trennen |
| `domain/planner.ts` | ~800 | Split-Wahl, Übungsauswahl, Änderungsvorschläge trennen |
| `data/training.ts` | ~750 | Übungen, Pläne, Einheiten/Sätze trennen |

Teilen erst, wenn an der Datei ohnehin gearbeitet wird – mit den bestehenden Tests als Sicherheitsnetz.
