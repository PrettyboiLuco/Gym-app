# Fehlersuche Oberfläche (app/, components/, providers/, hooks/), Stand 01.11.2026

Nur gelesen, nichts im Repo geändert. Pfade relativ zu `mobile/src/`.

Zuerst geprüft: `npx tsc --noEmit` ohne Fehler, `npx eslint src` ohne Fehler (rules-of-hooks greift also, keine Hooks
nach frühem return gefunden), `npx jest` 57 Suites / 676 Tests grün. Prüfskript für Routen:
`scan/routes.js`. Alle 153 Pfad-Strings passen zu den 63 Routen-Dateien. Die 3 Treffer des Skripts waren Fehlalarme
(Präfix-Vergleich im Mini-Player, Parameter per Ternary in book/index.tsx:98). A11y-Skript: `scan/a11y.js`.

---

## Mittel (deutlich, mit klarem Szenario)

### M1 Doppeltipp auf „Training starten“ legt zwei laufende Trainings an
- `app/training/index.tsx:112-115` `start()` hat kein busy-Flag. Aufgerufen wird es von Zeile 135 (Hero-Knopf),
  231 (jeder Plantag) und 235 (freies Training).
- `data/training.ts:384-387` schreibt per INSERT einfach ein neues Training mit 'aktiv' und prüft nicht, ob schon eins läuft.
  `getActiveSession` (`:353`) zeigt nur das neueste.
- Szenario: Zwei schnelle Tipps auf einen Plantag ergeben zwei aktive Sessions mit allen Plan-Sätzen und zwei gestapelte
  Session-Bildschirme. Nach dem Abschließen des einen taucht das andere als „Training läuft“ im Mini-Player bzw. auf
  „Heute“ wieder auf, bis man es verwirft oder es nach 6 h als vergessen gilt.

### M2 App-Sperre wirft im Training den ganzen Navigationsbaum weg
- `components/lock-gate.tsx:36-41` sperrt nach mehr als 60 s im Hintergrund wieder. Zeile 50 rendert die Kinder nur bei
  'offen', also wird `<AppTabs/>` ausgehängt.
- Szenario: App-Sperre an. In der Pause sperrt man das Handy länger als 60 s (Seitentaste trotz KeepAwake). Dann gehen
  verloren: getippte, noch nicht abgehakte Gewichte und Wiederholungen (`inputs`-State), ein laufender Halte-Countdown
  (Cleanup `session/[id].tsx:172-177` löscht den Timeout, der Satz wird nicht eingetragen), das Pausen-Vollbild und alle
  nicht gespeicherten Formulare (der Unsaved-Guard greift nicht).
- Dass man nach dem Entsperren auf dem Start-Tab landet: **unbestätigt**, hängt am Router-Store.

### M3 Notizen werden im Web nie gespeichert (onEndEditing)
- react-native-web 0.21.4 unterstützt `onEndEditing` nicht. Geprüft in `node_modules/react-native-web/.../TextInput/index.js`:
  dort gibt es nur onBlur und onSubmitEditing.
- Betroffen: Trainingsnotiz `app/training/session/[id].tsx:917`, Notiz in der Zusammenfassung
  `app/training/summary/[id].tsx:292`, Satznotiz `components/set-details.tsx:85`.
- iOS, **unbestätigt**: `components/screen.tsx:32` setzt `keyboardShouldPersistTaps="handled"`. Tippt man bei offener
  Tastatur direkt „Abschließen“ oder „Fertig“, blurt das Feld nicht, und die Notiz geht vermutlich beim Wegnavigieren verloren.

### M4 Doppeltes Buchen bzw. Anlegen durch fehlendes busy-Flag
Überall gleich: zuerst `await` auf den DB-Schreibvorgang, danach die Navigation. In der Zwischenzeit bleibt der Knopf aktiv.
- Lebensmittel buchen: `app/nutrition/food/[id].tsx:70-77`. Doppeltipp ergibt zwei Tagebucheinträge.
- Vorlage buchen: `app/nutrition/add.tsx:102-106`.
- „In eigenen Worten“: `app/nutrition/text.tsx:158-185`. Mehrere Writes nacheinander, deshalb ist das Zeitfenster lang. Bricht
  ein Write ab, bleibt eine halbe Buchung stehen, obwohl der Kommentar in Zeile 160 „keine halben Buchungen“ verspricht.
- Schnell eintragen: `app/nutrition/quick.tsx:35-45`.
- Vortag kopieren (Mahlzeit bzw. ganzer Tag): `app/nutrition/index.tsx:100-118`.
- Planassistent „Übernehmen“: `app/training/assistant.tsx:233-252`. Im Modus Vorlage entstehen zwei neue Pläne. Beim
  Umbau entstehen zwei Fassungen, und „Rückgängig“ stellt dann die erste übernommene Fassung wieder her statt der alten.
- Weniger schlimm: Körpergewicht (`app/progress/index.tsx:88-99`; zusätzlich löst `onSubmitEditing` in Zeile 155 zusammen mit
  dem Knopf aus), neue Routine (`app/training/routine/[id].tsx:114-128`), neues Lebensmittel
  (`app/nutrition/food-edit/[id].tsx:72-90`), neues Ziel (`app/progress/goal/[id].tsx:112-133`), Online-Treffer übernehmen
  (`add.tsx:96-100`), Scan „Übernehmen“ (`scan.tsx:86-93`).

### M5 Planeditor lädt nach dem Assistenten nicht neu, Speichern überschreibt dann die Änderung
- `app/training/plan/[id].tsx:157-167` lädt nur beim Mount (useEffect statt useFocusEffect). `save()` in `:195-208` speichert
  das Formular als neue Fassung.
- Szenario: Plan öffnen → „Assistent“ (`:250`) → Änderung übernehmen → zurück. Der Editor zeigt die alte Fassung, das
  Formular gilt als nicht geändert. Ändert man jetzt eine Kleinigkeit und speichert, wird die Assistenten-Fassung still
  ersetzt. Auch `active.validUntil` ist dann veraltet. Mit „Plan öffnen“ (`assistant.tsx:447`, replace) bleibt der alte
  Editor ebenfalls unter dem neuen im Stack liegen.

### M6 Module: Coach bleibt nach Ernährung aus/an dauerhaft aus
- `app/more/modules.tsx:19`: `coach: profile.modules.coach` soll den Wunsch erhalten. `profile.modules` ist aber schon der
  wirksame Wert (`data/profile.ts:11` `effectiveModules`), und solange Ernährung aus ist, ist coach dort `false`.
- Szenario: Ernährung aus und wieder an: der Coach bleibt aus. Der Hinweis „… ist deshalb **gerade** mit aus“ verspricht
  etwas anderes.

## Gering

- **G1 Module trotzdem erreichbar:**
  - `app/index.tsx:152-159`: Am Ruhetag führt der Hero zu „Dehnen“ (`/training/stretch`), auch wenn `routinen` aus ist. Der
    Ruhetag selbst (`restDay`) kommt aus dem Coach-Kalorienziel, auch wenn der Coach aus ist.
  - Check-in in `app/progress/index.tsx:216` wird ohne `modules.coach` gezeigt. Von dort führt `checkin.tsx:189` zur
    Coach-Einrichtung.
  - `more/notifications.tsx:165-214`: Trink- und Morgen-Erinnerung lassen sich einschalten, obwohl das Modul aus ist. Der
    Dienst filtert sie still weg, die Oberfläche sagt nichts dazu.
  - **unbestätigt (Absicht?)**: Aufwärmen und Cool-down im Training (`session/[id].tsx:449-450`) sind nicht an `routinen` gebunden.
- **G2 Mengen werden beim Speichern gerundet:** `app/nutrition/entry/[id].tsx:38` zeigt die Menge mit `formatNumber(e.amount)`,
  also mit 1 Nachkommastelle. Aus 0,25 Portion wird „0,3“. Ändert man nur die Mahlzeit und speichert, werden daraus +20 %
  kcal. Ähnlich ist es bei der Portionsgröße in `food/[id].tsx:48`.
- **G3 Datum im Verlauf ist das UTC-Datum:** `app/training/history.tsx:54,66` und `timed/[id].tsx:39` zeigen
  `startedAt.slice(0,10)` an, die Zeit ist aber UTC. Ein Training um 0:30 Uhr deutscher Zeit erscheint am Vortag. Der
  Mini-Player rechnet es richtig mit `localDay`.
- **G4 useLoad ohne Fehlerpfad:** `hooks/use-load.ts:59-67` hat kein try/catch. Wirft `load`, gibt es eine unbehandelte
  Rejection, `loaded` bleibt false und das Skeleton bleibt für immer stehen. Dazu ist `load` absichtlich nicht in den Deps.
  `progress/checkin.tsx:74` übergibt `profile` per Closure ohne key, nach einer Profiländerung rechnet es also mit dem alten
  Profil (heightCm, sensitive).
- **G5 Halte-Countdown geht verloren:** Verlässt man das Training mit „Zurück“, während ein Zeit-Satz (Plank) läuft, löscht der
  Cleanup den Timeout (`session/[id].tsx:172-177`, `228`). Der Satz wird nicht eingetragen, und es kommt keine Rückmeldung.
- **G6 run.tsx `finish()`:** Wirft `finishTimedSession`, bleibt `finishing.current = true` (`run.tsx:84-95`). Danach geht kein
  Abschluss und kein Abbruch mehr, und es gibt keine Meldung. **unbestätigt (Absicht?)**: Läuft der Ablauf im Hintergrund zu
  Ende, während der Bildschirm offen ist, zählt er beim Zurückkommen still als „abgeschlossen“. Die Rückfrage (`askDone`)
  kommt nur beim Mount.
- **G7 Timer ticken nach dem Ende weiter:** In `rest-timer-bar.tsx:48-49` läuft `useNow` alle 250 ms, bis man „OK“ tippt, und
  ebenso in `interval.tsx:38` im Zustand „fertig“ (Akku).
- **G8 Unsaved-Guard unvollständig:** In `more/notifications.tsx:61` zählen Aufwachzeit und Schlafziel nicht zum „dirty“-Zustand.
  Verlässt man den Bildschirm, gehen sie ohne Rückfrage verloren.
- **G9 Barrierefreiheit:**
  - `app/nutrition/plan.tsx:96,100,159`: Knöpfe „‹“, „›“, „✕“ ohne accessibilityLabel. VoiceOver liest dann nur das Zeichen vor.
  - Radios setzen `{ selected }` statt `{ checked }` (`components/fields.tsx:165,248`). TalkBack meldet die Auswahl dann
    nicht als „ausgewählt“, **unbestätigt**.
- **G10 Dunkelmodus, unbestätigt:** In `app/progress/breathe.tsx:95` ist die Phasenschrift fest `#000` auf dem Lime-Kreis. Der
  Kreis schrumpft auf 0,6 (132 px), „Ausatmen · 6“ in 28 px ist breiter, und die Ränder stehen dann schwarz auf dunklem Grund.
- **G11 Fehler ohne Rückmeldung:** `more/data.tsx` `deleteEverything` (try ohne catch), `chooseFile` (`pickBackup` ohne catch);
  `nutrition/scan.tsx:51-63`: wirft `findFoodByBarcode`, bleibt `busy.current` true und der Scanner reagiert nicht mehr;
  `share-card.tsx:31-34` im Desktop-Browser ohne `navigator.share` scheitert still (**unbestätigt**).
- **G12 Session ✓ ohne Sperre:** `session/[id].tsx:764` (`complete`). Kommt der zweite Tipp nach dem Neuladen, öffnet er den
  gerade erledigten Satz wieder (SetCheck ist dann „done“ und schaltet auf rückgängig). Kommt er davor, startet die Pause doppelt
  mit veraltetem `timer`. Abschließen und Abbrechen (`finish`, `:290`) haben auch kein busy-Flag, durch die
  ConfirmButton-Rückfrage ist das aber unwahrscheinlich.

## Geprüft, ohne Befund
- Komma und Punkt bei Satzgewicht (`parseDecimal`), lb (Eingabe in der Einheit, gespeichert in kg, Toleranz), keine
  Tausenderpunkte (`formatNumber` useGrouping:false).
- Die Pausenuhr rechnet mit `endAtMs` und ist damit sicher, wenn die App im Hintergrund war. Intervall und Ablauf werden aus
  der Startzeit berechnet.
- Haptics, KeepAwake, Kamera, Print und Notifications sind im Web abgefangen.
- Hart kodierte Farben sonst nur dort, wo es Absicht ist (Share-Karte, Kamera-Hinweis, Lime-Flächen mit schwarzer Schrift).
